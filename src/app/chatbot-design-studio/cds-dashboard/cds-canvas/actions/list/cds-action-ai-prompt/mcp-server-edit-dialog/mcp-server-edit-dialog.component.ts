import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';


@Component({
  selector: 'appdashboard-mcp-server-edit-dialog',
  templateUrl: './mcp-server-edit-dialog.component.html',
  styleUrls: ['./mcp-server-edit-dialog.component.scss']
})
export class McpServerEditDialogComponent implements OnInit {

  editedServer: { name: string, url: string, transport: string };
  originalServer: { name: string, url: string, transport: string };
  
  private logger: LoggerService = LoggerInstance.getInstance();
  
  constructor(
    public dialogRef: MatDialogRef<McpServerEditDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { 
      server: { name: string, url: string, transport: string }
    }
  ) { }

  ngOnInit(): void {
    this.logger.debug("[McpServerEditDialog] data: ", this.data);
    // Create a copy of the server to edit
    this.originalServer = this.data.server;
    this.editedServer = { ...this.data.server };
  }

  onCloseDialog(): void {
    this.logger.log("[McpServerEditDialog] - modal CLOSED");
    this.dialogRef.close(false);
  }

  onChangeField(value: string, field: 'name' | 'url' | 'transport'): void {
    this.editedServer[field] = value;
    this.logger.debug(`[McpServerEditDialog] Changed ${field}:`, value);
  }

  isFormValid(): boolean {
    return !!(this.editedServer.name && 
              this.editedServer.url && 
              this.editedServer.transport);
  }

  async onSave(): Promise<void> {
    if (!this.isFormValid()) {
      this.logger.warn("[McpServerEditDialog] Form is not valid");
      return;
    }

    this.logger.log("[McpServerEditDialog] Saving server:", this.editedServer);
    
    // TODO: Call service to save the MCP server
    // Example: await this.mcpService.updateServer(this.editedServer);
    
    // For now, just close with the edited data
    this.dialogRef.close(this.editedServer);
  }

}

