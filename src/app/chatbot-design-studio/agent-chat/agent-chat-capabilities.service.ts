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

    const nativeCaps = await Promise.all(natives.filter(s => !!s.id).map(async (s): Promise<McpServerCapability> => {
      const base: McpServerCapability = {
        id: s.id, name: s.name, native: true, transport: s.transport,
        ...(s.description ? { description: s.description } : {}),
        tools: []
      };
      try {
        const tools = await withTimeout(this.mcpService.connectNativeServer(s.id), NATIVE_CONNECT_TIMEOUT_MS);
        return { ...base, tools: tools.map(t => ({ name: t.name, ...(t.description ? { description: t.description } : {}) })) };
      } catch (e) {
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
      ...(errors.length ? { error: errors.join('; ') } : {})
    };
  }
}
