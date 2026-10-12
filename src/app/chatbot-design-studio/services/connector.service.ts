import { Injectable, Optional } from '@angular/core';
import { Observable, merge } from 'rxjs';
import { DashboardService } from 'src/app/services/dashboard.service';
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
 * bot aperto. I metodi che il legacy non ha (sono nati con il V3: `blockRendered`,
 * `ensureConnectorsDrawn`, ...) per un V2 non fanno nulla, esattamente come su master dove
 * nessuno li chiamava.
 *
 * Senza un DashboardService (le spec che istanziano i servizi a mano) risponde il V3.
 */
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

  /** V3: gli id che i dati del blocco chiedono. V2: il legacy non li prevede. */
  expectedConnectorIds(intent: any): string[] {
    return this.isV3 ? this.v3.expectedConnectorIds(intent) : [];
  }
  missingConnectorIds(intents: any[]): string[] {
    return this.isV3 ? this.v3.missingConnectorIds(intents) : [];
  }
  async ensureConnectorsDrawn(intents: any[]): Promise<{ missing: string[]; redrawnBlocks: number; stillMissing: string[] }> {
    return this.isV3 ? this.v3.ensureConnectorsDrawn(intents) : { missing: [], redrawnBlocks: 0, stillMissing: [] };
  }
  async refreshConnectorsAroundIntent(intentId: string, intents: any[]): Promise<void> {
    if (this.isV3) { return this.v3.refreshConnectorsAroundIntent(intentId, intents); }
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
