import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { KB } from 'src/app/models/kbsettings-model';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';

@Injectable({
  providedIn: 'root'
})
export class KnowledgeBaseService {

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
  ) {
  }

  initialize(serverBaseUrl: string, project_id: string){
    this.logger.log('[KNOWLEDGE BASE SERVICE] - initialize serverBaseUrl', serverBaseUrl);
    this.project_id = project_id;
    this.SERVER_BASE_URL = serverBaseUrl;
    this.URL_TILEDESK_KNB = this.SERVER_BASE_URL + this.project_id
    this.tiledeskToken = this.appStorageService.getItem('tiledeskToken')
  }

  getKbSettings() {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    }

    const url = this.URL_TILEDESK_KNB + "/kbsettings";
    this.logger.info("[KNOWLEDGE BASE SERVICE] - get settings URL ", url);

    return this.httpClient.get(url, httpOptions);
  }

  saveKbSettings(kb_settings) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    }

    const url = this.URL_TILEDESK_KNB + "/kbsettings/" + kb_settings._id;
    this.logger.info("[KNOWLEDGE BASE SERVICE] - save settings URL ", url);

    return this.httpClient.put(url, kb_settings, httpOptions);
  }

  addNewKb(settings_id: string, kb: KB) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    }

    const url = this.URL_TILEDESK_KNB + "/kbsettings/" + settings_id;
    this.logger.info("[KNOWLEDGE BASE SERVICE] - add new kb URL ", url);

    return this.httpClient.post(url, kb, httpOptions);
  }

  deleteKb(settings_id: string, kb_id: string){
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    }

    const url = this.URL_TILEDESK_KNB + "/kbsettings/" + settings_id + "/" + kb_id;
    this.logger.info("[KNOWLEDGE BASE SERVICE] - delete kb URL ", url);

    return this.httpClient.delete(url, httpOptions);
  }

  

}
