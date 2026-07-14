import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ProjectService } from './projects.service';
import { DashboardService } from './dashboard.service';
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
    private readonly dashboardService: DashboardService
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
}
