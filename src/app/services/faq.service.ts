import { HttpHeaders, HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { Intent } from 'src/app/models/intent-model';
import { Faq } from 'src/app/models/faq-model';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { AppConfigProvider } from './app-config';
@Injectable()
export class FaqService {

  SERVER_BASE_PATH: string;
  FAQ_URL: any;
  EXPORT_FAQ_TO_CSV_URL: string;
  TOKEN: string
  user: any;
  project: any;

  private logger: LoggerService = LoggerInstance.getInstance();
  
  constructor(
    private auth: AuthService,
    public appConfigProvider: AppConfigProvider,
    private _httpClient: HttpClient
  ) {
    // SUBSCRIBE TO USER BS
    this.user = auth.user_bs.value
    this.checkIfUserExistAndGetToken()

    this.auth.user_bs.subscribe((user) => {
      this.user = user;
      this.checkIfUserExistAndGetToken()
    });
    this.getAppConfig();
    this.getCurrentProjectAndBuildFaqUrls();
  }

  getAppConfig() {
    this.SERVER_BASE_PATH = this.appConfigProvider.getConfig().SERVER_BASE_URL;
    // this.logger.log('[FAQ-SERV] getAppConfig SERVER_BASE_PATH ', this.SERVER_BASE_PATH);
  }
  
  getCurrentProjectAndBuildFaqUrls() {
    // this.logger.log('[FAQ-SERV] - SUBSCRIBE TO CURRENT PROJCT ')
    this.auth.project_bs.subscribe((project) => {
      this.project = project

      if (this.project) {
        this.logger.log('[FAQ-SERV] project ID ', this.project._id)
        this.FAQ_URL = this.SERVER_BASE_PATH + this.project._id + '/faq/';
        this.EXPORT_FAQ_TO_CSV_URL = this.SERVER_BASE_PATH + this.project._id + '/faq/csv';
        this.logger.log('[FAQ-SERV] - FAQ_URL (built with SERVER_BASE_PATH) ', this.FAQ_URL);
        this.logger.log('[FAQ-SERV] - EXPORT_FAQ_TO_CSV_URL (built with SERVER_BASE_PATH) ', this.EXPORT_FAQ_TO_CSV_URL);
      }
    });
  }

  checkIfUserExistAndGetToken() {
    if (this.user) {
      this.TOKEN = this.user.token
      // this.getToken();
    } else {
      this.logger.log('[FAQ-SERV] - No user is signed in');
    }
  }

  /**
   * READ DETAIL (GET FAQ BY FAQ ID)
   * @param id 
   * @returns 
   */
  public getFaqById(id: string): Observable<Faq[]> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.TOKEN
      })
    };

    let url = this.FAQ_URL + id;
    this.logger.log('[FAQ-SERV] - GET FAQ BY FAQ-ID URL', url);

    return this._httpClient
      .get<Faq[]>(url, httpOptions)
  }

  /**
   * GET FAQ BY FAQ-KB ID (alias BY BOT ID)
   * @param id_faq_kb 
   * @returns 
   */
  public getPaginatedFaqByFaqKbId(id_faq_kb: string, pagenum: number, faqxpagelimit: number, textosearch: string): Observable<Faq[]> {

    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.TOKEN
      })
    };

    this.logger.log('[FAQ-SERV] - GET PAGINATED FAQ BY BOT-ID - pagenum', pagenum);
    this.logger.log('[FAQ-SERV] - GET PAGINATED FAQ BY BOT-ID - faqxpagelimit', faqxpagelimit);
    this.logger.log('[FAQ-SERV] - GET PAGINATED FAQ BY BOT-ID - textosearch', textosearch);

    let url = ''
    if (textosearch === undefined) {
      url = this.FAQ_URL + '?id_faq_kb=' + id_faq_kb + '&page=' + pagenum + '&limit=' + faqxpagelimit;
    } else {
      url = this.FAQ_URL + '?id_faq_kb=' + id_faq_kb + '&page=' + pagenum + '&limit=' + faqxpagelimit + '&text=' + textosearch;
    }
    this.logger.log('[FAQ-SERV] - GET PAGINATED FAQ BY BOT-ID - URL', url);


    return this._httpClient
      .get<Faq[]>(url, httpOptions)
  }

  /**
 * GET COUNT OF REPLIES OF BOT 
 * @param botId 
 * @returns 
 */
  getCountOfFaqReplies(botId) {
    this.logger.log("[FAQ-SERV] GET COUNT OF REPLIES OF FAQ OF THE BOT-ID: ", botId);
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': this.TOKEN
    })

    let params = new HttpParams().set('sender', 'bot_' + botId);

    return this._httpClient.get(this.SERVER_BASE_PATH + this.project._id + '/analytics/requests/aggregate/attributes/_answerid', { headers: headers, params: params });
  }

  /**
   * Get count of all searced faq
   * @param id_faq_kb 
   * @param textosearch 
   * @returns 
   */
  public getCountOfAllSearcedFaq(id_faq_kb: string, textosearch: string): Observable<Faq[]> {
    this.logger.log('[FAQ-SERV] - GET ALL SEARCED - textosearch', textosearch);

    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.TOKEN
      })
    };

    let url = ''
    if (textosearch !== undefined) {
      url = this.FAQ_URL + '?id_faq_kb=' + id_faq_kb + '&text=' + textosearch;
    }
    this.logger.log('[FAQ-SERV] - GET ALL SEARCED - URL', url);

    return this._httpClient
      .get<Faq[]>(url, httpOptions)
  }

  /**
 * GET FAQ BY FAQ-KB ID (alias BY BOT ID)
 * @param id_faq_kb 
 * @returns 
 */

public _getAllFaqByFaqKbId(id_faq_kb: string): Observable<Intent[]> {

  const httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': this.TOKEN
    })
  };
 
  let url = this.FAQ_URL + '?id_faq_kb=' + id_faq_kb;
  this.logger.log('[FAQ-SERV] - GET FAQ BY FAQ-KB ID (BOT-ID) - URL', url);

  return this._httpClient
    .get<Intent[]>(url, httpOptions)
}
  public getAllFaqByFaqKbId(id_faq_kb: string): Observable<Faq[]> {

    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.TOKEN
      })
    };

    let url = this.FAQ_URL + '?id_faq_kb=' + id_faq_kb;
    this.logger.log('[FAQ-SERV] - GET FAQ BY FAQ-KB ID (BOT-ID) - URL', url);

    return this._httpClient
      .get<Faq[]>(url, httpOptions)
  }

  /**
   * GET FAQ BY TEXT (CONTAINED IN THE QUESTION OR IN THE ANSWER)
   * @param text 
   * @returns 
   */
  public getFaqsByText(text: string): Observable<Faq[]> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.TOKEN
      })
    };

    let url = this.FAQ_URL + '?text=' + text;
    this.logger.log('[FAQ-SERV] - GET FAQ BY TEXT (CONTAINED IN THE QUESTION OR IN THE ANSWER)', url);

    return this._httpClient
      .get<Faq[]>(url, httpOptions)
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
        'Authorization': this.TOKEN,
      }),
      responseType: 'text' as 'json'
    };

    const url = this.EXPORT_FAQ_TO_CSV_URL + '?id_faq_kb=' + id_faq_kb;
    this.logger.log('[FAQ-SERV] - EXPORT FAQS AS CSV - URL', url);

    return this._httpClient
      .get(url, httpOptions)
  }

  public exportChatbotToJSON(id_faq_kb: string) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.TOKEN,
      }),
      // responseType: 'text' as 'json'
    };

    const url = this.SERVER_BASE_PATH + this.project._id + "/faq_kb/exportjson/" + id_faq_kb;
    this.logger.log('[FAQ-SERV] - EXPORT FAQS AS JSON - URL', url);

    return this._httpClient
      .get(url, httpOptions)
  }

  public exportIntentsToJSON(id_faq_kb: string) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.TOKEN,
      }),
      // responseType: 'text' as 'json'
    };

    const url = this.SERVER_BASE_PATH + this.project._id + "/faq_kb/exportjson/" + id_faq_kb + "?intentsOnly=true";
    this.logger.log('[FAQ-SERV] - EXPORT FAQS AS JSON - URL', url);

    return this._httpClient
      .get(url, httpOptions)
  }


  public importChatbotFromJSON(id_faq_kb: string, jsonfile) {
    const options = {
      headers: new HttpHeaders({
        'Accept': 'application/json',
        'Authorization': this.TOKEN
      })
    };


    const url = this.SERVER_BASE_PATH + this.project._id + "/faq_kb/importjson/" + id_faq_kb
    this.logger.log('[FAQ-SERV] UPLOAD FAQS CSV - URL ', url);

    return this._httpClient
      .post(url, jsonfile, options)
  }

  // ( POST ../PROJECT_ID/bots/importjson/null/?create=true)
  public importChatbotFromJSONFromScratch(jsonfile) {
    const options = {
      headers: new HttpHeaders({
        'Accept': 'application/json',
        'Authorization': this.TOKEN
      })
    };


    const url = this.SERVER_BASE_PATH + this.project._id + "/faq_kb/importjson/null/?create=true"
    this.logger.log('[FAQ-SERV] UPLOAD FAQS CSV - URL ', url);

    return this._httpClient
      .post(url, jsonfile, options)
  }

  public importIntentsFromJSON(id_faq_kb: string, jsonfile, action: string) {
    const options = {
      headers: new HttpHeaders({
        'Accept': 'application/json',
        'Authorization': this.TOKEN
      })
    };

    let qsaction = ''
    if (action === "add") {
      qsaction = "&overwrite=false"
    } else if (action === "overwrite") {
      qsaction = "&overwrite=true"
    }

    const url = this.SERVER_BASE_PATH + this.project._id + "/faq_kb/importjson/" + id_faq_kb + "?intentsOnly=true" + qsaction
    this.logger.log('[FAQ-SERV] UPLOAD FAQS CSV - URL ', url);

    return this._httpClient
      .post(url, jsonfile, options)
  }


  /**
   * CREATE FAQ (POST)
   * @param question 
   * @param answer 
   * @param id_faq_kb 
   * @param intentname 
   * @param faqwebhookenabled 
   * @returns 
   */
  public addFaq(question: string, answer: string, id_faq_kb: string, intentname: string, intentform: any, faqwebhookenabled: boolean) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.TOKEN
      })
    };

    const url = this.FAQ_URL;
    this.logger.log('[FAQ-SERV] ADD FAQ -  PUT URL ', url);
    const body = { 'question': question, 'answer': answer, 'id_faq_kb': id_faq_kb, 'intent_display_name': intentname, 'webhook_enabled': faqwebhookenabled };
    if (intentform && intentform.fields && intentform.fields.length > 0) {
      body['form'] = intentform;
    }
    this.logger.log('[FAQ-SERV] ADD FAQ - POST BODY ', body);

    return this._httpClient
      .post(url, JSON.stringify(body), httpOptions)
  }

  /**
   * UPDATE FAQ (PUT)
   * @param id 
   * @param question 
   * @param answer 
   * @param intentname 
   * @param faqwebhookenabled 
   * @returns 
   */
  public updateFaq(id: string, question: string, answer: string, intentname: string, intentform: any, faqwebhookenabled: boolean) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.TOKEN
      })
    };
    this.logger.log('[FAQ-SERV] UPDATE FAQ - ID ', id);
    let url = this.FAQ_URL + id;
    this.logger.log('[FAQ-SERV] UPDATE FAQ - PUT URL ', url);

    const body = { 'question': question, 'answer': answer, 'intent_display_name': intentname, 'form': intentform, 'webhook_enabled': faqwebhookenabled };
    this.logger.log('[FAQ-SERV] UPDATE FAQ - PUT REQUEST BODY ', body);
    return this._httpClient
      .put(url, JSON.stringify(body), httpOptions)
  }



  /**
   * CREATE FAQ (POST)
   * @param id_faq_kb 
   * @param question 
   * @param answer 
   * @param intent_display_name 
   * @param intent_form
   * @param intent_reply
   * @param webhook_enabled 
   * @returns 
   */
   public addIntent(id_faq_kb: string, attributes: any, question: any, answer: string, intent_display_name: string, intent_id: string, intent_form: any, intent_actions: any, webhook_enabled: boolean) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.TOKEN
      })
    };
    const url = this.FAQ_URL;
    this.logger.log('[FAQ-SERV] ADD FAQ -  PUT URL ', url);
    const body = { 
      'id_faq_kb': id_faq_kb, 
      'attributes': attributes,
      'question': question, 
      'answer': answer, 
      'intent_display_name': intent_display_name, 
      'intent_id': intent_id,
      'form': intent_form,
      'actions': intent_actions,
      'webhook_enabled': webhook_enabled 
    };
    this.logger.log('[FAQ-SERV] ADD FAQ - POST BODY ', body);
    return this._httpClient.post(url, JSON.stringify(body), httpOptions)
  }

  /**
   * UPDATE FAQ (PUT)
   * @param id 
   * @param question 
   * @param answer 
   * @param intent_display_name 
   * @param intent_form 
   * @param intent_reply 
   * @param webhook_enabled 
   * @returns 
   */
   public updateIntent(id: string, attributes: any, question: any, answer: string, intent_display_name: string, intent_form: any, intent_actions: any, webhook_enabled: boolean) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.TOKEN
      })
    };
    this.logger.log('[FAQ-SERV] UPDATE FAQ - ID ', id);
    let url = this.FAQ_URL + id; 
    this.logger.log('[FAQ-SERV] UPDATE FAQ - PUT URL ', url);
    const body = { 
      'attributes': attributes, 
      'question': question, 
      'answer': answer, 
      'intent_display_name': intent_display_name, 
      'form': intent_form,
      'actions': intent_actions,
      'webhook_enabled': webhook_enabled 
    };
    this.logger.log('----------->>>', intent_actions, body);
    this.logger.log('[FAQ-SERV] UPDATE FAQ - PUT REQUEST BODY ', body);
    return this._httpClient.put(url, JSON.stringify(body), httpOptions);
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
        'Authorization': this.TOKEN
      })
    };

    const url = this.FAQ_URL;
    this.logger.log('[FAQ-SERV] CREATE TRAIN BOT FAQ - URL ', url);

    const body = { 'question': question, 'answer': answer, 'id_faq_kb': id_faq_kb };
    this.logger.log('[FAQ-SERV] CREATE TRAIN BOT FAQ - BODY ', body);

    return this._httpClient
      .post(url, JSON.stringify(body), httpOptions)
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
        'Authorization': this.TOKEN
      })
    };

    const url = this.FAQ_URL + 'uploadcsv';
    this.logger.log('[FAQ-SERV] UPLOAD FAQS CSV - URL ', url);

    return this._httpClient
      .post(url, formData, options)
  }

  /**
   * DELETE FAQ (DELETE)
   * @param id 
   * @returns 
   */
  public deleteFaq(id: string) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.TOKEN
      })
    };

    let url = this.FAQ_URL + id;
    this.logger.log('[FAQ-SERV] DELETE FAQ URL ', url);

    return this._httpClient
      .delete(url, httpOptions)
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
        'Authorization': this.TOKEN
      })
    };

    let url = this.FAQ_URL + id;
    this.logger.log('[FAQ-SERV] - UPDATE TRAIN BOT FAQ - PUT URL ', url);

    const body = { 'question': question, 'answer': answer };
    this.logger.log('[FAQ-SERV] - UPDATE TRAIN BOT FAQ - BODY ', body);

    return this._httpClient
      .put(url, JSON.stringify(body), httpOptions)
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
        'Authorization': this.TOKEN
      })
    };

    const url = this.SERVER_BASE_PATH + this.project._id + '/faq_kb/' + 'askbot';
    const body = { 'id_faq_kb': botId, 'question': question };

    return this._httpClient
      .post(url, JSON.stringify(body), httpOptions)
  }



  public patchAttributes(id: string, attributes: any): Observable<Intent> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.TOKEN
      })
    };
    let url = this.SERVER_BASE_PATH + this.project._id + '/faq/' + id + '/attributes';
    let body = JSON.stringify(attributes);
    console.log('[FAQ.SERV] updateFaq - BODY ', url, body);
    return this._httpClient
    .patch<Intent>(url, body, httpOptions)
    // return this._httpClient.patch(url, body, httpOptions)
  }


}
