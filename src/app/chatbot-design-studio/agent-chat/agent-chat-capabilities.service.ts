import { Injectable, Injector } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { DashboardService } from 'src/app/services/dashboard.service';
import { McpService } from 'src/app/services/mcp.service';
import { ProjectService } from 'src/app/services/projects.service';
import { AppConfigService } from 'src/app/services/app-config';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { McpServer } from 'src/app/models/mcp.model';
import { ProjectPlanUtils } from 'src/app/utils/project-utils';
import {
  TYPE_CHATBOT, availableActionEntries, isSubagentSubtype, resolveChatbotSubtype
} from '../utils-actions';
import { DYNAMIC_MODEL_PROVIDERS, LlmModel, getIntegrations, initLLMModels } from '../utils-llm-models';
import {
  ActionCapability, CapabilitiesSnapshot, LlmModelCapability, McpServerCapability
} from './agent-chat-capabilities.model';

interface McpPart {
  servers: McpServerCapability[];
  configs: Record<string, McpServer>;
  /** The full native catalogue entry for each native discovered this load,
   *  keyed by id -- the same shape mcp-server-edit-dialog's
   *  buildServerConfigForIntegration() saves for a native, discovered tools
   *  included. Never surfaced in `capabilities`; read only by
   *  configureNativeServers() to add a missing native to the project's own
   *  integration. */
  nativeConfigs: Record<string, McpServer>;
  error?: string;
}

interface LlmPart {
  /** The configured picker entries, kept for flow-ops (see CapabilitiesSnapshot). */
  models: LlmModel[];
  capabilities: LlmModelCapability[];
  error?: string;
}

/** What AgentChatLlmModelsLoader reads: the picker's models, and the
 *  project's integrations they were read against (null when those could not
 *  be read). */
export interface LoadedLlmModels {
  models: LlmModel[];
  integrations: any[] | null;
}

/** The models the AI actions' own picker lists -- initLLMModels, the call
 *  each of their panels makes -- and the project's integrations, behind a
 *  seam the spec can replace, since both are plain functions reaching
 *  ProjectService, the app config and the integrations endpoint. */
@Injectable({ providedIn: 'root' })
export class AgentChatLlmModelsLoader {
  constructor(
    private projectService: ProjectService,
    private dashboardService: DashboardService,
    private appConfigService: AppConfigService
  ) {}

  public async load(): Promise<LoadedLlmModels> {
    const logger = LoggerInstance.getInstance();
    // The same list initLLMModels reads first -- ProjectService's 60s cache
    // makes it one request for both.
    const integrations = await getIntegrations(this.projectService, this.dashboardService, logger);
    const models = await initLLMModels({
      projectService: this.projectService,
      dashboardService: this.dashboardService,
      appConfigService: this.appConfigService,
      logger,
      componentName: 'AGENT-CHAT CAPABILITIES'
    });
    return { models, integrations: Array.isArray(integrations) ? integrations : null };
  }
}

function messageOf(error: any): string {
  return String(error?.message ?? error);
}

/** How long a successful MCP answer is reused: long enough to spare a turn
 *  that asks twice a connection per native server, short enough that a server
 *  added or connected meanwhile shows up within the session. */
const MCP_CACHE_MS = 60000;
/** A native server that has not answered by then is reported, not waited for. */
const NATIVE_CONNECT_TIMEOUT_MS = 10000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('timed out')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** Answers get_project_capabilities, and gives FlowOpsService the same answer
 *  to check patches against.
 *
 *  Actions are recomputed on every call: open_flow can move the canvas into a
 *  subagent, and what a subagent may use differs. So are the models: the
 *  integrations they come from are already cached by ProjectService for a
 *  minute. The MCP servers are read once per project and kept for up to a
 *  minute, because discovering a native
 *  server's tools is a connection per server; an answer with any failure in it
 *  (or a load that threw) is not kept, so the next call tries again instead of
 *  repeating a transient error for the whole session. */
@Injectable({ providedIn: 'root' })
export class AgentChatCapabilitiesService {

  private mcpCache: { projectId: string; value: Promise<McpPart>; loadedAt?: number } | null = null;

  constructor(
    private dashboardService: DashboardService,
    private injector: Injector,
    private mcpService: McpService
  ) {}

  public async snapshot(): Promise<CapabilitiesSnapshot> {
    const subtype = this.dashboardService.selectedChatbot?.subtype || TYPE_CHATBOT.CHATBOT;
    // Resolved here, not injected: ProjectPlanUtils reads the current project
    // in its constructor, and this service is built with the agent-chat host
    // when the dashboard starts -- before any project is loaded. Built that
    // early it throws, and the flow never opens.
    const projectPlanUtils = this.injector.get(ProjectPlanUtils);
    const actions: ActionCapability[] = availableActionEntries(subtype,
      (type, plan) => projectPlanUtils.checkIfCanLoad(type, plan))
      .map(a => a.canLoad
        ? { type: a.type, status: 'available' as const }
        : { type: a.type, status: 'needs_upgrade' as const, plan: String(a.plan) });
    const [mcp, llm] = await Promise.all([this.mcpPart(), this.llmPart()]);
    return {
      capabilities: {
        chatbot_subtype: resolveChatbotSubtype(subtype),
        subagent: isSubagentSubtype(subtype),
        actions,
        mcp_servers: mcp.servers,
        ...(mcp.error ? { mcp_error: mcp.error } : {}),
        llm_models: llm.capabilities,
        ...(llm.error ? { llm_models_error: llm.error } : {})
      },
      customServerConfigs: mcp.configs,
      llmModels: llm.models
    };
  }

  public invalidate(): void {
    this.mcpCache = null;
  }

  /** Adds to the project's own `mcp` integration every native in `ids` that
   *  is not already there -- exactly what picking it from the Native Tools
   *  dialog and saving would do -- so a native the AI chat just attached to
   *  an ai_prompt is not invisible to the MCP dialogs. Called by flow-ops
   *  right before it applies a patch that attaches such a native.
   *
   *  The integration is read through `mcpService.loadMcpServers()`, not the
   *  snapshot this service otherwise caches for up to a minute -- but that
   *  call itself goes through ProjectService's own 60s integrations cache,
   *  the same one the MCP dialogs read through. Saving (this method's own
   *  `saveMcpIntegration` below, or the dialogs') clears that cache, so a
   *  write from this tab is always seen; a write from another tab in the
   *  last 60 seconds might not be, and would be overwritten by the save
   *  below -- the same read-modify-write race the dialogs are exposed to,
   *  not a new one this method introduces. The native's own catalogue entry
   *  -- id, name, transport, description, discovered tools -- comes from
   *  `nativeConfigs` instead, since re-fetching it here would mean
   *  reconnecting to every native again for what loadMcp() already read.
   *
   *  An id already configured is left alone. One that is not, but has no
   *  usable catalogue entry -- unknown to the catalogue, or discovered with
   *  no tools at all (its Connect failed on the load that built
   *  `nativeConfigs`) -- cannot be added at all: silently dropping it would
   *  let the caller believe the native is now configured when it is not.
   *  That throws instead, naming every such id, so flow-ops refuses the
   *  whole batch and the agent can retry rather than proceed on a false
   *  premise.
   *
   *  Every other error -- from either read, or from the save -- is left to
   *  propagate: flow-ops turns a rejection here into a refusal, applying
   *  nothing. */
  public async configureNativeServers(ids: string[]): Promise<void> {
    const part = await this.mcpPart();
    const current = await this.mcpService.loadMcpServers();
    const missing: McpServer[] = [];
    const unresolved: string[] = [];
    for (const id of ids) {
      const entry = part.nativeConfigs[id];
      const alreadyConfigured = entry
        ? current.some(c => (entry.id && c.id === entry.id) || c.name === entry.name)
        : current.some(c => c.id === id);
      if (alreadyConfigured) { continue; }
      if (!entry || (entry.tools || []).length === 0) {
        unresolved.push(id);
        continue;
      }
      missing.push(entry);
    }
    if (unresolved.length > 0) {
      throw new Error(`No usable MCP catalogue entry for ${unresolved.join(', ')}: it is either `
        + `not a known native, or its tools could not be discovered.`);
    }
    if (missing.length === 0) { return; }
    await this.mcpService.saveMcpIntegration([...current, ...missing]);
    this.invalidate();
  }

  /** The models the project has configured, in the picker's own order
   *  (OpenAI first). A failure is reported in the answer, never thrown: the
   *  actions and MCP servers are still worth returning.
   *
   *  initLLMModels marks every model of a dynamic provider (ollama, vllm,
   *  agentplatform, openrouter) configured whether or not the project has
   *  that integration, and fills those models into the global LLM_MODEL
   *  only when it does -- so without one they are LLM_MODEL's placeholders
   *  (`ollama_1`), or the servers of another project opened earlier in the
   *  same tab. The picker shows them anyway; the agent must not pick them,
   *  so they are kept only when the project's integrations list that
   *  provider.
   *
   *  Note that getIntegrations / getIntegrationByName swallow HTTP errors
   *  (they log and answer null), so an outage of the integrations endpoint
   *  shows up here as fewer models -- only the always-configured OpenAI ones
   *  -- not as llm_models_error, which only a throw from initLLMModels sets. */
  private async llmPart(): Promise<LlmPart> {
    try {
      // Resolved here for the same reason as ProjectPlanUtils in snapshot().
      const loaded = await this.injector.get(AgentChatLlmModelsLoader).load();
      const translate = this.injector.get(TranslateService);
      const present = new Set((loaded.integrations || [])
        .filter(i => i?.value).map(i => String(i.name)));
      const dynamic: readonly string[] = DYNAMIC_MODEL_PROVIDERS;
      const models = loaded.models.filter(m => m.configured === true
        && (dynamic.indexOf(m.llm) === -1 || present.has(m.llm)));
      return { models, capabilities: models.map(m => this.llmCapability(m, translate)) };
    } catch (e) {
      return { models: [], capabilities: [], error: messageOf(e) };
    }
  }

  /** What the agent is told about one model. Never a key or a url. */
  private llmCapability(m: LlmModel, translate: TranslateService): LlmModelCapability {
    // `description` is an i18n key; one with no translation comes back as the
    // key itself, or empty, and says nothing.
    const description = m.description ? translate.instant(m.description) : '';
    // generateLlmModelsFlat() sets `reasoning`, which LlmModel does not declare.
    const reasoning = (m as LlmModel & { reasoning?: boolean }).reasoning === true;
    return {
      llm: m.llm,
      model: m.model,
      label: `${m.llmLabel} · ${m.modelName}`,
      ...(m.server ? { server: m.server } : {}),
      ...(description && description !== m.description ? { description } : {}),
      ...(reasoning ? { reasoning: true } : {}),
      ...(m.multiplier ? { cost_multiplier: m.multiplier } : {}),
      ...(typeof m.max_output_tokens === 'number' ? { max_output_tokens: m.max_output_tokens } : {})
    };
  }

  private mcpPart(): Promise<McpPart> {
    const projectId = this.dashboardService.projectID;
    const stale = this.mcpCache?.loadedAt !== undefined
      && Date.now() - this.mcpCache.loadedAt >= MCP_CACHE_MS;
    if (!this.mcpCache || this.mcpCache.projectId !== projectId || stale) {
      const value = this.loadMcp();
      const cache: { projectId: string; value: Promise<McpPart>; loadedAt?: number } = { projectId, value };
      this.mcpCache = cache;
      value.then(part => {
        if (this.mcpCache !== cache) { return; }
        const failed = !!part.error || part.servers.some(s => !!s.tools_error);
        if (failed) { this.mcpCache = null; } else { cache.loadedAt = Date.now(); }
      }, () => {
        // The caller gets the rejection; here it only must not stay cached.
        if (this.mcpCache === cache) { this.mcpCache = null; }
      });
    }
    return this.mcpCache.value;
  }

  private async loadMcp(): Promise<McpPart> {
    const errors: string[] = [];
    const [natives, customs] = await Promise.all([
      this.mcpService.loadNativeServers().catch(e => {
        errors.push(`native MCP servers could not be read: ${messageOf(e)}`); return [] as McpServer[];
      }),
      this.mcpService.loadMcpServers().catch(e => {
        errors.push(`the project's MCP servers could not be read: ${messageOf(e)}`); return [] as McpServer[];
      })
    ]);

    // Whether a native from the catalogue is already in the project's own
    // integration -- the same match rule the Native Tools dialog's own
    // isConfigured uses. `customs` is the FULL integration list (natives and
    // customs alike), not the customs-only filter used below for customCaps.
    const isConfigured = (s: McpServer): boolean =>
      customs.some(c => (s.id && c.id === s.id) || c.name === s.name);

    const nativeConfigs: Record<string, McpServer> = {};
    const nativeCaps = await Promise.all(natives.filter(s => !!s.id).map(async (s): Promise<McpServerCapability> => {
      const base: McpServerCapability = {
        id: s.id, name: s.name, native: true, transport: s.transport,
        ...(s.description ? { description: s.description } : {}),
        tools: [], configured: isConfigured(s)
      };
      // The same shape mcp-server-edit-dialog's buildServerConfigForIntegration()
      // saves for a native, kept private -- configureNativeServers() reads it
      // to add a missing native to the integration without connecting again.
      const configEntry: McpServer = {
        id: s.id, name: s.name, url: '', transport: s.transport, native: true,
        ...(s.description ? { description: s.description } : {}),
        tools: []
      };
      try {
        const tools = await withTimeout(this.mcpService.connectNativeServer(s.id), NATIVE_CONNECT_TIMEOUT_MS);
        configEntry.tools = tools;
        nativeConfigs[s.id] = configEntry;
        return { ...base, tools: tools.map(t => ({ name: t.name, ...(t.description ? { description: t.description } : {}) })) };
      } catch (e) {
        nativeConfigs[s.id] = configEntry;
        return { ...base, tools_error: `connect failed: ${messageOf(e)}` };
      }
    }));

    // Native entries in the integration are copies of the catalogue; the
    // catalogue above is the one that counts.
    const configs: Record<string, McpServer> = {};
    const customCaps: McpServerCapability[] = customs.filter(s => !s.native).map(s => {
      configs[s.name] = s;
      // Every tool the integration discovered, not only its selectedTools.
      const tools = (Array.isArray(s.tools) ? s.tools : [])
        .filter(t => typeof t?.name === 'string')
        .map(t => ({ name: t.name, ...(t.description ? { description: t.description } : {}) }));
      return { name: s.name, native: false, transport: s.transport, tools };
    });

    return {
      servers: [...nativeCaps, ...customCaps],
      configs,
      nativeConfigs,
      ...(errors.length ? { error: errors.join('; ') } : {})
    };
  }
}

