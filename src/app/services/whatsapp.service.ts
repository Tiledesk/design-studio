import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Injectable({
  providedIn: 'root'
})
export class WhatsappService {

  // private persistence: string;
  public SERVER_BASE_URL: string;

  // private
  private WHATSAPP_API_URL: string;
  private tiledeskToken: string;
  private project_id: string;

  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private httpClient: HttpClient,
    private appStorageService: AppStorageService,
  ) {
  }


  initialize(url: string, project_id: string){
    this.WHATSAPP_API_URL = url
    this.project_id = project_id
    this.tiledeskToken = this.appStorageService.getItem('tiledeskToken')
  }

  getAllTemplates() {

    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    }

    const url = this.WHATSAPP_API_URL + "/api/templates/" + this.project_id;
    this.logger.log('[WHATSAPP.SERV] - GET *ALL* TEMPLATES - URL', url);

    return this.httpClient.get<any[]>(url, httpOptions)
  }
}
