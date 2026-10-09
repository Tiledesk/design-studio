import { Injectable } from '@angular/core';
import { TiledeskConnectors } from 'src/assets/js/tiledesk-connectors.js';
import { getOpacityFromRgba, getColorFromRgba } from '../utils';
import { edgesOfFlow, edgesOfIntent, indexFlow, parseRecordId, slotsOfIntent, writeSlot } from '../connectors/connector-catalog';
import { TiledeskJsRenderer } from '../connectors/renderer/tiledesk-js-renderer';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

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
  
  /** L'adattatore sulla libreria di disegno: il resto del servizio parla con lui, non con la libreria. */
  renderer: TiledeskJsRenderer;
  /** I connettori che aspettano un elemento non ancora nel DOM, per id del blocco che manca:
   *  li sblocca `blockRendered`, che il canvas chiama quando il blocco ha finito di disegnarsi.
   *  Prima c'era un polling a 0 ms e una coda ritentata ogni 500 ms. */
  private pending = new Map<string, Array<{ fromId: string; toId: string; notify: boolean; attributes: any }>>();
  private readonly logger: LoggerService = LoggerInstance.getInstance();
  
  constructor(
  ) {}

  initializeConnectors(){
    this.tiledeskConnectors = new TiledeskConnectors("tds_drawer", {"input_block": "tds_input_block"}, {});
    this.renderer = new TiledeskJsRenderer(this.tiledeskConnectors);
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
    if (this.tiledeskConnectors) { this.tiledeskConnectors.scale = scale; }
  }

  /** Un blocco ha finito di disegnarsi: i connettori che lo aspettavano si possono tracciare.
   *  Un fotogramma dopo, cosi' anche le ancore delle sue action sono al loro posto. */
  public blockRendered(blockId: string): void {
    const waiting = this.pending.get(blockId);
    if (!waiting || waiting.length === 0) { return; }
    this.pending.delete(blockId);
    requestAnimationFrame(() => {
      for (const item of waiting) {
        void this.createConnectorFromId(item.fromId, item.toId, item.notify, item.attributes);
      }
    });
  }

  private addPending(blockId: string, item: { fromId: string; toId: string; notify: boolean; attributes: any }): void {
    const list = this.pending.get(blockId) || [];
    if (!list.some(p => p.fromId === item.fromId && p.toId === item.toId)) { list.push(item); }
    this.pending.set(blockId, list);
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
    await this.createConnectorFromId(fromId, toId, true, null);
  }

  /** Disegna tutti i connettori del flusso, blocco per blocco. */
  public async createConnectors(intents){
    this.listOfIntents = intents;
    // Pulisci la coda di retry prima di iniziare
    this.clearRetryQueue();
    
    for (const intent of intents) {
      await this.createConnectorsOfIntent(intent);
    }
  }


  public async createMapOfConnectors(intents){
    // Describes the ONE flow the canvas is building (see IntentService.setMapOfIntents).
    // The expected ids come from the catalogue, the same place the drawing takes them from:
    // the two can no longer disagree, and a flow cannot wait on an id nobody will ever draw.
    this.mapOfConnectors = {};
    this.listOfConnectors = {};
    this.existingIntentIds = new Set((intents || []).map((item) => item.intent_id));
    this.listOfIntents = intents;
    for (const record of edgesOfFlow(intents || []).records) {
      this.mapOfConnectors[record.id] = { shown: 'false' };
    }
    return this.mapOfConnectors;
  }

  /**
   * Disegna un connettore tra due elementi del DOM. Se uno dei due non c'e' ancora, il
   * connettore resta in attesa del blocco che manca (vedi `blockRendered`) e torna false.
   */
  public async createConnectorFromId(fromId: string, toId: string, notify = false, attributes: any = null): Promise<boolean> {
    if (!fromId || !toId) { return false; }
    const connectorID = fromId + '/' + toId;
    const fromEl = document.getElementById(fromId);
    if (!fromEl) { this.addPending(fromId.split('/')[0], { fromId, toId, notify, attributes }); return false; }
    const toEl = document.getElementById(toId);
    if (!toEl) { this.addPending(toId, { fromId, toId, notify, attributes }); return false; }
    if (document.getElementById(connectorID)) {
      // Already drawn: refresh its position from the source block. Before, a string was
      // handed to a method that wants an element, and nothing happened.
      const blockEl = document.getElementById(fromId.split('/')[0]);
      if (blockEl) { this.renderer.update(blockEl); }
      return true;
    }
    this.renderer.draw(fromId, toId, fromEl, toEl, attributes, notify);
    return true;
  }

  public async createConnectorById(connectorID: string): Promise<boolean> {
    const parsed = parseRecordId(connectorID);
    if (!parsed) { return false; }
    const toId = parsed.toId.startsWith('#') ? parsed.toId.substring(1) : parsed.toId;
    return this.createConnectorFromId(parsed.fromId, toId, false, null);
  }

  private intentExists(intentId: string): boolean {
    return (this.listOfIntents || []).some((obj: any) => obj.intent_id === intentId);
  }

  /**
   * Disegna i connettori di un blocco: il pallino e ogni uscita delle sue action, come li
   * descrive il catalogo (connectors/connector-catalog.ts). Un riferimento col `#` verso un
   * blocco che non esiste viene svuotato in memoria, come prima (all'apertura lo fa gia' il
   * normalizzatore, e lo salva; qui capita per i blocchi cancellati durante la sessione). Un
   * collegamento per nome dei flussi vecchi resta com'e'.
   */
  public async createConnectorsOfIntent(intent: any): Promise<void> {
    if (!intent) { return; }
    const index = indexFlow(this.listOfIntents || []);
    for (const slot of slotsOfIntent(intent)) {
      if (!slot.toId) { continue; }
      if (!index.ids.has(slot.toId)) {
        if (slot.hasHash) { writeSlot(slot, null); }
        continue;
      }
      await this.createConnector(intent, slot.fromId, slot.toId);
    }
  }

  private async createConnector(intent: any, idConnectorFrom: string, idConnectorTo: string): Promise<void> {
    if (!idConnectorFrom || !idConnectorTo) { return; }
    const connectorsAttributes = intent?.attributes?.connectors;
    const attributes = connectorsAttributes && connectorsAttributes[idConnectorFrom] ? connectorsAttributes[idConnectorFrom] : {};
    await this.createConnectorFromId(idConnectorFrom, idConnectorTo, false, attributes);
  }

  /** Dimentica i connettori in attesa (si cambia flusso, o si ricostruisce il canvas). */
  public clearRetryQueue() {
    this.pending.clear();
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
    if(idConnector && intent?.attributes?.connectors?.[idConnector]){
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

  public async updateConnector(elementID: string){
    const elem = document.getElementById(elementID);
    if (elem) {
      this.renderer.update(elem);
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
  public async updateConnectorsOfBlock(elementID: string){
    const elem = document.getElementById(elementID);
    if (!elem) { return true; }
    const anchors = Array.from(elem.querySelectorAll('[connector]')) as HTMLElement[];
    for (const anchor of anchors) {
      const fromId = anchor.id;
      const connectionId = anchor.getAttribute('idConnection');
      for (const connectorId of this.renderer.drawnIds()) {
        if (connectorId.startsWith(fromId)) { this.deleteConnectorById(connectorId); }
      }
      if (connectionId) { void this.createConnectorById(connectionId); }
    }
    return true;
  }

  public deleteConnectorById(connectorId: string) {
    if (!document.getElementById(connectorId)) { return; }
    const parsed = parseRecordId(connectorId);
    const intent = parsed ? (this.listOfIntents || []).find((i: any) => i.intent_id === parsed.intentId) : null;
    if (intent) {
      this.deleteConnector(intent, connectorId, false, false);
    } else {
      this.renderer.remove(connectorId, false, false);
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


  public logicPoint(positions){
    return this.tiledeskConnectors.logicPoint(positions);
  }
  




  /** The ids of the connectors a block's data asks for, towards blocks that exist: the catalogue's
   *  answer, the same the drawing uses. A "Return to parent agent" block draws nothing from its dot. */
  public expectedConnectorIds(intent: any): string[] {
    if (!intent?.intent_id) { return []; }
    return edgesOfIntent(intent, indexFlow(this.listOfIntents || [])).records.map(record => record.id);
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
