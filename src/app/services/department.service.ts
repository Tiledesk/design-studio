// tslint:disable:max-line-length
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Department } from 'src/app//models/department-model';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { AppConfigService } from './app-config';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';

@Injectable()
export class DepartmentService {

  public myDepts_bs: BehaviorSubject<Department[]> = new BehaviorSubject<Department[]>([]);

  // private persistence: string;
  private SERVER_BASE_URL: string;
  private URL_TILEDESK_DEPARTMENTS: string;

  SERVER_BASE_PATH: string;
  project_id: any;

  private tiledeskToken: string;

  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private httpClient: HttpClient,
    public appStorageService: AppStorageService,
  ) {}


  initialize(serverBaseUrl: string, projectId: string){
    this.SERVER_BASE_URL = serverBaseUrl;
    this.project_id = projectId
    this.URL_TILEDESK_DEPARTMENTS = this.SERVER_BASE_URL + projectId + '/departments/';
    this.logger.info('[DEPTS-SERV] initialize', serverBaseUrl, this.URL_TILEDESK_DEPARTMENTS)
    this.tiledeskToken = this.appStorageService.getItem('tiledeskToken')
  }


  // --------------------------------------------------------------
  // Method used for test
  // GET DEPTS AS THE OLD WIDGET VERSION (USED YET BY SOME PROJECTS)
  // ---------------------------------------------------------------
  public getDeptsAsOldWidget(): Observable<Department[]> {

    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };
    // const url = `http://localhost:3000/app1/departments/`;
    // const url = `http://api.chat21.org/app1/departments/;
    const url = this.URL_TILEDESK_DEPARTMENTS;
    this.logger.log('[DEPTS-SERV] - GET DEPTS AS OLD WIDGET VERSION', url);

    return this.httpClient
      .get<Department[]>(url, httpOptions)
  }

  // ------------------------------------
  // Method used for test
  // GET DEPTS AS THE NEW WIDGET VERSION
  // ------------------------------------
  public getDeptsAsNewWidget(): Observable<Department[]> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };

    const url = this.SERVER_BASE_PATH + this.project_id + '/widgets'
    this.logger.log('[DEPTS-SERV] - GET DEPTS AS THE NEW WIDGET VERSION URL', url);

    return this.httpClient
      .get<Department[]>(url, httpOptions)
  }

  // ------------------------------------
  //  GET VISITOR COUNTER - !!!! NOT USED
  // ------------------------------------
  public getVisitorCounter(): Observable<[any]> {

    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };

    const url = this.SERVER_BASE_PATH + this.project_id + '/visitorcounter'
    this.logger.log('[DEPTS-SERV] - GET DEPTS AS THE NEW WIDGET VERSION URL', url);

    return this.httpClient
      .get<[any]>(url, httpOptions)
  }

  /**
   * GET ALL DEPTS WITH THE CURRENT PROJECT ID AND WITHOUT FILTER FOR STATUS
   * NOTE: THE CALLBACK TO GET THE DEPTS FILTERED FOR STATUS IS RUNNED BY THE WIDGET
   * NOTE: the DSBRD CALL /departments/allstatus  WHILE the WIDGET  CALL /departments
   * 
   * NOTE: chat21-api-node.js READ THE CURRENT PROJECT ID FROM THE URL SO IS NO LONGER NECESSARY TO PASS THE PROJECT ID AS PARAMETER
   */
  public getDeptsByProjectId(): Observable<Department[]> {

    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };

    const url = this.URL_TILEDESK_DEPARTMENTS + 'allstatus';
    this.logger.log('[DEPTS-SERV] GET DEPTS ALL STATUS - DEPTS URL', url);
    return this.httpClient
      .get<Department[]>(url, httpOptions)
  }

  public getDeptsByProjectIdToHookTemplates(projectid): Observable<Department[]> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };

    // const url = this.DEPTS_URL + 'allstatus';
    const url = this.SERVER_BASE_PATH + projectid + '/departments/';
    this.logger.log('[DEPTS-SERV] GET DEPTS ALL STATUS - DEPTS URL', url);
    return this.httpClient
      .get<Department[]>(url, httpOptions)
  }

  public getDeptsByProjectIdToPromise(): any {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };

    const url = this.URL_TILEDESK_DEPARTMENTS + 'allstatus';
    this.logger.log('[DEPTS-SERV] GET DEPTS TO PROMISE - DEPTS URL', url);

    return this.httpClient
      .get(url, httpOptions)
      .pipe(
        map((response) => {
          return response
        })
      )
      .toPromise();
  }

  /**
   * READ DETAIL (GET BOT BY BOT ID)
   * @param id
   */
  public getDeptById(id: string): Observable<Department[]> {

    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };

    let url = this.URL_TILEDESK_DEPARTMENTS + id;
    // url += `${id}`;
    this.logger.log('[DEPTS-SERV] GET DEPT BY ID - URL', url);

    return this.httpClient
      .get<Department[]>(url, httpOptions)
  }


  /**
   * Create a dept
   * @param deptName 
   * @param deptDescription 
   * @param id_bot 
   * @param bot_only 
   * @param id_group 
   * @param routing 
   * @returns 
   */
  public addDept(deptName: string, deptDescription: string, id_bot: string, bot_only: boolean, id_group: string, routing: string) {

    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };

    const url = this.URL_TILEDESK_DEPARTMENTS;

    const body = {
      'name': deptName,
      'description': deptDescription,
      'id_group': id_group,
      'routing': routing,
      'id_project': this.project_id
    };

    if (id_bot) {
      body['id_bot'] = id_bot;
      body['bot_only'] = bot_only;
    } else {
      body['id_bot'] = null;
      body['bot_only'] = null;
    }

    this.logger.log('[DEPTS-SERV] ADD-DEPT BODY ', body);

    return this.httpClient
      .post(url, JSON.stringify(body), httpOptions)
  }

  /**
   * DELETE (DELETE)
   * @param id
   */
  public deleteDeparment(id: string) {

    const url = this.URL_TILEDESK_DEPARTMENTS + id;
    this.logger.log('[DEPTS-SERV] DELETE DEPT URL ', url);

    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };

    return this.httpClient
      .delete(url, httpOptions)
  }

  /**
   * UPDATE (PUT)
   * @param id
   * @param deptName
   */
  public updateDept(id: string, deptName: string, deptDescription: string, id_bot: string, bot_only: boolean, id_group: string, routing: string) {

    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };

    let url = this.URL_TILEDESK_DEPARTMENTS + id;
    // url += id;
    this.logger.log('[DEPTS-SERV] UPDATE DEPT - URL ', url);

    const body = { 'name': deptName, 'description': deptDescription, 'id_group': id_group, 'routing': routing };
    if (id_bot) {
      body['id_bot'] = id_bot;
      body['bot_only'] = bot_only;
    } else {
      body['id_bot'] = null;
      body['bot_only'] = null;
    }

    this.logger.log('[DEPTS-SERV] UPDATE DEPT - BODY ', body);

    return this.httpClient
      .put(url, JSON.stringify(body), httpOptions)
  }


  public updateExistingDeptWithSelectedBot(deptid: string, id_bot: string) {

    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };

    let url = this.URL_TILEDESK_DEPARTMENTS + deptid
    this.logger.log('[DEPTS-SERV] - UPDATE EXISTING DEPT WITH SELECED BOT - URL', url);

    const body = { 'id_bot': id_bot };
    this.logger.log('[DEPTS-SERV] - UPDATE EXISTING DEPT WITH SELECED BOT - BODY', body);

    return this.httpClient
      .patch(url, JSON.stringify(body), httpOptions)

  }

  /**
   * UPDATE DEPARTMENT STATUS
   * @param dept_id
   * @param status
   */
  public updateDeptStatus(dept_id: string, status: number) {

    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };

    const url = this.URL_TILEDESK_DEPARTMENTS + dept_id;
    this.logger.log('UPDATE DEPT STATUS - URL ', url);

    const body = { 'status': status };
    this.logger.log('[DEPTS-SERV] UPDATE DEPT STATUS - BODY ', body);

    return this.httpClient
      .patch(url, JSON.stringify(body), httpOptions)
  }

  // --------------------------------------------------------------
  // !!! NOT USED 
  // --------------------------------------------------------------
  public updateDefaultDeptOnlineMsg(id: string, onlineMsg: string) {

    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };

    const url = this.URL_TILEDESK_DEPARTMENTS + id;
    this.logger.log('[DEPTS-SERV] UPDATE DEFAULT DEPARTMENT ONLINE MSG URL  ', url);


    const body = { 'online_msg': onlineMsg };

    this.logger.log('[DEPTS-SERV] - UPDATE DEFAULT DEPARTMENT ONLINE MSG - BODY  ', body);
    return this.httpClient
      .put(url, JSON.stringify(body), httpOptions)
    // .map((res) => res.json());
  }

  // --------------------------------------------------------------
  // !!! NOT USED 
  // --------------------------------------------------------------
  public updateDefaultDeptOfflineMsg(id: string, offlineMsg: string) {

    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };

    const url = this.URL_TILEDESK_DEPARTMENTS + id;
    this.logger.log('[DEPTS-SERV] - UPDATE DEFAULT DEPARTMENT OFFLINE MSG - URL ', url);

    const body = { 'offline_msg': offlineMsg };

    this.logger.log('[DEPTS-SERV] - UPDATE DEFAULT DEPARTMENT OFFLINE MSG - BODY ', body);
    return this.httpClient
      .put(url, JSON.stringify(body), httpOptions)
  }

  /**
   * READ DETAIL (TEST CHAT 21 router.get('/:departmentid/operators')
   * @param id
   */
  // ------------------------------------
  // Method used for test
  // ------------------------------------
  public testChat21AssignesFunction(id: string): Observable<Department[]> {

    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };

    let url = this.URL_TILEDESK_DEPARTMENTS;
    // + '?nobot=' + true
    url += id + '/operators';
    this.logger.log('-- -- -- URL FOR TEST CHAT21 FUNC ', url);

    const headers = new Headers();
    headers.append('Content-Type', 'application/json');
    headers.append('Authorization', this.tiledeskToken);
    // this.logger.log('TOKEN TO COPY ', this.TOKEN)
    return this.httpClient
      .get<Department[]>(url, httpOptions)

  }

}
