import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Injectable({
  providedIn: 'root'
})

export class LogService {
  BSWidgetLoaded = new BehaviorSubject<any>(null);

  SERVER_BASE_PATH: string;
  LOG_URL: any;
  logs: any;
  
  private tiledeskToken: string;
  private project_id: string;

  private readonly logger: LoggerService = LoggerInstance.getInstance();
  
  constructor(
    public appStorageService: AppStorageService,
    private readonly _httpClient: HttpClient
  ) { }

  async initialize(serverBaseUrl: string, projectId: string, support_group_id: string){
    this.tiledeskToken = this.appStorageService.getItem('tiledeskToken');
    support_group_id = "support-group-62c3f10152dc7400352bab0d-bbbc598e4759420f9541f46a3df0fd16";
    this.LOG_URL = serverBaseUrl + projectId + '/logs/flows/' + support_group_id;
    this.logger.log('[LOG-SERV] initialize', serverBaseUrl, this.LOG_URL);

    this.getLastLogs().subscribe({ next: (resp)=> {
      this.logger.log("[LOG-SERV] get AllFaqById blocks: ", resp);
      this.logs = resp;
      this.BSWidgetLoaded.next(resp)
    }, error: (error)=> {
      this.logger.error("[LOG-SERV] error get AllFaqById: ", error);
    }, complete: () => {
      this.logger.log("[LOG-SERV] get AllFaqById completed.");
    }})

    
  }

  
  public getLastLogs(): Observable<any> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };
    let url = this.LOG_URL;
    this.logger.log('[LOG-SERV] - GET LOG - URL', url);
    return this._httpClient.get<any>(url, httpOptions)
  }

  public getOtherLogs(timestamp: string, direction: "prev"|"next"): Observable<any> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };
    let url = this.LOG_URL + '?timestamp=' + timestamp + "&direction=" + direction;
    this.logger.log('[LOG-SERV] - GET LOG - URL', url);
    return this._httpClient.get<any>(url, httpOptions)
  }


}
