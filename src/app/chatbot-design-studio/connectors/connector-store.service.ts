import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ConnectorRecord, slotOfFromId, writeSlot } from './connector-catalog';
import { STORE_OWNED_TYPES } from './connector-config';
import { ConnectorsCollection, RepairReport, buildCollection } from './flow-normalizer';

/**
 * Lo stato dei connettori del chatbot aperto: la lista (`attributes.connectors` del bot) e il
 * rapporto delle riparazioni dell'ultima apertura.
 *
 * In questa fase lo store tiene solo lo stato: la lista viene caricata dal normalizzatore in
 * `IntentService.getAllIntents` e letta da chi ne ha bisogno. Nelle fasi successive diventa
 * l'unica API di scrittura dei connettori e il punto da cui parte il disegno.
 */
@Injectable({ providedIn: 'root' })
export class ConnectorStore {
  private readonly collectionSource = new BehaviorSubject<ConnectorsCollection | null>(null);
  readonly collection$: Observable<ConnectorsCollection | null> = this.collectionSource.asObservable();

  /** Il rapporto dell'ultima normalizzazione; null finche' nessun flusso e' stato aperto. */
  lastRepairReport: RepairReport | null = null;

  /** Da dove parte il disegno del flusso aperto: dalla lista (il bot ce l'aveva all'apertura) o dalle action. */
  mode: 'collection' | 'actions' = 'actions';

  get drawsFromCollection(): boolean {
    return this.mode === 'collection' && !!this.collection;
  }

  private byId = new Map<string, ConnectorRecord>();
  private outOf = new Map<string, ConnectorRecord[]>();
  private into = new Map<string, ConnectorRecord[]>();

  get collection(): ConnectorsCollection | null {
    return this.collectionSource.value;
  }

  get records(): ConnectorRecord[] {
    return this.collection?.items || [];
  }

  /** Carica la lista di un flusso appena aperto (o ricostruita) e rifa' gli indici. */
  load(collection: ConnectorsCollection | null): void {
    this.byId = new Map();
    this.outOf = new Map();
    this.into = new Map();
    for (const record of collection?.items || []) {
      this.byId.set(record.id, record);
      push(this.outOf, record.from.intentId, record);
      push(this.into, record.to.intentId, record);
    }
    this.collectionSource.next(collection);
  }

  reset(): void {
    clearTimeout(this.saveTimer);
    this.saveTimer = null;
    this.load(null);
    this.lastRepairReport = null;
  }

  private save: ((collection: ConnectorsCollection) => Promise<void>) | null = null;
  private updateIntent: ((intent: any) => Promise<any> | void) | null = null;
  private saveTimer: any = null;
  private static readonly SAVE_DEBOUNCE_MS = 400;

  /** Chi sa salvare sul server (IntentService) si registra qui: lo store non conosce HTTP. */
  bindPersistence(persistence: { saveCollection: (collection: ConnectorsCollection) => Promise<void>; updateIntent?: (intent: any) => Promise<any> | void }): void {
    this.save = persistence.saveCollection;
    this.updateIntent = persistence.updateIntent || null;
  }

  /**
   * Un connettore e' nato o morto sul canvas (trascinamento, tasto Canc, menu, pannello): il
   * campo della action da cui parte viene scritto qui, in un posto solo, invece che in ognuno
   * dei trentatre' componenti. Se il cambio va salvato e il tipo e' tra quelli di cui lo store
   * risponde (STORE_OWNED_TYPES), salva anche il blocco. Restituisce cosa ha fatto.
   */
  applyRendererChange(change: { fromId: string; toId: string; deleted?: boolean; save?: boolean }, intents: any[]): { written: boolean; saved: boolean } {
    const result = { written: false, saved: false };
    if (!change?.fromId) { return result; }
    const intentId = change.fromId.split('/')[0];
    const intent = (intents || []).find((i: any) => i?.intent_id === intentId);
    if (!intent) { return result; }
    const slot = slotOfFromId(intent, change.fromId);
    if (!slot) { return result; }
    const toId = change.deleted ? null : (change.toId || null);
    result.written = writeSlot(slot, toId);
    // La lista segue subito, senza aspettare il salvataggio: chi disegna dalla lista la vede gia' giusta.
    this.applyToRecords(slot, toId);
    if (slot.kind === 'button' && slot.item) {
      // Un bottone collegato e' un bottone "action"; scollegato torna di testo. E lo stato che
      // il suo template legge (`__isConnected`, `__idConnection`) segue, come faceva ogni
      // elemento della reply per conto suo.
      slot.item.type = toId ? 'action' : 'text';
      slot.item.__idConnector = slot.fromId;
      slot.item.__isConnected = !!toId;
      slot.item.__idConnection = toId ? slot.fromId + '/' + toId : null;
    }
    const type = slot.kind === 'block' ? 'next' : (intent.actions || []).find((a: any) => a?._tdActionId === slot.actionId)?._tdActionType;
    if (change.save && this.updateIntent && type && STORE_OWNED_TYPES.has(type)) {
      void this.updateIntent(intent);
      result.saved = true;
    }
    return result;
  }

  /**
   * Riallinea la lista alle action (vincono le action), dopo ogni salvataggio del flusso: un
   * collegamento scritto da qualunque strada -- trascinamento, pannello, chat AI, undo --
   * finisce nella lista senza che nessuno debba ricordarsene. Se cambia, la salva, con un
   * breve ritardo che raccoglie le modifiche vicine in una scrittura sola.
   */
  syncFromIntents(intents: any[]): boolean {
    const built = buildCollection(intents || [], this.collection);
    if (!built.changed) { return false; }
    this.load(built.collection);
    this.scheduleSave();
    return true;
  }

  /** Aggiorna i record di un'uscita: via quelli che partivano da li', dentro quello nuovo se collegata. */
  private applyToRecords(slot: { fromId: string; intentId: string; actionId: string; key: string; kind: ConnectorRecord['kind']; attrs?: string | null }, toId: string | null): void {
    const current = this.collection;
    if (!current) { return; }
    const items = current.items.filter(r => !r.id.startsWith(slot.fromId + '/'));
    if (toId) {
      const previous = current.items.find(r => r.id === slot.fromId + '/' + toId);
      const props = { ...(previous?.props || {}), ...(slot.kind === 'button' && slot.attrs ? { params: slot.attrs } : {}) };
      items.push({ id: slot.fromId + '/' + toId, from: { intentId: slot.intentId, actionId: slot.actionId, slot: slot.key }, to: { intentId: toId }, kind: slot.kind, ...(Object.keys(props).length ? { props } : {}) });
    }
    if (items.length === current.items.length && items.every((r, i) => r.id === current.items[i].id)) { return; }
    this.load({ ...current, items, updatedAt: new Date().toISOString() });
    this.scheduleSave();
  }

  private scheduleSave(): void {
    if (!this.save) { return; }
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      const collection = this.collection;
      if (collection && this.save) { this.save(collection).catch(() => {}); }
    }, ConnectorStore.SAVE_DEBOUNCE_MS);
  }

  recordById(id: string): ConnectorRecord | null {
    return this.byId.get(id) || null;
  }

  recordsOut(intentId: string): ConnectorRecord[] {
    return this.outOf.get(intentId) || [];
  }

  recordsIn(intentId: string): ConnectorRecord[] {
    return this.into.get(intentId) || [];
  }
}

function push(map: Map<string, ConnectorRecord[]>, key: string, record: ConnectorRecord): void {
  const list = map.get(key);
  if (list) { list.push(record); } else { map.set(key, [record]); }
}
