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
  
  private logger: LoggerService = LoggerInstance.getInstance();
  
  constructor(
    public dialogRef: MatDialogRef<McpServersDialogComponent>,
    private dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA) public data: { 
      mcpServers: Array<{ name: string, url: string, transport: string }>,
      selectedServers?: Array<{ name: string, url: string, transport: string }>
    }
  ) { }

  ngOnInit(): void {
    this.logger.debug("[McpServersDialog] data: ", this.data);
    // Pre-select servers that were already selected
    if (this.data.selectedServers && this.data.selectedServers.length > 0) {
      this.selectedServers = [...this.data.selectedServers];
      this.logger.debug("[McpServersDialog] Pre-selected servers: ", this.selectedServers);
    }
  }

  onCloseDialog(): void {
    this.logger.log("[McpServersDialog] - modal CLOSED");
    this.dialogRef.close(false);
  }

  toggleServerSelection(server: { name: string, url: string, transport: string }): void {
    const index = this.selectedServers.findIndex(s => s.name === server.name);
    if (index > -1) {
      this.selectedServers.splice(index, 1);
    } else {
      this.selectedServers.push(server);
    }
    this.logger.log("[McpServersDialog] selectedServers: ", this.selectedServers);
  }

  isServerSelected(server: { name: string, url: string, transport: string }): boolean {
    return this.selectedServers.some(s => s.name === server.name);
  }

  onAddMcpServer(): void {
    this.logger.log("[McpServersDialog] - onAddMcpServer clicked");
    // TODO: Open a form to add a new MCP server
    // For now, just log the action
  }

  openEditServerDialog(server: { name: string, url: string, transport: string }, event: Event): void {
    event.stopPropagation(); // Prevent toggling selection
    this.logger.log("[McpServersDialog] - openEditServerDialog for:", server);
    
    const dialogRef = this.dialog.open(McpServerEditDialogComponent, {
      panelClass: 'custom-mcp-edit-dialog-container',
      data: { server: server }
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
        }
      }
    });
  }

  onConfirm(): void {
    this.logger.log("[McpServersDialog] - onConfirm return data: ", this.selectedServers);
    this.dialogRef.close(this.selectedServers);
  }

}

