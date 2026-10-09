/**
 * Il normalizzatore del flusso: all'apertura di un chatbot ripara i dati in un passaggio solo e
 * costruisce la lista dei connettori del bot.
 *
 * Prima queste riparazioni stavano in quattro posti (il `#` mancante in `patchActionId`, i
 * riferimenti nel vuoto azzerati dai rami del disegno, le action nulle in `intentAnalyzer`, il
 * pallino dei blocchi Return in `cds-intent`), coprivano solo alcuni campi e non si salvavano.
 * Qui coprono ogni uscita del catalogo, vengono riferite una per una nel rapporto, e il chiamante
 * le salva.
 *
 * La lista (`ConnectorsCollection`) si ricava dalle action -- che restano la copia che il motore
 * esegue -- e si riconcilia con quella eventualmente gia' salvata: se non coincidono VINCONO LE
 * ACTION, la lista viene ricostruita e la differenza finisce nel rapporto. L'aspetto dei
 * connettori (`props`) sopravvive per id: dal record precedente, oppure, la prima volta, dagli
 * attributi visivi che ogni blocco teneva in `intent.attributes.connectors`.
 *
 * Modulo puro: niente Angular, niente DOM, niente logger. MODIFICA gli intent che riceve
 * (il chiamante li clona se vuole conservare l'originale); `uid` e' iniettato per avere spec
 * riproducibili.
 */

import { RESERVED_INTENT_NAMES } from '../utils';
import { isReturnStackIntent } from '../utils-actions';
import {
  ConnectorProps, ConnectorRecord, DanglingRef, edgesOfFlow, ensureTechnicalIds, indexFlow, recordIdOf,
  slotsOfIntent, writeSlot,
} from './connector-catalog';
import { CONNECTORS_COLLECTION_VERSION } from './connector-config';

export interface ConnectorsCollection {
  version: number;
  updatedAt: string;
  items: ConnectorRecord[];
}

export type RepairKind =
  | 'null-action-removed'
  | 'action-id' | 'case-id' | 'button-uid'
  | 'hash-added'
  | 'dangling-cleared'
  | 'next-block-cleared-return-stack'
  | 'stale-connector-attr-removed'
  | 'connector-attr-id-filled';

export interface FlowRepair {
  intentId: string;
  kind: RepairKind;
  /** Dove, in parole: `actions[2].trueIntent`, `attributes.nextBlockAction.intentName`, `attributes.connectors[...]`. */
  path: string;
  before?: any;
  after?: any;
}

export interface RepairReport {
  faqKbId: string;
  at: string;
  counts: Partial<Record<RepairKind, number>>;
  /** I blocchi che sono cambiati e vanno salvati. */
  changedIntentIds: string[];
  /** Riferimenti lasciati come sono: nomi di blocco dei flussi vecchi, o valori che non sono ne' id ne' nome. */
  unresolved: DanglingRef[];
  /** Le riparazioni, una per una (al massimo `MAX_ITEMS`; il resto solo nei conteggi). */
  items: FlowRepair[];
  /** La lista: assente prima, oppure diversa da quella che le action descrivono. */
  collection: { existed: boolean; changed: boolean; records: number; missing: string[]; extra: string[] };
  /** Riempiti da chi salva. */
  saved?: { intents: boolean; collection: boolean };
  saveError?: string;
}

export interface NormalizeOptions {
  uid: () => string;
  isV3?: boolean;
  faqKbId?: string;
  now?: () => string;
}

export interface NormalizeResult {
  intents: any[];
  changedIntentIds: string[];
  collection: ConnectorsCollection;
  collectionChanged: boolean;
  report: RepairReport;
}

const MAX_ITEMS = 500;
const RESERVED = new Set<string>(Object.values(RESERVED_INTENT_NAMES) as string[]);

class Recorder {
  readonly counts: Partial<Record<RepairKind, number>> = {};
  readonly items: FlowRepair[] = [];
  readonly changed = new Set<string>();
  add(repair: FlowRepair): void {
    this.counts[repair.kind] = (this.counts[repair.kind] || 0) + 1;
    if (this.items.length < MAX_ITEMS) { this.items.push(repair); }
    this.changed.add(repair.intentId);
  }
}

/**
 * Ripara il flusso e costruisce la lista dei connettori. Vedi il commento in testa al file.
 */
export function normalizeFlow(intents: any[], collection: ConnectorsCollection | null | undefined, opts: NormalizeOptions): NormalizeResult {
  const list = Array.isArray(intents) ? intents : [];
  const rec = new Recorder();

  // 1. Action nulle (un'azione salvata male non deve far cadere il blocco intero).
  for (const intent of list) {
    if (!intent || !Array.isArray(intent.actions)) { continue; }
    const before = intent.actions.length;
    intent.actions = intent.actions.filter((a: any) => a !== null && a !== undefined);
    for (let i = before; i > intent.actions.length; i--) {
      rec.add({ intentId: intent.intent_id, kind: 'null-action-removed', path: 'actions' });
    }
  }

  // 2. Default che non contano come riparazioni: attributi e flag dei blocchi riservati.
  for (const intent of list) {
    if (!intent) { continue; }
    intent.attributes = intent.attributes || {};
    if (!intent.attributes.connectors || typeof intent.attributes.connectors !== 'object') { intent.attributes.connectors = {}; }
    if (RESERVED.has(intent.intent_display_name)) { intent.attributes.readonly = true; }
  }

  // 3. Id tecnici.
  for (const change of ensureTechnicalIds(list, opts.uid)) {
    rec.add({ intentId: change.intentId, kind: change.kind, path: change.path });
  }

  // 4. Le destinazioni, uscita per uscita: `#` mancante, riferimenti nel vuoto.
  const index = indexFlow(list);
  const isIntentId = (value: string) => index.ids.has(value) && !index.names.has(value);
  const unresolved: DanglingRef[] = [];
  for (const intent of list) {
    if (!intent) { continue; }
    for (const slot of slotsOfIntent(intent)) {
      if (!slot.toId) { continue; }
      const path = pathOf(intent, slot);
      if (index.ids.has(slot.toId)) {
        if (!slot.hasHash && isIntentId(slot.toId)) {
          const before = slot.raw;
          writeSlot(slot, slot.toId);
          rec.add({ intentId: intent.intent_id, kind: 'hash-added', path, before, after: slot.holder[slot.field] });
        }
        continue;
      }
      if (slot.hasHash) {
        const before = slot.raw;
        writeSlot(slot, null);
        rec.add({ intentId: intent.intent_id, kind: 'dangling-cleared', path, before, after: '' });
        continue;
      }
      // Senza `#` e senza un id: un nome di blocco dei flussi vecchi, o un valore ignoto. Si
      // lascia com'e' e si riferisce: oggi la riparazione si salva, e cancellare un
      // collegamento per nome che il motore risolve ancora sarebbe un danno.
      unresolved.push({
        intentId: intent.intent_id, actionId: slot.actionId, slot: slot.key, fromId: slot.fromId, raw: slot.raw,
        reason: index.names.has(slot.toId) ? 'bare-name' : 'bare-unknown',
      });
    }
  }

  // 5. Un blocco "Return to parent agent" non ha uscita dal pallino: un valore rimasto li' e' stantio.
  for (const intent of list) {
    const next = intent?.attributes?.nextBlockAction;
    if (next && typeof next === 'object' && isReturnStackIntent(intent) && typeof next.intentName === 'string' && next.intentName !== '') {
      rec.add({ intentId: intent.intent_id, kind: 'next-block-cleared-return-stack', path: 'attributes.nextBlockAction.intentName', before: next.intentName, after: '' });
      next.intentName = '';
    }
  }

  // 6. I connettori che le action descrivono, e gli attributi visivi per blocco.
  const edges = edgesOfFlow(list);
  for (const intent of list) {
    const attrs = intent?.attributes?.connectors;
    if (!attrs || typeof attrs !== 'object') { continue; }
    const connectedFromIds = new Map<string, string>();   // fromId -> id del record
    for (const record of edges.outOf.get(intent.intent_id) || []) {
      const fromId = record.id.substring(0, record.id.lastIndexOf('/'));
      connectedFromIds.set(fromId, record.id);
    }
    for (const key of Object.keys(attrs)) {
      const recordId = connectedFromIds.get(key);
      if (!recordId) {
        rec.add({ intentId: intent.intent_id, kind: 'stale-connector-attr-removed', path: `attributes.connectors[${key}]`, before: attrs[key] });
        delete attrs[key];
        continue;
      }
      const entry = attrs[key];
      if (!entry || typeof entry !== 'object') {
        rec.add({ intentId: intent.intent_id, kind: 'stale-connector-attr-removed', path: `attributes.connectors[${key}]`, before: entry });
        delete attrs[key];
        continue;
      }
      if (entry.id !== recordId) {
        rec.add({ intentId: intent.intent_id, kind: 'connector-attr-id-filled', path: `attributes.connectors[${key}].id`, before: entry.id, after: recordId });
        entry.id = recordId;
      }
    }
  }

  // 7. La lista: dalle action, con l'aspetto preso dagli attributi del blocco o dal record precedente.
  const previous = isCollection(collection) ? collection : null;
  const built = buildCollection(list, previous, opts.now);
  const collectionChanged = built.changed;

  const changedIntentIds = [...rec.changed];
  const report: RepairReport = {
    faqKbId: opts.faqKbId || '',
    at: opts.now ? opts.now() : new Date().toISOString(),
    counts: rec.counts,
    changedIntentIds,
    unresolved,
    items: rec.items,
    collection: { existed: !!previous, changed: collectionChanged, records: built.collection.items.length, missing: built.missing, extra: built.extra },
  };
  return { intents: list, changedIntentIds, collection: built.collection, collectionChanged, report };
}

/**
 * La lista dei connettori che le action descrivono, con l'aspetto di ognuno. E' la regola
 * "vincono le action", in una funzione sola: la usa il normalizzatore all'apertura e lo store
 * dopo ogni salvataggio, cosi' la lista non puo' restare indietro rispetto al flusso.
 *
 * L'aspetto (`props`) viene prima dagli attributi visivi del blocco (`intent.attributes.connectors`,
 * che oggi e' dove il menu del connettore scrive), poi dal record precedente con lo stesso id.
 */
export function buildCollection(intents: any[], previous: ConnectorsCollection | null, now?: () => string): {
  collection: ConnectorsCollection; changed: boolean; missing: string[]; extra: string[];
} {
  const edges = edgesOfFlow(intents || []);
  const previousById = new Map<string, ConnectorRecord>((previous?.items || []).map(r => [r.id, r]));
  const items: ConnectorRecord[] = edges.records.map(record => {
    const props = propsFor(record, previousById.get(record.id), intents || []);
    return props ? { ...record, props } : { ...record };
  });
  const derivedIds = new Set(items.map(r => r.id));
  const missing = previous ? previous.items.map(r => r.id).filter(id => !derivedIds.has(id)) : [];
  const extra = previous ? items.map(r => r.id).filter(id => !previousById.has(id)) : [];
  const changed = !previous || missing.length > 0 || extra.length > 0 || items.some(r => !sameProps(r.props, previousById.get(r.id)?.props));
  const collection: ConnectorsCollection = {
    version: CONNECTORS_COLLECTION_VERSION,
    updatedAt: changed || !previous ? (now ? now() : new Date().toISOString()) : previous.updatedAt,
    items,
  };
  return { collection, changed, missing, extra };
}

export function isCollection(value: any): value is ConnectorsCollection {
  return !!value && typeof value === 'object' && Array.isArray(value.items) && value.version === CONNECTORS_COLLECTION_VERSION;
}

function propsFor(record: ConnectorRecord, previous: ConnectorRecord | undefined, intents: any[]): ConnectorProps | null {
  const intent = intents.find(i => i?.intent_id === record.from.intentId);
  const fromId = record.id.substring(0, record.id.lastIndexOf('/'));
  const legacy = intent?.attributes?.connectors?.[fromId];
  if (legacy && typeof legacy === 'object') {
    const props: ConnectorProps = {};
    if (typeof legacy.display === 'boolean') { props.display = legacy.display; }
    if (typeof legacy.label === 'string' && legacy.label !== '') { props.label = legacy.label; }
    if (typeof legacy.color === 'string' && legacy.color !== '') { props.color = legacy.color; }
    if (Object.keys(props).length > 0) { return props; }
  }
  if (previous?.props && Object.keys(previous.props).length > 0) { return { ...previous.props }; }
  return null;
}

function sameProps(a?: ConnectorProps, b?: ConnectorProps): boolean {
  const x = a || {}; const y = b || {};
  return x.display === y.display && x.label === y.label && x.color === y.color;
}

function pathOf(intent: any, slot: { kind: string; actionId: string; key: string; field: string }): string {
  if (slot.kind === 'block') { return 'attributes.nextBlockAction.intentName'; }
  const i = (intent.actions || []).findIndex((a: any) => a?._tdActionId === slot.actionId);
  return `actions[${i}].${slot.key}.${slot.field}`;
}

/**
 * Un blocco incollato: nuovo id, nessun collegamento e nessun attributo visivo ereditato.
 * Sostituisce il `.replace` a prima occorrenza sul JSON e l'azzeramento di OGNI stringa che
 * comincia per `#` (che cancellava anche un testo come "#promo").
 */
export function preparedPastedIntent(intent: any, newIntentId: string): any {
  intent.intent_id = newIntentId;
  clearAllTargets(intent);
  intent.attributes = intent.attributes || {};
  intent.attributes.connectors = {};
  return intent;
}

/** Svuota ogni destinazione del blocco (pallino e action), e solo quelle. */
export function clearAllTargets(intent: any): number {
  let cleared = 0;
  for (const slot of slotsOfIntent(intent)) {
    if (slot.raw !== '' && writeSlot(slot, null)) { cleared++; }
  }
  return cleared;
}

/** L'id del record che un'uscita produce, se collegata. Comodo per chi deve cercare nella lista. */
export function recordIdOfSlot(fromId: string, toId: string | null): string | null {
  return toId ? recordIdOf(fromId, toId) : null;
}
