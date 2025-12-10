import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
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
   * Segue rigorosamente lo standard del protocollo MCP (Model Context Protocol)
   * @param url URL del server MCP
   * @param headers Optional headers object from the MCP server configuration
   * @param server Optional complete MCP server object (for full protocol compliance)
   * @returns Observable che emette la risposta JSON con i tools
   */
  loadMcpServerTools(url: string, headers?: any, server?: McpServer): Observable<any> {
    this.logger.log('[MCP-SERVICE] - Loading tools from MCP server:', url);
    this.logger.debug('[MCP-SERVICE] - Headers provided:', headers);
    this.logger.debug('[MCP-SERVICE] - Server object provided:', server);
    
    // Build HTTP headers for the request according to MCP protocol standard
    let httpHeaders = new HttpHeaders();
    
    // Set required headers according to MCP protocol
    httpHeaders = httpHeaders.set('Accept', 'application/json, text/event-stream');
    httpHeaders = httpHeaders.set('Content-Type', 'application/json');
    
    // Add Authorization header if present in server configuration
    // According to MCP standard, authorization_token can be provided
    if (server && server.headers) {
      // Process headers array if it's an array format
      if (Array.isArray(server.headers)) {
        server.headers.forEach((header: any) => {
          if (header && typeof header === 'object' && header.key && header.value) {
            const key = header.key;
            const value = header.value;
            if (typeof key === 'string' && typeof value === 'string') {
              httpHeaders = httpHeaders.set(key, value);
              this.logger.debug(`[MCP-SERVICE] - Added header from array: ${key} = ${value}`);
            }
          } else if (typeof header === 'string') {
            // Handle string format headers if needed
            const parts = header.split(':');
            if (parts.length >= 2) {
              const key = parts[0].trim();
              const value = parts.slice(1).join(':').trim();
              httpHeaders = httpHeaders.set(key, value);
              this.logger.debug(`[MCP-SERVICE] - Added header from string: ${key} = ${value}`);
            }
          }
        });
      }
    }
    
    // Add custom headers from the headers parameter (backward compatibility)
    if (headers && typeof headers === 'object') {
      if (Array.isArray(headers)) {
        // Handle array format
        headers.forEach((header: any) => {
          if (header && typeof header === 'object' && header.key && header.value) {
            const key = header.key;
            const value = header.value;
            if (typeof key === 'string' && typeof value === 'string') {
              httpHeaders = httpHeaders.set(key, value);
              this.logger.debug(`[MCP-SERVICE] - Added header from array param: ${key} = ${value}`);
            }
          }
        });
      } else {
        // Handle object format
        Object.keys(headers).forEach(key => {
          const value = headers[key];
          if (value && typeof value === 'string') {
            httpHeaders = httpHeaders.set(key, value);
            this.logger.debug(`[MCP-SERVICE] - Added header: ${key} = ${value}`);
          }
        });
      }
    }
    
    // Build request body according to MCP JSON-RPC 2.0 protocol standard
    // The tools/list method requires all necessary parameters
    const requestBody: any = {
      jsonrpc: '2.0',
      method: 'tools/list',
      params: {},
      id: this.generateRequestId()
    };
    
    // Include server name in params if available (MCP protocol standard)
    if (server && server.name) {
      requestBody.params = {
        ...requestBody.params,
        name: server.name
      };
    }
    
    // Include transport type in params if available and relevant
    if (server && server.transport) {
      requestBody.params = {
        ...requestBody.params,
        transport: server.transport
      };
    }
    
    this.logger.debug('[MCP-SERVICE] - Request body (MCP compliant):', requestBody);
    this.logger.debug('[MCP-SERVICE] - Request headers:', httpHeaders.keys());
    this.logger.debug('[MCP-SERVICE] - Full request URL:', url);
    
    // Make the POST request according to MCP protocol
    return this.http.post<any>(url, requestBody, { headers: httpHeaders });
  }

  /**
   * Generate a unique request ID for JSON-RPC requests
   * @returns A unique request ID
   */
  private generateRequestId(): number {
    return Date.now() + Math.floor(Math.random() * 1000);
  }

  // ----------------------------------------------------------
  // Initialize MCP Server
  // ----------------------------------------------------------

  /**
   * Initialize an MCP server connection
   * Implementa rigorosamente lo standard Model Context Protocol (MCP) secondo le specifiche ufficiali
   * 
   * Il processo di inizializzazione MCP segue questa sequenza:
   * 1. Client invia richiesta "initialize" al server
   * 2. Server risponde con le sue capabilities e informazioni
   * 3. Client invia notifica "initialized" per completare l'handshake
   * 
   * @param server MCP server object completo con tutte le informazioni necessarie
   * @param clientInfo Optional client information (name and version). Se non fornito, usa valori di default
   * @returns Observable che emette un oggetto con body e headers della risposta
   */
  initializeMCP(server: McpServer, clientInfo?: { name?: string; version?: string }): Observable<{ body: any; headers: any }> {
    this.logger.log('[MCP-SERVICE] - Starting MCP initialization for server:', server.name || server.url);
    this.logger.log('[MCP-SERVICE] - Server configuration:', server);
    
    // Validazione input
    if (!server || !server.url) {
      const error = new Error('Server URL is required for MCP initialization');
      this.logger.error('[MCP-SERVICE] - Validation error:', error.message);
      return new Observable(observer => {
        observer.error(error);
      });
    }

    // Costruzione degli headers HTTP secondo lo standard MCP
    // MCP richiede Content-Type: application/json e supporta Accept per event-stream
    let httpHeaders = new HttpHeaders();
    httpHeaders = httpHeaders.set('Content-Type', 'application/json');
    httpHeaders = httpHeaders.set('Accept', 'application/json, text/event-stream');

    // Costruzione del body della richiesta secondo lo standard JSON-RPC 2.0 e MCP
    // Lo standard MCP richiede:
    // - jsonrpc: "2.0" (standard JSON-RPC 2.0)
    // - method: "initialize" (metodo MCP per l'inizializzazione)
    // - params: oggetto con protocolVersion, capabilities, clientInfo
    // - id: identificatore univoco della richiesta
    const initializeRequest = {
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        // Protocol version: specifica la versione del protocollo MCP supportata dal client
        // Formato: "YYYY-MM-DD" per versioni datate o "0.1.0" per versioni semantiche
        protocolVersion: '0.1.0',
        
        // Capabilities: dichiara le capacità supportate dal client
        // Oggetto vuoto indica che il client non dichiara capacità specifiche
        // Può contenere: tools, prompts, resources, sampling, etc.
        capabilities: {},
        
        // Client information: identifica il client che effettua la richiesta
        clientInfo: {
          name: clientInfo?.name || 'Design Studio MCP Client',
          version: clientInfo?.version || '1.0.0'
        },
        rootUri: {file:'///'}
      },
      id: this.generateRequestId()
    };
    
    this.logger.debug('[MCP-SERVICE] - Initialize request (MCP compliant):', JSON.stringify(initializeRequest, null, 2));
    this.logger.debug('[MCP-SERVICE] - Request headers:', Array.from(httpHeaders.keys()));
    this.logger.debug('[MCP-SERVICE] - Request URL:', server.url);
    
    // Invio della richiesta HTTP POST secondo lo standard MCP
    // Usa observe: 'response' per ottenere la risposta completa inclusi gli headers
    return this.http.post<any>(server.url, initializeRequest, { 
      headers: httpHeaders,
      observe: 'response'
    }).pipe(
      map((response: HttpResponse<any>) => {
        this.logger.log('[MCP-SERVICE] ========================================== response: ',response);
        // Estrazione di tutti gli headers della risposta
        const responseHeaders: any = {};
        response.headers.keys().forEach(key => {
          responseHeaders[key] = response.headers.get(key);
        });
        
        this.logger.log('[MCP-SERVICE] ==========================================');
        this.logger.log('[MCP-SERVICE] - MCP INITIALIZE RESPONSE RECEIVED');
        this.logger.log('[MCP-SERVICE] ==========================================');
        this.logger.log('[MCP-SERVICE] - Response status:', response.status);
        
        // Stampa completa degli headers della risposta
        this.logger.log('[MCP-SERVICE] - RESPONSE HEADERS:');
        this.logger.log('[MCP-SERVICE]', JSON.stringify(responseHeaders, null, 2));
        Object.keys(responseHeaders).forEach(key => {
          this.logger.log(`[MCP-SERVICE]   ${key}: ${responseHeaders[key]}`);
        });
        
        // Stampa completa del body della risposta
        this.logger.log('[MCP-SERVICE] - RESPONSE BODY:');
        this.logger.log('[MCP-SERVICE]', JSON.stringify(response.body, null, 2));
        
        // Verifica errori nella risposta JSON-RPC
        if (response.body && response.body.error) {
          this.logger.error('[MCP-SERVICE] - MCP initialization error:', response.body.error);
          this.logger.error('[MCP-SERVICE] - Error code:', response.body.error.code);
          this.logger.error('[MCP-SERVICE] - Error message:', response.body.error.message);
        } else {
          this.logger.log('[MCP-SERVICE] - Initialization completed successfully');
        }
        
        this.logger.log('[MCP-SERVICE] ==========================================');
        
        // Restituisce body e headers per permettere al chiamante di processare la risposta
        return {
          body: response.body,
          headers: responseHeaders
        };
      })
    );
  }

  // ----------------------------------------------------------
  // Test MCP Server Connection
  // ----------------------------------------------------------

  /**
   * Test connection to an MCP server
   * Alias for loadMcpServerTools for backward compatibility
   * Segue rigorosamente lo standard del protocollo MCP
   * @param url URL del server MCP da testare
   * @param headers Optional headers from the MCP server configuration
   * @param server Optional complete MCP server object (for full protocol compliance)
   * @returns Observable che emette la risposta JSON con i tools
   */
  testMcpServerConnection(url: string, headers?: any, server?: McpServer): Observable<any> {
    return this.loadMcpServerTools(url, headers, server);
  }
}

