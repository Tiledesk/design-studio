import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { map } from 'rxjs/operators';

// Logger
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { Project } from '../models/project-model';
import { Observable } from 'rxjs';
import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';
import { UserModel } from 'src/chat21-core/models/user';
import { ProjectUser } from '../models/project-user';


@Injectable({
  providedIn: 'root'
})
export class ProjectService {

  private project: Project
  private projects: Project[];

  // private persistence: string;
  public SERVER_BASE_URL: string;

  // private
  private URL_TILEDESK_PROJECTS: string;
  private tiledeskToken: string;

  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    public http: HttpClient,
    public appStorageService: AppStorageService
  ) {
  }

  initialize(serverBaseUrl: string) {
    this.logger.log('[TILEDESK-PROJECTS-SERV] - initialize serverBaseUrl', serverBaseUrl);
    this.SERVER_BASE_URL = serverBaseUrl;
    this.URL_TILEDESK_PROJECTS = this.SERVER_BASE_URL + 'projects/';
    this.tiledeskToken = this.appStorageService.getItem('tiledeskToken')
  }

  /**
   * MCP Tools discovery for a specific MCP server endpoint.
   *
   * API:
   * POST /api/{id_project}/mcp/tools
   * Body: { url: "<server_url>" }
   *
   * NOTE: we build the URL following the same pattern used by other project-scoped endpoints:
   * SERVER_BASE_URL + project_id + '/mcp/tools'
   */
  public getMcpTools(project_id: string, server_url: string): Observable<any> {
    const url = this.SERVER_BASE_URL + project_id + '/mcp/tools';
    this.logger.log('[TILEDESK-SERVICE] - GET MCP TOOLS (DISCOVERY) - URL', url);

    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: this.tiledeskToken
      })
    };

    const body = { url: server_url };
    return this.http.post(url, body, httpOptions).pipe(map((res: any) => {
      this.logger.log('[TILEDESK-SERVICE] - GET MCP TOOLS (DISCOVERY) - RES ', res);
      return res;
    }));
  }


  getCurrentProject(): Project {
    return this.project
  }

  setCurrentProject(project: Project){
    this.project = project
  }

  public getProjects(token: string): Observable<Project[]> {
    const url = this.SERVER_BASE_URL + 'projects/';
    this.logger.log('[TILEDESK-SERVICE] - GET PROJECTS URL', url);

    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: token
      })
    };

    return this.http.get(url, httpOptions).pipe(map((projects: Project[]) => {
      this.logger.log('[TILEDESK-SERVICE] GET PROJECTS - RES ', projects);
      this.projects = projects
      return projects
    }))
  }


  public getProjectById(id: string): Observable<Project> {
    const url = this.SERVER_BASE_URL + 'projects/' + id;
    this.logger.log('[TILEDESK-SERVICE] - GET PROJECT BY ID URL', url);

    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: this.tiledeskToken
      })
    };
    return this.http.get(url, httpOptions).pipe(map((project: Project) => {
      this.logger.log('[TILEDESK-SERVICE] GET PROJECT BY ID URL - RES ', project);
      this.project = project
      return project
    }))
  }


  public getProjectUsersByProjectId(project_id: string) {
    const url = this.SERVER_BASE_URL + project_id + '/project_users/';
    this.logger.log('[TILEDESK-SERVICE] - GET PROJECT-USER URL', url);
    
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: this.tiledeskToken
      })
    };
    return this.http.get(url, httpOptions).pipe(map((res: any) => {
      this.logger.log('[TILEDESK-SERVICE] - GET PROJECT-USER RES ', res);
      return res
    }))
  }

  public getProjectUserByUserId(project_id: string, user_id: string): Observable<ProjectUser> {
    const url = this.SERVER_BASE_URL + project_id + '/project_users/' + 'users/' + user_id;
    this.logger.log('[TILEDESK-SERVICE] - GET PROJECT-USER BY USER-ID - URL', url);

    const httpOptions = {
      headers: new HttpHeaders({
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };

    return this.http.get<ProjectUser[]>(url, httpOptions).pipe(map((res: any) => {
      this.logger.log('[TILEDESK-SERVICE] - GET PROJECT-USER RES ', res);
      if ((res) && (res.length !== 0)) {
        return res[0]
      }
    }))
  }


  public getAllLeadsActiveWithLimit(project_id: string, limit: number) {
    const url = this.SERVER_BASE_URL + project_id + '/leads?limit=' + limit + '&with_fullname=true';
    this.logger.log('[TILEDESK-SERVICE] - GET ALL ACTIVE LEADS (LIMIT 10000) -  URL', url);
    
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: this.tiledeskToken
      })
    };
    return this.http.get(url, httpOptions).pipe(map((res: any) => {
      this.logger.log('[TILEDESK-SERVICE] - GET ALL ACTIVE LEADS (LIMIT 10000) ', res);
      return res
    }))
  }


  // ---------------------------------------------
  // @ Create new project user to get new lead ID
  // ---------------------------------------------
  public createNewProjectUserToGetNewLeadID(project_id: string) {
    const url = this.SERVER_BASE_URL + project_id + '/project_users/'
    this.logger.log('[TILEDESK-SERVICE] - CREATE NEW PROJECT USER TO GET NEW LEAD ID url ', url);
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: this.tiledeskToken
      })
    };
    const body = {};
    return this.http.post(url, body, httpOptions).pipe(map((res: any) => {
        this.logger.log('[TILEDESK-SERVICE] - CREATE NEW PROJECT USER TO GET NEW LEAD ID url ', res);
        return res
      }))
  }

  // ---------------------------------------------
  // @ Create new lead 
  // ---------------------------------------------
  public createNewLead(leadid: string, fullname: string, leademail: string, project_id: string) {
    const url = this.SERVER_BASE_URL + project_id + '/leads/'
    this.logger.log('[TILEDESK-SERVICE] - CREATE NEW LEAD url ', url);
   
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: this.tiledeskToken
      })
    };

    const body = { 'lead_id': leadid, 'fullname': fullname, 'email': leademail };
    this.logger.log('[TILEDESK-SERVICE] - CREATE NEW LEAD ', body);

    return this.http.post(url, body, httpOptions).pipe(map((res: any) => {
      this.logger.log('[TILEDESK-SERVICE] - CREATE NEW LEAD RES ', res);
      return res
    }))
  }

  // -------------------------------------------------------------------------------------
  // @ Get all bots of the project (with all=true the response return also the identity bot) 
  // -------------------------------------------------------------------------------------
  public getAllBotByProjectId(project_id: string) {
   
    const url = this.SERVER_BASE_URL + project_id + '/faq_kb?all=true'
    this.logger.log('[TILEDESK-SERVICE] - GET ALL BOTS BY PROJECT ID - URL', url);

    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: this.tiledeskToken
      })
    };

    return this.http.get(url, httpOptions).pipe(map((res: any) => {
      this.logger.log('[TILEDESK-SERVICE] - GET ALL BOTS BY PROJECT ID - RES ', res);
      return res
    }))
  }

  // -------------------------------------------------------------------------------------
  // @ Get all DEPTS of the project
  // -------------------------------------------------------------------------------------
  public getDeptsByProjectId(project_id: string) {
   
    const url = this.SERVER_BASE_URL + project_id + '/departments/allstatus';
    this.logger.log('[TILEDESK-SERVICE] - GET DEPTS (ALL STATUS) - URL', url);
   
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: this.tiledeskToken
      })
    };

    return this.http.get(url, httpOptions).pipe(map((res: any) => {
      this.logger.log('[TILEDESK-SERVICE] - GET DEPTS (ALL STATUS) - RES ', res);
      return res
    }))
  }  


  // ----------------------------------------------------------
  // Get integration by projectId and integration name
  // ----------------------------------------------------------
  getIntegrationByName(project_id: string, name: string): Observable<any> {
    const url = this.SERVER_BASE_URL + project_id + '/integration/name/' + name;
    this.logger.log('[TILEDESK-SERVICE] - GET INTEGRATION - URL', url);
    const httpOptions = {
      headers: new HttpHeaders({
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        Authorization: this.tiledeskToken
      })
    };
    return this.http.get(url, httpOptions);
  }


   getIntegrations(project_id: string): Observable<any> {
    const url = this.SERVER_BASE_URL + project_id + '/integration';
    this.logger.log('[TILEDESK-SERVICE] - GET INTEGRATION - URL', url);
    const httpOptions = {
      headers: new HttpHeaders({
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        Authorization: this.tiledeskToken
      })
    };
    return this.http.get(url, httpOptions);
   }

   // ----------------------------------------------------------
   // Save/Update MCP Server in integration
   // ----------------------------------------------------------

   saveIntegration(project_id: string, integration:any) {
    this.logger.log('[TILEDESK-SERVICE] - UPDATE MCP SERVER', integration);
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    }
    const url = this.SERVER_BASE_URL + project_id + "/integration/";
    this.logger.debug('[TILEDESK-SERVICE] - save integration URL: ', url);
    return this.http.post(url, integration, httpOptions);
  }

  //  updateMcpServer(project_id: string, mcpServer: { name: string, url: string, transport: string }): Observable<any> {
  //   this.logger.log('[TILEDESK-SERVICE] - UPDATE MCP SERVER', mcpServer);
  //   const httpOptions = {
  //     headers: new HttpHeaders({
  //       'Content-Type': 'application/json',
  //       'Authorization': this.tiledeskToken
  //     })
  //   };

  //   const url = this.SERVER_BASE_URL + project_id + "/integration";
  //   this.logger.log('[TILEDESK-SERVICE] - UPDATE MCP SERVER - URL: ', url);

  //   return this.http.put(url, mcpServer, httpOptions);
  // }

   


}
