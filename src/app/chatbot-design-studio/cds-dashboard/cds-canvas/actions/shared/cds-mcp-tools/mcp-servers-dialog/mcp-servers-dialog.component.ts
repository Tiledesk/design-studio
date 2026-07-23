import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { McpServerEditDialogComponent } from '../mcp-server-edit-dialog/mcp-server-edit-dialog.component';
import { McpNativeCatalogDialogComponent } from '../mcp-native-catalog-dialog/mcp-native-catalog-dialog.component';
import { McpServer, McpSelectedServer, McpTool, normalizeMcpToolNames } from 'src/app/models/mcp.model';


@Component({
  selector: 'mcp-servers-dialog',
  templateUrl: './mcp-servers-dialog.component.html',
  styleUrls: ['./mcp-servers-dialog.component.scss']
})
export class McpServersDialogComponent implements OnInit {

  selectedServers: Array<McpSelectedServer> = [];
  filteredServers: Array<McpServer> = [];
  searchFilter: string = '';
  onUpdateCallback: (data: any) => void;

  // "Tools" popup (opened from the "more.." link on a card): ALL the server's tools sorted
  // descending, editable. Toggling tools (and select/deselect all) updates the server's ACTIVE
  // tools for this action in real time (like the card toggle).
  isActiveToolsModalOpen: boolean = false;
  activeToolsModalServer: McpServer | null = null;
  activeToolsModalTools: McpTool[] = [];
  activeToolsModalSelected: Set<string> = new Set();

  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    public dialogRef: MatDialogRef<McpServersDialogComponent>,
    private dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA) public data: {
      // mcpServers from integrations: tools = available, selectedTools = last selection (kept even when server not selected).
      mcpServers: Array<McpServer>,
      selectedServers?: Array<McpSelectedServer>,
      onUpdate?: (data: any) => void
    }
  ) { }

  ngOnInit(): void {
    this.logger.debug("[McpServersDialog] data: ", this.data);
    // Pre-select servers that were already selected
    if (this.data.selectedServers && this.data.selectedServers.length > 0) {
      this.selectedServers = this.data.selectedServers.map(server => ({
        // Tool selection is per-action: use ONLY the action's own tools (no integration fallback).
        ...server,
        tools: normalizeMcpToolNames(server.tools)
      }));
      this.logger.debug("[McpServersDialog] Pre-selected servers: ", this.selectedServers);
    }
    // Store the update callback if provided
    if (this.data.onUpdate) {
      this.onUpdateCallback = this.data.onUpdate;
    }
    // Initialize filtered servers (alphabetically by name)
    this.filteredServers = [...this.data.mcpServers].sort((a, b) => a.name.localeCompare(b.name));
  }

  onCloseDialog(): void {
    this.logger.log("[McpServersDialog] - modal CLOSED");
    this.dialogRef.close(false);
  }

  toggleServerSelection(server: McpServer, event?: Event): void {
    if (event) {
      event.stopPropagation(); // Prevent triggering the button click
    }
    const index = this.selectedServers.findIndex(s => s.name === server.name);
    if (index > -1) {
      this.selectedServers.splice(index, 1);
    } else {
      // Add with NO tools selected: the selection is per-action, the user picks via the tools popup.
      const stored = this.data.mcpServers?.find(s => s.name === server.name);
      this.selectedServers.push({
        id: server.id,
        name: server.name,
        url: server.url,
        transport: server.transport,
        native: server.native,
        customHeaders: stored?.customHeaders,
        tools: []
      });
    }
    this.logger.log("[McpServersDialog] selectedServers: ", this.selectedServers);

    // Notify parent component in real-time
    this.notifyUpdate();
  }

  private notifyUpdate(): void {
    if (this.onUpdateCallback) {
      this.onUpdateCallback({
        selectedServers: this.selectedServers,
        allServers: this.data.mcpServers
      });
    }
  }

  onSearchChange(): void {
    const filter = this.searchFilter.toLowerCase().trim();

    if (!filter) {
      this.filteredServers = [...this.data.mcpServers].sort((a, b) => a.name.localeCompare(b.name));
    } else {
      this.filteredServers = this.data.mcpServers
        .filter(server =>
          server.name.toLowerCase().includes(filter) ||
          (server.url || '').toLowerCase().includes(filter) ||
          server.transport.toLowerCase().includes(filter)
        )
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    this.logger.log("[McpServersDialog] Filtered servers:", this.filteredServers.length);
  }

  isServerSelected(server: { name: string }): boolean {
    return this.selectedServers.some(s => s.name === server.name);
  }

  /**
   * Active tool NAMES for a server = the ACTION's selection only. A server that is not selected in
   * the action has no active tools (no fallback to the integration — selection is per-action).
   */
  getActiveToolNames(server: { name: string }): string[] {
    const selected = this.selectedServers.find(s => s.name === server.name);
    if (selected && Array.isArray(selected.tools)) {
      return selected.tools;
    }
    return [];
  }

  /** All available (discovered) tools of a server, from the integration's data.mcpServers[].tools. */
  getAvailableTools(server: { name: string }): McpTool[] {
    const found = this.data?.mcpServers?.find(s => s.name === server.name);
    return Array.isArray(found?.tools) ? found.tools : [];
  }

  /** True when the given tool name is currently checked in the popup. */
  isActiveTool(name: string): boolean {
    return this.activeToolsModalSelected.has(name);
  }

  get areAllActiveToolsSelected(): boolean {
    return this.activeToolsModalTools.length > 0
      && this.activeToolsModalTools.every(t => this.activeToolsModalSelected.has(t.name));
  }

  get someActiveToolsSelected(): boolean {
    return this.activeToolsModalSelected.size > 0 && !this.areAllActiveToolsSelected;
  }

  /**
   * Opens the popup with ALL the server's tools (descending alphabetical order), the active ones
   * checked. Triggered by the "more.." link. Editing persists to the action (see applySelection).
   */
  openActiveToolsModal(server: McpServer, event?: Event): void {
    event?.stopPropagation();
    this.activeToolsModalServer = server;
    this.activeToolsModalTools = [...this.getAvailableTools(server)]
      .sort((a, b) => b.name.localeCompare(a.name));
    this.activeToolsModalSelected = new Set(this.getActiveToolNames(server));
    this.isActiveToolsModalOpen = true;
  }

  /** Toggle a single tool, then persist the selection to the action. */
  toggleActiveTool(name: string): void {
    if (this.activeToolsModalSelected.has(name)) {
      this.activeToolsModalSelected.delete(name);
    } else {
      this.activeToolsModalSelected.add(name);
    }
    this.applyActiveToolsSelection();
  }

  /** Select all / deselect all the visible tools, then persist. */
  toggleAllActiveTools(): void {
    if (this.areAllActiveToolsSelected) {
      this.activeToolsModalSelected.clear();
    } else {
      this.activeToolsModalSelected = new Set(this.activeToolsModalTools.map(t => t.name));
    }
    this.applyActiveToolsSelection();
  }

  /**
   * Persist the popup selection to the action's server list (real-time, like the card toggle):
   * - >=1 tool selected → the server is (or becomes) selected with exactly those active tools;
   * - 0 tools selected  → the server is removed from the action selection.
   */
  private applyActiveToolsSelection(): void {
    const srv = this.activeToolsModalServer;
    if (!srv) {
      return;
    }
    const names = Array.from(this.activeToolsModalSelected);
    const idx = this.selectedServers.findIndex(s => s.name === srv.name);
    if (names.length === 0) {
      if (idx > -1) {
        this.selectedServers.splice(idx, 1);
      }
    } else if (idx > -1) {
      this.selectedServers[idx] = { ...this.selectedServers[idx], tools: names };
    } else {
      this.selectedServers.push({
        id: srv.id,
        name: srv.name,
        url: srv.url,
        transport: srv.transport,
        native: srv.native,
        customHeaders: srv.customHeaders,
        tools: names
      });
    }
    this.notifyUpdate();
  }

  closeActiveToolsModal(): void {
    this.isActiveToolsModalOpen = false;
  }

  /**
   * "Tiledesk Tools": apre la modale catalogo dei server MCP NATIVI. Dal catalogo si seleziona un
   * server -> dettaglio (Connect + selezione tool) -> Save. Il nativo configurato torna qui via
   * onNativeConfigured e viene aggiunto/attivato nella lista dei server configurati.
   */
  onAddTiledeskTools(): void {
    this.logger.log("[McpServersDialog] - onAddTiledeskTools clicked");
    this.dialog.open(McpNativeCatalogDialogComponent, {
      panelClass: 'custom-mcp-dialog-container',
      data: {
        configuredServers: this.data.mcpServers,
        onConfigured: (server: McpServer) => this.onNativeConfigured(server)
      }
    });
  }

  /** Aggiunge/aggiorna nella lista configurata un server nativo appena configurato e lo attiva. */
  private onNativeConfigured(server: McpServer): void {
    if (!server) return;
    // add/update nella lista dei server configurati (già salvati in integration dall'edit-dialog)
    const idx = this.data.mcpServers.findIndex(s => (server.id && s.id === server.id) || s.name === server.name);
    if (idx > -1) {
      this.data.mcpServers[idx] = server;
    } else {
      this.data.mcpServers.push(server);
    }
    // attiva il server (selezione) con i tool scelti
    const tools = normalizeMcpToolNames(server.selectedTools);
    const selected: McpSelectedServer = {
      id: server.id,
      name: server.name,
      url: server.url,
      transport: server.transport,
      native: server.native,
      customHeaders: server.customHeaders,
      tools
    };
    const selIdx = this.selectedServers.findIndex(s => s.name === server.name);
    if (selIdx > -1) {
      this.selectedServers[selIdx] = selected;
    } else {
      this.selectedServers.push(selected);
    }
    this.onSearchChange();
    this.notifyUpdate();
    this.logger.log("[McpServersDialog] native server configured & added:", server);
  }

  onAddMcpServer(): void {
    this.logger.log("[McpServersDialog] - onAddMcpServer clicked");

    const dialogRef = this.dialog.open(McpServerEditDialogComponent, {
      panelClass: 'custom-mcp-edit-dialog-container',
      data: {
        isNew: true,
        allServers: this.data.mcpServers
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      this.logger.log("[McpServerEditDialog] new server result:", result);
      if (result !== false && result) {
        const createdServer = result?.server ? result.server : result;
        // Add the new server to the list
        this.data.mcpServers.push(createdServer);
        // Automatically select the new server
        this.selectedServers.push({
          id: createdServer.id,
          name: createdServer.name,
          url: createdServer.url,
          transport: createdServer.transport,
          native: createdServer.native,
          customHeaders: createdServer.customHeaders,
          tools: normalizeMcpToolNames(result?.selectedTools)
        });
        this.logger.log("[McpServersDialog] New server added:", createdServer);

        // Update filtered list
        this.onSearchChange();

        // Notify parent component in real-time
        this.notifyUpdate();
      }
    });
  }

  openEditServerDialog(server: McpServer, event?: Event): void {
    if (event) {
      event.stopPropagation(); // Prevent any unwanted propagation
    }
    this.logger.log("[McpServersDialog] - openEditServerDialog for:", server);
    // Use action selection if server is selected, else use stored selectedTools from integration
    const selectedServer = this.selectedServers.find(s => s.name === server.name);
    // Pre-check ONLY the action's current selection for this server (no integration fallback).
    const initialSelectedToolNames = normalizeMcpToolNames(selectedServer?.tools);
    const dialogRef = this.dialog.open(McpServerEditDialogComponent, {
      panelClass: 'custom-mcp-edit-dialog-container',
      data: {
        server: server,
        allServers: this.data.mcpServers,
        selectedTools: initialSelectedToolNames.map(name => ({ name }))
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      this.logger.log("[McpServerEditDialog] result:", result);
      if (result !== false && result) {
        const updatedServer = result?.server ? result.server : result;
        const selectedTools: string[] = Array.isArray(result?.selectedTools) ? result.selectedTools : [];
        // Update the server in the list (tools + selectedTools so they are shown and persisted)
        const index = this.data.mcpServers.findIndex(s => s.name === server.name);
        if (index > -1) {
          this.data.mcpServers[index] = updatedServer;
          // Update in selectedServers if it was selected
          const selectedIndex = this.selectedServers.findIndex(s => s.name === server.name);
          if (selectedIndex > -1) {
            this.selectedServers[selectedIndex] = {
              id: updatedServer.id,
              name: updatedServer.name,
              url: updatedServer.url,
              transport: updatedServer.transport,
              native: updatedServer.native,
              customHeaders: updatedServer.customHeaders,
              tools: [...new Set(selectedTools)]
            };
          }
          this.logger.log("[McpServersDialog] Server updated:", updatedServer);

          // Update filtered list
          this.onSearchChange();

          // Notify parent component in real-time
          this.notifyUpdate();
        }
      }
    });
  }

}
