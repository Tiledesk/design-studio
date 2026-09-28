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
import { ReadOnlyService } from './read-only.service';
import { of } from 'rxjs';
/**
 * Il corpo della richiesta di pubblicazione multipla.
 *
 * `chatbots` deve essere un array di OGGETTI con dentro `id`: il servizio rifiuta con 400
 * una lista di stringhe. La nota di rilascio si manda solo se c'e' -- in sua assenza il
 * servizio scrive "No comment" da se'.
 *
 * Pura ed esportata apposta: e' l'unico punto in cui un errore si paga con un 400 a
 * pubblicazione avviata, ed e' provabile senza montare nulla.
 */
export function buildPublishMultiBody(chatbotIds: string[], release_note: string | null): { chatbots: Array<{ id: string }>, release_note?: string } {
  const body: { chatbots: Array<{ id: string }>, release_note?: string } = {
    chatbots: (chatbotIds || []).map(id => ({ id }))
  };
  if (release_note && release_note.trim()) {
    body.release_note = release_note;
  }
  return body;
}

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
    private _httpClient: HttpClient,
    private readonly readOnlyService: ReadOnlyService
  ) {
  }

  /**
   * Sola lettura: nessuna scrittura sul chatbot parte da questa scheda.
   *
   * Il pannello di pubblicazione e le impostazioni non sono nemmeno raggiungibili senza
   * header e sidebar, ma nascondere un pulsante non e' impedire un'azione: il guard sta
   * qui, dove l'azione accadrebbe davvero.
   */
  private blockedByReadOnly(what: string): boolean {
    if (this.readOnlyService.readOnly) {
      this.logger.log('[FAQ-KB.SERV] read-only: ' + what + ' non inviata');
      return true;
    }
    return false;
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
  public getFaqKbByProjectId(): Observable<Chatbot[]> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };

    const url = this.FAQKB_URL;
    this.logger.log('[FAQ-KB.SERV] - GET FAQ-KB BY PROJECT ID - URL', url);

    return this._httpClient.get<Chatbot[]>(url, httpOptions).pipe(map((response) => {
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

  /**
   * READ — elenco dei SUBAGENT collegati a un chatbot.
   * API: GET {SERVER_BASE_PATH}{project_id}/faq_kb/{faq_kb_id}/subagents
   */
  public getSubagentsByFaqKbId(faq_kb_id: string): Observable<Chatbot[]> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };
    const url = this.FAQKB_URL + faq_kb_id + '/subagents';
    this.logger.log('[FAQ-KB.SERV] - GET SUBAGENTS - URL', url);
    return this._httpClient.get<Chatbot[]>(url, httpOptions).pipe(map((res) => {
      this.logger.log('[FAQ-KB.SERV] - GET SUBAGENTS - RES', res);
      return res;
    }));
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
   * CREATE (POST) — crea un nuovo faq_kb (es. subagent).
   * API: POST {SERVER_BASE_PATH}{project_id}/faq_kb/
   * payload es.: { id_project, language, name, subtype:'subagent', template:'blank', type:'tilebot', parent_id }
   */
  public createFaqKb(payload: any): Observable<Chatbot> {
    if (this.blockedByReadOnly('createFaqKb')) { return of(null as any); }
    const httpOptions = {
      headers: new HttpHeaders({
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };
    const url = this.FAQKB_URL;
    this.logger.log('[FAQ-KB.SERV] - CREATE FAQ-KB - URL', url, payload);
    return this._httpClient.post<Chatbot>(url, JSON.stringify(payload), httpOptions).pipe(map((res) => {
      this.logger.log('[FAQ-KB.SERV] - CREATE FAQ-KB - RES', res);
      return res;
    }));
  }

  /**
   * DELETE — elimina un faq_kb (es. un subagent).
   * API: DELETE {SERVER_BASE_PATH}{project_id}/faq_kb/{id}
   */
  public deleteFaqKb(id: string): Observable<any> {
    if (this.blockedByReadOnly('deleteFaqKb')) { return of<any>(null); }
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };
    const url = this.FAQKB_URL + id;
    this.logger.log('[FAQ-KB.SERV] - DELETE FAQ-KB - URL', url);
    return this._httpClient.delete(url, httpOptions);
  }

  /**
   * UPDATE (PUT)
   * @param id
   * @param fullName
   */
  public updateFaqKb(chatbot: Chatbot) {
    if (this.blockedByReadOnly('updateFaqKb')) { return of<any>(null); }
    const httpOptions = {
      headers: new HttpHeaders({
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };

    let url = this.FAQKB_URL + chatbot._id;
    this.logger.log('update BOT - URL ', url);
    
    // if (chatbot.type === 'internal' || chatbot.type === 'tilebot') {
    //   chatbot['webhook_enabled'] = webkookisenalbled;
    //   chatbot['webhook_url'] = webhookurl
    //   chatbot['language'] = resbotlanguage
    // }
    this.logger.log('[FAQ-KB.SERV] updateFaqKb - BODY ', chatbot);
    return this._httpClient.put(url, JSON.stringify(chatbot), httpOptions)
  }

  /**
   * UPDATE (PUT)
   * @param id
   * @param fullName
   */
  public updateFaqKbAgentsAvailable(id: string, agents_available: boolean) {
    if (this.blockedByReadOnly('updateFaqKbAgentsAvailable')) { return of<any>(null); }
    const httpOptions = {
      headers: new HttpHeaders({
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };

    let url = this.FAQKB_URL + id;
    this.logger.log('update BOT - URL ', url);
    let body = { 
      'agents_available': agents_available, 
    };
    this.logger.log('[FAQ-KB.SERV] updateFaqKb - BODY ', body);
    return this._httpClient.put(url, JSON.stringify(body), httpOptions)
  }
  

  // PROJECT_ID/faq_kb/FAQ_KB_ID/language/LANGUAGE

  updateFaqKbLanguage (id: string, chatbotlanguage: string) {
    if (this.blockedByReadOnly('updateFaqKbLanguage')) { return of<any>(null); }
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
    if (this.blockedByReadOnly('updateChatbot')) { return of<any>(null); }
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

  public publish(chatbot: Chatbot, releaseid: string , release_note:string) {
    if (this.blockedByReadOnly('publish')) { return of<any>(null); }
    this.logger.log(' publish BOT chatbot id ' , chatbot._id)
    this.logger.log(' publish BOT releaseid ' , releaseid)
    this.logger.log(' publish BOT release_note ' , release_note)
    const httpOptions = {
      headers: new HttpHeaders({
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    }

    let url = this.FAQKB_URL + chatbot._id + "/publish"; // id chatbot originale
    this.logger.log('publish BOT - URL ', url);
    // let body = { 'release_note': release_note }
    let body = { }
    if (release_note !== null && releaseid === null) {
      body['release_note'] = release_note
    } else  if (release_note === null && releaseid !== null){
      body['restore_from'] = releaseid
    }
    this.logger.log('publish BOT - URL ', body);
    return this._httpClient.put(url, body, httpOptions)
  }

  /**
   * Pubblica in una sola volta un agent e i suoi subagent.
   *
   * Il servizio pretende un array di OGGETTI con dentro `id`: una lista di stringhe
   * viene rifiutata con 400. L'id del parent puo' stare nell'array come gli altri --
   * il controllo di parentela lo scarta e poi lo pubblica insieme ai figli.
   *
   * La risposta porta l'esito di ciascuno in `results`. Se anche uno solo fallisce lo
   * stato e' 500, ma `results` c'e' lo stesso nel corpo dell'errore: va letto, altrimenti
   * dopo una pubblicazione riuscita a meta' non si sa cosa sia stato pubblicato.
   */
  public publishMulti(parentId: string, chatbotIds: string[], release_note: string | null) {
    if (this.blockedByReadOnly('publishMulti')) { return of<any>(null); }
    const httpOptions = {
      headers: new HttpHeaders({
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    }
    const url = this.FAQKB_URL + parentId + '/publish/multi';
    const body = buildPublishMultiBody(chatbotIds, release_note);
    this.logger.log('[FAQ-KB.SERV] - PUBLISH MULTI - URL', url, body);
    return this._httpClient.put(url, body, httpOptions)
  }

  /**
   * Riporta il chatbot di sviluppo al contenuto di una versione pubblicata.
   *
   * `chatbotId` e' lo **sviluppo**, `releaseId` la release: passarli al contrario viene
   * rifiutato dal servizio con un 400, e cosi' anche una release che non appartiene a
   * quel chatbot.
   *
   * E' l'operazione distruttiva di questa schermata: i blocchi dello sviluppo vengono
   * sovrascritti con quelli della release e non si recuperano. Sopravvivono solo le
   * variabili globali. I subagent non vengono toccati: la release e' del solo chatbot
   * su cui si sta lavorando.
   */
  public restoreFromPublished(chatbotId: string, releaseId: string) {
    if (this.blockedByReadOnly('restoreFromPublished')) { return of<any>(null); }
    const httpOptions = {
      headers: new HttpHeaders({
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    }
    const url = this.FAQKB_URL + chatbotId + '/restore/' + releaseId;
    this.logger.log('[FAQ-KB.SERV] - RESTORE FROM PUBLISHED - URL', url);
    return this._httpClient.put(url, {}, httpOptions)
  }

  /**
   * DELETE dell'intero agent (chatbot). Il server rimuove il documento `faq_kb`
   * e, in cascade, i suoi blocchi. Operazione irreversibile.
   */
  public deleteBot(botId: string) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };

    const url = this.FAQKB_URL + botId;
    this.logger.log('[FAQ-KB.SERV] - DELETE BOT - URL', url);

    return this._httpClient.delete(url, httpOptions);
  }


  public getBotReleaseHistory(botid: string): Observable<FaqKb> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };
    let url = this.FAQKB_URL + botid + '/published';
    this.logger.log('[FAQ-KB.SERV] - GET FAQ-KB RELEASE HISTORY - URL', url);
    return this._httpClient.get<FaqKb>(url, httpOptions)
  }



  addNodeToChatbotAttributes(idBot: string, key:string,  json:any) {
    if (this.blockedByReadOnly('addNodeToChatbotAttributes')) { return of<any>(null); }
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
    if (this.blockedByReadOnly('addRuleToChatbot')) { return of<any>(null); }
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
    if (this.blockedByReadOnly('patchAttributes')) { return of<any>(null); }
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
