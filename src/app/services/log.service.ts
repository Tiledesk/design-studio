import { ElementRef, Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject, lastValueFrom } from 'rxjs';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { MqttClient } from 'src/assets/js/MqttClient.js';
import { AppConfigService } from './app-config';
import { TYPE_CHATBOT } from '../chatbot-design-studio/utils-actions';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';


@Injectable({
  providedIn: 'root'
})

export class LogService {
  BSWidgetLoaded = new Subject<boolean>();
  BSWidgetLoadedNewMessage = new Subject<any>();

  mqtt_client: any;
  SERVER_BASE_PATH: string;
  LOG_URL: any;
  logs: any = null;
  request_id: string;

  private readonly logger: LoggerService = LoggerInstance.getInstance();
  
  constructor(
    public readonly appConfigService: AppConfigService,
    public appStorageService: AppStorageService,
    private readonly _httpClient: HttpClient
  ) {}


  public getStaticLastLogs(logLevel?): Observable<any> {
    const tiledeskToken = this.appStorageService.getItem('tiledeskToken');
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': tiledeskToken
      })
    };
    let url = this.LOG_URL+'?logLevel='+logLevel;
    this.logger.log('[LOG-SERV] - GET LOG - URL', url);
    return this._httpClient.get<any>(url, httpOptions)
  }



  async initStaticServices(serverBaseUrl: string, projectId: string, support_group_id: string){
    const tiledeskToken = this.appStorageService.getItem('tiledeskToken');
    this.LOG_URL = serverBaseUrl + projectId + '/logs/flows/' + support_group_id;
    this.logger.log('[LOG-SERV] initialize', serverBaseUrl, this.LOG_URL);
    this.logs = '';
    this.BSWidgetLoaded.next(true);
  }


  public initialize(request_id: string){
    this.request_id = request_id;
    this.logger.log("[LOG-SERV] getConfig : ", this.appConfigService.getConfig());
    const appId = this.appConfigService.getConfig().chat21Config.appId;
    const MQTTendpoint = this.appConfigService.getConfig().chat21Config.MQTTendpoint;
    const log = this.appConfigService.getConfig().chat21Config.log;
    this.mqtt_client = new MqttClient({
      appId: appId,
      MQTTendpoint: MQTTendpoint,
      log: log
    });
  }

  async starterLog(mqtt_token, request_id){
    this.logger.log('[CdsWidgetLogsComponent] >>> starterLog ', this.mqtt_client);
    this.logger.log('[CdsWidgetLogsComponent] >>> mqtt_token ok---> ', mqtt_token, request_id);
    if(this.mqtt_client && mqtt_token && request_id){
      this.mqtt_client.connect(request_id, mqtt_token, (message: any)=>{
        this.logger.log("[CdsWidgetLogsComponent] message: ", message);
        const msg = message?.payload?message?.payload:null;
        this.BSWidgetLoadedNewMessage.next(msg);
      });
    }
  }

  public closeLog(){
    this.logger.log('[CdsWidgetLogsComponent] >>> closeLog ');
    this.mqtt_client?.close();
  }

  public resetLogService(){
    this.logs = null;
  }


}
