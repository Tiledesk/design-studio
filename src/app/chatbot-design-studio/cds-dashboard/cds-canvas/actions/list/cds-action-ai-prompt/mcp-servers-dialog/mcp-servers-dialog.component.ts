import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { McpServerEditDialogComponent } from '../mcp-server-edit-dialog/mcp-server-edit-dialog.component';


@Component({
  selector: 'appdashboard-mcp-servers-dialog',
  templateUrl: './mcp-servers-dialog.component.html',
  styleUrls: ['./mcp-servers-dialog.component.scss']
})
export class McpServersDialogComponent implements OnInit {

  selectedServers: Array<{ name: string, url: string, transport: string }> = [];
  filteredServers: Array<{ name: string, url: string, transport: string }> = [];
  searchFilter: string = '';
  onUpdateCallback: (data: any) => void;
  
  private logger: LoggerService = LoggerInstance.getInstance();
  
  constructor(
    public dialogRef: MatDialogRef<McpServersDialogComponent>,
    private dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA) public data: { 
      mcpServers: Array<{ name: string, url: string, transport: string }>,
      selectedServers?: Array<{ name: string, url: string, transport: string }>,
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
    // Initialize filtered servers
    this.filteredServers = [...this.data.mcpServers];
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
      this.selectedServers.push(server);
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
      this.filteredServers = [...this.data.mcpServers];
    } else {
      this.filteredServers = this.data.mcpServers.filter(server => 
        server.name.toLowerCase().includes(filter) ||
        server.url.toLowerCase().includes(filter) ||
        server.transport.toLowerCase().includes(filter)
      );
    }
    
    this.logger.log("[McpServersDialog] Filtered servers:", this.filteredServers.length);
  }

  isServerSelected(server: { name: string, url: string, transport: string }): boolean {
    return this.selectedServers.some(s => s.name === server.name);
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
        // Add the new server to the list
        this.data.mcpServers.push(result);
        // Automatically select the new server
        this.selectedServers.push(result);
        this.logger.log("[McpServersDialog] New server added:", result);
        
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
    
    const dialogRef = this.dialog.open(McpServerEditDialogComponent, {
      panelClass: 'custom-mcp-edit-dialog-container',
      data: { 
        server: server,
        allServers: this.data.mcpServers 
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      this.logger.log("[McpServerEditDialog] result:", result);
      if (result !== false && result) {
        // Update the server in the list
        const index = this.data.mcpServers.findIndex(s => s.name === server.name);
        if (index > -1) {
          this.data.mcpServers[index] = result;
          // Update in selectedServers if it was selected
          const selectedIndex = this.selectedServers.findIndex(s => s.name === server.name);
          if (selectedIndex > -1) {
            this.selectedServers[selectedIndex] = result;
          }
          this.logger.log("[McpServersDialog] Server updated:", result);
          
          // Update filtered list
          this.onSearchChange();
          
          // Notify parent component in real-time
          this.notifyUpdate();
        }
      }
    });
  }

}

