import { Injectable } from '@angular/core';
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

/** Answers get_project_capabilities, and gives FlowOpsService the same answer
 *  to check patches against.
 *
 *  Actions are recomputed on every call: open_flow can move the canvas into a
 *  subagent, and what a subagent may use differs. The MCP servers are read once
 *  per project, because discovering a native server's tools is a connection
 *  per server; an answer with any failure in it is not kept, so the next call
 *  tries again instead of repeating a transient error for the whole session. */
@Injectable({ providedIn: 'root' })
export class AgentChatCapabilitiesService {

  private mcpCache: { projectId: string; value: Promise<McpPart> } | null = null;

  constructor(
    private dashboardService: DashboardService,
    private projectPlanUtils: ProjectPlanUtils,
    private mcpService: McpService
  ) {}

  public async snapshot(): Promise<CapabilitiesSnapshot> {
    const subtype = this.dashboardService.selectedChatbot?.subtype || TYPE_CHATBOT.CHATBOT;
    const actions: ActionCapability[] = availableActionEntries(subtype,
      (type, plan) => this.projectPlanUtils.checkIfCanLoad(type, plan))
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
    if (!this.mcpCache || this.mcpCache.projectId !== projectId) {
      const value = this.loadMcp();
      this.mcpCache = { projectId, value };
      value.then(part => {
        const failed = !!part.error || part.servers.some(s => !!s.tools_error);
        if (failed && this.mcpCache?.value === value) { this.mcpCache = null; }
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
        const tools = await this.mcpService.connectNativeServer(s.id);
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
      const selected = Array.isArray(s.selectedTools) && s.selectedTools.length > 0 ? s.selectedTools : null;
      const tools = (s.tools || [])
        .filter(t => !selected || selected.indexOf(t.name) !== -1)
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
