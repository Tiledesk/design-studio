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
 * La lista (`ConnectorsCollection`) si ricava dalle action e si riconcilia con quella eventualmente
 * gia' salvata nel bot. Chi vince lo dice il chiamante:
 *  - `collectionWins` (gli agenti V3, dal 12/10/2026): LA LISTA E' LA VERITA'. Le uscite di ogni
 *    action e il pallino vengono riscritti dalla lista; i campi delle action sono solo la copia in
 *    memoria che i componenti leggono (e, finche' il motore V3 non e' in produzione, la copia che
 *    il motore esegue). Senza lista (prima apertura di un V3) la lista nasce dalle action.
 *  - altrimenti VINCONO LE ACTION: la lista viene ricostruita e la differenza finisce nel rapporto.
 * L'aspetto dei connettori (`props`) sopravvive per id: dal record precedente, oppure, la prima
 * volta, dagli attributi visivi che ogni blocco teneva in `intent.attributes.connectors`.
 *
 * Modulo puro: niente Angular, niente DOM, niente logger. MODIFICA gli intent che riceve
 * (il chiamante li clona se vuole conservare l'originale); `uid` e' iniettato per avere spec
 * riproducibili.
 */

import { RESERVED_INTENT_NAMES } from '../utils';
import { isReturnStackIntent } from '../utils-actions';
import {
  ConnectorProps, ConnectorRecord, DanglingRef, FlowIndex, ResolvedSlot, edgesOfFlow, ensureTechnicalIds, indexFlow, recordIdOf,
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
  | 'connector-attr-id-filled'
  /** V3 senza pulizia: un'uscita riscritta dalla lista del bot (la lista vince sui campi), da salvare. */
  | 'projected-from-collection'
  /** V3 con pulizia: il JSON del blocco porta ancora una chiave di destinazione alla maniera V2; il blocco va salvato ripulito. */
  | 'v2-destination-still-saved'
  /** V3 con pulizia: il JSON del blocco porta ancora gli attributi visivi per blocco (`attributes.connectors`); il blocco va salvato ripulito. */
  | 'v2-connector-attrs-still-saved';

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
  collection: { existed: boolean; changed: boolean; records: number; missing: string[]; extra: string[]; projected: number };
  /** Riempiti da chi salva. */
  saved?: { intents: boolean; collection: boolean };
  saveError?: string;
}

export interface NormalizeOptions {
  uid: () => string;
  isV3?: boolean;
  /** La lista salvata nel bot vince sui campi delle action (gli agenti V3). Senza lista non cambia nulla. */
  collectionWins?: boolean;
  /**
   * V3: il JSON dell'agente va ripulito dalle destinazioni scritte alla maniera V2. I blocchi che
   * le portano ancora vengono segnati da salvare (chi salva svuota i campi, bottoni esclusi); il
   * riempimento dei campi in memoria dalla lista non conta come riparazione. Spento: i campi
   * riscritti dalla lista contano come riparazione e si salvano pieni.
   */
  cleanDestinations?: boolean;
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

  // Chi porta ancora gli attributi visivi per blocco (`attributes.connectors`, maniera V2): si
  // guarda PRIMA dei default, che li creano vuoti in memoria per il canvas.
  const hadV2Attrs = new Set<string>(list.filter(i => i?.attributes && Object.prototype.hasOwnProperty.call(i.attributes, 'connectors')).map(i => i.intent_id));

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

  // 5a. V3 con pulizia: il JSON di un V3 non porta traccia dei connettori alla maniera V2. Un
  //     blocco che sul server ha ancora una chiave di destinazione (anche vuota, bottoni compresi:
  //     il motore V3 riempie `button.action` dalla lista prima che la reply parta) o gli attributi
  //     visivi per blocco va salvato ripulito: la verita' e' la lista. Un nome di blocco senza `#`
  //     (flussi vecchi) non si tocca.
  if (opts.collectionWins && opts.cleanDestinations) {
    for (const intent of list) {
      if (!intent) { continue; }
      for (const slot of slotsOfIntent(intent)) {
        if (!isV2Trace(slot)) { continue; }
        rec.add({ intentId: intent.intent_id, kind: 'v2-destination-still-saved', path: pathOf(intent, slot), before: slot.raw, after: undefined });
      }
      if (hadV2Attrs.has(intent.intent_id)) {
        rec.add({ intentId: intent.intent_id, kind: 'v2-connector-attrs-still-saved', path: 'attributes.connectors' });
      }
    }
  }

  // 5b. V3: la lista salvata nel bot e' la verita', e le uscite si riscrivono da li'. Un record
  //     verso un blocco che non c'e' piu' cade; un'uscita che la lista non conosce si svuota;
  //     un nome di blocco dei flussi vecchi (senza `#`) non si tocca. Con la pulizia accesa e'
  //     solo il riempimento in memoria (i campi sul server restano vuoti); spenta, e' una
  //     riparazione da salvare.
  let projected = 0;
  if (opts.collectionWins && isCollection(collection)) {
    projected = projectCollection(list, collection, index, opts.cleanDestinations ? null : rec);
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

  // 7b. V3: l'aspetto dei connettori vive nei `props` della lista; il canvas pero' lo legge e lo
  //     scrive ancora negli attributi del blocco, che sul server non ci sono piu'. Qui, in memoria,
  //     si ricostruiscono dalla lista (quelli gia' presenti nel blocco vincono: sono la scrittura
  //     piu' recente del menu). Solo per i record che hanno un aspetto (`display`, `label`,
  //     `color`): la coda `params` di un bottone non lo e', e una voce senza `display` fa
  //     comparire al pallino il riquadro col nome del blocco come se la linea fosse nascosta.
  //     Il menu scrive sempre `display`: qui lo stesso, vero se il record non lo dice.
  if (opts.collectionWins) {
    const byId = new Map<string, any>(list.filter(i => !!i).map(i => [i.intent_id, i]));
    for (const record of built.collection.items) {
      const props = record.props;
      if (!props || (props.display === undefined && props.label === undefined && props.color === undefined)) { continue; }
      const intent = byId.get(record.from.intentId);
      if (!intent) { continue; }
      const fromId = record.id.substring(0, record.id.lastIndexOf('/'));
      if (intent.attributes.connectors[fromId]) { continue; }
      const entry: any = { id: record.id, display: props.display !== false };
      if (props.label !== undefined) { entry.label = props.label; }
      if (props.color !== undefined) { entry.color = props.color; }
      intent.attributes.connectors[fromId] = entry;
    }
  }

  const changedIntentIds = [...rec.changed];
  const report: RepairReport = {
    faqKbId: opts.faqKbId || '',
    at: opts.now ? opts.now() : new Date().toISOString(),
    counts: rec.counts,
    changedIntentIds,
    unresolved,
    items: rec.items,
    collection: { existed: !!previous, changed: collectionChanged, records: built.collection.items.length, missing: built.missing, extra: built.extra, projected },
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
  // Cio' che il record porta gia' dalla action (la coda `{...}` di un bottone) resta sempre.
  const own: ConnectorProps = record.props ? { ...record.props } : {};
  const legacy = intent?.attributes?.connectors?.[fromId];
  let looks: ConnectorProps = {};
  if (legacy && typeof legacy === 'object') {
    if (typeof legacy.display === 'boolean') { looks.display = legacy.display; }
    if (typeof legacy.label === 'string' && legacy.label !== '') { looks.label = legacy.label; }
    if (typeof legacy.color === 'string' && legacy.color !== '') { looks.color = legacy.color; }
  }
  if (previous?.props) {
    const { params, ...rest } = previous.props;
    if (Object.keys(looks).length === 0) { looks = rest; }
    // Un bottone ripulito (senza `action`) non sa piu' la sua coda: la tiene il record precedente.
    if (own.params === undefined && params !== undefined) { own.params = params; }
  }
  const props = { ...own, ...looks };
  return Object.keys(props).length > 0 ? props : null;
}

/**
 * Riscrive ogni uscita del flusso con la destinazione che la lista le da' (una per uscita: se la
 * lista ne avesse due per la stessa uscita, vale l'ultima). Restituisce quante uscite ha cambiato.
 */
function projectCollection(list: any[], collection: ConnectorsCollection, index: FlowIndex, rec: Recorder | null): number {
  const byFromId = new Map<string, ConnectorRecord>();
  for (const record of collection.items) {
    if (!record?.id || !record.to?.intentId) { continue; }
    byFromId.set(record.id.substring(0, record.id.lastIndexOf('/')), record);
  }
  const isIntentId = (value: string) => index.ids.has(value) && !index.names.has(value);
  let changed = 0;
  for (const intent of list) {
    if (!intent) { continue; }
    for (const slot of slotsOfIntent(intent)) {
      const record = byFromId.get(slot.fromId);
      const wanted = record && index.ids.has(record.to.intentId) ? record.to.intentId : null;
      if (slot.toId && !slot.hasHash && !isIntentId(slot.toId)) { continue; }   // un nome di blocco: non si tocca
      if (slot.kind === 'button' && !wanted && !slot.toId && slot.item?.type === 'action') {
        // un bottone "action" senza record e senza destinazione (ripulito sul server): torna di testo
        writeSlot(slot, null, null);
        slot.item.type = 'text';
        changed++;
        continue;
      }
      if ((slot.toId || null) === wanted) { continue; }
      const before = slot.raw;
      writeSlot(slot, wanted, slot.kind === 'button' ? (record?.props?.params ?? slot.attrs) : undefined);
      if (slot.kind === 'button' && slot.item) { slot.item.type = wanted ? 'action' : 'text'; }
      if (rec) { rec.add({ intentId: intent.intent_id, kind: 'projected-from-collection', path: pathOf(intent, slot), before, after: slot.holder[slot.field] }); }
      changed++;
    }
  }
  return changed;
}

function sameProps(a?: ConnectorProps, b?: ConnectorProps): boolean {
  const x = a || {}; const y = b || {};
  return x.display === y.display && x.label === y.label && x.color === y.color && x.params === y.params;
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

/** Una chiave di destinazione scritta alla maniera V2: c'e', ed e' vuota o un `#id` (un nome di blocco nudo non lo e'). */
function isV2Trace(slot: ResolvedSlot): boolean {
  if (!slot.holder || !Object.prototype.hasOwnProperty.call(slot.holder, slot.field)) { return false; }
  return !(slot.toId && !slot.hasHash);
}

/**
 * V3, al salvataggio: il JSON dell'agente non porta traccia dei connettori alla maniera V2. Via le
 * chiavi di destinazione delle action e del pallino (`trueIntent`, `intentName`, `goToIntent`,
 * `cases[].intent`, ...), via `button.action` dei bottoni (il motore V3 lo riempie dalla lista prima
 * che la reply parta; la coda `{...}` sta nei `props` del record) e via gli attributi visivi per
 * blocco (`attributes.connectors`: l'aspetto sta nei `props` della lista). Resta un nome di blocco
 * senza `#` dei flussi vecchi. Lavora su cio' che riceve: va chiamata sul payload, che e' un clone,
 * mai sul modello che il canvas disegna. Restituisce quante cose ha tolto.
 */
export function stripV2Connectors(intents: any[]): number {
  let stripped = 0;
  for (const intent of intents || []) {
    if (!intent) { continue; }
    for (const slot of slotsOfIntent(intent)) {
      if (!isV2Trace(slot)) { continue; }
      delete slot.holder[slot.field];
      stripped++;
    }
    if (intent.attributes && Object.prototype.hasOwnProperty.call(intent.attributes, 'connectors')) {
      delete intent.attributes.connectors;
      stripped++;
    }
  }
  return stripped;
}
