import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { McpServerEditDialogComponent } from '../mcp-server-edit-dialog/mcp-server-edit-dialog.component';


@Component({
  selector: 'mcp-servers-dialog',
  templateUrl: './mcp-servers-dialog.component.html',
  styleUrls: ['./mcp-servers-dialog.component.scss']
})
export class McpServersDialogComponent implements OnInit {

  selectedServers: Array<{ name: string, url: string, transport: string, tools?: Array<{ name: string }> }> = [];
  filteredServers: Array<{ name: string, url: string, transport: string }> = [];
  searchFilter: string = '';
  onUpdateCallback: (data: any) => void;
  
  private logger: LoggerService = LoggerInstance.getInstance();
  
  constructor(
    public dialogRef: MatDialogRef<McpServersDialogComponent>,
    private dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA) public data: { 
      // mcpServers from integrations: tools = selected tools, availableToolsCount = total from last discovery (optional).
      mcpServers: Array<{ name: string, url: string, transport: string, tools?: Array<{ name: string }>, availableToolsCount?: number }>,
      selectedServers?: Array<{ name: string, url: string, transport: string, tools?: Array<{ name: string }> }>,
      onUpdate?: (data: any) => void
    }
  ) { }

  ngOnInit(): void {
    this.logger.debug("[McpServersDialog] data: ", this.data);
    // Pre-select servers that were already selected
    if (this.data.selectedServers && this.data.selectedServers.length > 0) {
      this.selectedServers = [...this.data.selectedServers];
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

  toggleServerSelection(server: { name: string, url: string, transport: string }, event?: Event): void {
    if (event) {
      event.stopPropagation(); // Prevent triggering the button click
    }
    const index = this.selectedServers.findIndex(s => s.name === server.name);
    if (index > -1) {
      this.selectedServers.splice(index, 1);
    } else {
      // IMPORTANT: keep action payload minimal (no tools metadata from integrations).
      this.selectedServers.push({
        name: server.name,
        url: server.url,
        transport: server.transport,
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
          server.url.toLowerCase().includes(filter) ||
          server.transport.toLowerCase().includes(filter)
        )
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    
    this.logger.log("[McpServersDialog] Filtered servers:", this.filteredServers.length);
  }

  isServerSelected(server: { name: string, url: string, transport: string }): boolean {
    return this.selectedServers.some(s => s.name === server.name);
  }

  /**
   * Count of tools available from the MCP server (from last discovery, persisted as availableToolsCount).
   * Falls back to tools.length for older integrations that don't have availableToolsCount.
   */
  getAvailableToolsCount(server: { name: string }): number {
    const found = this.data?.mcpServers?.find(s => s.name === server.name) as { tools?: Array<{ name: string }>; availableToolsCount?: number } | undefined;
    if (found?.availableToolsCount != null && Number.isFinite(found.availableToolsCount)) {
      return found.availableToolsCount;
    }
    return Array.isArray(found?.tools) ? found.tools.length : 0;
  }

  /**
   * Count of active/selected tools for a server in the action payload (selectedServers[].tools).
   */
  getActiveToolsCount(server: { name: string }): number {
    const selected = this.selectedServers.find(s => s.name === server.name);
    return Array.isArray(selected?.tools) ? selected.tools.length : 0;
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
          name: createdServer.name,
          url: createdServer.url,
          transport: createdServer.transport,
          tools: result?.selectedTools || []
        });
        this.logger.log("[McpServersDialog] New server added:", createdServer);
        
        // Update filtered list
        this.onSearchChange();
        
        // Notify parent component in real-time
        this.notifyUpdate();
      }
    });
  }

  openEditServerDialog(server: { name: string, url: string, transport: string }, event?: Event): void {
    if (event) {
      event.stopPropagation(); // Prevent any unwanted propagation
    }
    this.logger.log("[McpServersDialog] - openEditServerDialog for:", server);
    
    const selectedServer = this.selectedServers.find(s => s.name === server.name);
    const dialogRef = this.dialog.open(McpServerEditDialogComponent, {
      panelClass: 'custom-mcp-edit-dialog-container',
      data: { 
        server: server,
        allServers: this.data.mcpServers,
        selectedTools: selectedServer?.tools || []
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      this.logger.log("[McpServerEditDialog] result:", result);
      if (result !== false && result) {
        const updatedServer = result?.server ? result.server : result;
        const selectedTools: Array<{ name: string }> | undefined = result?.selectedTools;
        // Update the server in the list
        const index = this.data.mcpServers.findIndex(s => s.name === server.name);
        if (index > -1) {
          this.data.mcpServers[index] = updatedServer;
          // Update in selectedServers if it was selected
          const selectedIndex = this.selectedServers.findIndex(s => s.name === server.name);
          if (selectedIndex > -1) {
            const unique = new Map<string, { name: string }>();
            (selectedTools || this.selectedServers[selectedIndex].tools || []).forEach(t => {
              if (t?.name) unique.set(t.name, { name: t.name });
            });
            this.selectedServers[selectedIndex] = {
              name: updatedServer.name,
              url: updatedServer.url,
              transport: updatedServer.transport,
              tools: Array.from(unique.values())
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

