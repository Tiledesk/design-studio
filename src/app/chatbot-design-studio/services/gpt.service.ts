import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AppConfigProvider } from 'src/app/services/app-config';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Injectable({
  providedIn: 'root'
})
export class GptService {

  GPT_API_URL: string;

  private logger: LoggerService = LoggerInstance.getInstance();
  
  constructor(
    private httpClient: HttpClient
  ) { 
    // this.GPT_API_URL = this.appConfigService.getConfig().gptApiUrl;
    // this.GPT_API_URL = "https://tiledesk-playground.azurewebsites.net/api";
    this.GPT_API_URL = "http://tiledesk-backend.h8dahhe4edc7cahh.francecentral.azurecontainer.io:8000/api"
  }

  startScraping(data) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    }

    const url = this.GPT_API_URL + "/scrape";
    this.logger.log('[GPT.SERV] - GET *ALL* TEMPLATES - URL', url);

    return this.httpClient.post(url, data, httpOptions);

  }

  checkScrapingStatus(data) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    }

    const url = this.GPT_API_URL + "/scrape/status";
    this.logger.log('[GPT.SERV] - GET *ALL* TEMPLATES - URL', url);

    return this.httpClient.post(url, data, httpOptions);
  }

}
