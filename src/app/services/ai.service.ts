import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, firstValueFrom } from 'rxjs';
import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Injectable({
  providedIn: 'root'
})
export class AiService {
  
  // user: any;
  project_id: any;

  // private persistence: string;
  public SERVER_BASE_URL: string;
  

  // private
  private URL_TILEDESK_OPENAI: string;
  private tiledeskToken: string;

  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    public appStorageService: AppStorageService,
    private httpClient: HttpClient
  ) {     
  }

  initialize(serverBaseUrl: string, project_id: string): void {
    this.logger.log('[OPENAI.SERVICE] - initialize serverBaseUrl', serverBaseUrl);
    this.project_id = project_id;
    this.SERVER_BASE_URL = serverBaseUrl + this.project_id;
    this.tiledeskToken = this.appStorageService.getItem('tiledeskToken')
  }

  getElevenLabsVoices(): Promise<any[]> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken,
      })
    }

    const url = this.SERVER_BASE_URL + "/voice/voices";
    this.logger.debug('[OPENAI.SERVICE] - preview prompt URL: ', url);

    return firstValueFrom(this.httpClient.get<any[]>(url, httpOptions));
  }

  getElevenLabsModels(): Promise<any[]> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    } 

    const url = this.SERVER_BASE_URL + "/voice/models";
    this.logger.debug('[OPENAI.SERVICE] - preview prompt URL: ', url);

    return firstValueFrom(this.httpClient.get<any[]>(url, httpOptions));
  }


} 