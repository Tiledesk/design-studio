import { HttpHeaders, HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Intent } from 'src/app/models/intent-model';
import { Faq } from 'src/app/models/faq-model';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';
@Injectable()
export class FaqService {

  SERVER_BASE_PATH: string;
  FAQ_URL: any;
  EXPORT_FAQ_TO_CSV_URL: string;
  
  private tiledeskToken: string;
  private project_id: string;

  private logger: LoggerService = LoggerInstance.getInstance();
  
  constructor(
    public appStorageService: AppStorageService,
    private _httpClient: HttpClient
  ) { }


  initialize(serverBaseUrl: string, projectId: string){
    this.logger.log('[FAQ-KB.SERV] initialize', serverBaseUrl);
    this.SERVER_BASE_PATH = serverBaseUrl;
    this.tiledeskToken = this.appStorageService.getItem('tiledeskToken');
    this.project_id = projectId;
    this.FAQ_URL = this.SERVER_BASE_PATH + this.project_id + '/faq/';
    this.EXPORT_FAQ_TO_CSV_URL = this.SERVER_BASE_PATH + this.project_id + '/faq/csv';
  }
  
  public getAllFaqByFaqKbId(id_faq_kb: string): Observable<Intent[]> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };
    let url = this.FAQ_URL + '?id_faq_kb=' + id_faq_kb;
    this.logger.log('[FAQ-SERV] - GET FAQ BY FAQ-KB ID (BOT-ID) - URL', url);
    return this._httpClient.get<Intent[]>(url, httpOptions)
  }

  /**
   * EXPORT FAQS AS CSV
   * @param id_faq_kb 
   * @returns 
   */
  public exsportFaqsToCsv(id_faq_kb: string) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken,
      }),
      responseType: 'text' as 'json'
    };

    const url = this.EXPORT_FAQ_TO_CSV_URL + '?id_faq_kb=' + id_faq_kb;
    this.logger.log('[FAQ-SERV] - EXPORT FAQS AS CSV - URL', url);

    return this._httpClient.get(url, httpOptions)
  }

  public exportChatbotToJSON(id_faq_kb: string) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken,
      }),
      // responseType: 'text' as 'json'
    };

    const url = this.SERVER_BASE_PATH + this.project_id + "/faq_kb/exportjson/" + id_faq_kb;
    this.logger.log('[FAQ-SERV] - EXPORT FAQS AS JSON - URL', url);

    return this._httpClient.get(url, httpOptions)
  }

  public exportIntentsToJSON(id_faq_kb: string) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken,
      }),
      // responseType: 'text' as 'json'
    };

    const url = this.SERVER_BASE_PATH + this.project_id + "/faq_kb/exportjson/" + id_faq_kb + "?intentsOnly=true";
    this.logger.log('[FAQ-SERV] - EXPORT FAQS AS JSON - URL', url);

    return this._httpClient.get(url, httpOptions)
  }


  public importChatbotFromJSON(id_faq_kb: string, jsonfile) {
    const options = {
      headers: new HttpHeaders({
        'Accept': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };

    const url = this.SERVER_BASE_PATH + this.project_id + "/faq_kb/importjson/" + id_faq_kb
    this.logger.log('[FAQ-SERV] UPLOAD FAQS CSV - URL ', url);

    return this._httpClient.post(url, jsonfile, options)
  }

  // ( POST ../PROJECT_ID/bots/importjson/null/?create=true)
  public importChatbotFromJSONFromScratch(jsonfile) {
    const options = {
      headers: new HttpHeaders({
        'Accept': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };


    const url = this.SERVER_BASE_PATH + this.project_id + "/faq_kb/importjson/null/?create=true"
    this.logger.log('[FAQ-SERV] UPLOAD FAQS CSV - URL ', url);

    return this._httpClient.post(url, jsonfile, options)
  }

  public importIntentsFromJSON(id_faq_kb: string, jsonfile, action: string) {
    const options = {
      headers: new HttpHeaders({
        'Accept': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };

    let qsaction = ''
    if (action === "add") {
      qsaction = "&overwrite=false"
    } else if (action === "overwrite") {
      qsaction = "&overwrite=true"
    }

    const url = this.SERVER_BASE_PATH + this.project_id + "/faq_kb/importjson/" + id_faq_kb + "?intentsOnly=true" + qsaction
    this.logger.log('[FAQ-SERV] UPLOAD FAQS CSV - URL ', url);

    return this._httpClient.post(url, jsonfile, options)
  }
  
  /**
   * CREATE FAQ (POST)
   * @param intent 
   * @returns 
   */
  public addIntent(intent: any) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };
    const url = this.FAQ_URL;
    this.logger.log('[FAQ-SERV] ADD FAQ -  PUT URL ', url);
    this.logger.log('[FAQ-SERV] ADD FAQ - POST BODY ', intent);
    return this._httpClient.post(url, JSON.stringify(intent), httpOptions)
  }

  /**
   * UPDATE FAQ (PUT)
   * @param intent
   * @returns 
   */
  public updateIntent(intent: any) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };
    this.logger.log('[FAQ-SERV] UPDATE FAQ - ID ', intent._id);
    let url = this.FAQ_URL + intent._id; 
    if(intent.intent_id) url = this.FAQ_URL + 'intentId' + intent.intent_id; 
    
    this.logger.log('[FAQ-SERV] UPDATE FAQ - PUT URL ', url);

    this.logger.log('----------->>>', intent);
    this.logger.log('[FAQ-SERV] UPDATE FAQ - PUT REQUEST BODY ', intent);
    return this._httpClient.put(url, JSON.stringify(intent), httpOptions);
  }


  /**
   * CREATE TRAIN BOT ANSWER (POST)
   * @param question 
   * @param answer 
   * @param id_faq_kb 
   * @returns 
   */
  public createTrainBotAnswer(question: string, answer: string, id_faq_kb: string) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };

    const url = this.FAQ_URL;
    this.logger.log('[FAQ-SERV] CREATE TRAIN BOT FAQ - URL ', url);

    const body = { 'question': question, 'answer': answer, 'id_faq_kb': id_faq_kb };
    this.logger.log('[FAQ-SERV] CREATE TRAIN BOT FAQ - BODY ', body);

    return this._httpClient.post(url, JSON.stringify(body), httpOptions)
  }

  /**
   * UPLOAD FAQS CSV
   * @param formData 
   * @returns 
   */
  public uploadFaqCsv(formData: any) {
    // const headers = new Headers();
    /** No need to include Content-Type in Angular 4 */
    // headers.append('Content-Type', 'multipart/form-data');

    // headers.append('Accept', 'text/csv');
    // headers.append('Authorization', this.TOKEN);
    // const options = new RequestOptions({ headers: headers });

    const options = {
      headers: new HttpHeaders({
        'Accept': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };

    const url = this.FAQ_URL + 'uploadcsv';
    this.logger.log('[FAQ-SERV] UPLOAD FAQS CSV - URL ', url);

    return this._httpClient.post(url, formData, options)
  }

  /**
   * DELETE FAQ (DELETE)
   * @param id 
   * @returns 
   */
  public deleteFaq(id: string, intent_id?: string, id_faq_kb?: string) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };
    let url = this.FAQ_URL + id;
    if(intent_id) url = this.FAQ_URL + 'intentId' + intent_id + '?id_faq_kb=' + id_faq_kb; 
    // if(intent_id) url = this.FAQ_URL + 'intentId' + intent_id; 
    this.logger.log('[FAQ-SERV] DELETE FAQ URL ', url);
    return this._httpClient.delete(url, httpOptions)
  }

  /**
   * UPDATE TRAIN BOT FAQ
   * @param id 
   * @param question 
   * @param answer 
   * @returns 
   */
  public updateTrainBotFaq(id: string, question: string, answer: string) {
    this.logger.log('[FAQ-SERV] - UPDATE TRAIN BOT FAQ - ID ', id);

    const httpOptions = {
      headers: new HttpHeaders({
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };

    let url = this.FAQ_URL + id;
    this.logger.log('[FAQ-SERV] - UPDATE TRAIN BOT FAQ - PUT URL ', url);

    const body = { 'question': question, 'answer': answer };
    this.logger.log('[FAQ-SERV] - UPDATE TRAIN BOT FAQ - BODY ', body);

    return this._httpClient.put(url, JSON.stringify(body), httpOptions)
  }


  /**
   * SEARCH FAQ BY BOT ID
   * @param botId 
   * @param question 
   * @returns 
   */
  public searchFaqByFaqKbId(botId: string, question: string) {

    const httpOptions = {
      headers: new HttpHeaders({
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };

    const url = this.SERVER_BASE_PATH + this.project_id + '/faq_kb/' + 'askbot';
    const body = { 'id_faq_kb': botId, 'question': question };

    return this._httpClient.post(url, JSON.stringify(body), httpOptions)
  }



  public patchAttributes(id: string, attributes: any): Observable<Intent> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };
    let url = this.SERVER_BASE_PATH + this.project_id + '/faq/' + id + '/attributes';
    let body = JSON.stringify(attributes);
    return this._httpClient.patch<Intent>(url, body, httpOptions)
    // return this._httpClient.patch(url, body, httpOptions)
  }


  public opsUpdate(payload: any) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };
    let url = this.SERVER_BASE_PATH + this.project_id + '/faq/ops_update'; 
    let body = JSON.stringify(payload);
    this.logger.log('[FAQ-SERV] ops_update FAQ - URL ', url);
    this.logger.log('[FAQ-SERV] ops_update FAQ - PUT REQUEST BODY ', payload);
    return this._httpClient.post(url, body, httpOptions);
  }

}
