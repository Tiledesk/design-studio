import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { ProjectService } from 'src/app/services/projects.service';
import { DashboardService } from 'src/app/services/dashboard.service';
import { firstValueFrom } from 'rxjs';

interface McpServer {
  name: string;
  url: string;
  transport: string;
}

interface McpIntegration {
  id_project: string;
  name: string;
  value: {
    servers: McpServer[];
  };
}


@Component({
  selector: 'appdashboard-mcp-server-edit-dialog',
  templateUrl: './mcp-server-edit-dialog.component.html',
  styleUrls: ['./mcp-server-edit-dialog.component.scss']
})
export class McpServerEditDialogComponent implements OnInit {

  editedServer: McpServer;
  originalServer: McpServer;
  project_id: string;
  isSaving: boolean = false;
  allMcpServers: McpServer[] = [];
  isNewServer: boolean = false;
  
  private logger: LoggerService = LoggerInstance.getInstance();
  
  constructor(
    public dialogRef: MatDialogRef<McpServerEditDialogComponent>,
    private projectService: ProjectService,
    private dashboardService: DashboardService,
    @Inject(MAT_DIALOG_DATA) public data: { 
      server?: McpServer;
      allServers: McpServer[];
      isNew?: boolean;
    }
  ) { }

  ngOnInit(): void {
    this.logger.debug("[McpServerEditDialog] data: ", this.data);
    
    // Check if we're creating a new server
    this.isNewServer = this.data.isNew || false;
    
    if (this.isNewServer) {
      // Initialize empty server for creation
      this.editedServer = {
        name: '',
        url: '',
        transport: 'streamable_http' // Default value
      };
      this.originalServer = null;
    } else {
      // Create a copy of the server to edit
      this.originalServer = this.data.server;
      this.editedServer = { ...this.data.server };
    }
    
    // Store all servers
    this.allMcpServers = [...this.data.allServers];
    // Get project ID
    this.project_id = this.dashboardService.projectID;
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

    if (this.isSaving) {
      return; // Prevent double submission
    }

    this.isSaving = true;
    this.logger.log("[McpServerEditDialog] Saving server:", this.editedServer);
    
    try {
      if (this.isNewServer) {
        // Check if server name already exists
        const nameExists = this.allMcpServers.some(s => s.name === this.editedServer.name);
        if (nameExists) {
          this.logger.warn("[McpServerEditDialog] Server name already exists");
          // TODO: Show error message to user
          this.isSaving = false;
          return;
        }
        // Add new server to the array
        this.allMcpServers.push({ ...this.editedServer });
      } else {
        // Find and update the server in the array
        const serverIndex = this.allMcpServers.findIndex(s => s.name === this.originalServer.name);
        if (serverIndex > -1) {
          this.allMcpServers[serverIndex] = { ...this.editedServer };
        }
      }

      // Prepare the integration object
      const mcpIntegration: McpIntegration = {
        id_project: this.project_id,
        name: "mcp",
        value: {
          servers: this.allMcpServers
        }
      };

      this.logger.log("[McpServerEditDialog] Saving integration:", mcpIntegration);

      // Call service to save the entire MCP integration
      const response = await firstValueFrom(
        this.projectService.saveIntegration(this.project_id, mcpIntegration)
      );
      
      this.logger.log("[McpServerEditDialog] Integration saved successfully:", response);
      
      // Close with the edited data
      this.dialogRef.close(this.editedServer);
    } catch (error) {
      this.logger.error("[McpServerEditDialog] Error saving integration:", error);
      this.isSaving = false;
      // TODO: Show error message to user
      // For now, we still close with the edited data for UI consistency
      this.dialogRef.close(this.editedServer);
    }
  }

}

