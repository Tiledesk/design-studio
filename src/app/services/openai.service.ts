import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';
import { Observable } from 'rxjs';
import { Namespace } from '../models/namespace-model';
import { HttpMemoCache } from '../utils/http-memo-cache';

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

  /**
   * Cache della GET kb/namespace/all: senza, ogni azione Ask KB / Add KB Content sul canvas
   * la rifà in ngOnInit.
   * TTL 30s: i namespace sono read-only in questa app (nascono nella sezione KB della
   * dashboard), quindi non esiste un hook di invalidazione oltre a initialize().
   */
  private static readonly NAMESPACES_CACHE_TTL_MS = 30_000;
  private readonly namespacesCache = new HttpMemoCache(OpenaiService.NAMESPACES_CACHE_TTL_MS);

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
    // unico hook di cambio progetto: i namespace in cache sono di un altro progetto
    this.namespacesCache.clear();
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
    return this.namespacesCache.get<Namespace[]>(`namespaces|${this.project_id}`, () => {
      const httpOptions = {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          'Authorization': this.tiledeskToken
        })
      }

      const url = this.URL_TILEDESK_OPENAI + "/kb/namespace/all";
      this.logger.debug('[OPENAI.SERVICE] - getAllNamespaces URL: ', url);

      return this.httpClient.get<Namespace[]>(url, httpOptions);
    });
  }

  ////////////////////////////////////////////////////////
  //////////////////// ASK KB - START ////////////////////
  ////////////////////////////////////////////////////////

}
