import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Injectable({
  providedIn: 'root'
})
export class WebhookService {

  SERVER_BASE_PATH: string;
  WEBHOOK_URL: any;
  thereIsWebhook: boolean = true;

  private tiledeskToken: string;
  private project_id: string;

  private readonly logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    public appStorageService: AppStorageService,
    private readonly _httpClient: HttpClient
  ) { }

  initialize(serverBaseUrl: string, projectId: string){
    this.logger.log('[WEBHOOK_URL.SERV] initialize', serverBaseUrl);
    this.SERVER_BASE_PATH = serverBaseUrl;
    this.project_id = projectId;
    this.WEBHOOK_URL = this.SERVER_BASE_PATH + this.project_id 
  }

  getWebhook(chatbot_id: string){
    this.tiledeskToken = this.appStorageService.getItem('tiledeskToken');
    this.logger.log('[WEBHOOK_URL.SERV] getWebhook');
    const httpOptions = {
      headers: new HttpHeaders({
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };
    let url = this.WEBHOOK_URL + '/webhooks/' + chatbot_id;
    this.logger.log('[WEBHOOK_URL.SERV] - URL ', url);
    return this._httpClient.get<any>(url, httpOptions);
  }

  createWebhook(chatbot_id: string, intent_id: string){
    this.thereIsWebhook = true;
    this.tiledeskToken = this.appStorageService.getItem('tiledeskToken');
    this.logger.log('[WEBHOOK_URL.SERV] createWebhook');
    const httpOptions = {
      headers: new HttpHeaders({
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };
    let body = { 
      'chatbot_id': chatbot_id,
      'block_id': intent_id
    };
    this.logger.log('[WEBHOOK_URL.SERV]  createWebhook - BODY ', body);
    let url = this.WEBHOOK_URL + '/webhooks/';
    this.logger.log('[WEBHOOK_URL.SERV] - createWebhook ', url);
    return this._httpClient.post<any>(url, JSON.stringify(body), httpOptions);
  }

  regenerateWebhook(chatbot_id: string){
    this.tiledeskToken = this.appStorageService.getItem('tiledeskToken');
    this.logger.log('[WEBHOOK_URL.SERV] regenerateWebhook');
    const httpOptions = {
      headers: new HttpHeaders({
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };
    let body = {};
    let url = this.WEBHOOK_URL + '/webhooks/' + chatbot_id + '/regenerate';
    this.logger.log('[WEBHOOK_URL.SERV] - URL ', url);
    return this._httpClient.put<any>(url, JSON.stringify(body), httpOptions);
  }

  deleteWebhook(chatbot_id: string){
    this.thereIsWebhook = false;
    this.tiledeskToken = this.appStorageService.getItem('tiledeskToken');
    this.logger.log('[WEBHOOK_URL.SERV] deleteWebhook');
    const httpOptions = {
      headers: new HttpHeaders({
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };
    let url = this.WEBHOOK_URL + '/webhooks/' + chatbot_id;
    this.logger.log('[WEBHOOK_URL.SERV] - URL ', url);
    return this._httpClient.delete<any>(url, httpOptions);
  }


  checkActionForDelete(action: any){
    if(action._tdActionType == 'web_response'){
      // updateWebhook(chatbot_id: string){
    }
  }
  updateWebhook(chatbot_id: string){
    // this.thereIsWebhook = false;
    // this.tiledeskToken = this.appStorageService.getItem('tiledeskToken');
    // this.logger.log('[WEBHOOK_URL.SERV] deleteWebhook');
    // const httpOptions = {
    //   headers: new HttpHeaders({
    //     'Accept': 'application/json',
    //     'Content-Type': 'application/json',
    //     'Authorization': this.tiledeskToken
    //   })
    // };
    // let url = this.WEBHOOK_URL + '/webhooks/' + chatbot_id;
    // this.logger.log('[WEBHOOK_URL.SERV] - URL ', url);
    // return this._httpClient.delete<any>(url, httpOptions);
  }


}
