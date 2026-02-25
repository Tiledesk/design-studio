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
  filteredServers: Array<{ name: string, url: string, transport: string, tools?: Array<{ name: string }>, selectedTools?: Array<{ name: string }> }> = [];
  searchFilter: string = '';
  onUpdateCallback: (data: any) => void;
  
  private logger: LoggerService = LoggerInstance.getInstance();
  
  constructor(
    public dialogRef: MatDialogRef<McpServersDialogComponent>,
    private dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA) public data: { 
      // mcpServers from integrations: tools = available, selectedTools = last selection (kept even when server not selected).
      mcpServers: Array<{ name: string, url: string, transport: string, tools?: Array<{ name: string }>, selectedTools?: Array<{ name: string }> }>,
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

  toggleServerSelection(server: { name: string, url: string, transport: string, selectedTools?: Array<{ name: string }> }, event?: Event): void {
    if (event) {
      event.stopPropagation(); // Prevent triggering the button click
    }
    const index = this.selectedServers.findIndex(s => s.name === server.name);
    if (index > -1) {
      this.selectedServers.splice(index, 1);
    } else {
      // Use stored selectedTools from integration when adding, so previous selection is restored
      const stored = this.data.mcpServers?.find(s => s.name === server.name);
      const tools = Array.isArray(stored?.selectedTools) ? [...stored.selectedTools] : [];
      this.selectedServers.push({
        name: server.name,
        url: server.url,
        transport: server.transport,
        tools
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
   * Count of available tools for a server (from integrations -> data.mcpServers[].tools).
   */
  getAvailableToolsCount(server: { name: string }): number {
    const found = this.data?.mcpServers?.find(s => s.name === server.name);
    return Array.isArray(found?.tools) ? found.tools.length : 0;
  }

  /**
   * Count of active/selected tools: from selectedServers when server is selected, else from stored selectedTools (integration).
   */
  getActiveToolsCount(server: { name: string }): number {
    const selected = this.selectedServers.find(s => s.name === server.name);
    if (selected && Array.isArray(selected.tools)) {
      return selected.tools.length;
    }
    const found = this.data?.mcpServers?.find(s => s.name === server.name);
    return Array.isArray(found?.selectedTools) ? found.selectedTools.length : 0;
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

  openEditServerDialog(server: { name: string, url: string, transport: string, tools?: Array<{ name: string }>, selectedTools?: Array<{ name: string }> }, event?: Event): void {
    if (event) {
      event.stopPropagation(); // Prevent any unwanted propagation
    }
    this.logger.log("[McpServersDialog] - openEditServerDialog for:", server);
    // Use action selection if server is selected, else use stored selectedTools from integration
    const selectedServer = this.selectedServers.find(s => s.name === server.name);
    const initialSelectedTools = selectedServer?.tools?.length
      ? selectedServer.tools
      : (Array.isArray(server.selectedTools) ? server.selectedTools : []);
    const dialogRef = this.dialog.open(McpServerEditDialogComponent, {
      panelClass: 'custom-mcp-edit-dialog-container',
      data: { 
        server: server,
        allServers: this.data.mcpServers,
        selectedTools: initialSelectedTools
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      this.logger.log("[McpServerEditDialog] result:", result);
      if (result !== false && result) {
        const updatedServer = result?.server ? result.server : result;
        const selectedTools: Array<{ name: string }> | undefined = result?.selectedTools;
        // Update the server in the list (tools + selectedTools so they are shown and persisted)
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

