/**
 * Il catalogo delle uscite: l'unico posto che sa quali connettori puo' avere un'action.
 *
 * Oggi la domanda "quali uscite ha questa action" ha sei risposte sparse per il Design Studio
 * (i rami di `ConnectorService.createConnectorsOfIntent`, `connectorIdFor`,
 * `ACTIONS_WITH_OWN_OUTPUTS`, `ACTION_DESTINATION_FIELDS`, le costanti di flow-ops, e ogni
 * componente di action che si costruisce da solo l'id del proprio pallino). Qui la risposta e'
 * una tabella dichiarativa per tipo di action, e tutto il resto si ricava da quella:
 *
 * - `outputsOf` elenca le uscite di un'action, collegate o vuote, con l'id dell'ancora
 *   (`fromId`), il campo da cui si legge la destinazione e la destinazione gia' interpretata;
 * - `edgesOfIntent` / `edgesOfFlow` ricavano i connettori di un blocco o di un flusso intero,
 *   nello stesso formato per tutti i tipi (`ConnectorRecord`), separando i riferimenti a
 *   blocchi che non esistono (`DanglingRef`);
 * - `setTarget` scrive una destinazione nel campo giusto, qualunque sia la forma della action.
 *
 * Gli id dei connettori restano quelli di sempre -- `${intent_id}/${_tdActionId}${suffisso}/${toId}`
 * con i suffissi `''`, `/true`, `/false`, `/noInput`, `/noMatch`, `/${uid}`, `/case/${id}`, `/else`,
 * `/${label}/true`, `/fallback`, `/error`, `/goto` -- perche' sono gli id che il disegno, gli
 * attributi visivi per blocco e la chat AI usano gia'. La spec di parita'
 * (`connector-catalog.parity.spec.ts`) dimostra che questo modulo produce, su flussi reali, gli
 * stessi id del codice attuale.
 *
 * Modulo puro: niente Angular, niente DOM, nessun effetto collaterale. L'unica funzione che
 * modifica i dati e' `ensureTechnicalIds`, e lo dichiara nel nome.
 */

import { TYPE_ACTION, TYPE_ACTION_VXML, isReturnStackIntent } from '../utils-actions';
import { TYPE_BUTTON } from '../utils';

/** Dove sta, dentro l'action, il campo con la destinazione di un'uscita. */
export type SlotPath =
  /** `action[field]` (trueIntent, intentName, goToIntent...). */
  | { kind: 'field'; field: string }
  /** `action.a.b.field` (la reply v1 tiene noInput/noMatch in `settings`). */
  | { kind: 'nested'; path: string[] }
  /** `action.attributes.commands[ultimo].settings[field]` (le action voice). */
  | { kind: 'lastCommandSetting'; field: string }
  /** Ogni `buttons[]` trovato a qualunque profondita' (come `findButtons`), solo i bottoni `type: action`. */
  | { kind: 'buttons' }
  /** Un elemento per voce di `action[array]`, identificato da `item[idField]`: i casi, i rami. */
  | { kind: 'array'; array: string; idField: string; field: string };

/** Che cosa monta il template per questa uscita. 'none': il connettore si disegna ma non ha un pallino suo. */
export type SlotAnchor = 'action' | 'button' | 'case' | 'branch' | 'block' | 'none';

/** La famiglia del connettore: decide stile e trattamento. */
export type RecordKind = 'block' | 'action' | 'button' | 'case' | 'branch';

export interface SlotSpec {
  /** Nome normalizzato dell'uscita; per bottoni, casi e rami e' il prefisso (`button`, `case`, `branch`). */
  key: string;
  /** Il suffisso che l'id del connettore porta dopo `${intent_id}/${_tdActionId}`. */
  suffix: string | ((item: any) => string);
  path: SlotPath;
  anchor: SlotAnchor;
  kind: RecordKind;
}

/** Un'uscita di una action, istanziata: una per bottone, per caso, per ramo. */
export interface ResolvedSlot {
  spec: SlotSpec;
  /** `true`, `button:<uid>`, `case:<id>`, `branch:<label>`, `next`... */
  key: string;
  intentId: string;
  actionId: string;
  fromId: string;
  kind: RecordKind;
  /** L'oggetto che contiene il campo, e il campo: e' qui che si legge e si scrive. */
  holder: any;
  field: string;
  /** Il bottone, il caso o il ramo da cui nasce l'uscita. */
  item?: any;
  /** Il valore grezzo del campo ('' se vuoto o assente). */
  raw: string;
  /** La destinazione interpretata (senza `#`, senza la coda `{...}` dei bottoni); null se vuota. */
  toId: string | null;
  /** Il valore cominciava con `#`. Senza, il motore cerca il blocco per nome. */
  hasHash: boolean;
  /** Per i bottoni: la coda `{...}` dopo l'id, da conservare quando si riscrive la destinazione. */
  attrs: string | null;
  /** Il bottone non ha un `uid` valido: l'id dell'ancora non e' affidabile finche' non lo riceve. */
  needsId?: boolean;
}

/** Un connettore, nello stesso formato per ogni tipo di uscita. E' il record della lista del bot. */
export interface ConnectorRecord {
  /** `${fromId}/${toId}`: derivato dagli estremi, non generato. */
  id: string;
  from: { intentId: string; actionId: string; slot: string };
  to: { intentId: string };
  kind: RecordKind;
  props?: ConnectorProps;
}

/** L'aspetto di un connettore. Prima stava in `intent.attributes.connectors[fromId]`. */
export interface ConnectorProps {
  display?: boolean;
  label?: string;
  color?: string;
}

/** Una destinazione che non porta a nessun blocco del flusso. */
export interface DanglingRef {
  intentId: string;
  actionId: string;
  slot: string;
  fromId: string;
  raw: string;
  /** `unknown-id`: aveva il `#` ma l'id non esiste. `bare-name`: e' il nome di un blocco (flussi vecchi). `bare-unknown`: ne' id ne' nome. */
  reason: 'unknown-id' | 'bare-name' | 'bare-unknown';
}

export interface FlowIndex {
  ids: Set<string>;
  names: Set<string>;
}

export interface IntentEdges {
  records: ConnectorRecord[];
  dangling: DanglingRef[];
  /** Per ogni record, l'uscita da cui nasce. */
  slots: Map<string, ResolvedSlot>;
}

export interface FlowEdges extends IntentEdges {
  byId: Map<string, ConnectorRecord>;
  outOf: Map<string, ConnectorRecord[]>;
  into: Map<string, ConnectorRecord[]>;
}

const field = (key: string, suffix: string, name: string, anchor: SlotAnchor = 'action'): SlotSpec =>
  ({ key, suffix, path: { kind: 'field', field: name }, anchor, kind: 'action' });
const nested = (key: string, suffix: string, path: string[], anchor: SlotAnchor = 'none'): SlotSpec =>
  ({ key, suffix, path: { kind: 'nested', path }, anchor, kind: 'action' });
const lastCommand = (key: string, suffix: string, name: string): SlotSpec =>
  ({ key, suffix, path: { kind: 'lastCommandSetting', field: name }, anchor: 'action', kind: 'action' });
const BUTTONS: SlotSpec = { key: 'button', suffix: (b: any) => '/' + b.uid, path: { kind: 'buttons' }, anchor: 'button', kind: 'button' };

const TRUE_FALSE: SlotSpec[] = [field('true', '/true', 'trueIntent'), field('false', '/false', 'falseIntent')];

/* La reply v1 legge noInput/noMatch da `settings`, e li disegna anche se il suo template non monta
   un pallino per loro: il connettore esiste, l'ancora no. Resta cosi' per parita'. */
const REPLY_V1: SlotSpec[] = [
  BUTTONS,
  nested('noInput', '/noInput', ['settings', 'noInputIntent']),
  nested('noMatch', '/noMatch', ['settings', 'noMatchIntent']),
];

/* Le action voice coi bottoni passano anche dal ramo della reply v1 (bottoni e `settings`), poi
   leggono noInput/noMatch (o true/false) dall'ultimo comando. L'ordine e' quello del codice attuale. */
const VOICE_SETTINGS: SlotSpec[] = [
  nested('noInput', '/noInput', ['settings', 'noInputIntent']),
  nested('noMatch', '/noMatch', ['settings', 'noMatchIntent']),
];

/**
 * Le uscite di ogni tipo di action, nell'ordine in cui il codice attuale le percorre.
 * Un tipo che non compare non ha connettori propri (e il blocco prosegue dal pallino).
 */
export const OUTPUT_CATALOG: Readonly<Record<string, ReadonlyArray<SlotSpec>>> = {
  [TYPE_ACTION.INTENT]:              [field('default', '', 'intentName')],
  [TYPE_ACTION.CONNECT_BLOCK]:       [field('default', '', 'intentName')],
  [TYPE_ACTION.REPLY]:               REPLY_V1,
  [TYPE_ACTION.RANDOM_REPLY]:        REPLY_V1,
  [TYPE_ACTION.REPLYV2]:             [BUTTONS, field('noInput', '/noInput', 'noInputIntent'), field('noMatch', '/noMatch', 'noMatchIntent')],
  [TYPE_ACTION.ONLINE_AGENTS]:       TRUE_FALSE,
  [TYPE_ACTION.ONLINE_AGENTSV2]:     TRUE_FALSE,
  [TYPE_ACTION.OPEN_HOURS]:          TRUE_FALSE,
  [TYPE_ACTION.JSON_CONDITION_MULTI]: [
    { key: 'case', suffix: (c: any) => '/case/' + c._tdCaseId, path: { kind: 'array', array: 'cases', idField: '_tdCaseId', field: 'intent' }, anchor: 'case', kind: 'case' },
    field('else', '/else', 'elseIntent'),
  ],
  [TYPE_ACTION.JSON_CONDITION]:      TRUE_FALSE,
  [TYPE_ACTION.JSON_CONDITION2]:     TRUE_FALSE,
  [TYPE_ACTION.INVOKE_SUB_AGENT]:    TRUE_FALSE,
  [TYPE_ACTION.ASKGPT]:              TRUE_FALSE,
  [TYPE_ACTION.ASKGPTV2]:            TRUE_FALSE,
  [TYPE_ACTION.GPT_TASK]:            TRUE_FALSE,
  [TYPE_ACTION.GPT_ASSISTANT]:       TRUE_FALSE,
  [TYPE_ACTION.AI_PROMPT]:           TRUE_FALSE,
  [TYPE_ACTION.AI_CONDITION]: [
    { key: 'branch', suffix: (b: any) => '/' + b.label + '/true', path: { kind: 'array', array: 'intents', idField: 'label', field: 'conditionIntentId' }, anchor: 'branch', kind: 'branch' },
    field('fallback', '/fallback', 'fallbackIntent'),
    field('error', '/error', 'errorIntent'),
  ],
  [TYPE_ACTION.WEB_REQUESTV2]:       TRUE_FALSE,
  [TYPE_ACTION.DATA_TABLE]:          TRUE_FALSE,
  [TYPE_ACTION.MAKE]:                TRUE_FALSE,
  [TYPE_ACTION.HUBSPOT]:             TRUE_FALSE,
  [TYPE_ACTION.CUSTOMERIO]:          TRUE_FALSE,
  [TYPE_ACTION.BREVO]:               TRUE_FALSE,
  [TYPE_ACTION.N8N]:                 TRUE_FALSE,
  [TYPE_ACTION.QAPLA]:               TRUE_FALSE,
  [TYPE_ACTION.CAPTURE_USER_REPLY]:  [field('default', '', 'goToIntent')],
  [TYPE_ACTION.ITERATION]:           [field('goto', '/goto', 'goToIntent'), field('fallback', '/fallback', 'fallbackIntent', 'none')],
  [TYPE_ACTION_VXML.DTMF_MENU]:      [BUTTONS, ...VOICE_SETTINGS, lastCommand('noInput', '/noInput', 'noInputIntent'), lastCommand('noMatch', '/noMatch', 'noMatchIntent')],
  [TYPE_ACTION_VXML.DTMF_FORM]:      [BUTTONS, ...VOICE_SETTINGS, lastCommand('noInput', '/noInput', 'noInputIntent'), lastCommand('noMatch', '/noMatch', 'noMatchIntent')],
  [TYPE_ACTION_VXML.SPEECH_FORM]:    [lastCommand('noInput', '/noInput', 'noInputIntent'), lastCommand('noMatch', '/noMatch', 'noMatchIntent')],
  [TYPE_ACTION_VXML.BLIND_TRANSFER]: [BUTTONS, ...VOICE_SETTINGS, lastCommand('true', '/true', 'trueIntent'), lastCommand('false', '/false', 'falseIntent')],
  [TYPE_ACTION.SEND_WHATSAPP]:       TRUE_FALSE,
};

/** L'uscita del blocco: il pallino, che scrive in `attributes.nextBlockAction.intentName`. */
export const BLOCK_SLOT: SlotSpec = { key: 'next', suffix: '', path: { kind: 'nested', path: ['attributes', 'nextBlockAction', 'intentName'] }, anchor: 'block', kind: 'block' };

/**
 * In V3 il pallino del blocco si nasconde sulle action che hanno uscite proprie, tranne queste:
 * la famiglia reply (il flusso deve poter proseguire dopo la risposta), la capture (la sua uscita
 * e' il pallino), l'iterazione (il pallino e' "lista finita") e le action voice. E' la regola di
 * `ACTIONS_WITH_OWN_OUTPUTS` in utils-actions.ts, che qui si ricava dal catalogo invece di
 * mantenerla a mano.
 */
const V3_KEEPS_BLOCK_DOT: ReadonlySet<string> = new Set<string>([
  TYPE_ACTION.REPLY, TYPE_ACTION.REPLYV2, TYPE_ACTION.RANDOM_REPLY,
  TYPE_ACTION.CAPTURE_USER_REPLY, TYPE_ACTION.ITERATION,
  ...Object.values(TYPE_ACTION_VXML) as string[],
]);

export const TYPES_WITH_OWN_OUTPUTS: ReadonlyArray<string> =
  Object.keys(OUTPUT_CATALOG).filter(type => !V3_KEEPS_BLOCK_DOT.has(type));

export function typeHasOwnOutputs(type: string): boolean {
  return TYPES_WITH_OWN_OUTPUTS.includes(type);
}

/** Il tipo ha almeno un'uscita nel catalogo (bottoni compresi). */
export function typeHasOutputs(type: string): boolean {
  return !!type && Object.prototype.hasOwnProperty.call(OUTPUT_CATALOG, type);
}

export function destinationSlotsOf(type: string): ReadonlyArray<SlotSpec> {
  return OUTPUT_CATALOG[type] || [];
}

/* ------------------------------------------------------------------------------------------ */
/* Lettura e scrittura delle destinazioni                                                      */
/* ------------------------------------------------------------------------------------------ */

function isSet(raw: any): raw is string {
  return typeof raw === 'string' && raw !== '';
}

/**
 * La destinazione di un bottone: `#<id>` oppure `#<id>{...attributi}`. E' l'unico posto che
 * conosce questa forma; prima era ripetuta in cinque file. Segue alla lettera il codice attuale:
 * l'id va dal carattere dopo `#` fino alla `{`, e senza `#` vale tutta la stringa.
 */
export function parseButtonTarget(action: any): { toId: string | null; attrs: string | null; hasHash: boolean } {
  if (!isSet(action)) { return { toId: null, attrs: null, hasHash: false }; }
  const start = action.indexOf('#') + 1;
  const end = action.indexOf('{');
  const toId = end > -1 ? action.substring(start, end) : action.substring(start);
  return { toId: toId !== '' ? toId : null, attrs: end > -1 ? action.substring(end) : null, hasHash: action.trim().startsWith('#') };
}

export function buildButtonAction(toId: string | null, attrs: string | null): string {
  return toId ? '#' + toId + (attrs || '') : '';
}

/** La destinazione di un campo: `#<id>` di norma, l'id nudo nei flussi vecchi. Come il codice attuale, toglie il primo `#`. */
export function parseFieldTarget(raw: any): { toId: string | null; hasHash: boolean } {
  if (!isSet(raw)) { return { toId: null, hasHash: false }; }
  const toId = raw.replace('#', '');
  return { toId: toId !== '' ? toId : null, hasHash: raw.trim().startsWith('#') };
}

/** Il valore da scrivere in un campo di destinazione: `'#'+id`, oppure '' per scollegare. */
export function destinationValue(toId: string | null): string {
  return toId ? '#' + toId : '';
}

export function recordIdOf(fromId: string, toId: string): string {
  return fromId + '/' + toId;
}

export function parseRecordId(id: string): { fromId: string; toId: string; intentId: string } | null {
  const cut = (id || '').lastIndexOf('/');
  if (cut < 1) { return null; }
  const fromId = id.substring(0, cut);
  return { fromId, toId: id.substring(cut + 1), intentId: fromId.split('/')[0] };
}

/** Ogni `buttons[]` dentro l'oggetto, a qualunque profondita', nell'ordine di visita (= `findButtons`). */
export function findButtons(obj: any): any[] {
  let buttons: any[] = [];
  if (!obj) { return buttons; }
  if (Array.isArray(obj)) {
    for (const element of obj) { buttons = buttons.concat(findButtons(element)); }
  } else if (typeof obj === 'object') {
    if (Object.prototype.hasOwnProperty.call(obj, 'buttons') && Array.isArray(obj.buttons)) {
      obj.buttons.forEach((button: any) => buttons.push(button));
    }
    for (const key in obj) { buttons = buttons.concat(findButtons(obj[key])); }
  }
  return buttons;
}

function hasValidUid(uid: any): boolean {
  return typeof uid === 'string' && uid !== '' && uid !== 'UUIDV4';
}

function suffixOf(spec: SlotSpec, item?: any): string {
  return typeof spec.suffix === 'function' ? spec.suffix(item) : spec.suffix;
}

function makeSlot(spec: SlotSpec, intentId: string, actionId: string, holder: any, fieldName: string, item?: any, keyOverride?: string): ResolvedSlot {
  const raw = holder && isSet(holder[fieldName]) ? holder[fieldName] : '';
  const parsed = spec.path.kind === 'buttons' ? parseButtonTarget(raw) : { ...parseFieldTarget(raw), attrs: null };
  const slot: ResolvedSlot = {
    spec, key: keyOverride || spec.key, intentId, actionId,
    fromId: intentId + '/' + actionId + suffixOf(spec, item),
    kind: spec.kind, holder, field: fieldName, item,
    raw, toId: parsed.toId, hasHash: parsed.hasHash, attrs: parsed.attrs,
  };
  return slot;
}

/**
 * Le uscite di una action, collegate o vuote, nell'ordine del codice attuale.
 * Non lancia mai: una action senza `commands`, senza `intents` o senza `cases` ha semplicemente
 * meno uscite (oggi la stessa mancanza interrompe il disegno di tutto il blocco).
 */
export function outputsOf(intentId: string, action: any): ResolvedSlot[] {
  const out: ResolvedSlot[] = [];
  if (!action || typeof action !== 'object') { return out; }
  const actionId = action._tdActionId;
  for (const spec of destinationSlotsOf(action._tdActionType)) {
    switch (spec.path.kind) {
      case 'field':
        out.push(makeSlot(spec, intentId, actionId, action, spec.path.field));
        break;
      case 'nested': {
        const steps = spec.path.path;
        let holder = action;
        for (let i = 0; i < steps.length - 1 && holder; i++) { holder = holder[steps[i]]; }
        if (holder && typeof holder === 'object') { out.push(makeSlot(spec, intentId, actionId, holder, steps[steps.length - 1])); }
        break;
      }
      case 'lastCommandSetting': {
        const commands = action.attributes?.commands;
        const settings = Array.isArray(commands) && commands.length > 0 ? commands[commands.length - 1]?.settings : null;
        if (settings && typeof settings === 'object') { out.push(makeSlot(spec, intentId, actionId, settings, spec.path.field)); }
        break;
      }
      case 'buttons':
        for (const button of findButtons(action)) {
          if (!button || button.type !== TYPE_BUTTON.ACTION) { continue; }
          const slot = makeSlot(spec, intentId, actionId, button, 'action', button, 'button:' + (button.uid ?? ''));
          if (!hasValidUid(button.uid)) { slot.needsId = true; }
          out.push(slot);
        }
        break;
      case 'array': {
        const list = action[spec.path.array];
        if (!Array.isArray(list)) { break; }
        for (const item of list) {
          if (!item || typeof item !== 'object') { continue; }
          out.push(makeSlot(spec, intentId, actionId, item, spec.path.field, item, spec.key + ':' + item[spec.path.idField]));
        }
        break;
      }
    }
  }
  return out;
}

/** L'uscita del pallino del blocco; null se il blocco non ha `nextBlockAction` o e' un "Return to parent agent". */
export function blockOutputOf(intent: any): ResolvedSlot | null {
  const next = intent?.attributes?.nextBlockAction;
  if (!next || typeof next !== 'object' || isReturnStackIntent(intent)) { return null; }
  return makeSlot(BLOCK_SLOT, intent.intent_id, next._tdActionId, next, 'intentName');
}

/** Tutte le uscite di un blocco: prima il pallino, poi le action nell'ordine in cui stanno. */
export function slotsOfIntent(intent: any): ResolvedSlot[] {
  const out: ResolvedSlot[] = [];
  const block = blockOutputOf(intent);
  if (block) { out.push(block); }
  for (const action of intent?.actions || []) { out.push(...outputsOf(intent.intent_id, action)); }
  return out;
}

export function slotOfFromId(intent: any, fromId: string): ResolvedSlot | null {
  return slotsOfIntent(intent).find(slot => slot.fromId === fromId) || null;
}

export function slotOfKey(intent: any, actionId: string | null, slotKey: string): ResolvedSlot | null {
  return slotsOfIntent(intent).find(slot => slot.key === slotKey && (slotKey === BLOCK_SLOT.key || slot.actionId === actionId)) || null;
}

/** La destinazione di un'uscita, gia' interpretata; null se vuota o se l'uscita non esiste. */
export function readTarget(intent: any, actionId: string | null, slotKey: string): string | null {
  return slotOfKey(intent, actionId, slotKey)?.toId ?? null;
}

/**
 * Scrive la destinazione di un'uscita nel campo giusto: `'#'+id`, oppure '' per scollegare.
 * Per i bottoni conserva la coda `{...}`. Restituisce true se il valore e' cambiato.
 */
export function setTarget(intent: any, actionId: string | null, slotKey: string, toId: string | null): boolean {
  const slot = slotOfKey(intent, actionId, slotKey);
  if (!slot) { return false; }
  return writeSlot(slot, toId);
}

export function writeSlot(slot: ResolvedSlot, toId: string | null): boolean {
  const value = slot.spec.path.kind === 'buttons' ? buildButtonAction(toId, slot.attrs) : destinationValue(toId);
  if (slot.holder[slot.field] === value) { return false; }
  slot.holder[slot.field] = value;
  return true;
}

/* ------------------------------------------------------------------------------------------ */
/* I connettori di un flusso                                                                   */
/* ------------------------------------------------------------------------------------------ */

export function indexFlow(intents: any[]): FlowIndex {
  const ids = new Set<string>();
  const names = new Set<string>();
  for (const intent of intents || []) {
    if (intent?.intent_id) { ids.add(intent.intent_id); }
    if (intent?.intent_display_name) { names.add(intent.intent_display_name); }
  }
  return { ids, names };
}

/**
 * I connettori di un blocco: un record per uscita collegata verso un blocco che esiste, e un
 * riferimento pendente per ogni uscita che punta nel vuoto. Un id che compare due volte (lo
 * stesso bottone copiato, due rami con la stessa label) conta una volta sola, come oggi.
 */
export function edgesOfIntent(intent: any, index: FlowIndex): IntentEdges {
  const records: ConnectorRecord[] = [];
  const dangling: DanglingRef[] = [];
  const slots = new Map<string, ResolvedSlot>();
  for (const slot of slotsOfIntent(intent)) {
    if (!slot.toId) { continue; }
    if (!index.ids.has(slot.toId)) {
      dangling.push({
        intentId: slot.intentId, actionId: slot.actionId, slot: slot.key, fromId: slot.fromId, raw: slot.raw,
        reason: slot.hasHash ? 'unknown-id' : (index.names.has(slot.toId) ? 'bare-name' : 'bare-unknown'),
      });
      continue;
    }
    const id = recordIdOf(slot.fromId, slot.toId);
    if (slots.has(id)) { continue; }
    records.push({ id, from: { intentId: slot.intentId, actionId: slot.actionId, slot: slot.key }, to: { intentId: slot.toId }, kind: slot.kind });
    slots.set(id, slot);
  }
  return { records, dangling, slots };
}

export function edgesOfFlow(intents: any[]): FlowEdges {
  const index = indexFlow(intents);
  const records: ConnectorRecord[] = [];
  const dangling: DanglingRef[] = [];
  const slots = new Map<string, ResolvedSlot>();
  const byId = new Map<string, ConnectorRecord>();
  const outOf = new Map<string, ConnectorRecord[]>();
  const into = new Map<string, ConnectorRecord[]>();
  for (const intent of intents || []) {
    const edges = edgesOfIntent(intent, index);
    dangling.push(...edges.dangling);
    for (const record of edges.records) {
      if (byId.has(record.id)) { continue; }
      records.push(record);
      byId.set(record.id, record);
      slots.set(record.id, edges.slots.get(record.id)!);
      push(outOf, record.from.intentId, record);
      push(into, record.to.intentId, record);
    }
  }
  return { records, dangling, slots, byId, outOf, into };
}

function push(map: Map<string, ConnectorRecord[]>, key: string, record: ConnectorRecord): void {
  const list = map.get(key);
  if (list) { list.push(record); } else { map.set(key, [record]); }
}

/* ------------------------------------------------------------------------------------------ */
/* Id tecnici                                                                                  */
/* ------------------------------------------------------------------------------------------ */

export interface TechnicalIdChange {
  intentId: string;
  kind: 'action-id' | 'case-id' | 'button-uid';
  path: string;
}

/**
 * Da' un id a cio' che ne ha bisogno per avere un connettore stabile: `_tdActionId` delle action,
 * `_tdCaseId` dei casi, `uid` dei bottoni (mancante, `UUIDV4` o duplicato nello stesso elenco).
 * Sono le regole di `patchActionId`, `patchButtons` e del ramo dei bottoni del disegno, in un
 * posto solo. MODIFICA gli intent che riceve; `uid` e' iniettato per avere spec riproducibili.
 */
export function ensureTechnicalIds(intents: any[], uid: () => string): TechnicalIdChange[] {
  const changes: TechnicalIdChange[] = [];
  for (const intent of intents || []) {
    (intent?.actions || []).forEach((action: any, a: number) => {
      if (!action || typeof action !== 'object') { return; }
      if (!hasValidUid(action._tdActionId)) {
        action._tdActionId = uid();
        changes.push({ intentId: intent.intent_id, kind: 'action-id', path: `actions[${a}]._tdActionId` });
      }
      if (Array.isArray(action.cases)) {
        action.cases.forEach((branch: any, c: number) => {
          if (branch && typeof branch === 'object' && !branch._tdCaseId) {
            branch._tdCaseId = uid();
            changes.push({ intentId: intent.intent_id, kind: 'case-id', path: `actions[${a}].cases[${c}]._tdCaseId` });
          }
        });
      }
      const seen = new Set<string>();
      findButtons(action).forEach((button: any, b: number) => {
        if (!button || typeof button !== 'object') { return; }
        if (!hasValidUid(button.uid) || seen.has(button.uid)) {
          button.uid = uid();
          changes.push({ intentId: intent.intent_id, kind: 'button-uid', path: `actions[${a}].buttons#${b}.uid` });
        }
        seen.add(button.uid);
      });
    });
  }
  return changes;
}
