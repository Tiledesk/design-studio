import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { TYPE_ACTION } from '../utils-actions';
import { Schedule } from '../utils-schedule';
import { IntentService } from './intent.service';

@Injectable({
  providedIn: 'root'
})

export class WebhookService {

  SERVER_BASE_PATH: string;
  WEBHOOK_URL: any;
  thereIsWebhook: boolean = false;
  thereIsWebResponse: boolean;

  /** the chatbot webhook (start_points, scheduled_live, scheduled_available, next_runs), loaded once and shared by the palette and the start boxes */
  webhook$ = new BehaviorSubject<any>(null);
  private loading: Subscription | null = null;
  private loadedChatbotId: string | null = null;

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

  /**
   * Loads the webhook of a chatbot into webhook$. webhook$ always belongs to the last chatbot asked for:
   * a different id cancels the in-flight GET and resets webhook$ to null first; a failed load for a new id leaves null.
   * Same id: a call while one is in flight reuses it unless forced (a forced one cancels the stale response);
   * a failed reload keeps the previous value.
   */
  loadWebhook(chatbot_id: string, force: boolean = false){
    const sameChatbot = this.loadedChatbotId === chatbot_id;
    const inFlight = !!this.loading && !this.loading.closed;
    if (sameChatbot && inFlight && !force) {
      return;
    }
    if (inFlight) {
      this.loading.unsubscribe();
    }
    if (!sameChatbot) {
      this.loadedChatbotId = chatbot_id;
      if (this.webhook$.value !== null) {
        this.webhook$.next(null);
      }
    }
    this.loading = this.getWebhook(chatbot_id).subscribe({
      next: (webhook) => this.webhook$.next(webhook),
      error: (err) => this.logger.log('[WEBHOOK_URL.SERV] loadWebhook error', err)
    });
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

  upsertStartPoint(chatbot_id: string, type: 'webhook' | 'scheduled', body: { block_id: string, enabled?: boolean, mapping?: { source_name?: string, payload?: { [key: string]: any } }, schedule?: Schedule, confirm?: boolean }){
    this.tiledeskToken = this.appStorageService.getItem('tiledeskToken');
    this.logger.log('[WEBHOOK_URL.SERV] upsertStartPoint', type);
    const httpOptions = {
      headers: new HttpHeaders({
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };
    const url = this.WEBHOOK_URL + '/webhooks/' + chatbot_id + '/start_points/' + type;
    return this._httpClient.put<any>(url, JSON.stringify(body), httpOptions);
  }

  /** POST …/start_points/scheduled/test → { request_id } (404 when there is no scheduled draft) */
  testScheduledStart(chatbot_id: string){
    return this._httpClient.post<any>(this.scheduledUrl(chatbot_id) + '/test', '{}', this.jsonOptions());
  }

  /** POST …/start_points/scheduled/sync → scheduled_live */
  syncScheduledStart(chatbot_id: string){
    return this._httpClient.post<any>(this.scheduledUrl(chatbot_id) + '/sync', '{}', this.jsonOptions());
  }

  private scheduledUrl(chatbot_id: string){
    return this.WEBHOOK_URL + '/webhooks/' + chatbot_id + '/start_points/scheduled';
  }

  private jsonOptions(){
    this.tiledeskToken = this.appStorageService.getItem('tiledeskToken');
    return {
      headers: new HttpHeaders({
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };
  }

  deleteStartPoint(chatbot_id: string, type: 'webhook' | 'scheduled'){
    this.tiledeskToken = this.appStorageService.getItem('tiledeskToken');
    this.logger.log('[WEBHOOK_URL.SERV] deleteStartPoint', type);
    const httpOptions = {
      headers: new HttpHeaders({
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };
    const url = this.WEBHOOK_URL + '/webhooks/' + chatbot_id + '/start_points/' + type;
    return this._httpClient.delete<any>(url, httpOptions);
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


}