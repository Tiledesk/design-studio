import { Chatbot } from 'src/app/models/faq_kb-model';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { FaqKb } from '../models/faq_kb-model';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { AppConfigService } from './app-config';
import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';
@Injectable()
export class FaqKbService {

  SERVER_BASE_PATH: string;
  FAQKB_URL: any;

  private tiledeskToken: string;
  private project_id: string;


  // user: any;
  public $nativeBotName: BehaviorSubject<string> = new BehaviorSubject<string>('')

  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    public appConfigService: AppConfigService,
    public appStorageService: AppStorageService,
    private _httpClient: HttpClient
  ) {
  }

  initialize(serverBaseUrl: string, projectId: string){
    this.logger.log('[FAQ-KB.SERV] initialize', serverBaseUrl);
    this.SERVER_BASE_PATH = serverBaseUrl;
    this.tiledeskToken = this.appStorageService.getItem('tiledeskToken');
    this.project_id = projectId;
    this.FAQKB_URL = this.SERVER_BASE_PATH + this.project_id + '/faq_kb/'
  }

  /**
   * READ (GET ALL FAQKB WITH THE CURRENT PROJECT ID)
   * NOTE: chat21-api-node.js READ THE CURRENT PROJECT ID FROM THE URL SO IT SO NO LONGER NECESSARY TO PASS THE PROJECT 
   * ID AS PARAMETER
   */
  public getFaqKbByProjectId(): Observable<FaqKb[]> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };

    const url = this.FAQKB_URL;
    this.logger.log('[FAQ-KB.SERV] - GET FAQ-KB BY PROJECT ID - URL', url);

    return this._httpClient.get<FaqKb[]>(url, httpOptions).pipe(map((response) => {
            const data = response;
            // Does something on data.data
            this.logger.log('[FAQ-KB.SERV] GET FAQ-KB BY PROJECT ID - data', data);

            data.forEach(d => {
              if (d.description) {
                let stripHere = 20;
                d['truncated_desc'] = d.description.substring(0, stripHere) + '...';
              }
            });
            // return the modified data:
            return data;
          })
      );
  }

  // ------------------------------------------------------------
  // with all=true the response return also the identity bot 
  // ------------------------------------------------------------
  public getAllBotByProjectId(): Observable<FaqKb[]> {

    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };

    const url = this.FAQKB_URL + '?all=true';
    this.logger.log('[FAQ-KB.SERV] - GET *ALL* FAQ-KB BY PROJECT ID - URL', url);

    return this._httpClient.get<FaqKb[]>(url, httpOptions).pipe(
        map(
          (response) => {
            const data = response;
            // Does something on data.data
            this.logger.log('[FAQ-KB.SERV] GET *ALL* FAQ-KB BY PROJECT ID - data', data);

            data.forEach(d => {
              this.logger.log('[FAQ-KB.SERV] - GET *ALL* FAQ-KB BY PROJECT ID URL data d', d);
              if (d.description) {
                let stripHere = 20;
                d['truncated_desc'] = d.description.substring(0, stripHere) + '...';
              }
            });
            // return the modified data:
            return data;
          })
      );
  }


  public getBotById(id: string): Observable<FaqKb> {

    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };

    let url = this.FAQKB_URL + id;
    this.logger.log('[FAQ-KB.SERV] - GET FAQ-KB BY ID - URL', url);
    return this._httpClient.get<FaqKb>(url, httpOptions)
  }
 
  /**
   * UPDATE (PUT)
   * @param id
   * @param fullName
   */
  public updateFaqKb(id: string, name: string, urlfaqkb: string, bottype: string, faqKb_description: string, webkookisenalbled: any, webhookurl, resbotlanguage: string) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };

    let url = this.FAQKB_URL + id;
    this.logger.log('update BOT - URL ', url);

    let body = {}
    body = { 
      'name': name, 
      'url': urlfaqkb, 
      'type': bottype, 
      'description': faqKb_description
    };
    
    if (bottype === 'internal' || bottype === 'tilebot') {
      body['webhook_enabled'] = webkookisenalbled;
      body['webhook_url'] = webhookurl
      body['language'] = resbotlanguage
    }
    this.logger.log('[FAQ-KB.SERV] updateFaqKb - BODY ', body);
    return this._httpClient.put(url, JSON.stringify(body), httpOptions)
  }
  // PROJECT_ID/faq_kb/FAQ_KB_ID/language/LANGUAGE

  updateFaqKbLanguage (id: string, chatbotlanguage: string) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };

    let url = this.FAQKB_URL + id + '/language/' + chatbotlanguage;
    this.logger.log('update BOT LANG - URL ', url);

  
   const body = {  'language': chatbotlanguage };
    
    this.logger.log('[FAQ-KB.SERV] update BOT LANG - BODY ', body);
    return this._httpClient.put(url, JSON.stringify(body), httpOptions)

  }

  public updateChatbot(chatbot: Chatbot) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    }

    let url = this.FAQKB_URL + chatbot._id;
    this.logger.log('update BOT - URL ', url);
    this.logger.log('[FAQ-KB.SERV] updateFaqKb - BODY ', chatbot);

    return this._httpClient.put(url, JSON.stringify(chatbot), httpOptions)
  }

  public getJWT(id: string) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    }

    let url = this.FAQKB_URL + id + '/jwt';
    this.logger.log('update BOT - URL ', url);

    return this._httpClient.get(url, httpOptions)
  }
  // http://localhost:3000/63ea8812b48b3e22c9372f05/faq_kb/63ea8820b48b3e22c9372f83/publish

  public publish(chatbot: Chatbot) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    }

    let url = this.FAQKB_URL + chatbot._id + "/publish";
    this.logger.log('publish BOT - URL ', url);


    return this._httpClient.put(url, null, httpOptions)
  }

  addNodeToChatbotAttributes(idBot: string, key:string,  json:any) {
    this.logger.log('[FAQ-KB.SERV] - addNodeToAttributesChatbot idBot ', idBot)
    const httpOptions = {
      headers: new HttpHeaders({
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };
    let url = this.SERVER_BASE_PATH + this.project_id + '/bots/' + idBot + '/attributes';
    this.logger.log('addRuleToChatbot BOT - URL ', url);
    let body = { [key]: json }
    this.logger.log('[FAQ-KB.SERV] updateFaqKb - BODY ', body);
    return this._httpClient.patch(url, body, httpOptions)
  }



  addRuleToChatbot(idBot: string, rule: any[]) {
    this.logger.log('[FAQ-KB.SERV] - addRuleToChatbot idBot ', idBot)
    const httpOptions = {
      headers: new HttpHeaders({
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };

    let url = this.SERVER_BASE_PATH + this.project_id + '/bots/' + idBot + '/attributes';
    this.logger.log('addRuleToChatbot BOT - URL ', url);

    let body = { "rules": rule }
    this.logger.log('[FAQ-KB.SERV] updateFaqKb - BODY ', body);
    return this._httpClient.patch(url, body, httpOptions)
  }

  public patchAttributes(id: string, attributes: any): Observable<FaqKb> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };
    let url = this.SERVER_BASE_PATH + this.project_id + '/faq_kb/' + id + '/attributes';
    let body = JSON.stringify(attributes);
    this.logger.log('[FAQ-KB.SERV] updateFaqKb - BODY ', url, body);
    return this._httpClient.patch(url, body, httpOptions)
  }

}
