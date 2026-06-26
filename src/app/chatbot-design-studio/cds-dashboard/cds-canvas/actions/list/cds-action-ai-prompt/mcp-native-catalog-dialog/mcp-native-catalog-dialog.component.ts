import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { ProjectService } from 'src/app/services/projects.service';
import { DashboardService } from 'src/app/services/dashboard.service';
import { firstValueFrom } from 'rxjs';
import { McpServerEditDialogComponent } from '../mcp-server-edit-dialog/mcp-server-edit-dialog.component';

/** Server MCP nativo Tiledesk nel catalogo. */
interface NativeServer {
  id?: string;
  name: string;
  url: string;
  transport: string;
  native?: boolean;
  description?: string;
  customHeaders?: Array<{ enabled: boolean, key: string, value: string }>;
  tools?: Array<{ name: string }>;
  selectedTools?: Array<{ name: string }>;
}

@Component({
  selector: 'mcp-native-catalog-dialog',
  templateUrl: './mcp-native-catalog-dialog.component.html',
  styleUrls: ['./mcp-native-catalog-dialog.component.scss']
})
export class McpNativeCatalogDialogComponent implements OnInit {

  nativeServers: NativeServer[] = [];
  filteredServers: NativeServer[] = [];
  searchFilter: string = '';
  isLoading: boolean = false;
  showError: boolean = false;
  errorMessage: string = '';

  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    public dialogRef: MatDialogRef<McpNativeCatalogDialogComponent>,
    private dialog: MatDialog,
    private projectService: ProjectService,
    private dashboardService: DashboardService,
    @Inject(MAT_DIALOG_DATA) public data: {
      // lista dei server MCP già configurati (per ripristinare la config e marcare i "configured")
      configuredServers: NativeServer[];
      // callback invocata quando un nativo viene configurato e salvato (per aggiungerlo alla lista principale)
      onConfigured?: (server: any) => void;
    }
  ) { }

  ngOnInit(): void {
    this.loadNativeServers();
  }

  /** Carica il catalogo dei server nativi (POST {proj}/mcp/native). */
  async loadNativeServers(): Promise<void> {
    this.isLoading = true;
    this.showError = false;
    try {
      const projectId = this.dashboardService.projectID;
      const res = await firstValueFrom(this.projectService.getNativeMcpServers(projectId));
      const rawList = Array.isArray(res)
        ? res
        : (Array.isArray(res?.servers) ? res.servers : (Array.isArray(res?.value?.servers) ? res.value.servers : []));
      this.nativeServers = (rawList || [])
        .filter((s: any) => s && (s.id || s.name))
        .map((s: any) => ({
          id: s.id ? String(s.id) : undefined,
          name: String(s.name ?? s.id ?? ''),
          url: s.url ? String(s.url) : '',
          transport: String(s.transport ?? 'streamable_http'),
          native: true,
          description: s.description ? String(s.description) : undefined,
          tools: [],
          selectedTools: []
        }));
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
  isConfigured(server: NativeServer): boolean {
    return (this.data.configuredServers || []).some(c =>
      (server.id && c.id === server.id) || c.name === server.name);
  }

  /** Click su un server del catalogo: apre il dettaglio (edit-dialog readonly per i nativi). */
  onSelectNative(server: NativeServer): void {
    // Se già configurato, ripristina la configurazione esistente (tool selezionati ecc.).
    const existing = (this.data.configuredServers || []).find(c =>
      (server.id && c.id === server.id) || c.name === server.name);
    const detail: NativeServer = existing
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
