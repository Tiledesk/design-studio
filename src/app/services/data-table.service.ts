import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';

@Injectable({
  providedIn: 'root'
})
export class DataTableService {

  project_id: any;
  public SERVER_BASE_URL: string;

  private URL_TILEDESK_TABLES: string;
  private tiledeskToken: string;

  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    public appStorageService: AppStorageService,
    private httpClient: HttpClient
  ) { }

  initialize(serverBaseUrl: string, project_id: string) {
    this.logger.log('[DATA-TABLE SERVICE] - initialize serverBaseUrl', serverBaseUrl);
    this.project_id = project_id;
    this.SERVER_BASE_URL = serverBaseUrl;
    this.URL_TILEDESK_TABLES = this.SERVER_BASE_URL + this.project_id + '/tables';
    this.tiledeskToken = this.appStorageService.getItem('tiledeskToken');
  }

  private httpOptions() {
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };
  }

  /** GET /{projectId}/tables — list all tables of the project */
  listTables() {
    const url = this.URL_TILEDESK_TABLES;
    this.logger.info('[DATA-TABLE SERVICE] - listTables URL ', url);
    return this.httpClient.get(url, this.httpOptions());
  }

  /** GET /{projectId}/tables/{tableId} — table detail with schema (columns) and first rows */
  getTable(tableId: string) {
    const url = this.URL_TILEDESK_TABLES + '/' + tableId;
    this.logger.info('[DATA-TABLE SERVICE] - getTable URL ', url);
    return this.httpClient.get(url, this.httpOptions());
  }
}
