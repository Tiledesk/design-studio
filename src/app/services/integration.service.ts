import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class IntegrationService {

  // user: any;
  project_id: any;

  // private persistence: string;
  public SERVER_BASE_URL: string;

  // private
  private URL_TILEDESK_KNB: string;
  private tiledeskToken: string;

  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    public appStorageService: AppStorageService,
    private httpClient: HttpClient
  ) {}

  initialize(serverBaseUrl: string, project_id: string){
    this.logger.log('[KNOWLEDGE BASE SERVICE] - initialize serverBaseUrl', serverBaseUrl);
    this.project_id = project_id;
    this.SERVER_BASE_URL = serverBaseUrl;
    this.URL_TILEDESK_KNB = this.SERVER_BASE_URL + this.project_id
    this.tiledeskToken = this.appStorageService.getItem('tiledeskToken')
  }

  getIntegrations(project_id: string): Observable<any> {
    const url = this.SERVER_BASE_URL + project_id + '/integration';
    this.logger.log('[TILEDESK-SERVICE] - GET INTEGRATION - URL', url);
    const httpOptions = {
      headers: new HttpHeaders({
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        Authorization: this.tiledeskToken
      })
    };
    return this.httpClient.get(url, httpOptions);
  }
}

