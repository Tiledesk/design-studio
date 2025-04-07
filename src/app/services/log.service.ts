import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { DashboardService } from './dashboard.service';
import { TiledeskAuthService } from 'src/chat21-core/providers/tiledesk/tiledesk-auth.service';
import { MqttClient } from 'src/assets/js/MqttClient.js';


export enum MQTT_CLIENT {
  appId           = 'tilechat',
  MQTTendpoint    = 'ws://35.246.144.116:15675/ws',
  log             = 'true'
}



@Injectable({
  providedIn: 'root'
})

export class LogService {
  BSWidgetLoaded = new BehaviorSubject<boolean>(null);
  BSWidgetLoadedNewMessage = new BehaviorSubject<any>(null);

  SERVER_BASE_PATH: string;
  LOG_URL: any;
  logs: any = null;
  
  public mqtt_client: any;
  private tiledeskToken: string;
  private mqtt_token: string;
  public request_id: string;

  private readonly logger: LoggerService = LoggerInstance.getInstance();
  
  constructor(
    public appStorageService: AppStorageService,
    private readonly _httpClient: HttpClient,
    public dashboardService: DashboardService,
    public tiledeskAuthService: TiledeskAuthService
  ) { }


  public initLogService(){
    this.mqtt_client = new MqttClient({
      appId: MQTT_CLIENT.appId,
      MQTTendpoint: MQTT_CLIENT.MQTTendpoint, 
      log: MQTT_CLIENT.log
    })
  }


  async initialize(serverBaseUrl: string, projectId: string, support_group_id: string, request_id: string){
    this.tiledeskToken = this.appStorageService.getItem('tiledeskToken');
    if(request_id){
      this.request_id = request_id;
    }
    this.starterLog();
    // // support_group_id = "support-group-62c3f10152dc7400352bab0d-bbbc598e4759420f9541f46a3df0fd16";
    // this.LOG_URL = serverBaseUrl + projectId + '/logs/flows/' + support_group_id;
    this.logger.log('[LOG-SERV] initialize', serverBaseUrl, this.LOG_URL);
    this.logs = '';
    this.BSWidgetLoaded.next(true);
  }


  async getToken(): Promise<any|null> {
    const tiledeskToken = localStorage.getItem('tiledesk_token');
    const project_id = this.dashboardService.projectID;
    const request_id = this.request_id;// "support-group-6790c1a05ee3a700132d4fa0-78fa3328a7ad43e0b547467d93dde083";
    try {
      const resp = await this.tiledeskAuthService.createCustomTokenByRequestId(
        tiledeskToken,
        project_id,
        request_id
      );
      this.logger.log('[CdsWidgetLogsComponent] >>> getToken ok ', resp);
      return resp;
    } catch (error: any) {
      this.logger.error('[CdsWidgetLogsComponent] getToken error::', error);
      if (error.status && error.status === 401) {
        // gestione errore
      }
      return null;
    }
  }


  async starterLog(){
      this.logger.log('[CdsWidgetLogsComponent] >>> starterLog ');
      let resp = await this.getToken();
      this.logger.log('[CdsWidgetLogsComponent] >>> mqtt_token ok ', resp);
      if(this.mqtt_client && resp){
        this.mqtt_token = resp['token'];
        this.request_id = resp['request_id'];
        this.mqtt_client.connect(this.request_id, this.mqtt_token, (message)=>{
          this.logger.log("[CdsWidgetLogsComponent] message: ", message);
          this.BSWidgetLoadedNewMessage.next(message.payload);
        });
      }

      // alla chiusura del log richiamo mqtt_client.close()
    }




  closeLog(){
    this.mqtt_client.close();
  }





  public resetLogService(){
    this.logs = null;
  }

  




  public getLastLogs(logLevel?): Observable<any> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };
    let url = this.LOG_URL+'?logLevel='+logLevel;
    this.logger.log('[LOG-SERV] - GET LOG - URL', url);
    return this._httpClient.get<any>(url, httpOptions)
  }

  public getOtherLogs(timestamp: string, direction: "prev"|"next", logLevel?): Observable<any> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };
    let url = this.LOG_URL + '?timestamp=' + timestamp + "&direction=" + direction +'&logLevel='+logLevel;
    this.logger.log('[LOG-SERV] - GET LOG - URL', url);
    return this._httpClient.get<any>(url, httpOptions)
  }


}
