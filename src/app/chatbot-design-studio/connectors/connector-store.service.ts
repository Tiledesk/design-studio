import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ConnectorRecord } from './connector-catalog';
import { ConnectorsCollection, RepairReport } from './flow-normalizer';

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
    this.load(null);
    this.lastRepairReport = null;
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
