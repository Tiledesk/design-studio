import { Injectable, Injector } from '@angular/core';
import { DashboardService } from 'src/app/services/dashboard.service';
import { McpService } from 'src/app/services/mcp.service';
import { McpServer } from 'src/app/models/mcp.model';
import { ProjectPlanUtils } from 'src/app/utils/project-utils';
import {
  TYPE_CHATBOT, availableActionEntries, isSubagentSubtype, resolveChatbotSubtype
} from '../utils-actions';
import {
  ActionCapability, CapabilitiesSnapshot, McpServerCapability
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
 *  subagent, and what a subagent may use differs. The MCP servers are read once
 *  per project and kept for up to a minute, because discovering a native
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
    const mcp = await this.mcpPart();
    return {
      capabilities: {
        chatbot_subtype: resolveChatbotSubtype(subtype),
        subagent: isSubagentSubtype(subtype),
        actions,
        mcp_servers: mcp.servers,
        ...(mcp.error ? { mcp_error: mcp.error } : {})
      },
      customServerConfigs: mcp.configs
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
   *  The integration is read fresh (`mcpService.loadMcpServers()`, not the
   *  cache this service otherwise keeps): a user may have configured or
   *  removed a server while the current snapshot was still valid, and
   *  writing over that would lose it. The native's own catalogue entry --
   *  id, name, transport, description, discovered tools -- comes from
   *  `nativeConfigs` instead, since re-fetching it here would mean
   *  reconnecting to every native again for what loadMcp() already read.
   *
   *  Errors -- from either read -- are left to propagate: flow-ops turns a
   *  rejection here into a refusal, applying nothing. */
  public async configureNativeServers(ids: string[]): Promise<void> {
    const part = await this.mcpPart();
    const current = await this.mcpService.loadMcpServers();
    const alreadyConfigured = (entry: McpServer): boolean =>
      current.some(c => (entry.id && c.id === entry.id) || c.name === entry.name);
    const missing = ids
      .map(id => part.nativeConfigs[id])
      .filter((entry): entry is McpServer => !!entry && !alreadyConfigured(entry));
    if (missing.length === 0) { return; }
    await this.mcpService.saveMcpIntegration([...current, ...missing]);
    this.invalidate();
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
