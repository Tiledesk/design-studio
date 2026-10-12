import { Injectable, Optional } from '@angular/core';
import { Observable, merge } from 'rxjs';
import { DashboardService } from 'src/app/services/dashboard.service';
import { edgesOfIntent, indexFlow } from '../connectors/connector-catalog';
import { ConnectorStore } from '../connectors/connector-store.service';
import { ConnectorServiceLegacy } from './connector-legacy.service';
import { ConnectorServiceV3 } from './connector-v3.service';

/**
 * LA FACCIATA DEI CONNETTORI: una sola porta per canvas, blocchi, pannelli e chat AI.
 *
 * Dietro ci sono due servizi che non si parlano (decisione di Dario, 12/10/2026):
 *  - `ConnectorServiceLegacy` (connector-legacy.service.ts): il servizio di `master`, pari pari.
 *    E' la strada di ogni agente che NON e' V3. Il V2 resta com'e' e non si manutiene piu'.
 *  - `ConnectorServiceV3` (connector-v3.service.ts): disegno e previsione dal catalogo delle
 *    uscite e dalla lista `attributes.connectors` del bot. E' la strada degli agenti V3.
 *
 * Quale dei due risponde lo decide `DashboardService.isV3`, cioe' `attributes.dsVersion` del
 * bot aperto. I metodi che il legacy non ha e che la chat AI e il canvas usano anche sui V2
 * (`ensureConnectorsDrawn`, `refreshConnectorsAroundIntent`, `missingConnectorIds`,
 * `expectedConnectorIds`: esistevano gia' sulla linea di stage prima del refactor) qui sono
 * rifatti sopra il legacy, con lo stesso algoritmo di allora; gli id attesi vengono dal
 * catalogo, che la spec di parita' tiene uguale al disegno del legacy. `blockRendered` per un
 * V2 non fa nulla: il legacy aspetta i blocchi da solo.
 *
 * Senza un DashboardService (le spec che istanziano i servizi a mano) risponde il V3.
 */
/** Tentativi e attese di `ensureConnectorsDrawn` per un V2: gli stessi di prima del refactor. */
const LEGACY_DRAW_ATTEMPTS = 3;
const LEGACY_DRAW_RETRY_MS = [80, 400];

function waitAFrame(delayMs: number): Promise<void> {
  return new Promise(resolve => setTimeout(() => requestAnimationFrame(() => resolve()), delayMs));
}

@Injectable({
  providedIn: 'root'
})
export class ConnectorService {

  /** Gli attributi di un connettore sono cambiati (menu: mostra/nascondi, etichetta), da qualunque dei due servizi. */
  readonly observableChangedConnectorAttributes: Observable<any>;
  /** I connettori in ingresso di un blocco sono cambiati, da qualunque dei due servizi. */
  readonly connectorsInChanged$: Observable<{ intentId: string, connectors: any[] }>;

  private legacyStoreBridgeInstalled = false;

  constructor(
    private readonly legacy: ConnectorServiceLegacy,
    private readonly v3: ConnectorServiceV3,
    @Optional() private readonly dashboardService?: DashboardService,
    @Optional() private readonly store?: ConnectorStore,
  ) {
    this.observableChangedConnectorAttributes = merge(this.legacy.observableChangedConnectorAttributes, this.v3.observableChangedConnectorAttributes);
    this.connectorsInChanged$ = merge(this.legacy.connectorsInChanged$, this.v3.connectorsInChanged$);
  }

  /** L'agente aperto e' V3: rispondono il servizio nuovo e la lista del bot. */
  get isV3(): boolean {
    return this.dashboardService ? !!this.dashboardService.isV3 : true;
  }

  /** Il servizio che risponde per l'agente aperto. */
  get impl(): any {
    return this.isV3 ? this.v3 : this.legacy;
  }

  /* ---- stato condiviso, letto da canvas e blocchi ---- */

  get tiledeskConnectors(): any { return this.impl.tiledeskConnectors; }
  get connectorDraft(): any { return this.impl.connectorDraft; }
  set connectorDraft(value: any) { this.impl.connectorDraft = value; }
  get listOfIntents(): any { return this.impl.listOfIntents; }
  set listOfIntents(value: any) { this.impl.listOfIntents = value; }
  get listOfConnectors(): any { return this.impl.listOfConnectors; }
  get mapOfConnectors(): any { return this.impl.mapOfConnectors; }
  get scale(): number { return this.impl.scale; }

  /* ---- ciclo di vita ---- */

  initializeConnectors(): void {
    this.impl.initializeConnectors();
    if (!this.isV3) { this.installLegacyStoreBridge(); }
  }

  /**
   * Per un agente V2 i componenti delle action (condivisi con il V3) non scrivono piu' da soli il
   * campo di destinazione quando un connettore nasce o muore sul canvas: lo fa lo store, in un
   * posto solo. Nel V3 e' `ConnectorServiceV3` a chiamarlo; qui lo stesso ponte per il V2, con la
   * lista del legacy. Lo store, senza una lista caricata, scrive il campo e basta.
   */
  private installLegacyStoreBridge(): void {
    if (this.legacyStoreBridgeInstalled || typeof document === 'undefined') { return; }
    const apply = (e: Event, deleted: boolean) => {
      if (this.isV3) { return; }
      const connector = (e as CustomEvent).detail?.connector;
      if (!connector?.id) { return; }
      this.store?.applyRendererChange({ fromId: connector.fromId, toId: connector.toId, deleted, save: !!connector.save }, this.legacy.listOfIntents || []);
    };
    document.addEventListener('connector-created', e => apply(e, false), true);
    document.addEventListener('connector-deleted', e => apply(e, true), true);
    this.legacyStoreBridgeInstalled = true;
  }

  setScale(scale: number): void { this.impl.setScale(scale); }
  logicPoint(positions: any): any { return this.impl.logicPoint(positions); }
  moved(element: any, x: any, y: any): void { this.impl.moved(element, x, y); }

  /** Il flusso su cui si controllano le destinazioni. Il legacy lo riceve e basta. */
  syncIntents(intents: any[]): void {
    if (this.isV3) { this.v3.syncIntents(intents); } else { this.legacy.listOfIntents = intents; }
  }

  /** V3: i connettori in attesa di questo blocco si disegnano ora. V2: il legacy aspetta da solo (polling). */
  blockRendered(blockId: string): void {
    if (this.isV3) { this.v3.blockRendered(blockId); }
  }

  clearRetryQueue(): void { this.impl.clearRetryQueue(); }

  /* ---- disegno ---- */

  async setMapOfConnectors(listOfIntents: any): Promise<any> { return this.impl.setMapOfConnectors(listOfIntents); }
  async createMapOfConnectors(intents: any): Promise<any> { return this.impl.createMapOfConnectors(intents); }
  async createConnectors(intents: any): Promise<void> { return this.impl.createConnectors(intents); }
  async createConnectorsOfIntent(intent: any): Promise<void> { return this.impl.createConnectorsOfIntent(intent); }
  async createConnectorFromId(fromId: string, toId: string, notify = false, attributes: any = null): Promise<boolean> {
    return this.impl.createConnectorFromId(fromId, toId, notify, attributes);
  }
  async createConnectorById(connectorID: string): Promise<boolean> { return this.impl.createConnectorById(connectorID); }
  async createNewConnector(fromId: string, toId: string): Promise<void> { return this.impl.createNewConnector(fromId, toId); }
  createConnectorDraft(detail: any): void { this.impl.createConnectorDraft(detail); }
  removeConnectorDraft(): void { this.impl.removeConnectorDraft(); }
  addConnectorToList(connector: any): void { this.impl.addConnectorToList(connector); }
  deleteConnectorToList(connectorID: string): void { this.impl.deleteConnectorToList(connectorID); }

  async updateConnector(elementID: string): Promise<void> { return this.impl.updateConnector(elementID); }
  async updateConnectorsOfBlock(elementID: string): Promise<void> { return this.impl.updateConnectorsOfBlock(elementID); }
  updateConnectorAttributes(connectors: any, connector: any): void { this.impl.updateConnectorAttributes(connectors, connector); }
  updateConnectorLabel(elementID: string, label: string): void { this.impl.updateConnectorLabel(elementID, label); }
  updateLineTextPosition(id: string, label: string): void { this.impl.updateLineTextPosition(id, label); }

  /** Gli id dei connettori che i dati del blocco chiedono, verso blocchi che esistono. */
  expectedConnectorIds(intent: any): string[] {
    if (this.isV3) { return this.v3.expectedConnectorIds(intent); }
    if (!intent?.intent_id) { return []; }
    return edgesOfIntent(intent, indexFlow(this.legacy.listOfIntents || [])).records.map(record => record.id);
  }

  /** I connettori che i dati chiedono e che non sono sullo stage. */
  missingConnectorIds(intents: any[]): string[] {
    if (this.isV3) { return this.v3.missingConnectorIds(intents); }
    this.syncIntents(intents);
    const missing: string[] = [];
    for (const intent of intents || []) {
      for (const id of this.expectedConnectorIds(intent)) {
        if (!document.getElementById(id)) { missing.push(id); }
      }
    }
    return missing;
  }

  /**
   * Disegna ogni connettore che i dati chiedono e che manca sullo stage, con qualche tentativo
   * a distanza crescente (un blocco puo' comparire un fotogramma dopo). Per un V2 e' l'algoritmo
   * che c'era prima del refactor, sopra il disegno del legacy, che non duplica un connettore
   * gia' presente.
   */
  async ensureConnectorsDrawn(intents: any[]): Promise<{ missing: string[]; redrawnBlocks: number; stillMissing: string[] }> {
    if (this.isV3) { return this.v3.ensureConnectorsDrawn(intents); }
    let redrawnBlocks = 0;
    const missing: string[] = [];
    for (let attempt = 0; attempt < LEGACY_DRAW_ATTEMPTS; attempt++) {
      if (attempt > 0) { await waitAFrame(LEGACY_DRAW_RETRY_MS[attempt - 1]); }
      this.syncIntents(intents);
      let absentThisPass = 0;
      for (const intent of intents || []) {
        const absent = this.expectedConnectorIds(intent).filter(id => !document.getElementById(id));
        if (absent.length === 0) { continue; }
        absentThisPass += absent.length;
        for (const id of absent) { if (!missing.includes(id)) { missing.push(id); } }
        try {
          await this.legacy.createConnectorsOfIntent(intent);
          redrawnBlocks++;
        } catch (error) {
          // un blocco che non si lascia disegnare non deve fermare gli altri
        }
      }
      if (absentThisPass === 0) { break; }
    }
    const stillMissing = missing.filter(id => !document.getElementById(id));
    return { missing, redrawnBlocks, stillMissing };
  }

  /** Disegna o aggiorna i connettori da e verso un blocco: i suoi e quelli dei blocchi che lo puntano. */
  async refreshConnectorsAroundIntent(intentId: string, intents: any[]): Promise<void> {
    if (this.isV3) { return this.v3.refreshConnectorsAroundIntent(intentId, intents); }
    this.syncIntents(intents);
    const list = Array.isArray(intents) ? intents : [];
    const target = list.find(intent => intent?.intent_id === intentId);
    if (!target) { return; }
    await this.legacy.createConnectorsOfIntent(target);
    const reference = '#' + intentId;
    for (const source of list) {
      if (!source || source.intent_id === intentId) { continue; }
      const destinations = JSON.stringify([source.actions ?? [], source.attributes?.nextBlockAction ?? null]);
      if (destinations.includes(reference)) { await this.legacy.createConnectorsOfIntent(source); }
    }
    await this.legacy.updateConnector(intentId);
  }

  /* ---- cancellazione ---- */

  deleteConnector(intent: any, idConnection: string, save = false, notify = true): void { this.impl.deleteConnector(intent, idConnection, save, notify); }
  deleteConnectorById(connectorId: string): void { this.impl.deleteConnectorById(connectorId); }
  deleteConnectorFromAction(actionId: any, connId: any): void { this.impl.deleteConnectorFromAction(actionId, connId); }
  deleteConnectorsFromActionByActionId(actionId: any): void { this.impl.deleteConnectorsFromActionByActionId(actionId); }
  deleteConnectorsToIntentById(intentId: string): void { this.impl.deleteConnectorsToIntentById(intentId); }
  deleteConnectorsOfBlock(intent_id: any, save = false, notify = false): void { this.impl.deleteConnectorsOfBlock(intent_id, save, notify); }
  deleteConnectorsOutOfBlock(intent_id: any, save = false, notify = true): void { this.impl.deleteConnectorsOutOfBlock(intent_id, save, notify); }
  deleteConnectorsOfBlockThatDontExist(intent_id: any): void { this.impl.deleteConnectorsOfBlockThatDontExist(intent_id); }
  deleteConnectorsBrokenOutOfBlock(intent_id: any): void { this.impl.deleteConnectorsBrokenOutOfBlock(intent_id); }
  deleteConnectorWithIDStartingWith(connectorID: string, save = false, notify = true): void { this.impl.deleteConnectorWithIDStartingWith(connectorID, save, notify); }

  /* ---- lettura ---- */

  getConnectorsInByIntent(intentId: string): any[] { return this.impl.getConnectorsInByIntent(intentId); }
  getConnectorsInObservable(intentId: string): Observable<any[]> { return this.impl.getConnectorsInObservable(intentId); }
  searchConnectorsInByIntent(intent_id: string): Array<any> { return this.impl.searchConnectorsInByIntent(intent_id); }

  /* ---- aspetto ---- */

  addCustomMarker(connectorId: any, color: string): void { this.impl.addCustomMarker(connectorId, color); }
  setConnectorColor(intentId: any, color: string, opacity: number): void { this.impl.setConnectorColor(intentId, color, opacity); }
  showDefaultConnector(idConnection: string): void { this.impl.showDefaultConnector(idConnection); }
  hideDefaultConnector(idConnection: string): void { this.impl.hideDefaultConnector(idConnection); }
  showContractConnector(idConnection: string): void { this.impl.showContractConnector(idConnection); }
  hideContractConnector(idConnection: string): void { this.impl.hideContractConnector(idConnection); }
  setDisplayElementById(elementId: string, displayValue: string): void { this.impl.setDisplayElementById(elementId, displayValue); }
  showHideConnectorByIdConnector(idConnection: string, shown: boolean): void { this.impl.showHideConnectorByIdConnector(idConnection, shown); }
}
