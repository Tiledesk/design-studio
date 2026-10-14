import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ProjectService } from './projects.service';
import { DashboardService } from './dashboard.service';
import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';
import {
  McpServer,
  McpSelectedServer,
  McpTool,
  McpIntegration,
  normalizeMcpToolNames
} from '../models/mcp.model';

/**
 * Shared MCP orchestration service.
 *
 * Owns fetch + normalize + sync of MCP servers/tools so that the reusable `cds-mcp-tools`
 * component and the MCP dialogs depend on a single collaborator instead of duplicating logic.
 * All HTTP is delegated to `ProjectService` (no new endpoints).
 */
@Injectable({ providedIn: 'root' })
export class McpService {

  /** Name of the integration that stores MCP servers. */
  static readonly INTEGRATION_NAME = 'mcp';

  constructor(
    private readonly projectService: ProjectService,
    private readonly dashboardService: DashboardService,
    private readonly appStorageService: AppStorageService
  ) { }

  private resolveProjectId(projectId?: string): string {
    return projectId || this.dashboardService.projectID;
  }

  /** Extract McpTool[] from an arbitrary discovery/connect response shape. */
  private mapRawTools(res: any): McpTool[] {
    const rawTools = Array.isArray(res) ? res : (Array.isArray(res?.tools) ? res.tools : []);
    return (rawTools || [])
      .filter((t: any) => t && typeof t.name === 'string' && t.name.trim().length > 0)
      .map((t: any) => ({
        name: String(t.name),
        title: t.title ? String(t.title) : undefined,
        description: t.description ? String(t.description) : undefined
      }));
  }

  /**
   * Load the configured MCP servers from the "mcp" integration (the available list).
   * Delegates ProjectService.getIntegrations and extracts value.servers.
   */
  async loadMcpServers(projectId?: string): Promise<McpServer[]> {
    const id = this.resolveProjectId(projectId);
    const integrations = await firstValueFrom(this.projectService.getIntegrations(id));
    if (!Array.isArray(integrations)) {
      return [];
    }
    const mcp = integrations.find((el: any) => el?.name === McpService.INTEGRATION_NAME);
    return Array.isArray(mcp?.value?.servers) ? mcp.value.servers : [];
  }

  /**
   * Discover tools for a custom server URL. Delegates ProjectService.getMcpTools, forwarding the
   * enabled custom headers so the backend can authenticate to the MCP server during discovery.
   */
  async discoverTools(
    url: string,
    projectId?: string,
    customHeaders?: Array<{ key: string; value: string }>
  ): Promise<McpTool[]> {
    const id = this.resolveProjectId(projectId);
    const res = await firstValueFrom(this.projectService.getMcpTools(id, url, { customHeaders }));
    return this.mapRawTools(res);
  }

  /**
   * Load the Tiledesk native MCP catalog. Delegates ProjectService.getNativeMcpServers.
   * Returns McpServer[] (native:true, empty tools — tools are discovered on Connect).
   */
  async loadNativeServers(projectId?: string): Promise<McpServer[]> {
    const id = this.resolveProjectId(projectId);
    const res = await firstValueFrom(this.projectService.getNativeMcpServers(id));
    const rawList = Array.isArray(res)
      ? res
      : (Array.isArray(res?.servers) ? res.servers : (Array.isArray(res?.value?.servers) ? res.value.servers : []));
    return (rawList || [])
      .filter((s: any) => s && (s.id || s.name))
      .map((s: any): McpServer => ({
        id: s.id ? String(s.id) : undefined,
        name: String(s.name ?? s.id ?? ''),
        url: s.url ? String(s.url) : '',
        transport: String(s.transport ?? 'streamable_http'),
        native: true,
        description: s.description ? String(s.description) : undefined,
        tools: [],
        selectedTools: []
      }));
  }

  /** Connect + fetch tools of a native MCP server. Delegates ProjectService.getNativeMcpServerTools. */
  async connectNativeServer(nativeId: string, projectId?: string): Promise<McpTool[]> {
    const id = this.resolveProjectId(projectId);
    const res = await firstValueFrom(this.projectService.getNativeMcpServerTools(id, nativeId));
    return this.mapRawTools(res);
  }

  /**
   * Persist the "mcp" integration with the given server list.
   * Delegates ProjectService.saveIntegration.
   */
  async saveMcpIntegration(servers: McpServer[], projectId?: string): Promise<any> {
    const id = this.resolveProjectId(projectId);
    const integration: McpIntegration = {
      id_project: id,
      name: McpService.INTEGRATION_NAME,
      value: { servers }
    };
    return firstValueFrom(this.projectService.saveIntegration(id, integration));
  }

  /** Single normalizer entry point (re-export of the pure model helper). */
  normalizeToolNames(tools: unknown): string[] {
    return normalizeMcpToolNames(tools);
  }

  /**
   * Normalize an action's selected servers (pure, no side effects). Tool selection is per-action:
   * each server keeps ONLY its own selected tool names (normalized) — NO fallback to the integration
   * `selectedTools`, so selecting tools never depends on / modifies the integration.
   * `available` is accepted for signature stability but intentionally not used.
   */
  syncSelectedServers(selected: McpSelectedServer[], available?: McpServer[]): McpSelectedServer[] {
    if (!Array.isArray(selected) || !selected.length) {
      return [];
    }
    return selected.map(server => ({
      ...server,
      tools: normalizeMcpToolNames(server.tools)
    }));
  }

  /* ==========================================================================
   * Memoria della selezione dei tool
   *
   * `action.servers[]` contiene SOLO i server attivi: deselezionandone uno la sua selezione
   * di tool sparirebbe, e riselezionandolo si ripartirebbe da zero. Qui la conserviamo a parte,
   * per AZIONE + SERVER (scope corretto: due azioni che usano lo stesso server non si
   * sovrascrivono a vicenda), fuori sia dall'integrazione MCP sia dal payload dell'azione.
   * ========================================================================*/

  /** Chiave di storage (AppStorageService aggiunge gia' il prefisso applicativo). */
  private static readonly TOOLS_MEMORY_KEY = 'cds_mcp_tools_memory';
  /** Voci non toccate da piu' di questo periodo vengono scartate alla prima scrittura. */
  private static readonly TOOLS_MEMORY_TTL_MS = 90 * 24 * 60 * 60 * 1000;
  /** Tetto di azioni memorizzate: oltre, si scartano le meno recenti (l'azione puo' essere stata cancellata). */
  private static readonly TOOLS_MEMORY_MAX_ACTIONS = 200;

  /** Legge l'intera memoria. Tollerante a storage assente o contenuto corrotto. */
  private readToolsMemory(): { [actionId: string]: { updatedAt: number, servers: { [name: string]: string[] } } } {
    try {
      const raw = this.appStorageService.getItem(McpService.TOOLS_MEMORY_KEY);
      if (!raw) {
        return {};
      }
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return (parsed && typeof parsed === 'object') ? parsed : {};
    } catch (_e) {
      return {};
    }
  }

  /** Scrive la memoria applicando TTL e tetto massimo. Non lancia mai. */
  private writeToolsMemory(memory: { [actionId: string]: { updatedAt: number, servers: { [name: string]: string[] } } }): void {
    try {
      const now = Date.now();
      let entries = Object.keys(memory)
        .filter(id => (now - (memory[id]?.updatedAt ?? 0)) < McpService.TOOLS_MEMORY_TTL_MS)
        .sort((a, b) => (memory[b]?.updatedAt ?? 0) - (memory[a]?.updatedAt ?? 0))
        .slice(0, McpService.TOOLS_MEMORY_MAX_ACTIONS);
      const pruned = entries.reduce((acc, id) => { acc[id] = memory[id]; return acc; }, {});
      this.appStorageService.setItem(McpService.TOOLS_MEMORY_KEY, JSON.stringify(pruned));
    } catch (_e) {
      // la memoria e' un comfort, non deve mai rompere il flusso
    }
  }

  /** Selezione di tool memorizzata per un'azione (mappa nomeServer -> tool). */
  getRememberedToolsForAction(actionId: string): { [serverName: string]: string[] } {
    if (!actionId) {
      return {};
    }
    const entry = this.readToolsMemory()[actionId];
    return (entry && entry.servers && typeof entry.servers === 'object') ? entry.servers : {};
  }

  /** Memorizza (o azzera) la selezione di tool di un server per una specifica azione. */
  setRememberedTools(actionId: string, serverName: string, tools: string[]): void {
    if (!actionId || !serverName) {
      return;
    }
    const memory = this.readToolsMemory();
    const entry = memory[actionId] ?? { updatedAt: 0, servers: {} };
    entry.servers = entry.servers ?? {};
    entry.servers[serverName] = normalizeMcpToolNames(tools);
    entry.updatedAt = Date.now();
    memory[actionId] = entry;
    this.writeToolsMemory(memory);
  }
}
