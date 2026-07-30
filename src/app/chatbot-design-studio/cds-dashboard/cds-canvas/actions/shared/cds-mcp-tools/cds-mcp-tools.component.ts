import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { McpService } from 'src/app/services/mcp.service';
import { McpSelectedServer, McpServer, toPersistedMcpServer } from 'src/app/models/mcp.model';
import { McpServersDialogComponent } from './mcp-servers-dialog/mcp-servers-dialog.component';

/**
 * Reusable MCP tools selector.
 *
 * Renders the "select MCP tools" editor (and, optionally, the read-only preview of the selected
 * servers) and owns all interaction with the MCP dialogs and the MCP integration. It is fully
 * decoupled from any specific action: the host binds its `action.servers` to `[servers]` and
 * persists the emitted `serversChange` however it likes (typically `action.servers = $event`
 * followed by its own save). Usable by AI Prompt, AskGPT V2, AI Condition, etc.
 */
@Component({
  selector: 'cds-mcp-tools',
  templateUrl: './cds-mcp-tools.component.html',
  styleUrls: ['./cds-mcp-tools.component.scss']
})
export class CdsMcpToolsComponent implements OnInit, OnChanges {

  /** Currently selected servers/tools (bound to the host's action.servers). */
  @Input() servers: McpSelectedServer[] = [];
  /** Project id; falls back to DashboardService inside McpService when empty. */
  @Input() projectId: string;
  /** When true, also render the read-only tag preview of the selected servers. */
  @Input() previewMode: boolean = false;
  /** When true, disables the picker interactions. */
  @Input() disabled: boolean = false;
  /** Emitted whenever the selection changes (the host writes it to action.servers + saves). */
  @Output() serversChange = new EventEmitter<McpSelectedServer[]>();

  /** Available servers from the "mcp" integration (source for the picker + tool reconciliation). */
  availableServers: McpServer[] = [];

  private readonly logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private readonly dialog: MatDialog,
    private readonly mcpService: McpService
  ) { }

  async ngOnInit(): Promise<void> {
    // Guard synchronously (the input may be bound to an undefined action.servers) so the
    // template can safely read `servers.length` on the first render, before load resolves.
    this.servers = this.servers ?? [];
    await this.loadAndSync();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Re-hydrate when the host switches to a different action/block (new servers input reference).
    if (changes['servers']) {
      this.servers = this.servers ?? [];
      if (!changes['servers'].firstChange) {
        this.loadAndSync();
      }
    }
  }

  /**
   * Load the available servers from the integration and reconcile the current selection with them.
   * Does NOT emit: matches the original behavior where init/sync updated the view without saving.
   */
  private async loadAndSync(): Promise<void> {
    try {
      this.availableServers = await this.mcpService.loadMcpServers(this.projectId);
    } catch (error) {
      this.logger.error('[cds-mcp-tools] loadMcpServers error:', error);
      this.availableServers = this.availableServers || [];
    }
    this.servers = this.mcpService.syncSelectedServers(this.servers ?? [], this.availableServers);
  }

  openMcpServersDialog(): void {
    if (this.disabled) {
      return;
    }
    this.servers = this.mcpService.syncSelectedServers(this.servers ?? [], this.availableServers);
    const dialogRef = this.dialog.open(McpServersDialogComponent, {
      panelClass: 'custom-mcp-dialog-container',
      data: {
        mcpServers: this.availableServers,
        selectedServers: this.servers,
        onUpdate: (updateData: any) => this.handleMcpServersUpdate(updateData)
      }
    });
    dialogRef.afterClosed().subscribe(() => {
      this.logger.log('[cds-mcp-tools] McpServersDialog closed');
    });
  }

  /** Real-time callback from the picker (kept internal to the component). */
  private handleMcpServersUpdate(updateData: any): void {
    this.servers = updateData?.selectedServers?.length ? [...updateData.selectedServers] : [];
    this.servers = this.mcpService.syncSelectedServers(this.servers, this.availableServers);
    if (updateData?.allServers) {
      this.availableServers = [...updateData.allServers];
    }
    this.emitChange();
  }

  removeSelectedServer(server: McpSelectedServer, event: Event): void {
    event.stopPropagation();
    if (this.disabled) {
      return;
    }
    const index = this.servers.findIndex(s => s.name === server.name);
    if (index > -1) {
      this.servers.splice(index, 1);
      this.emitChange();
    }
  }

  private emitChange(): void {
    // Persist the canonical shape: native always present, id only for native, tools as names.
    this.serversChange.emit((this.servers ?? []).map(toPersistedMcpServer));
  }
}
