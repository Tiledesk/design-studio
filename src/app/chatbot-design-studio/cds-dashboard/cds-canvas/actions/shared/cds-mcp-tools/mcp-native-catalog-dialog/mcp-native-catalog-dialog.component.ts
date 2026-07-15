import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { McpService } from 'src/app/services/mcp.service';
import { McpServer } from 'src/app/models/mcp.model';
import { McpServerEditDialogComponent } from '../mcp-server-edit-dialog/mcp-server-edit-dialog.component';

@Component({
  selector: 'mcp-native-catalog-dialog',
  templateUrl: './mcp-native-catalog-dialog.component.html',
  styleUrls: ['./mcp-native-catalog-dialog.component.scss']
})
export class McpNativeCatalogDialogComponent implements OnInit {

  nativeServers: McpServer[] = [];
  filteredServers: McpServer[] = [];
  searchFilter: string = '';
  isLoading: boolean = false;
  showError: boolean = false;
  errorMessage: string = '';

  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    public dialogRef: MatDialogRef<McpNativeCatalogDialogComponent>,
    private dialog: MatDialog,
    private mcpService: McpService,
    @Inject(MAT_DIALOG_DATA) public data: {
      // lista dei server MCP già configurati (per ripristinare la config e marcare i "configured")
      configuredServers: McpServer[];
      // callback invocata quando un nativo viene configurato e salvato (per aggiungerlo alla lista principale)
      onConfigured?: (server: McpServer) => void;
    }
  ) { }

  ngOnInit(): void {
    this.loadNativeServers();
  }

  /** Carica il catalogo dei server nativi (GET {proj}/mcp/native). */
  async loadNativeServers(): Promise<void> {
    this.isLoading = true;
    this.showError = false;
    try {
      this.nativeServers = await this.mcpService.loadNativeServers();
      this.applyFilter();
    } catch (error) {
      this.logger.error('[McpNativeCatalogDialog] error loading native servers:', error);
      this.showError = true;
      this.errorMessage = 'Error while loading Tiledesk tools.';
    } finally {
      this.isLoading = false;
    }
  }

  onSearchChange(): void {
    this.applyFilter();
  }

  private applyFilter(): void {
    const f = this.searchFilter.toLowerCase().trim();
    const list = !f
      ? [...this.nativeServers]
      : this.nativeServers.filter(s =>
          s.name.toLowerCase().includes(f) ||
          (s.description || '').toLowerCase().includes(f) ||
          s.transport.toLowerCase().includes(f));
    this.filteredServers = list.sort((a, b) => a.name.localeCompare(b.name));
  }

  /** true se il nativo è già presente nella lista dei server configurati. */
  isConfigured(server: McpServer): boolean {
    return (this.data.configuredServers || []).some(c =>
      (server.id && c.id === server.id) || c.name === server.name);
  }

  /** Click su un server del catalogo: apre il dettaglio (edit-dialog readonly per i nativi). */
  onSelectNative(server: McpServer): void {
    // Se già configurato, ripristina la configurazione esistente (tool selezionati ecc.).
    const existing = (this.data.configuredServers || []).find(c =>
      (server.id && c.id === server.id) || c.name === server.name);
    const detail: McpServer = existing
      ? { ...existing, native: true, id: existing.id || server.id, description: existing.description || server.description }
      : { ...server };
    const selectedTools = Array.isArray(existing?.selectedTools)
      ? existing.selectedTools
      : (Array.isArray(detail.selectedTools) ? detail.selectedTools : []);

    const ref = this.dialog.open(McpServerEditDialogComponent, {
      panelClass: 'custom-mcp-edit-dialog-container',
      data: {
        server: detail,
        allServers: this.data.configuredServers,
        selectedTools
      }
    });

    ref.afterClosed().subscribe(result => {
      if (result !== false && result) {
        const saved = result?.server ? result.server : result;
        this.logger.log('[McpNativeCatalogDialog] native server configured:', saved);
        if (this.data.onConfigured) {
          this.data.onConfigured(saved);
        }
      }
    });
  }
}
