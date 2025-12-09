import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { McpService, McpServer, McpIntegration } from 'src/app/services/mcp.service';
import { DashboardService } from 'src/app/services/dashboard.service';
import { firstValueFrom } from 'rxjs';
import { TYPE_METHOD_ATTRIBUTE } from 'src/app/chatbot-design-studio/utils';


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
  showLoader: boolean = false;
  allMcpServers: McpServer[] = [];
  isNewServer: boolean = false;
  errorMessage: string = '';
  showError: boolean = false;
  showJsonOverlay: boolean = false;
  formattedJsonResponse: string = '';
  jsonHeaders: any = {};
  typeMethodAttribute = TYPE_METHOD_ATTRIBUTE;
  
  private logger: LoggerService = LoggerInstance.getInstance();
  
  constructor(
    public dialogRef: MatDialogRef<McpServerEditDialogComponent>,
    private mcpService: McpService,
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
        transport: 'streamable_http', // Default value
        headers: [],
      };
      // Initialize default headers
      this.jsonHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      this.originalServer = null;
    } else {
      // Create a copy of the server to edit
      this.originalServer = this.data.server;
      this.editedServer = { ...this.data.server };
      // Convert headers to object format if needed
      this.jsonHeaders = this.convertHeadersToObject(this.editedServer.headers);
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

  onCloseJsonOverlay(): void {
    this.showJsonOverlay = false;
    this.formattedJsonResponse = '';
  }

  onChangeField(value: string, field: 'name' | 'url' | 'transport'): void {
    this.editedServer[field] = value;
    this.logger.debug(`[McpServerEditDialog] Changed ${field}:`, value);
  }

  onChangeHeaders(attributes: any): void {
    this.jsonHeaders = attributes;
    this.editedServer.headers = attributes;
    this.logger.debug(`[McpServerEditDialog] Changed headers:`, attributes);
  }

  private convertHeadersToObject(headers: any): any {
    if (!headers) {
      return {};
    }
    
    // If it's already an object, return it
    if (typeof headers === 'object' && !Array.isArray(headers)) {
      return headers;
    }
    
    // If it's an array of strings like ['Content-Type: application/json', 'Accept: application/json']
    if (Array.isArray(headers)) {
      const result: any = {};
      headers.forEach((header: string) => {
        if (typeof header === 'string' && header.includes(':')) {
          const [key, ...valueParts] = header.split(':');
          const value = valueParts.join(':').trim();
          if (key && value) {
            result[key.trim()] = value;
          }
        }
      });
      return result;
    }
    
    return {};
  }

  isFormValid(): boolean {
    return !!(this.editedServer.name && 
              this.editedServer.url && 
              this.editedServer.transport);
  }

  async onToolsList(): Promise<void> {
    this.logger.log("[McpServerEditDialog] Starting test with URL:", this.editedServer?.url || 'N/A');
    
    // Reset error state
    this.showError = false;
    this.errorMessage = '';

    try {
      // Chiama il service per testare la connessione (simula 2 chiamate POST in sequenza)
      // Non effettua controlli sui dati, usa i dati mockati
      const url = this.editedServer?.url || '';
      const headers = this.editedServer?.headers || {};
      const response = await firstValueFrom(
        this.mcpService.loadMcpServerTools(url, headers)
      );
      
      this.logger.log("[McpServerEditDialog] Test completed successfully:", response);
      
      // Formatta il JSON in modo leggibile
      this.formattedJsonResponse = JSON.stringify(response, null, 2);
      
      // Mostra l'overlay con il JSON
      this.showJsonOverlay = true;
      
      // Mostra successo
      this.showError = false;
      this.errorMessage = '';
      
    } catch (error) {
      this.logger.error("[McpServerEditDialog] Error during test:", error);
      this.showError = true;
      
      if (error?.error?.message) {
        this.errorMessage = error.error.message;
      } else if (error?.message) {
        this.errorMessage = error.message;
      } else {
        this.errorMessage = "An error occurred while testing the server connection.";
      }
    }
  }

  async onSave(): Promise<void> {
    if (!this.isFormValid()) {
      this.logger.warn("[McpServerEditDialog] Form is not valid");
      return;
    }

    if (this.isSaving) {
      return; // Prevent double submission
    }

    // Reset error state
    this.showError = false;
    this.errorMessage = '';
    this.isSaving = true;
    this.showLoader = false;
    this.logger.log("[McpServerEditDialog] Saving server:", this.editedServer);
    
    // Set a timer to show loader after 500ms if still saving
    const loaderTimer = setTimeout(() => {
      if (this.isSaving) {
        this.showLoader = true;
      }
    }, 500);

    try {
      if (this.isNewServer) {
        // Check if server name already exists
        const nameExists = this.allMcpServers.some(s => s.name === this.editedServer.name);
        if (nameExists) {
          this.logger.warn("[McpServerEditDialog] Server name already exists");
          this.errorMessage = "A server with this name already exists";
          this.showError = true;
          this.isSaving = false;
          clearTimeout(loaderTimer);
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
        this.mcpService.saveMcpIntegration(this.project_id, mcpIntegration)
      );
      
      this.logger.log("[McpServerEditDialog] Integration saved successfully:", response);
      
      // Clear the loader timer and hide states
      clearTimeout(loaderTimer);
      this.isSaving = false;
      this.showLoader = false;
      
      // Close with the edited data
      this.dialogRef.close(this.editedServer);
    } catch (error) {
      this.logger.error("[McpServerEditDialog] Error saving integration:", error);
      clearTimeout(loaderTimer);
      this.isSaving = false;
      this.showLoader = false;
      
      // Show error message to user
      this.showError = true;
      
      // Extract error message with different fallback strategies
      if (error?.error?.message) {
        this.errorMessage = error.error.message;
      } else if (error?.message) {
        this.errorMessage = error.message;
      } else if (error?.error?.error) {
        this.errorMessage = error.error.error;
      } else if (typeof error === 'string') {
        this.errorMessage = error;
      } else {
        this.errorMessage = "An error occurred while saving the server. Please try again.";
      }
      
      this.logger.log("[McpServerEditDialog] Error message displayed:", this.errorMessage);
    }
  }

}

