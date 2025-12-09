import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';

export interface McpServer {
  name: string;
  url: string;
  transport: string;
  headers: any[];
}

export interface McpIntegration {
  id_project: string;
  name: string;
  value: {
    servers: McpServer[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class McpService {

  public SERVER_BASE_URL: string;
  private tiledeskToken: string;
  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private http: HttpClient,
    private appStorageService: AppStorageService
  ) {
  }

  /**
   * Initialize the service with server base URL
   * @param serverBaseUrl Base URL of the server
   */
  initialize(serverBaseUrl: string): void {
    this.logger.log('[MCP-SERVICE] - initialize serverBaseUrl', serverBaseUrl);
    this.SERVER_BASE_URL = serverBaseUrl;
    this.tiledeskToken = this.appStorageService.getItem('tiledeskToken');
  }

  /**
   * Get HTTP options with headers
   */
  private getHttpOptions(): { headers: HttpHeaders } {
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };
  }

  // ----------------------------------------------------------
  // Load MCP Servers
  // ----------------------------------------------------------

  /**
   * Load all MCP servers for a project
   * @param project_id Project ID
   * @returns Observable with MCP integration containing servers array
   */
  loadMcpServers(project_id: string): Observable<McpIntegration> {
    this.logger.log('[MCP-SERVICE] - Loading MCP servers for project:', project_id);
    const url = this.SERVER_BASE_URL + project_id + '/integration/name/mcp';
    this.logger.debug('[MCP-SERVICE] - Load MCP servers URL:', url);
    return this.http.get<McpIntegration>(url, this.getHttpOptions());
  }

  /**
   * Load all integrations and filter for MCP
   * @param project_id Project ID
   * @returns Observable with all integrations
   */
  loadIntegrations(project_id: string): Observable<any[]> {
    this.logger.log('[MCP-SERVICE] - Loading all integrations for project:', project_id);
    const url = this.SERVER_BASE_URL + project_id + '/integration/';
    this.logger.debug('[MCP-SERVICE] - Load integrations URL:', url);
    return this.http.get<any[]>(url, this.getHttpOptions());
  }

  // ----------------------------------------------------------
  // Create MCP Server
  // ----------------------------------------------------------

  /**
   * Create a new MCP server
   * @param project_id Project ID
   * @param server MCP server to create
   * @returns Observable with the created integration
   */
  createMcpServer(project_id: string, server: McpServer): Observable<any> {
    this.logger.log('[MCP-SERVICE] - Creating MCP server:', server);
    
    // First, load existing servers
    return new Observable(observer => {
      this.loadMcpServers(project_id).subscribe({
        next: (integration) => {
          // Add new server to existing servers
          const servers = integration?.value?.servers || [];
          servers.push(server);
          
          const mcpIntegration: McpIntegration = {
            id_project: project_id,
            name: 'mcp',
            value: {
              servers: servers
            }
          };
          
          this.saveMcpIntegration(project_id, mcpIntegration).subscribe({
            next: (result) => {
              this.logger.log('[MCP-SERVICE] - MCP server created successfully');
              observer.next(result);
              observer.complete();
            },
            error: (error) => {
              this.logger.error('[MCP-SERVICE] - Error creating MCP server:', error);
              observer.error(error);
            }
          });
        },
        error: (error) => {
          // If integration doesn't exist, create new one
          if (error.status === 404) {
            const mcpIntegration: McpIntegration = {
              id_project: project_id,
              name: 'mcp',
              value: {
                servers: [server]
              }
            };
            
            this.saveMcpIntegration(project_id, mcpIntegration).subscribe({
              next: (result) => {
                this.logger.log('[MCP-SERVICE] - MCP server created successfully (new integration)');
                observer.next(result);
                observer.complete();
              },
              error: (err) => {
                this.logger.error('[MCP-SERVICE] - Error creating MCP server:', err);
                observer.error(err);
              }
            });
          } else {
            this.logger.error('[MCP-SERVICE] - Error loading MCP servers:', error);
            observer.error(error);
          }
        }
      });
    });
  }

  // ----------------------------------------------------------
  // Update MCP Server
  // ----------------------------------------------------------

  /**
   * Update an existing MCP server
   * @param project_id Project ID
   * @param originalServerName Original name of the server (for identification)
   * @param updatedServer Updated MCP server
   * @returns Observable with the updated integration
   */
  updateMcpServer(project_id: string, originalServerName: string, updatedServer: McpServer): Observable<any> {
    this.logger.log('[MCP-SERVICE] - Updating MCP server:', originalServerName, 'to', updatedServer);
    
    return new Observable(observer => {
      this.loadMcpServers(project_id).subscribe({
        next: (integration) => {
          const servers = integration?.value?.servers || [];
          const serverIndex = servers.findIndex(s => s.name === originalServerName);
          
          if (serverIndex > -1) {
            servers[serverIndex] = updatedServer;
            
            const mcpIntegration: McpIntegration = {
              id_project: project_id,
              name: 'mcp',
              value: {
                servers: servers
              }
            };
            
            this.saveMcpIntegration(project_id, mcpIntegration).subscribe({
              next: (result) => {
                this.logger.log('[MCP-SERVICE] - MCP server updated successfully');
                observer.next(result);
                observer.complete();
              },
              error: (error) => {
                this.logger.error('[MCP-SERVICE] - Error updating MCP server:', error);
                observer.error(error);
              }
            });
          } else {
            const error = new Error('Server not found');
            this.logger.error('[MCP-SERVICE] - Server not found:', originalServerName);
            observer.error(error);
          }
        },
        error: (error) => {
          this.logger.error('[MCP-SERVICE] - Error loading MCP servers for update:', error);
          observer.error(error);
        }
      });
    });
  }

  // ----------------------------------------------------------
  // Delete MCP Server
  // ----------------------------------------------------------

  /**
   * Delete an MCP server
   * @param project_id Project ID
   * @param serverName Name of the server to delete
   * @returns Observable with the updated integration
   */
  deleteMcpServer(project_id: string, serverName: string): Observable<any> {
    this.logger.log('[MCP-SERVICE] - Deleting MCP server:', serverName);
    
    return new Observable(observer => {
      this.loadMcpServers(project_id).subscribe({
        next: (integration) => {
          const servers = integration?.value?.servers || [];
          const filteredServers = servers.filter(s => s.name !== serverName);
          
          if (servers.length === filteredServers.length) {
            const error = new Error('Server not found');
            this.logger.error('[MCP-SERVICE] - Server not found for deletion:', serverName);
            observer.error(error);
            return;
          }
          
          const mcpIntegration: McpIntegration = {
            id_project: project_id,
            name: 'mcp',
            value: {
              servers: filteredServers
            }
          };
          
          this.saveMcpIntegration(project_id, mcpIntegration).subscribe({
            next: (result) => {
              this.logger.log('[MCP-SERVICE] - MCP server deleted successfully');
              observer.next(result);
              observer.complete();
            },
            error: (error) => {
              this.logger.error('[MCP-SERVICE] - Error deleting MCP server:', error);
              observer.error(error);
            }
          });
        },
        error: (error) => {
          this.logger.error('[MCP-SERVICE] - Error loading MCP servers for deletion:', error);
          observer.error(error);
        }
      });
    });
  }

  // ----------------------------------------------------------
  // Save MCP Integration
  // ----------------------------------------------------------

  /**
   * Save/Update MCP integration (all servers)
   * @param project_id Project ID
   * @param integration MCP integration object
   * @returns Observable with the saved integration
   */
  saveMcpIntegration(project_id: string, integration: McpIntegration): Observable<any> {
    this.logger.log('[MCP-SERVICE] - Saving MCP integration:', integration);
    const url = this.SERVER_BASE_URL + project_id + '/integration/';
    this.logger.debug('[MCP-SERVICE] - Save integration URL:', url);
    return this.http.post(url, integration, this.getHttpOptions());
  }

  // ----------------------------------------------------------
  // Load MCP Server Tools
  // ----------------------------------------------------------

  /**
   * Load tools from an MCP server
   * Esegue una chiamata POST al server MCP per ottenere la lista dei tools disponibili
   * @param url URL del server MCP
   * @param headers Optional headers object from the MCP server configuration
   * @returns Observable che emette la risposta JSON con i tools
   */
  loadMcpServerTools(url: string, headers?: any): Observable<any> {
    this.logger.log('[MCP-SERVICE] - Loading tools from MCP server:', url);
    this.logger.debug('[MCP-SERVICE] - Headers provided:', headers);
    
    // Build HTTP headers for the request
    let httpHeaders = new HttpHeaders();
    
    // Set default headers
    httpHeaders = httpHeaders.set('Accept', 'application/json, text/event-stream');
    httpHeaders = httpHeaders.set('Content-Type', 'application/json');
    
    // Add custom headers from the MCP server configuration
    if (headers && typeof headers === 'object') {
      Object.keys(headers).forEach(key => {
        const value = headers[key];
        if (value && typeof value === 'string') {
          httpHeaders = httpHeaders.set(key, value);
          this.logger.debug(`[MCP-SERVICE] - Added header: ${key} = ${value}`);
        }
      });
    }
    
    // Build request body
    const requestBody = {
      jsonrpc: '2.0',
      method: 'tools/list',
      params: {},
      id: 2
    };
    
    this.logger.debug('[MCP-SERVICE] - Request body:', requestBody);
    this.logger.debug('[MCP-SERVICE] - Request headers:', httpHeaders.keys());
    
    // Make the POST request
    return this.http.post<any>(url, requestBody, { headers: httpHeaders });
  }

  // ----------------------------------------------------------
  // Test MCP Server Connection
  // ----------------------------------------------------------

  /**
   * Test connection to an MCP server
   * Alias for loadMcpServerTools for backward compatibility
   * @param url URL del server MCP da testare
   * @param headers Optional headers from the MCP server configuration
   * @returns Observable che emette la risposta JSON con i tools
   */
  testMcpServerConnection(url: string, headers?: any): Observable<any> {
    return this.loadMcpServerTools(url, headers);
  }
}

