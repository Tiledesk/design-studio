import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, lastValueFrom } from 'rxjs';

import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { DashboardService } from './dashboard.service';
import { TiledeskAuthService } from 'src/chat21-core/providers/tiledesk/tiledesk-auth.service';
import { MqttClient } from 'src/assets/js/MqttClient.js';
import { WebhookService } from '../chatbot-design-studio/services/webhook-service.service';



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

  private readonly logger: LoggerService = LoggerInstance.getInstance();
  
  constructor(
    public appStorageService: AppStorageService,
    private readonly _httpClient: HttpClient,
    public dashboardService: DashboardService,
    public tiledeskAuthService: TiledeskAuthService,
    public webhookService: WebhookService
  ) { }



  public initLogService(chatbotSubtype){
    //this.chatbotSubtype = chatbotSubtype;
    this.mqtt_client = new MqttClient({
      appId: MQTT_CLIENT.appId,
      MQTTendpoint: MQTT_CLIENT.MQTTendpoint, 
      log: MQTT_CLIENT.log
    })
  }

  async initializeChatbot(request_id: string){
    if(!request_id){
      // is webhook
      const webhook_id = await this.getWebhook();
      this.logger.log("[LOG-SERV] webhook_id : ", webhook_id);
      request_id = await this.getNewRequestId(webhook_id);
      this.logger.log("[LOG-SERV] request_id : ", request_id);
    }
    let resp = await this.getToken(request_id);
    this.starterLog(resp);
    this.logger.log('[LOG-SERV] initializeChatbot', this.LOG_URL);
    this.logs = '';
    this.BSWidgetLoaded.next(true);
  }

  async getWebhook(): Promise<any | null> {
    const chatbot_id = this.dashboardService.id_faq_kb;
    try {
      const resp = await lastValueFrom(this.webhookService.getWebhook(chatbot_id));
      this.logger.log("[LOG-SERV] getWebhook : ", resp);
      return resp.webhook_id;
    } catch (error) {
      this.logger.error("[LOG-SERV] error getWebhook: ", error);
      return null;
    } finally {
      this.logger.log("[LOG-SERV] getWebhook completed.");
    }
  }


  async getNewRequestId(webhook_id): Promise<any|null> {
    const tiledeskToken = localStorage.getItem('tiledesk_token');
    const project_id = this.dashboardService.projectID;
    try {
      const resp = await this.tiledeskAuthService.createNewRequestId(
        tiledeskToken,
        project_id, 
        webhook_id
      );
      this.logger.log('[CdsWidgetLogsComponent] >>> createNewRequestId ok ', resp);
      if(resp['request_id']){
        return resp['request_id'];
      } else {
        return null;
      }
    } catch (error: any) {
      this.logger.error('[CdsWidgetLogsComponent] createNewRequestId error::', error);
      if (error.status && error.status === 401) {
        // gestione errore
      }
      return null;
    }
  }

  async getToken(request_id): Promise<any|null> {
    const tiledeskToken = localStorage.getItem('tiledesk_token');
    const project_id = this.dashboardService.projectID;
    // const request_id = this.request_id;
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


  async starterLog(resp){
    this.logger.log('[CdsWidgetLogsComponent] >>> starterLog ');
    this.logger.log('[CdsWidgetLogsComponent] >>> mqtt_token ok ', resp);
    if(this.mqtt_client && resp){
      const mqtt_token = resp['token'];
      const request_id = resp['request_id'];
      this.mqtt_client.connect(request_id, mqtt_token, (message)=>{
        this.logger.log("[CdsWidgetLogsComponent] message: ", message);
        this.BSWidgetLoadedNewMessage.next(message.payload);
      });
    }
  }

  public closeLog(){
    this.mqtt_client?.close();
  }

  public resetLogService(){
    this.logs = null;
  }


}
