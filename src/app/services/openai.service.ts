import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';
import { Observable } from 'rxjs';
import { Namespace } from '../models/namespace-model';

@Injectable({
  providedIn: 'root'
})
export class OpenaiService {

  // user: any;
  project_id: any;

  // private persistence: string;
  public SERVER_BASE_URL: string;
  

  // private
  private URL_TILEDESK_OPENAI: string;
  private tiledeskToken: string;
  private GPT_API_URL: string;

  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    public appStorageService: AppStorageService,
    private httpClient: HttpClient
  ) {     
  }

  initialize(serverBaseUrl: string, project_id: string){
    this.logger.log('[OPENAI.SERVICE] - initialize serverBaseUrl', serverBaseUrl);
    this.project_id = project_id;
    this.SERVER_BASE_URL = serverBaseUrl;
    this.URL_TILEDESK_OPENAI = this.SERVER_BASE_URL + this.project_id
    this.tiledeskToken = this.appStorageService.getItem('tiledeskToken')
    this.GPT_API_URL = "http://tiledesk-backend.h8dahhe4edc7cahh.francecentral.azurecontainer.io:8000/api";
  }

  previewPrompt(data) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    }

    const url = this.URL_TILEDESK_OPENAI + "/openai/";
    this.logger.debug('[OPENAI.SERVICE] - preview prompt URL: ', url);

    return this.httpClient.post(url, data, httpOptions);
  }

  previewLLMPrompt(data) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    }

    const url = this.URL_TILEDESK_OPENAI + "/llm/preview";
    this.logger.debug('[OPENAI.SERVICE] - preview prompt LLM URL: ', url);

    return this.httpClient.post(url, data, httpOptions);
  }

  ////////////////////////////////////////////////////////
  //////////////////// ASK KB - START ////////////////////
  ////////////////////////////////////////////////////////

  previewAskPrompt(data) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    }

    const url = this.URL_TILEDESK_OPENAI + "/kb/qa";
    this.logger.debug('[OPENAI.SERVICE] - preview prompt URL: ', url);

    return this.httpClient.post(url, data, httpOptions);
  }


  getAllNamespaces(): Observable<Namespace[]>{
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    }

    const url = this.URL_TILEDESK_OPENAI + "/kb/namespace/all";
    this.logger.debug('[OPENAI.SERVICE] - getAllNamespaces URL: ', url);

    return this.httpClient.get<Namespace[]>(url, httpOptions);
  }

  ////////////////////////////////////////////////////////
  //////////////////// ASK KB - START ////////////////////
  ////////////////////////////////////////////////////////

}
