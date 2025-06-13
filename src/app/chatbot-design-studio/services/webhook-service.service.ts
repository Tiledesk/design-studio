import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { TYPE_ACTION } from '../utils-actions';
import { IntentService } from './intent.service';

@Injectable({
  providedIn: 'root'
})

export class WebhookService {

  SERVER_BASE_PATH: string;
  WEBHOOK_URL: any;
  thereIsWebhook: boolean = false;
  thereIsWebResponse: boolean;

  private tiledeskToken: string;
  private project_id: string;

  private readonly logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    public appStorageService: AppStorageService,
    private readonly intentService: IntentService,
    private readonly _httpClient: HttpClient
  ) { }

  initialize(serverBaseUrl: string, projectId: string){
    this.logger.log('[WEBHOOK_URL.SERV] initialize', serverBaseUrl);
    this.SERVER_BASE_PATH = serverBaseUrl;
    this.project_id = projectId;
    this.WEBHOOK_URL = this.SERVER_BASE_PATH + this.project_id;
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

  createWebhook(chatbot_id: string, intent_id: string, thereIsWebResponse: boolean, copilot: boolean){
    if(this.thereIsWebResponse === undefined){
      this.thereIsWebResponse = thereIsWebResponse;
    }
    if(this.thereIsWebResponse !== thereIsWebResponse){
      this.thereIsWebResponse = thereIsWebResponse;
    }
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
      'block_id': intent_id, 
      'async': !thereIsWebResponse,
      'copilot': copilot
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

  deleteWebhook(webhook_id: string){
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
    let url = this.WEBHOOK_URL + '/webhooks/preload/' + webhook_id;
    this.logger.log('[WEBHOOK_URL.SERV] - URL ', url);
    return this._httpClient.delete<any>(url, httpOptions);
  }


  checkIfThereIsWebResponse(){
    const listOfIntents = this.intentService.listOfIntents;
    let thereIsWebResponse = false;
    for (const intent of listOfIntents) {
      for (const action of intent.actions) {
        if (action._tdActionType === TYPE_ACTION.WEB_RESPONSE) {
          thereIsWebResponse = true;
          break;
        }
      }
      if (thereIsWebResponse === true) {
        break;
      }
    }
    return thereIsWebResponse;
  } 

  /**
   * updateWebhook
   * @param chatbot_id 
   * @param thereIsWebResponse 
   * @returns 
   */
  updateWebhook(chatbot_id: string, thereIsWebResponse: boolean){
    this.logger.log('[WEBHOOK_URL.SERV] - thereIsWebResponse  ', thereIsWebResponse, this.thereIsWebResponse);
    if(this.thereIsWebResponse === undefined){
      this.thereIsWebResponse = thereIsWebResponse;
    }
    if(this.thereIsWebResponse !== thereIsWebResponse){
      this.thereIsWebResponse = thereIsWebResponse;
      this.tiledeskToken = this.appStorageService.getItem('tiledeskToken');
      const httpOptions = { 
        headers: new HttpHeaders({
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': this.tiledeskToken
        })
      };
      let body = { 
        'async': !this.thereIsWebResponse,
      };
      let url = this.WEBHOOK_URL + '/webhooks/' + chatbot_id;
      this.logger.log('[WEBHOOK_URL.SERV] - URL ', url);
      return this._httpClient.put<any>(url, JSON.stringify(body), httpOptions);
    }
  }


  /**
   * updateCopilotWebhook
   * @param chatbot_id 
   * @param copilot 
   * @returns 
   */
  updateCopilotWebhook(chatbot_id: string, copilot: boolean){
    this.logger.log('[WEBHOOK_URL.SERV] - updateCopilotWebhook ', copilot);
    this.tiledeskToken = this.appStorageService.getItem('tiledeskToken');
    const httpOptions = {
      headers: new HttpHeaders({
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };
    let body = { 
      'copilot': copilot,
    };
    let url = this.WEBHOOK_URL + '/webhooks/' + chatbot_id;
    this.logger.log('[WEBHOOK_URL.SERV] - URL ', url);
    return this._httpClient.put<any>(url, JSON.stringify(body), httpOptions);
  }



    preloadWebhook(webhook_id: string){
      this.tiledeskToken = this.appStorageService.getItem('tiledeskToken');
      this.logger.log('[WEBHOOK_URL.SERV] preloadWebhook');
      const httpOptions = {
        headers: new HttpHeaders({
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': this.tiledeskToken
        })
      };
      let body = { };
      let url = this.WEBHOOK_URL + '/webhooks/preload/' + webhook_id;
      this.logger.log('[WEBHOOK_URL.SERV] - URL ', url);
      return this._httpClient.post<any>(url, JSON.stringify(body), httpOptions);
  }

    // preloadWebhook(tiledeskToken: string, id_project: string, webhook_id: string) {
    //   const headers = new HttpHeaders({
    //     'Content-type': 'application/json',
    //     Authorization: tiledeskToken
    //   });
    //   const requestOptions = { headers: headers };
    //   const postData = {};
    //   this.logger.log('[TILEDESK-AUTH-SERV] - createNewRequestId webhook_id: ', webhook_id);
    //   const that = this;
    //   let URL_TILEDESK_CREATE_TOKEN_BY_REQUEST_ID = this.SERVER_BASE_URL + id_project+ '/webhooks/preload/'+webhook_id;
    //   this.logger.log('[TILEDESK-AUTH-SERV] - URL_TILEDESK_CREATE_TOKEN_BY_REQUEST_ID2: ', URL_TILEDESK_CREATE_TOKEN_BY_REQUEST_ID);
    //   return new Promise((resolve, reject) => {
    //     this.http.post(URL_TILEDESK_CREATE_TOKEN_BY_REQUEST_ID, postData, requestOptions).subscribe({next: (data)=>{
    //       if (data) {
    //         resolve(data);
    //       }
    //     }, error: (error)=>{
    //       reject(error)
    //     }})
    //   });
    // }


}