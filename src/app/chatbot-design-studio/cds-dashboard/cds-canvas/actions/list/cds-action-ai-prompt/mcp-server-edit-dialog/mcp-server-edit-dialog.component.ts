import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { ProjectService } from 'src/app/services/projects.service';
import { DashboardService } from 'src/app/services/dashboard.service';
import { firstValueFrom } from 'rxjs';

interface McpTool {
  name: string;
  title?: string;
  description?: string;
}

interface McpServer {
  name: string;
  url: string;
  transport: string;
  /** Available tools (from Connect / integrations). Persisted on Save. */
  tools?: McpTool[];
  /** Selected tools for this server. Persisted in integration so selection is kept even when server is not selected. */
  selectedTools?: Array<{ name: string }>;
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
  showLoader: boolean = false;
  allMcpServers: McpServer[] = [];
  isNewServer: boolean = false;
  errorMessage: string = '';
  showError: boolean = false;

  // --- Tools selection (per-server, per-action) ---
  availableTools: McpTool[] = [];
  private selectedToolNames: Set<string> = new Set();
  isToolsModalOpen: boolean = false;

  // --- Tools discovery state (Connect -> fetch tools, Save -> persist integration) ---
  isLoadingTools: boolean = false;
  /**
   * When true, tools have been successfully retrieved (or already exist on the server object).
   * Save must stay hidden/disabled until this becomes true.
   */
  toolsLoaded: boolean = false;

  /**
   * EDIT MODE UX RULE:
   * - Save is always visible but disabled until the user makes changes (dirty)
   * - If URL is modified, Save must be hidden and Connect shown
   * - After a successful Connect, Save becomes visible again
   */
  urlChangedSinceLastConnect: boolean = false;

  private originalSnapshot: { name: string; url: string; transport: string } | null = null;
  private originalSelectedToolsSnapshot: Set<string> = new Set();
  /** Snapshot of available tool names when dialog opened (or after first load). Used to detect changes after Refresh. */
  private originalAvailableToolNames: Set<string> = new Set();
  /** True when Refresh returned a different list of tools than the original, so Save should be enabled. */
  private availableToolsChangedAfterRefresh: boolean = false;
  private lastUrlBlurValue: string = '';
  
  private logger: LoggerService = LoggerInstance.getInstance();
  
  constructor(
    public dialogRef: MatDialogRef<McpServerEditDialogComponent>,
    private projectService: ProjectService,
    private dashboardService: DashboardService,
    @Inject(MAT_DIALOG_DATA) public data: { 
      server?: McpServer;
      allServers: McpServer[];
      isNew?: boolean;
      /**
       * Selected tools for THIS server in the action config (only {name} is allowed).
       * Used to keep state when reopening the dialog.
       */
      selectedTools?: Array<{ name: string }>;
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
      this.originalSnapshot = {
        name: this.data.server?.name || '',
        url: this.data.server?.url || '',
        transport: this.data.server?.transport || ''
      };
    }
    
    // Store all servers
    this.allMcpServers = [...this.data.allServers];
    // Get project ID
    this.project_id = this.dashboardService.projectID;

    // Tools: initialize selection and load available tools for the selected server
    this.selectedToolNames = new Set((this.data.selectedTools || []).map(t => t?.name).filter(Boolean) as string[]);
    this.originalSelectedToolsSnapshot = new Set(Array.from(this.selectedToolNames));
    this.refreshAvailableTools();
    this.toolsLoaded = Array.isArray(this.availableTools) && this.availableTools.length > 0;
    this.originalAvailableToolNames = new Set((this.availableTools || []).map(t => t.name));
    this.urlChangedSinceLastConnect = false;
    this.lastUrlBlurValue = (this.editedServer?.url || '').trim();

    this.logger.log("[McpServerEditDialog] toolsLoaded:", this.toolsLoaded);
  }

  onCloseDialog(): void {
    this.logger.log("[McpServerEditDialog] - modal CLOSED");
    this.dialogRef.close(false);
  }

  onChangeField(value: string, field: 'name' | 'url' | 'transport'): void {
    // Guard: some inputs can emit "change" also during initialization with the same value.
    // We must avoid triggering state transitions (especially URL -> Connect) if nothing really changed.
    const prevValue = this.editedServer[field];
    if (prevValue === value) {
      return;
    }

    this.editedServer[field] = value;
    this.logger.debug(`[McpServerEditDialog] Changed ${field}:`, value);
    if (field === 'name') {
      // If the user renames the server, the available tools could change (depending on integrations).
      // Keep this as a safe refresh: tools are optional anyway.
      this.refreshAvailableTools();
    }
  }

  /**
   * URL verification must happen on blur (not on change).
   * If the URL really changed, we reset tools and show Connect (edit mode).
   */
  onUrlBlur(): void {
    const current = (this.editedServer?.url || '').trim();
    if (current === this.lastUrlBlurValue) {
      return;
    }
    this.lastUrlBlurValue = current;

    // Reset tool selection + loaded tools only when URL changed.
    this.selectedToolNames.clear();
    this.isToolsModalOpen = false;
    this.toolsLoaded = false;
    this.availableTools = [];
    this.editedServer.tools = [];

    // In edit mode, show Connect only if URL differs from original.
    // In add mode, Connect is the discovery step.
    this.urlChangedSinceLastConnect = this.isNewServer ? true : (current !== ((this.originalSnapshot?.url || '').trim()));
  }

  private refreshAvailableTools(): void {
    // Prefer tools from the server currently being edited (after Connect/Refresh).
    if (Array.isArray(this.editedServer?.tools)) {
      this.availableTools = this.editedServer.tools;
    } else {
      const serverName = this.isNewServer ? this.editedServer?.name : this.originalServer?.name;
      if (!serverName) {
        this.availableTools = [];
        return;
      }
      const found = this.allMcpServers.find(s => s.name === serverName);
      this.availableTools = Array.isArray(found?.tools) ? found.tools : [];
    }

    // Keep selection consistent: drop selected tools that are no longer available (avoid stale names).
    if (this.availableTools.length > 0) {
      const availableNames = new Set(this.availableTools.map(t => t.name));
      for (const name of Array.from(this.selectedToolNames)) {
        if (!availableNames.has(name)) {
          this.selectedToolNames.delete(name);
        }
      }
    }
  }

  get totalToolsCount(): number {
    return this.availableTools?.length || 0;
  }

  get selectedToolsCount(): number {
    return this.selectedToolNames.size;
  }

  isToolSelected(name: string): boolean {
    return this.selectedToolNames.has(name);
  }

  onToggleTool(name: string, checked: boolean): void {
    if (!name) return;
    if (checked) {
      this.selectedToolNames.add(name);
    } else {
      this.selectedToolNames.delete(name);
    }
  }

  private areSetsEqual(a: Set<string>, b: Set<string>): boolean {
    if (a.size !== b.size) return false;
    for (const v of a) {
      if (!b.has(v)) return false;
    }
    return true;
  }

  /**
   * Dirty state (edit mode):
   * Save becomes enabled if the user changed name/transport, selected tools, or if Refresh returned a different tool list.
   * NOTE: URL changes are handled separately (Save hidden -> Connect) and do NOT enable Save by themselves.
   */
  get isDirty(): boolean {
    if (this.isNewServer) {
      // In create mode, "dirty" is not used to gate Save; Connect gates it.
      return false;
    }
    const snap = this.originalSnapshot;
    if (!snap) return false;

    const nameChanged = (this.editedServer?.name || '') !== snap.name;
    const transportChanged = (this.editedServer?.transport || '') !== snap.transport;
    const toolsSelectionChanged = !this.areSetsEqual(this.selectedToolNames, this.originalSelectedToolsSnapshot);
    return nameChanged || transportChanged || toolsSelectionChanged || this.availableToolsChangedAfterRefresh;
  }

  get showConnectButton(): boolean {
    // In Edit: connect ONLY when URL has been modified.
    // In Add: connect is the discovery step.
    return this.isNewServer ? true : this.urlChangedSinceLastConnect;
  }

  get showSaveButton(): boolean {
    // In Add: Save is shown only after tools are loaded via Connect.
    if (this.isNewServer) return this.toolsLoaded;
    // In Edit: Save is visible except when URL has been modified (then Connect must happen first).
    return !this.urlChangedSinceLastConnect;
  }

  get isSaveDisabled(): boolean {
    if (this.isSaving || this.isLoadingTools) return true;
    if (!this.isFormValid()) return true;
    if (!this.toolsLoaded) return true;
    if (this.isNewServer) return false; // create: connect gates, not dirty
    return !this.isDirty;
  }

  openToolsModal(): void {
    this.isToolsModalOpen = true;
  }

  closeToolsModal(): void {
    this.isToolsModalOpen = false;
  }

  get connectButtonLabelKey(): string {
    return this.toolsLoaded ? 'CDSCanvas.RefreshTools' : 'CDSCanvas.Connect';
  }

  async onConnect(): Promise<void> {
    if (!this.isFormValid()) {
      this.showError = true;
      this.errorMessage = "Please fill Name and URL before connecting.";
      return;
    }
    if (this.isLoadingTools) return;

    this.showError = false;
    this.errorMessage = '';
    this.isLoadingTools = true;
    this.toolsLoaded = false;
    this.isToolsModalOpen = false;

    try {
      const res = await firstValueFrom(this.projectService.getMcpTools(this.project_id, this.editedServer.url));
      const rawTools = Array.isArray(res) ? res : (Array.isArray(res?.tools) ? res.tools : []);

      const tools: McpTool[] = (rawTools || [])
        .filter((t: any) => t && typeof t.name === 'string' && t.name.trim().length > 0)
        .map((t: any) => ({
          name: String(t.name),
          title: t.title ? String(t.title) : undefined,
          description: t.description ? String(t.description) : undefined
        }));

      if (!tools || tools.length === 0) {
        this.showError = true;
        this.errorMessage = "No tools returned by the server.";
        this.isLoadingTools = false;
        return;
      }

      /**
       * Requirement: persist tools on the MCP server object (in-memory now, persisted on Save).
       * Also keep selection consistent if refreshing: keep only still-available tools selected.
       */
      this.editedServer.tools = tools;
      this.refreshAvailableTools();
      this.toolsLoaded = true;
      this.urlChangedSinceLastConnect = false;
      this.lastUrlBlurValue = (this.editedServer?.url || '').trim();

      // If the list of available tools changed after Refresh, enable Save so user can persist it.
      const newToolNames = new Set(this.availableTools.map(t => t.name));
      this.availableToolsChangedAfterRefresh = !this.areSetsEqual(newToolNames, this.originalAvailableToolNames);

      // Ensure selected tools are subset of available tools (refresh scenario).
      const availableNames = new Set(this.availableTools.map(t => t.name));
      for (const name of Array.from(this.selectedToolNames)) {
        if (!availableNames.has(name)) {
          this.selectedToolNames.delete(name);
        }
      }
    } catch (error) {
      this.logger.error("[McpServerEditDialog] Error fetching MCP tools:", error);
      this.showError = true;
      this.errorMessage = "Error while loading tools. Please check the URL and try again.";
    } finally {
      this.isLoadingTools = false;
    }
  }

  private buildSelectedToolsPayload(): Array<{ name: string }> {
    // Save ONLY {name}. No duplicates thanks to Set.
    return Array.from(this.selectedToolNames)
      .filter(Boolean)
      .map(name => ({ name }));
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
        // Add new server to the array (include tools + selectedTools for persistence)
        this.allMcpServers.push({
          ...this.editedServer,
          tools: this.editedServer.tools,
          selectedTools: this.buildSelectedToolsPayload()
        });
      } else {
        // Find and update the server in the array (include tools + selectedTools for persistence)
        const serverIndex = this.allMcpServers.findIndex(s => s.name === this.originalServer.name);
        if (serverIndex > -1) {
          this.allMcpServers[serverIndex] = {
            ...this.editedServer,
            tools: this.editedServer.tools,
            selectedTools: this.buildSelectedToolsPayload()
          };
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
      
      // Clear the loader timer and hide states
      clearTimeout(loaderTimer);
      this.isSaving = false;
      this.showLoader = false;
      
      // Close with the edited data (server includes tools + selectedTools so list dialog can show and persist them)
      const selectedToolsPayload = this.buildSelectedToolsPayload();
      this.dialogRef.close({
        server: {
          ...this.editedServer,
          tools: this.editedServer.tools,
          selectedTools: selectedToolsPayload
        },
        selectedTools: selectedToolsPayload
      });
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

