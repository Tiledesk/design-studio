import { Injectable } from '@angular/core';
import { TiledeskConnectors } from 'src/assets/js/tiledesk-connectors.js';
import { TYPE_BUTTON, isElementOnTheStage, generateShortUID, getOpacityFromRgba, getColorFromRgba } from '../utils';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

import { Setting } from 'src/app/models/action-model';
import { TYPE_ACTION, TYPE_ACTION_VXML, isReturnStackIntent } from '../utils-actions';
import { Subject, BehaviorSubject, Observable } from 'rxjs';
import { filter, map, shareReplay } from 'rxjs/operators';

/** Quante volte `ensureConnectorsDrawn` guarda lo stage prima di arrendersi.
 *  Tre e non "finche' non riesce": un connettore verso un blocco che non c'e'
 *  davvero non comparira' mai, e un ciclo senza fine sarebbe peggio del difetto. */
const CONNECTOR_DRAW_ATTEMPTS = 3;

/** L'attesa prima di ogni nuovo tentativo, in millisecondi -- una per tentativo
 *  dopo il primo. Cresce perche' le due cause sono diverse: una carta in ritardo
 *  di un fotogramma, e un lotto grande che il browser sta ancora impaginando. */
const CONNECTOR_DRAW_RETRY_MS = [80, 400];


// SERVICES //
// import { StageService } from '../services/stage.service';


/** CLASSE DI SERVICES PER GESTIRE I CONNETTORI **/


@Injectable({
  providedIn: 'root'
})

export class ConnectorService {
 

  private readonly subjectChangedConnectorAttributes = new Subject<any>();
  observableChangedConnectorAttributes = this.subjectChangedConnectorAttributes.asObservable();
  
  // Observable per notificare cambiamenti ai connettori in ingresso di un intent specifico
  private readonly connectorsInChangedSubject = new Subject<{ intentId: string, connectors: any[] }>();
  public readonly connectorsInChanged$ = this.connectorsInChangedSubject.asObservable();
  
  // Cache per gli observable dei connettori in ingresso per ogni intent
  private connectorsInObservablesCache: Map<string, Observable<any[]>> = new Map();
  
  // Flag per indicare se il listener globale è stato inizializzato
  private globalConnectorListenerInitialized = false;
  
  listOfConnectors: any = {};
  tiledeskConnectors: any;
  connectorDraft: any = {};
  listOfIntents: any;
  mapOfConnectors: any = {};
  scale: number = 1;
  existingIntentIds: any;
  
  // Coda per connettori che hanno fallito il rendering
  private failedConnectorsQueue: Array<{intent: any, fromId: string, toId: string, attributes: any, retryCount: number}> = [];
  private retryIntervalId: any = null;
  private readonly MAX_RETRY_ATTEMPTS = 5;

  private readonly logger: LoggerService = LoggerInstance.getInstance();
  
  constructor(
  ) {}

  initializeConnectors(){
    this.tiledeskConnectors = new TiledeskConnectors("tds_drawer", {"input_block": "tds_input_block"}, {});
    this.tiledeskConnectors.mousedown(document);
    this.initializeGlobalConnectorListener();
  }

  /**
   * Inizializza il listener globale per gli eventi connector-created e connector-deleted.
   * Viene chiamato una sola volta per evitare listener multipli.
   * 
   * NOTA: Questi eventi vengono sollevati dal core tiledesk-connectors.js tramite
   * document.dispatchEvent(). Usiamo il capture phase (true) per processare gli eventi
   * prima degli altri listener, garantendo che gli observer vengano notificati il prima possibile.
   */
  private initializeGlobalConnectorListener(): void {
    if (this.globalConnectorListenerInitialized) {
      return;
    }

    // Listener per connector-created (evento sollevato da tiledesk-connectors.js)
    document.addEventListener("connector-created", (e: CustomEvent) => {
      const connector = e.detail?.connector;
      if (connector?.id) {
        this.handleConnectorChange(connector.id, 'created');
      }
    }, true); // Capture phase per processare prima degli altri listener

    // Listener per connector-deleted (evento sollevato da tiledesk-connectors.js)
    document.addEventListener("connector-deleted", (e: CustomEvent) => {
      const connector = e.detail?.connector;
      if (connector?.id) {
        this.handleConnectorChange(connector.id, 'deleted');
      }
    }, true); // Capture phase per processare prima degli altri listener

    this.globalConnectorListenerInitialized = true;
    this.logger.log('[CONNECTORS] Global connector listener inizializzato (usa eventi da tiledesk-connectors.js)');
  }

  /**
   * Gestisce i cambiamenti dei connettori (creazione/eliminazione)
   * Notifica solo gli intent interessati
   */
  private handleConnectorChange(connectorId: string, changeType: 'created' | 'deleted'): void {
    // Estrae l'ID dell'intent di destinazione dall'ID del connettore
    const segments = connectorId.split('/');
    const toIntentId = segments[segments.length - 1];

    if (toIntentId) {
      this.logger.log(`[CONNECTORS] Connettore ${changeType === 'created' ? 'creato' : 'eliminato'}: ${connectorId} per blocco ${toIntentId}`);
      
      // Notifica solo l'intent interessato (ricarica sempre i connettori freschi)
      const connectors = this.getConnectorsInByIntent(toIntentId);
      this.connectorsInChangedSubject.next({ intentId: toIntentId, connectors });
      
      this.logger.log(`[CONNECTORS] Notificato aggiornamento connettori per blocco ${toIntentId}: ${connectors.length} connettori totali`);
    }
  }

  /**
   * Ottiene i connettori in ingresso per un intent.
   * Cerca sempre direttamente in tiledeskConnectors senza cache.
   */
  public getConnectorsInByIntent(intentId: string): any[] {
    this.logger.log(`[CONNECTORS] Carico i connettori in ingresso per blocco ${intentId}`);
    const connectors = this.searchConnectorsInByIntent(intentId);
    this.logger.log(`[CONNECTORS] totale ${connectors.length} connettori`);
    return connectors;
  }

  /**
   * Ottiene un observable filtrato per i connettori in ingresso di un intent specifico.
   * Emette solo quando cambiano i connettori di quell'intent.
   * Usa una cache per evitare di creare osservabili multipli per lo stesso intent.
   * 
   * @param intentId - ID dell'intent per cui ricevere gli aggiornamenti
   * @returns Observable che emette l'array di connettori quando cambia
   */
  public getConnectorsInObservable(intentId: string): Observable<any[]> {
    // Se esiste già un observable in cache, lo restituisce
    if (this.connectorsInObservablesCache.has(intentId)) {
      return this.connectorsInObservablesCache.get(intentId)!;
    }

    this.logger.log(`[CONNECTORS] Creo observable per aggiornamenti connettori del blocco ${intentId}`);
    // Restituisce il valore corrente (non lo loggiamo qui perché verrà loggato da getConnectorsInByIntent)
    const currentValue = this.getConnectorsInByIntent(intentId);
    const subject = new BehaviorSubject<any[]>(currentValue);

    // Sottoscrivi agli aggiornamenti filtrati per questo intent
    this.connectorsInChanged$
      .pipe(
        filter(change => change.intentId === intentId),
        map(change => change.connectors)
      )
      .subscribe(connectors => {
        subject.next(connectors);
      });

    // Crea l'observable condiviso usando shareReplay
    // refCount: true pulisce automaticamente la subscription quando non ci sono più subscriber
    const observable = subject.asObservable().pipe(
      shareReplay({ bufferSize: 1, refCount: true })
    );

    // Metti in cache
    this.connectorsInObservablesCache.set(intentId, observable);
    this.logger.log(`[CONNECTORS] Observable creato per blocco ${intentId}`);
    
    return observable;
  }

  /** setScale
   * set the scale when loading the page, taking it from localStorage 
   * */
  setScale(scale: number){
    this.scale = scale;
    this.tiledeskConnectors.scale = scale;
  }
 
  /*************************************************/
  /** CREATE CONNECTOR                             */
  /*************************************************/
  public async setMapOfConnectors(listOfIntents){
    this.mapOfConnectors = await this.createMapOfConnectors(listOfIntents);
    return this.mapOfConnectors;
  }

  /**
   * createConnectorDraft
   * @param detail 
   */
  createConnectorDraft(detail){
    this.connectorDraft = {
      fromId: detail.fromId,
      fromPoint: detail.fromPoint,
      toPoint: detail.toPoint,
      menuPoint: detail.menuPoint,
      target: detail.target, 
      color: detail.color
    }
  }

  /**
   * addConnectorToList
   * @param connector 
   */
  public addConnectorToList(connector){
    this.listOfConnectors[connector.id] = connector;
    this.mapOfConnectors[connector.id] =  {'shown': true };
    this.logger.log('[CONNECTOR-SERV] addConnectorToList:: connector added to listOfConnectors and mapOfConnectors', connector.id)
  }

  /**
   * createNewConnector
   * @param fromId 
   * @param toId 
   * 
   */
  async createNewConnector(fromId:string, toId:string){
    this.logger.log('[CONNECTOR-SERV] createNewConnector:: fromId:', fromId, 'toId:', toId);
    let elFrom = await isElementOnTheStage(fromId); // sync
    let elTo = await isElementOnTheStage(toId); // sync
    this.logger.log('[CONNECTOR-SERV] createNewConnector:: ', elFrom, elTo);
    if (elFrom && elTo) { 
      const fromPoint = this.tiledeskConnectors.elementLogicCenter(elFrom);
      const toPoint = this.tiledeskConnectors.elementLogicTopLeft(elTo);
      this.tiledeskConnectors.createConnector(fromId, toId, fromPoint, toPoint, false, true, null);
    }
  }





  /**
   * createConnectors
   * @param intents 
   * 
   */
  public async createConnectors(intents){
    this.listOfIntents = intents;
    // Pulisci la coda di retry prima di iniziare
    this.clearRetryQueue();
    
    for (const intent of intents) {
      await this.createConnectorsOfIntent(intent);
    }
  }


  public async createMapOfConnectors(intents){
    this.logger.log('[CONNECTOR-SERV] -----> createMapOfConnectors 1::: ', intents);
    // Same reasoning as IntentService.setMapOfIntents: this describes the ONE
    // flow the canvas is building, and its only caller is that build. Carrying
    // the previous flow's connectors over was invisible while changing flow
    // meant reloading the page; with the canvas rebuilt in place they are
    // entries pointing at blocks that no longer exist on the stage.
    this.mapOfConnectors = {};
    this.listOfConnectors = {};
    this.existingIntentIds = new Set(intents.map((item) => item.intent_id));
    this.listOfIntents = intents;
    intents.forEach(async intent => {
      this.createListOfConnectorsByIntent2(intent);  
    });
    this.logger.log('[CONNECTOR-SERV] -----> createMapOfConnectors 2::: ', this.mapOfConnectors);
    return this.mapOfConnectors;
  }


  /**
   * createConnectorFromId
   * @param fromId 
   * @param toId 
   * @param save 
   * @returns 
   */
  public async createConnectorFromId(fromId, toId, notify=false, attributes=null) {
    const connectorID = fromId+'/'+toId;
    const isConnector = document.getElementById(connectorID);
    if (isConnector) {
      this.logger.log('[CONNECTOR-SERV] il connettore esiste già', connectorID);
      this.tiledeskConnectors.updateConnectorsOutOfItent(connectorID);
      return true;
    } 
    let fromEle = document.getElementById(fromId);
    if(!fromEle) {
      fromEle = await isElementOnTheStage(fromId); // sync
      this.logger.log('[CONNECTOR-SERV] isOnTheStage fromEle:', fromEle);
    }
    let toEle = document.getElementById(toId);
    if(!toEle) {
      toEle = await isElementOnTheStage(toId); // sync
      this.logger.log('[CONNECTOR-SERV] isOnTheStage toEle:', toEle);
    }
    if(fromEle && toEle){
      const fromPoint = this.tiledeskConnectors.elementLogicCenter(fromEle);
      const toPoint = this.tiledeskConnectors.elementLogicTopLeft(toEle);
      this.logger.log('[CONNECTOR-SERV] createConnector attributes:', attributes);
      this.tiledeskConnectors.createConnector(fromId, toId, fromPoint, toPoint, false, notify, attributes);
      return true;
    } else {
      return false;
    }
  }

  /**
   * 
   * @param connectorID 
   * @returns 
   */
  public async createConnectorById(connectorID) {
    this.logger.log('[CONNECTOR-SERV] createConnectorById: ', connectorID);
    const isConnector = document.getElementById(connectorID);
    if (isConnector) {
      this.logger.log('[CONNECTOR-SERV] createConnectorById il connettore esiste già', connectorID);
      this.tiledeskConnectors.updateConnectorsOutOfItent(connectorID);
      return true;
    } 
    let lastIndex = connectorID.lastIndexOf("/");
    if (lastIndex !== -1) {
      const fromId = connectorID.substring(0, lastIndex);
      let toId = connectorID.substring(lastIndex + 1);
      if (toId.startsWith('#')) {
        toId = toId.substring(1);
      }
      let fromEle = document.getElementById(fromId);
      if(!fromEle) {
        fromEle = await isElementOnTheStage(fromId); // sync
        this.logger.log('[CONNECTOR-SERV] isOnTheStageFrom', fromEle);
      }
      let toEle = document.getElementById(toId);
      if(!toEle) {
        toEle = await isElementOnTheStage(toId); // sync
        this.logger.log('[CONNECTOR-SERV] isOnTheStageFrom', toEle, toId);
      }
      if (toEle && fromEle) {
        const fromPoint = this.tiledeskConnectors.elementLogicCenter(fromEle);
        const toPoint = this.tiledeskConnectors.elementLogicTopLeft(toEle);
        this.logger.log('[CONNECTOR-SERV] createConnectorById createConnector', connectorID);
        this.tiledeskConnectors.createConnector(fromId, toId, fromPoint, toPoint, false, false, null);
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }


  /**
   * 
   * @param intentId 
   */
  private intentExists(intentId){
    const response = this.listOfIntents.some((obj) => obj.intent_id === intentId);
    this.logger.log('[CONNECTOR-SERV] intentExists::', intentId, this.listOfIntents, response);
    return response;
  }

  /**
   * refreshConnectorsOfIntent
   * @param intent 
   * 
   * create connectors from Intent
   */
  public async createConnectorsOfIntent(intent:any){
    // i nodi "Return to parent agent" sono terminali: nessun connettore in uscita,
    // anche se su blocchi legacy è rimasto salvato un nextBlockAction.intentName stantio
    if(intent.attributes?.nextBlockAction && !isReturnStackIntent(intent)){
      let idConnectorFrom = null;
      let idConnectorTo = null;
      let nextBlockAction = intent.attributes.nextBlockAction;
      if(nextBlockAction.intentName && nextBlockAction.intentName !== ''){
        idConnectorFrom = intent.intent_id+'/'+nextBlockAction._tdActionId;
        idConnectorTo = nextBlockAction.intentName.replace("#", "");
        if(!this.intentExists(idConnectorTo)){
          nextBlockAction.intentName = '';
          idConnectorTo = null;
        }
        this.logger.log('[CONNECTOR-SERV] -> CREATE CONNECTOR', intent, idConnectorFrom, idConnectorTo);
        this.createConnector(intent, idConnectorFrom, idConnectorTo);
      }
    }

    if(intent.actions){
      intent.actions.forEach(action => {
        let idConnectorFrom = null;
        let idConnectorTo = null;
        this.logger.log('[CONNECTOR-SERV] createConnectors:: ACTION ', action);
        
        /**  INTENT */
        if(action._tdActionType === TYPE_ACTION.INTENT){
          // // this.logger.log('[CONNECTOR-SERV] intent_display_name', intent.intent_display_name);
          if(action.intentName && action.intentName !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId;
            idConnectorTo = action.intentName.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.intentName = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] -> CREATE CONNECTOR', intent, idConnectorFrom, idConnectorTo);
            // // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
        }

        /**  CONNECT BLOCK */
        if(action._tdActionType === TYPE_ACTION.CONNECT_BLOCK){
          // // this.logger.log('[CONNECTOR-SERV] intent_display_name', intent.intent_display_name);
          if(action.intentName && action.intentName !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId;
            idConnectorTo = action.intentName.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.intentName = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] -> CREATE CONNECTOR', intent, idConnectorFrom, idConnectorTo);
            // // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
        }

        /**  REPLY  RANDOM_REPLY */
        if( (action._tdActionType === TYPE_ACTION.REPLY || action._tdActionType === TYPE_ACTION.RANDOM_REPLY) ||
            (action._tdActionType === TYPE_ACTION_VXML.DTMF_FORM || action._tdActionType === TYPE_ACTION_VXML.DTMF_MENU || action._tdActionType === TYPE_ACTION_VXML.BLIND_TRANSFER)){
          let buttons = this.findButtons(action);
          this.logger.log('buttons   ----- >', buttons, action);
          buttons.forEach(button => {
            // // this.logger.log('[CONNECTOR-SERV] button   ----- > ', button, button.__idConnector);
            if(button.type === TYPE_BUTTON.ACTION && button.action){
              // // const idConnectorFrom = button.__idConnector;
              if(!button.uid || button.uid === "UUIDV4"){
                button.uid = generateShortUID();
              }
              idConnectorFrom = intent.intent_id+"/"+action._tdActionId+"/"+button.uid;
              this.logger.log('[CONNECTOR-SERV] -> idConnectorFrom', idConnectorFrom);
              let startIndex = button.action.indexOf('#') + 1;
              let endIndex = button.action.indexOf('{');
              idConnectorTo = button.action.substring(startIndex);
              if(endIndex>-1){
                idConnectorTo = button.action.substring(startIndex, endIndex);
              }
              if(!this.intentExists(idConnectorTo)){
                button.action = '';
                idConnectorTo = null;
              }
              this.logger.log('[CONNECTOR-SERV] -> idConnectorFrom', idConnectorFrom);
              this.logger.log('[CONNECTOR-SERV] -> idConnectorTo', idConnectorTo);
              // // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
              this.createConnector(intent, idConnectorFrom, idConnectorTo);
            }
          });

          /** noInput and noMatch block connectors */
          if( action.settings?.noInputIntent &&  action.settings?.noInputIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/noInput';
            idConnectorTo =  action.settings.noInputIntent.replace("#", "");
            
            if(!this.intentExists(idConnectorTo)){
              action.settings.noInputIntent = '';
              idConnectorTo = null;
            }
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
          if(action.settings?.noMatchIntent && action.settings?.noMatchIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/noMatch';
            idConnectorTo = action.settings.noMatchIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.settings.noMatchIntent = '';
              idConnectorTo = null;
            }
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
        }

        /**  REPLY V2 */
        if(action._tdActionType === TYPE_ACTION.REPLYV2){
          let buttons = this.findButtons(action);
          this.logger.log('buttons   ----- >', buttons, action);
          buttons.forEach(button => {
            // //this.logger.log('[CONNECTOR-SERV] button   ----- > ', button, button.__idConnector);
            if(button.type === TYPE_BUTTON.ACTION && button.action){
              // //const idConnectorFrom = button.__idConnector;
              if(!button.uid || button.uid === "UUIDV4"){
                button.uid = generateShortUID();
              }
              idConnectorFrom = intent.intent_id+"/"+action._tdActionId+"/"+button.uid;
              this.logger.log('[CONNECTOR-SERV] -> idConnectorFrom', idConnectorFrom);
              let startIndex = button.action.indexOf('#') + 1;
              let endIndex = button.action.indexOf('{');
              idConnectorTo = button.action.substring(startIndex);
              if(endIndex>-1){
                idConnectorTo = button.action.substring(startIndex, endIndex);
              }
              if(!this.intentExists(idConnectorTo)){
                button.action = '';
                idConnectorTo = null;
              }
              this.logger.log('[CONNECTOR-SERV] -> idConnectorFrom', idConnectorFrom);
              this.logger.log('[CONNECTOR-SERV] -> idConnectorTo', idConnectorTo);
              // // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
              this.createConnector(intent, idConnectorFrom, idConnectorTo);
            }
          });
          
          if(action.noInputIntent && action.noInputIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/noInput';
            idConnectorTo = action.noInputIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.noInputIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - REPLY-V2 ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - REPLY-V2 ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
          if(action.noMatchIntent && action.noMatchIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/noMatch';
            idConnectorTo = action.noMatchIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.noMatchIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - REPLY-V2 ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - REPLY-V2 ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
        }

        /**  ONLINE_AGENTS */
        if(action._tdActionType === TYPE_ACTION.ONLINE_AGENTS || action._tdActionType === TYPE_ACTION.ONLINE_AGENTSV2){
          if(action.trueIntent && action.trueIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/true';
            idConnectorTo = action.trueIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.trueIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - ONLINE_AGENTS ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - ONLINE_AGENTS ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
          if(action.falseIntent && action.falseIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/false';
            idConnectorTo = action.falseIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.falseIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - ONLINE_AGENTS ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - ONLINE_AGENTS ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
        }

        /**  OPEN_HOURS */
        if(action._tdActionType === TYPE_ACTION.OPEN_HOURS){
          if(action.trueIntent && action.trueIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/true';
            idConnectorTo = action.trueIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.trueIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - OPEN_HOURS ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - OPEN_HOURS ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
          if(action.falseIntent && action.falseIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/false';
            idConnectorTo = action.falseIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.falseIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - OPEN_HOURS ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - OPEN_HOURS ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
        }

        /**  JSON-CONDITION (legacy) + JSON-CONDITION2 (V2): stessi connettori true/false */
        if(action._tdActionType === TYPE_ACTION.JSON_CONDITION || action._tdActionType === TYPE_ACTION.JSON_CONDITION2){
          if(action.trueIntent && action.trueIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/true';
            idConnectorTo =  action.trueIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.trueIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - JSON_CONDITION ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - JSON_CONDITION ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
          if(action.falseIntent && action.falseIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/false';
            idConnectorTo = action.falseIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.falseIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - JSON_CONDITION ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - JSON_CONDITION ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
        }

        /**  SUB-AGENT (INVOKE_SUB_AGENT) — connettori Success/Else, stessa logica di JSON_CONDITION */
        if(action._tdActionType === TYPE_ACTION.INVOKE_SUB_AGENT){
          if(action.trueIntent && action.trueIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/true';
            idConnectorTo =  action.trueIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.trueIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - INVOKE_SUB_AGENT ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - INVOKE_SUB_AGENT ACTION -> idConnectorTo', idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
          if(action.falseIntent && action.falseIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/false';
            idConnectorTo = action.falseIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.falseIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - INVOKE_SUB_AGENT ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - INVOKE_SUB_AGENT ACTION -> idConnectorTo', idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
        }

        /** ASKGPT */
        if(action._tdActionType === TYPE_ACTION.ASKGPT){
          if(action.trueIntent && action.trueIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/true';
            idConnectorTo =  action.trueIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.trueIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - ASKGPT ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - ASKGPT ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
          if(action.falseIntent && action.falseIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/false';
            idConnectorTo = action.falseIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.falseIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - ASKGPT ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - ASKGPT ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
        }

        /** ASKGPTV2 */
        if(action._tdActionType === TYPE_ACTION.ASKGPTV2){
          if(action.trueIntent && action.trueIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/true';
            idConnectorTo =  action.trueIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.trueIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - ASKGPTV2 ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - ASKGPTV2 ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
          if(action.falseIntent && action.falseIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/false';
            idConnectorTo = action.falseIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.falseIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - ASKGPTV2 ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - ASKGPTV2 ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
        }

        /**  GPT-TASK */
        if(action._tdActionType === TYPE_ACTION.GPT_TASK){
          if(action.trueIntent && action.trueIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/true';
            idConnectorTo =  action.trueIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.trueIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - GPT-TASK ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - GPT-TASK ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
          if(action.falseIntent && action.falseIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/false';
            idConnectorTo = action.falseIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.falseIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - GPT-TASK ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - GPT-TASK ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
        }

        /**  GPT-ASSISTANT */
        if(action._tdActionType === TYPE_ACTION.GPT_ASSISTANT){
          if(action.trueIntent && action.trueIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/true';
            idConnectorTo =  action.trueIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.trueIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - GPT-ASSISTANT ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - GPT-ASSISTANT ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
          if(action.falseIntent && action.falseIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/false';
            idConnectorTo = action.falseIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.falseIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - GPT-ASSISTANT ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - GPT-ASSISTANT ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
        }

        /**  AI-PROMPT */
        if(action._tdActionType === TYPE_ACTION.AI_PROMPT){
          if(action.trueIntent && action.trueIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/true';
            idConnectorTo =  action.trueIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.trueIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - AI-PROMPT ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - AI-PROMPT ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
          if(action.falseIntent && action.falseIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/false';
            idConnectorTo = action.falseIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.falseIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - AI-PROMPT ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - AI-PROMPT ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
        }

        if(action._tdActionType === TYPE_ACTION.AI_CONDITION){
          action.intents.forEach(element => {
            if(element.conditionIntentId && element.conditionIntentId !== ''){
              idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/'+element.label + '/true';
              idConnectorTo = element.conditionIntentId.replace("#", "");
              if(!this.intentExists(idConnectorTo)){
                element.conditionIntentId = '';
                idConnectorTo = null;
              }
              this.logger.log('[CONNECTOR-SERV] - AI-CONDITION ACTION -> idConnectorFrom', idConnectorFrom);
              this.logger.log('[CONNECTOR-SERV] - AI-CONDITION ACTION -> idConnectorTo', idConnectorTo);
              this.createConnector(intent, idConnectorFrom, idConnectorTo);
            }
          });
          if(action.fallbackIntent && action.fallbackIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/fallback';
            idConnectorTo = action.fallbackIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.fallbackIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - AI-CONDITION ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - AI-CONDITION ACTION -> idConnectorTo', idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
          if(action.errorIntent && action.errorIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/error';
            idConnectorTo = action.errorIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.errorIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - AI-CONDITION ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - AI-CONDITION ACTION -> idConnectorTo', idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
        }

        /** WEB-REQUEST-V2 */
        if(action._tdActionType === TYPE_ACTION.WEB_REQUESTV2){
          if(action.trueIntent && action.trueIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/true';
            idConnectorTo =  action.trueIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.trueIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - WEB-REQUEST-V2 ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - WEB-REQUEST-V2 ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
          if(action.falseIntent && action.falseIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/false';
            idConnectorTo = action.falseIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.falseIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - WEB-REQUEST-V2 ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - WEB-REQUEST-V2 ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
        }

        /** DATA-TABLE */
        if(action._tdActionType === TYPE_ACTION.DATA_TABLE){
          if(action.trueIntent && action.trueIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/true';
            idConnectorTo =  action.trueIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.trueIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - DATA-TABLE ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - DATA-TABLE ACTION -> idConnectorTo', idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
          if(action.falseIntent && action.falseIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/false';
            idConnectorTo = action.falseIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.falseIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - DATA-TABLE ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - DATA-TABLE ACTION -> idConnectorTo', idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
        }

        /** MAKE */
        if(action._tdActionType === TYPE_ACTION.MAKE){
          if(action.trueIntent && action.trueIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/true';
            idConnectorTo =  action.trueIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.trueIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - WEB-MAKE ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - WEB-MAKE ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
          if(action.falseIntent && action.falseIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/false';
            idConnectorTo = action.falseIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.falseIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - WEB-MAKE ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - WEB-MAKE ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
        }

        /**  WEB-HUBSPOT */
        if(action._tdActionType === TYPE_ACTION.HUBSPOT){
          if(action.trueIntent && action.trueIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/true';
            idConnectorTo =  action.trueIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.trueIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - WEB-HUBSPOT ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - WEB-HUBSPOT ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
          if(action.falseIntent && action.falseIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/false';
            idConnectorTo = action.falseIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.falseIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - WEB-HUBSPOT ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - WEB-HUBSPOT ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
        }

        /**  WEB-CUSTOMERIO */
        if(action._tdActionType === TYPE_ACTION.CUSTOMERIO){
          if(action.trueIntent && action.trueIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/true';
            idConnectorTo =  action.trueIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.trueIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - WEB-CUSTOMERIO ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - WEB-CUSTOMERIO ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
          if(action.falseIntent && action.falseIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/false';
            idConnectorTo = action.falseIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.falseIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - WEB-CUSTOMERIO ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - WEB-CUSTOMERIO ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
        }

          /**  WEB-BREVO */
          if(action._tdActionType === TYPE_ACTION.BREVO){
            if(action.trueIntent && action.trueIntent !== ''){
              idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/true';
              idConnectorTo =  action.trueIntent.replace("#", "");
              if(!this.intentExists(idConnectorTo)){
                action.trueIntent = '';
                idConnectorTo = null;
              }
              this.logger.log('[CONNECTOR-SERV] - WEB-BREVO ACTION -> idConnectorFrom', idConnectorFrom);
              this.logger.log('[CONNECTOR-SERV] - WEB-BREVO ACTION -> idConnectorTo', idConnectorTo);
              // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
              this.createConnector(intent, idConnectorFrom, idConnectorTo);
            }
            if(action.falseIntent && action.falseIntent !== ''){
              idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/false';
              idConnectorTo = action.falseIntent.replace("#", "");
              if(!this.intentExists(idConnectorTo)){
                action.falseIntent = '';
                idConnectorTo = null;
              }
              this.logger.log('[CONNECTOR-SERV] - WEB-BREVO ACTION -> idConnectorFrom', idConnectorFrom);
              this.logger.log('[CONNECTOR-SERV] - WEB-BREVO ACTION -> idConnectorTo', idConnectorTo);
              // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
              this.createConnector(intent, idConnectorFrom, idConnectorTo);
            }
          }

           /**  WEB-N8N */
           if(action._tdActionType === TYPE_ACTION.N8N){
            if(action.trueIntent && action.trueIntent !== ''){
              idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/true';
              idConnectorTo =  action.trueIntent.replace("#", "");
              if(!this.intentExists(idConnectorTo)){
                action.trueIntent = '';
                idConnectorTo = null;
              }
              this.logger.log('[CONNECTOR-SERV] - WEB-N8N ACTION -> idConnectorFrom', idConnectorFrom);
              this.logger.log('[CONNECTOR-SERV] - WEB-N8N ACTION -> idConnectorTo', idConnectorTo);
              // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
              this.createConnector(intent, idConnectorFrom, idConnectorTo);
            }
            if(action.falseIntent && action.falseIntent !== ''){
              idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/false';
              idConnectorTo = action.falseIntent.replace("#", "");
              if(!this.intentExists(idConnectorTo)){
                action.falseIntent = '';
                idConnectorTo = null;
              }
              this.logger.log('[CONNECTOR-SERV] - WEB-N8N ACTION -> idConnectorFrom', idConnectorFrom);
              this.logger.log('[CONNECTOR-SERV] - WEB-N8N ACTION -> idConnectorTo', idConnectorTo);
              // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
              this.createConnector(intent, idConnectorFrom, idConnectorTo);
            }
          }
        
        /** QAPLA' */
        if(action._tdActionType === TYPE_ACTION.QAPLA){
          if(action.trueIntent && action.trueIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/true';
            idConnectorTo =  action.trueIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.trueIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - QAPLA ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - QAPLA ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
          if(action.falseIntent && action.falseIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/false';
            idConnectorTo = action.falseIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.falseIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - QAPLA ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - QAPLA ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
        }

        /**  CAPTURE USER_REPLY */
        if(action._tdActionType === TYPE_ACTION.CAPTURE_USER_REPLY){
          this.logger.log('[CONNECTOR-SERV] intent_display_name', intent.intent_display_name);
          if(action.goToIntent && action.goToIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId;
            idConnectorTo = action.goToIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.goToIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
        }

        /**  ITERATION */
        if(action._tdActionType === TYPE_ACTION.ITERATION){
          this.logger.log('[CONNECTOR-SERV] ITERATION - intent_display_name', intent.intent_display_name);
          this.logger.log('[CONNECTOR-SERV] ITERATION - action:', { goToIntent: action.goToIntent, fallbackIntent: action.fallbackIntent });
          
          // goToIntent (con /goto)
          if(action.goToIntent && action.goToIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId+'/goto';
            idConnectorTo = action.goToIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              this.logger.log('[CONNECTOR-SERV] ITERATION - goToIntent target does not exist:', idConnectorTo);
              action.goToIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] ITERATION - Creating goTo connector:', { from: idConnectorFrom, to: idConnectorTo });
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
          
          // fallbackIntent (con /fallback)
          if(action.fallbackIntent && action.fallbackIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId+'/fallback';
            idConnectorTo = action.fallbackIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              this.logger.log('[CONNECTOR-SERV] ITERATION - fallbackIntent target does not exist:', idConnectorTo);
              action.fallbackIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] ITERATION - Creating fallback connector:', { from: idConnectorFrom, to: idConnectorTo });
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
        }

        /** DTMF_MENU' ||  DTMF_FORM  || SPEECH_FORM */
        if(action._tdActionType === TYPE_ACTION_VXML.DTMF_MENU  || action._tdActionType === TYPE_ACTION_VXML.DTMF_FORM
            || action._tdActionType === TYPE_ACTION_VXML.SPEECH_FORM){
          let settingCommand: Setting = action.attributes.commands.slice(-1)[0].settings
          if(settingCommand && settingCommand.noInputIntent && settingCommand.noInputIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/noInput';
            idConnectorTo =  settingCommand.noInputIntent.replace("#", "");
            
            if(!this.intentExists(idConnectorTo)){
              settingCommand.noInputIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - DTMF_MENU ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - DTMF_MENU ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
          if(settingCommand && settingCommand.noMatchIntent && settingCommand.noMatchIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/noMatch';
            idConnectorTo = settingCommand.noMatchIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              settingCommand.noMatchIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - DTMF_MENU ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - DTMF_MENU ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
        }

        /** BLIND TRANSFER' */
        if(action._tdActionType === TYPE_ACTION_VXML.BLIND_TRANSFER){
          let settingCommand: Setting = action.attributes.commands.slice(-1)[0].settings
          if(settingCommand && settingCommand.trueIntent && settingCommand.trueIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/true';
            idConnectorTo =  settingCommand.trueIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              settingCommand.trueIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - QAPLA ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - QAPLA ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
          if(settingCommand && settingCommand.falseIntent && settingCommand.falseIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/false';
            idConnectorTo = settingCommand.falseIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              settingCommand.falseIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - QAPLA ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - QAPLA ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
        }

        /** SEND WHATSAPP  */
        if(action._tdActionType === TYPE_ACTION.SEND_WHATSAPP){
          if(action.trueIntent && action.trueIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/true';
            idConnectorTo = action.trueIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.trueIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - ONLINE_AGENTS ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - ONLINE_AGENTS ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
          if(action.falseIntent && action.falseIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/false';
            idConnectorTo = action.falseIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.falseIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - ONLINE_AGENTS ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - ONLINE_AGENTS ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
        }


      });
    }
  }

  private async createConnector(intent, idConnectorFrom, idConnectorTo){
    const connectorsAttributes = intent.attributes.connectors;
    this.logger.log('[DEBUG] - createConnector ->', intent, connectorsAttributes, idConnectorFrom, idConnectorTo);
    if(idConnectorFrom && idConnectorTo){
      //const connectorID =  idConnectorFrom + '/' + idConnectorTo; 
      let attributes = {};
      if(connectorsAttributes && connectorsAttributes[idConnectorFrom]){
        attributes = connectorsAttributes[idConnectorFrom];
      }
      this.logger.log('[DEBUG] - createConnector attributes ->', idConnectorFrom, connectorsAttributes, attributes);
      const success = await this.createConnectorFromId(idConnectorFrom, idConnectorTo, false, attributes);
      
      // Se il connettore non è stato creato, aggiungilo alla coda per retry
      if (!success) {
        this.logger.log('[CONNECTOR-SERV] Connettore fallito, aggiunto alla coda retry:', idConnectorFrom, idConnectorTo);
        this.addToRetryQueue(intent, idConnectorFrom, idConnectorTo, attributes);
      }
    } else {
      this.logger.log('[DEBUG] - il connettore è rotto non esiste intent ->', idConnectorTo);
    }
  }
  
  /**
   * Aggiunge un connettore fallito alla coda per ritentare
   */
  private addToRetryQueue(intent: any, fromId: string, toId: string, attributes: any) {
    this.failedConnectorsQueue.push({
      intent,
      fromId,
      toId,
      attributes,
      retryCount: 0
    });
    
    // Avvia il processo di retry se non è già attivo
    if (!this.retryIntervalId) {
      this.startRetryProcess();
    }
  }
  
  /**
   * Avvia il processo di retry per i connettori falliti
   */
  private startRetryProcess() {
    this.logger.log('[CONNECTOR-SERV] Avvio processo retry per connettori falliti');
    
    this.retryIntervalId = setInterval(async () => {
      if (this.failedConnectorsQueue.length === 0) {
        this.logger.log('[CONNECTOR-SERV] Coda retry vuota, termino processo');
        this.stopRetryProcess();
        return;
      }
      
      this.logger.log('[CONNECTOR-SERV] Ritento creazione connettori, coda:', this.failedConnectorsQueue.length);
      
      // Processa tutti i connettori nella coda
      const connectorsToRetry = [...this.failedConnectorsQueue];
      this.failedConnectorsQueue = [];
      
      for (const connector of connectorsToRetry) {
        connector.retryCount++;
        
        if (connector.retryCount > this.MAX_RETRY_ATTEMPTS) {
          this.logger.error('[CONNECTOR-SERV] Connettore fallito definitivamente dopo', this.MAX_RETRY_ATTEMPTS, 'tentativi:', connector.fromId, connector.toId);
          continue;
        }
        
        const success = await this.createConnectorFromId(
          connector.fromId, 
          connector.toId, 
          false, 
          connector.attributes
        );
        
        // Se ancora fallisce, rimettilo in coda
        if (!success) {
          this.failedConnectorsQueue.push(connector);
        } else {
          this.logger.log('[CONNECTOR-SERV] Connettore creato con successo al tentativo', connector.retryCount, ':', connector.fromId, connector.toId);
        }
      }
    }, 500); // Ritenta ogni 500ms
  }
  
  /**
   * Ferma il processo di retry
   */
  private stopRetryProcess() {
    if (this.retryIntervalId) {
      clearInterval(this.retryIntervalId);
      this.retryIntervalId = null;
    }
  }
  
  /**
   * Pulisce la coda di retry (da chiamare quando si cambia bot o si resetta)
   */
  public clearRetryQueue() {
    this.failedConnectorsQueue = [];
    this.stopRetryProcess();
  }
  /*************************************************/


  /*************************************************/
  /** DELETE CONNECTOR                             */
  /*************************************************/

  /**
   * removeConnectorDraft
   */
  public removeConnectorDraft(){
    this.connectorDraft = null;
    this.tiledeskConnectors.removeConnectorDraft();
  }

  /**
   * deleteConnectorsOfBlockThatDontExist
   * @param intent_id 
   */
  public deleteConnectorsOfBlockThatDontExist(intent_id){
    this.tiledeskConnectors.deleteConnectorsOfBlockThatDontExist(intent_id);
    this.logger.log('[CONNECTOR-SERV] deleteConnectorsOfBlockThatDontExist intent_id ' ,intent_id);
  }

  /**
   * deleteConnectorsOutOfBlock
   * @param intent_id 
   * @param dispatch 
   */
  public deleteConnectorsOutOfBlock(intent_id, save=false, notify=true){
    this.tiledeskConnectors.deleteConnectorsOutOfBlock(intent_id, save, notify);
    // this.logger.log('[CONNECTOR-SERV] deleteConnectorsOutOfBlock intent_id ' ,intent_id);
  }

  /**
   * deleteConnectorsOfBlock
   * @param intent_id 
   */
  public deleteConnectorsOfBlock(intent_id, save=false, notify=false){
    this.logger.log('[CONNECTOR-SERV] deleteConnectorsOfBlock intent_id ' ,intent_id);
    this.tiledeskConnectors.deleteConnectorsOfBlock(intent_id, save, notify);
  }

  /**
   * deleteConnectorsBrokenOutOfBlock
   * @param intent_id 
   */
  public deleteConnectorsBrokenOutOfBlock(intent_id){
    this.tiledeskConnectors.deleteConnectorsBrokenOutOfBlock(intent_id);
    this.logger.log('[CONNECTOR-SERV] deleteConnectorsBrokenOutOfBlock intent_id ' ,intent_id )
  }

  /**
   * deleteConnectorFromAction
   * @param actionId 
   * @param connId 
   */
  public deleteConnectorFromAction(actionId, connId){
    this.tiledeskConnectors.deleteConnectorFromAction(actionId, connId);
    this.logger.log('[CONNECTOR-SERV] deleteConnectorFromAction actionId ' ,actionId ,' connId ', connId)
  }

  /**
   * deleteConnectorsFromActionByActionId
   * @param actionId 
   */
  public deleteConnectorsFromActionByActionId(actionId){
    this.tiledeskConnectors.deleteConnectorsFromActionByActionId(actionId);
    this.logger.log('[CONNECTOR-SERV] deleteConnectorsFromActionByActionId actionId ' ,actionId )
  }


  public deleteConnectorsToIntentById(intentId){
    this.tiledeskConnectors.deleteConnectorsToIntentById(intentId);
    this.logger.log('[CONNECTOR-SERV] deleteConnectorsToIntentById intentId ' ,intentId );
  }


  /**
   * deleteConnector
   * @param connectorID 
   * 
   */
  public deleteConnector(intent, idConnection, save=false, notify=true) {
    this.logger.log('[CONNECTOR-SERV] deleteConnector::  connectorID ', intent, idConnection, save, notify);
    const idConnector = idConnection.substring(0, idConnection.lastIndexOf('/'));
    this.logger.log('[CONNECTOR-SERV] 00000 ', idConnector);
    if(idConnector && intent.attributes?.connectors[idConnector]){
      delete intent.attributes.connectors[idConnector];
    }
    this.hideContractConnector(idConnection);
    this.logger.log('[CONNECTOR-SERV] deleteConnector::  intent ', intent);
    this.tiledeskConnectors.deleteConnector(idConnection, save, notify);
  }


  /**
   * 
   * @param connectorID 
   */
  public deleteConnectorToList(connectorID){
    this.logger.log('[CONNECTOR-SERV] deleteConnectorToList:: connectorID ', connectorID)
    delete this.listOfConnectors[connectorID];
    // delete this.mapOfConnectors[connectorID];
    this.logger.log('[CONNECTOR-SERV] deleteConnectorToList:: deleted from listOfConnectors and mapOfConnectors',this.listOfConnectors, this.mapOfConnectors)
  }

  /** */
  // public deleteAllConnectors(){
  //   this.logger.log('[CONNECTOR-SERV] deleteAllConnectors:: ');
  //   this.tiledeskConnectors.deleteAllConnectors();
  // }

  /**
   * eleteConnectorWithIDStartingWith 
   * @param connectorID 
   * @param dispatch 
   * 
   * elimino il connettore creato in precedenza allo stesso punto e lo sostituisco con il nuovo
   */
  public deleteConnectorWithIDStartingWith(connectorID, save=false, notify=true){
    this.logger.log('[CONNECTOR-SERV] deleteConnectorWithIDStartingWith:: ', connectorID, this.tiledeskConnectors.connectors);
    const isConnector = document.getElementById(connectorID);
    if (isConnector){
      const listOfConnectors = Object.keys(this.tiledeskConnectors.connectors)
      .filter(key => key.startsWith(connectorID))
      .reduce((filteredMap, key) => {
        filteredMap[key] = this.tiledeskConnectors.connectors[key];
        return filteredMap;
      }, {});
      for (const [key, connector] of Object.entries(listOfConnectors)) {
        this.logger.log('delete connector :: ', key );
        const intentId = connectorID.split('/')[0];
        const intent = this.listOfIntents.find((intent) => intent.intent_id === intentId);
        this.deleteConnector(intent, key, save, notify);
      };
    }
  }
  /*************************************************/



  /*************************************************/
  /** EDIT CONNECTOR                             */
  /*************************************************/

  /**
   * updateConnector
   * @param elementID 
   */
  /** Keeps the list `intentExists()` checks in step with the canvas.
   *
   *  `listOfIntents` was only assigned by `createConnectors` / `createMapOfConnectors`,
   *  on the flow's first build. IntentService replaces its array on a delete (a
   *  `filter`), so after one this service kept checking destinations against the old
   *  array: a block created afterwards did not "exist" here, and `createConnectorsOfIntent`
   *  wiped the destination pointing at it instead of drawing the edge. */
  public syncIntents(intents: any[]): void {
    if (Array.isArray(intents)) {
      this.listOfIntents = intents;
    }
  }

  /** Draws or updates every connector from and to one block: its own outgoing edges,
   *  the edges of every block pointing at it, and the position of the edges the library
   *  already has for it. For a block that has just appeared on the stage, whose
   *  connectors were attempted before its element existed.
   *
   *  `createConnectorsOfIntent` is idempotent (an existing edge is updated, not
   *  duplicated), so redrawing a source that points at this block is safe. */
  public async refreshConnectorsAroundIntent(intentId: string, intents: any[]): Promise<void> {
    this.syncIntents(intents);
    const list = Array.isArray(intents) ? intents : [];
    const target = list.find(intent => intent?.intent_id === intentId);
    if (!target) { return; }
    await this.createConnectorsOfIntent(target);
    const reference = '#' + intentId;
    for (const source of list) {
      if (!source || source.intent_id === intentId) { continue; }
      const destinations = JSON.stringify([source.actions ?? [], source.attributes?.nextBlockAction ?? null]);
      if (destinations.includes(reference)) {
        await this.createConnectorsOfIntent(source);
      }
    }
    await this.updateConnector(intentId);
  }

  public async updateConnector(elementID){
    this.logger.log('[CONNECTOR-SERV] movedConnector elementID ' ,elementID )
    const elem = await isElementOnTheStage(elementID); // chiamata sincrona
    // const elem = document.getElementById(elementID);
    if(elem){
      this.logger.log('[CONNECTOR-SERV] aggiorno i connettori: ', elem);
      //setTimeout(() => {
        this.tiledeskConnectors.updateConnectorsOutOfItent(elem);
      //}, 0);
    }
  }


  public updateConnectorAttributes(connectors: any, connector: any) {
    this.logger.log('[CONNECTOR-SERV] updateConnectorAttributes:::::  ',connectors,  connector);
    if(!connector){
      return;
    }
    if(!connectors[connector.id]){
      connectors[connector.id] = {};
    }
    Object.keys(connector).forEach(key => {
      connectors[connector.id][key] = connector[key]
    });
  }



  public updateConnectorLabel(elementID: string, label: string) {
    this.logger.log('[CONNECTOR-SERV] updateConnectorLabel:::::  ',elementID,  label);
    const lineText = document.getElementById("label_"+elementID);
    if(lineText){
      lineText.textContent = label;
      this.updateLineTextPosition(elementID, label);
    }
  }

  
  updateLineTextPosition(id: string, label: string){
    let lineText = document.getElementById("label_"+id);
    let rect = document.getElementById("rect_"+id);
    let rectLabel = lineText.getBoundingClientRect();
    if (lineText && rect) {
      let rectWidth = 0;
      let rectHeight = 0;
      if(label && label !== ''){
        rectWidth = rectLabel.width + 10;
        rectHeight = rectLabel.height + 10;
      } 
      const x = parseFloat(lineText.getAttribute("x"));
      const y = parseFloat(lineText.getAttribute("y"));
      lineText.setAttributeNS(null, "x", String(x));
      lineText.setAttributeNS(null, "y", String(y));
      rect.setAttributeNS(null, "x",  String(x - rectWidth / 2));
      rect.setAttributeNS(null, "y", String(y - rectHeight / 2));
      rect.setAttributeNS(null, "width", String(rectWidth));
      rect.setAttributeNS(null, "height", String(rectHeight));
    }
  }


  /**
   * 
   * @param elementID 
   */
  public async updateConnectorsOfBlock(elementID){
    this.logger.log('[CONNECTOR-SERV] updateConnector2 elementID ' ,elementID);
    const elem = await isElementOnTheStage(elementID); //sync
    if(elem){
      let cdsConnectors = elem.querySelectorAll('[connector]');
      this.logger.log('[CONNECTOR-SERV] elem::', Array.from(cdsConnectors));
      const elements = Array.from(cdsConnectors).map((element: HTMLElement) => element);
      elements.forEach(element => {
        const fromId = element.id;
        const connectionId = element.getAttribute('idConnection');
        this.logger.log('[CONNECTOR-SERV] element::', element, connectionId, fromId);
        for (let connectorId in this.tiledeskConnectors.connectors) {
          if (connectorId.startsWith(fromId)) {
            this.deleteConnectorById(connectorId);
          }
        }
        if(connectionId){
          this.createConnectorById(connectionId);
        }
      });
      return true;
    }
    return true;
  }


  public deleteConnectorById(connectorId) {
    let connectorElement = document.getElementById(connectorId);
    if(connectorElement){
      this.deleteConnector(connectorId, false, false);
    }
  }


  
  /**
   * moved
   * @param element 
   * @param x 
   * @param y 
   */
  public moved(element, x, y){
    this.tiledeskConnectors.moved(element, x, y);
    // this.logger.log('[CONNECTOR-SERV] moved element ' ,element , ' x ' , x ,  'y ',  y )
  }
  /*************************************************/


  /*************************************************/
  /** SEARCH CONNECTOR                             */
  /*************************************************/


/**
   * searchConnectorsInOfIntent
   * @param intent_id 
   * @returns Array di connettori in ingresso per l'intent specificato
   */
public searchConnectorsInByIntent(intent_id: string): Array<any>{
  if (!this.tiledeskConnectors) {
    this.logger.log(`[CONNECTORS] tiledeskConnectors non inizializzato per blocco ${intent_id}`);
    return [];
  }
  
  if (!this.tiledeskConnectors.connectors) {
    this.logger.log(`[CONNECTORS] tiledeskConnectors.connectors non disponibile per blocco ${intent_id}`);
    return [];
  }
  
  const connectors = Object.keys(this.tiledeskConnectors.connectors)
  .filter(key => {
    // Verifica che il connettore sia in ingresso (contiene intent_id ma non inizia con esso)
    // E che l'ultimo segmento coincida con intent_id (destinazione)
    const segments = key.split('/');
    const toIntentId = segments[segments.length - 1];
    return toIntentId === intent_id;
    //return key.includes(intent_id) && !key.startsWith(intent_id) && toIntentId === intent_id;
  })
  .reduce((filteredMap, key) => {
    filteredMap[key] = this.tiledeskConnectors.connectors[key];
    return filteredMap;
  }, {});
  const arrayConnectors = Object.values(connectors);
  return arrayConnectors;
}


   /**
   * searchConnectorsInOfIntent
   * @param intent_id 
   * @returns 
   */
   public searchConnectorsOutByIntent(intent_id: string): Array<any>{
    const connectors = Object.keys(this.tiledeskConnectors.connectors)
    .filter(key => key.includes(intent_id) && key.startsWith(intent_id) )
    .reduce((filteredMap, key) => {
      filteredMap[key] = this.tiledeskConnectors.connectors[key];
      return filteredMap;
    }, {});
    const arrayConnectors = Object.values(connectors);
    this.logger.log('[CONNECTOR-SERV] -----> searchConnectorsOutByIntent::: ', arrayConnectors);
    return arrayConnectors;
  }
  

  /*************************************************/


  public findButtons(obj) {
    let buttons = [];
    if(!obj) return buttons;
    if (Array.isArray(obj)) {
      for (const element of obj) {
        buttons = buttons.concat(this.findButtons(element));
      }
    } else if (typeof obj === 'object') {
      if (obj.hasOwnProperty('buttons')) {
        obj.buttons.forEach(button => {
          buttons.push(button);
        });
      }
      for (let key in obj) {
        buttons = buttons.concat(this.findButtons(obj[key]));
      }
    }
    return buttons;
  }


  /**
   * 
   * @param positions 
   */
  public logicPoint(positions){
    return this.tiledeskConnectors.logicPoint(positions);
  }
  




  /** The DOM id of the connector a destination field draws: `<from>/<to>`, where `<from>` is the
   *  anchor of the action port the field belongs to. '' for a field that draws no connector. */
  private connectorIdFor(intent_id: string, tdActionId: string, key: string, obj: any, idConnectorTo: string): string {
    if(key === 'intentName'){
      return intent_id+'/'+tdActionId+'/'+idConnectorTo;
    } else if(key === 'trueIntent'){
      return intent_id+'/'+tdActionId+'/true/'+idConnectorTo;
    } else if(key === 'falseIntent'){
      return intent_id+'/'+tdActionId+'/false/'+idConnectorTo;
    } else if(key === 'noInputIntent'){
      return intent_id+'/'+tdActionId+'/noInput/'+idConnectorTo;
    } else if(key === 'noMatchIntent'){
      return intent_id+'/'+tdActionId+'/noMatch/'+idConnectorTo;
    } else if(obj.uid && obj.type === 'action'){
      return intent_id+"/"+tdActionId+"/"+obj.uid+'/'+idConnectorTo;
    } else if(key === 'conditionIntentId' && obj.label){
      return intent_id+"/"+tdActionId+"/"+obj.label+'/true/'+idConnectorTo;
    } else if(key === 'fallbackIntent'){
      return intent_id+"/"+tdActionId+'/fallback/'+idConnectorTo;
    } else if(key === 'errorIntent'){
      return intent_id+"/"+tdActionId+'/error/'+idConnectorTo;
    } else if(key === 'goToIntent'){
      return intent_id+"/"+tdActionId+'/goto/'+idConnectorTo;
    }
    return '';
  }

  /** The ids of the connectors a block's data asks for, towards blocks that exist -- the same
   *  derivation as createListOfConnectorsByIntent2, without touching the maps. A "Return to
   *  parent agent" block draws no connector out of its block dot, so that one is not expected. */
  public expectedConnectorIds(intent: any): string[] {
    const ids: string[] = [];
    if (!intent?.intent_id) { return ids; }
    const known = new Set((this.listOfIntents || []).map((item: any) => item?.intent_id));
    const skipBlockDot = isReturnStackIntent(intent);
    let tdActionId = '';
    const explore = (obj: any) => {
      if (typeof obj !== 'object' || obj === null) { return; }
      if (skipBlockDot && obj === intent.attributes?.nextBlockAction) { return; }
      if (obj._tdActionId) { tdActionId = obj._tdActionId; }
      for (const key in obj) {
        const value = obj[key];
        if (typeof value === 'string' && value.startsWith('#') && value !== '#') {
          const to = value.replace('#', '');
          const id = this.connectorIdFor(intent.intent_id, tdActionId, key, obj, to);
          if (id && known.has(to)) { ids.push(id); }
        }
        explore(value);
      }
    };
    explore(intent);
    return ids;
  }

  /** Connectors the data asks for that are not on the stage. */
  public missingConnectorIds(intents: any[]): string[] {
    this.syncIntents(intents);
    const missing: string[] = [];
    for (const intent of intents || []) {
      for (const id of this.expectedConnectorIds(intent)) {
        if (!document.getElementById(id)) { missing.push(id); }
      }
    }
    return missing;
  }

  /** Draws every connector the flow's data asks for that is not on the stage.
   *
   *  A connector is drawn once its two ends are rendered; when they appear later than the wait
   *  and the retry queue allow -- a big batch from the AI chat, say -- it is given up silently and
   *  only a page reload brought it back. This compares the expected connectors with the stage and
   *  redraws the blocks that miss one. `createConnectorsOfIntent` updates an existing connector
   *  instead of duplicating it, so a block is only ever completed. Connectors on the stage that
   *  the data no longer asks for are left alone.
   *
   *  It checks its own work. Drawing a connector needs BOTH its ends in the DOM, so a single
   *  pass can fail for the same reason it was called: the other end of the last batch is not
   *  rendered yet. Before, that connector was simply lost -- the missing list was returned and
   *  nobody read it -- and only a page reload brought it back. Now each pass is followed by a
   *  fresh look at the stage, and what is still absent is tried again, a few times, waiting a
   *  little longer each time. It stops as soon as nothing is missing, so the common case costs
   *  one pass, exactly as before. */
  public async ensureConnectorsDrawn(
    intents: any[]
  ): Promise<{ missing: string[]; redrawnBlocks: number; stillMissing: string[] }> {
    let redrawnBlocks = 0;
    // `missing` keeps its meaning: what was found absent and therefore redrawn, across
    // every pass. What the retries add is `stillMissing` -- absent even after the last
    // one -- which is a different question and gets its own answer rather than
    // redefining this one.
    const missing: string[] = [];

    for (let attempt = 0; attempt < CONNECTOR_DRAW_ATTEMPTS; attempt++) {
      if (attempt > 0) {
        // The wait grows: the first retry is for a card one frame late, the last for a
        // batch the browser is still laying out.
        await this.waitAFrame(CONNECTOR_DRAW_RETRY_MS[attempt - 1]);
      }

      this.syncIntents(intents);
      let absentThisPass = 0;
      for (const intent of intents || []) {
        const absent = this.expectedConnectorIds(intent).filter(id => !document.getElementById(id));
        if (absent.length === 0) { continue; }
        absentThisPass += absent.length;
        for (const id of absent) {
          if (!missing.includes(id)) { missing.push(id); }
        }
        try {
          await this.createConnectorsOfIntent(intent);
          redrawnBlocks++;
        } catch (error) {
          this.logger.error('[CONNECTOR-SERV] ensureConnectorsDrawn: redraw failed', intent?.intent_id, error);
        }
      }

      if (absentThisPass === 0) { break; }
    }

    const stillMissing = missing.filter(id => !document.getElementById(id));
    if (stillMissing.length) {
      this.logger.warn('[CONNECTOR-SERV] connectors still missing after '
        + CONNECTOR_DRAW_ATTEMPTS + ' attempts:', stillMissing);
    }
    return { missing, redrawnBlocks, stillMissing };
  }

  /** A frame after a delay: the delay lets the browser lay out, the frame lets it paint. */
  private waitAFrame(delayMs: number): Promise<void> {
    return new Promise(resolve =>
      setTimeout(() => requestAnimationFrame(() => resolve()), delayMs));
  }

  createListOfConnectorsByIntent2(json: any): void {
    let intent_id = json.intent_id;
    let tdActionId = '';
    const exploreObject = (obj: any) => {

      if (typeof obj === 'object' && obj !== null) {
        if(obj._tdActionId){
          tdActionId = obj._tdActionId;
        }
        for (const key in obj) {
          if (typeof obj[key] === 'string' && obj[key].startsWith('#') && obj[key] !== '#') {
            const idConnectorTo = obj[key].replace('#', '');
            let connectorID = this.connectorIdFor(intent_id, tdActionId, key, obj, idConnectorTo);

            let shown = 'false';
            const objectExists = this.existingIntentIds.has(idConnectorTo);
            if(!objectExists) {
              connectorID = 'ERROR_'+connectorID+'___'+generateShortUID();
              shown = 'error';
            } else if (this.mapOfConnectors.hasOwnProperty(connectorID)) {
              connectorID = 'DUPLICATE_'+connectorID+'___'+generateShortUID();
              shown = 'error';
            }
            this.mapOfConnectors[connectorID] = { shown: shown };

          }
          exploreObject(obj[key]);
        }
      }
    };
    exploreObject(json);
  }



  /** addCustomMarker
   * add custom market arrow to each connector 
   * */
  addCustomMarker(connectorId: any, color: string) {;
    const element = document.getElementById(connectorId);
    if (element) {
      this.tiledeskConnectors.addCustomMarker(element, color);
    }
  }


  /**  setConnectorColor 
   * get all connectors that start with intentid
   * iterate the array of connectors and change the connector color 
   * add the arrow with same color of connector
  */
  setConnectorColor(intentId: any, color: string, opacity: number) {
    let rgba = `rgba(${color}, 1)`; // ${opacity}
    const listOfConnectors = this.searchConnectorsOutByIntent(intentId);
    listOfConnectors.forEach(connector => {
      const element = document.getElementById(connector.id);
      let op: string = opacity.toString();
      if (element) {
        element.style.setProperty('stroke', rgba);
        element.style.setProperty('filter', 'brightness(70%)');
        element.setAttributeNS(null, "opacity", op);
        this.addCustomMarker(connector.id, rgba);
      }
    });
  }




  /**
   * restoreDefaultConnector
   * richiamato da cds-connector
   * scatta quando premo su connector contract per ripristinare il connettore,
   * cioè nascondere il connector contract e mostrare il connettore normale
   */
  showDefaultConnector(idConnection: string){
    idConnection = idConnection.replace("#", "");
    this.logger.log('[CONNECTOR-SERV] showDefaultConnector:: ', idConnection);
    this.setDisplayElementById(idConnection, 'flex');
    this.setDisplayElementById('rect_' + idConnection, 'flex');
    this.setDisplayElementById('label_' + idConnection, 'flex');
  }

  // setDisplayConnectorByIdConnector(connectorId: string) {
  /**
   * restoreDefaultConnector
   * richiamato da cds-canvas
   * scatta quando premo sul pulsante per nascondere il connettore
   * nasconde il connettore normale e mostra il connector contract
   */
  hideDefaultConnector(idConnection: string){
    idConnection = idConnection.replace("#", "");
    // // this.logger.log('[CONNECTOR-SERV] hideDefaultConnector:: ', idConnection);
    this.setDisplayElementById(idConnection, 'none');
    this.setDisplayElementById('rect_' + idConnection, 'none');
    this.setDisplayElementById('label_' + idConnection, 'none');
  }

  hideContractConnector(idConnection: string){
    idConnection = idConnection.replace("#", "");
    const idConnector = idConnection.substring(0, idConnection.lastIndexOf('/'));
    this.setDisplayElementById('contract_' + idConnector, 'none');
    // const connector = {id:idConnector, display:true};
    // this.subjectChangedConnectorAttributes.next(connector);
    this.subjectChangedConnectorAttributes.next({id: idConnection, display: true});
  }

  showContractConnector(idConnection: string){
    idConnection = idConnection.replace("#", "");
    const idConnector = idConnection.substring(0, idConnection.lastIndexOf('/'));
    this.setDisplayElementById('contract_' + idConnector, 'flex');
    // const connector = {id:idConnector, display:false};
    // this.subjectChangedConnectorAttributes.next(connector);
    this.subjectChangedConnectorAttributes.next({id: idConnection, display: true});
  }


  setDisplayElementById(elementId: string, displayValue: string): void {
    // this.logger.log('[CONNECTOR-SERV] setDisplayElementById:: ', elementId, displayValue);
    const element = document.getElementById(elementId);
    if (element) {
      this.logger.log('[CONNECTOR-SERV] setDisplayElementById :: ', elementId, displayValue);
      element.style.setProperty('display', displayValue);
    }
  }

  showHideConnectorByIdConnector(idConnection: string, shown: boolean) {
    if(idConnection){
      const idConnector = idConnection.substring(0, idConnection.lastIndexOf('/'));
      const displayConnector = shown?'flex':'none';
      const displayContractConnector = shown?'none':'flex';
      this.logger.log('[CONNECTOR-SERV] showHideConnectorByIdConnector:: ', idConnection, displayConnector, displayContractConnector);
      this.setDisplayElementById(idConnection, displayConnector);
      this.setDisplayElementById('rect_' + idConnection, displayConnector);
      this.setDisplayElementById('label_' + idConnection, displayConnector);
      this.setDisplayElementById('contract_' + idConnector, displayContractConnector);
    }
  }

}
