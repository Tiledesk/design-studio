/**
 * Compilatore Blueprint → agente V3, nel formato di /faq_kb/importjson?create=true.
 *
 * Il Blueprint (prodotto dal servizio di generazione, contratto in docs/V3/ai-authoring) descrive il flusso
 * con id locali leggibili. Qui diventa un agente V3:
 * - una sola action per intent; la macro `ask` diventa due blocchi (messaggio + capture);
 * - `intent_id` reali e riferimenti `#<intent_id>`: nel V3 un `#id` pendente viene azzerato in silenzio;
 * - nomi dei blocchi validi per l'editor, unici e mai riservati;
 * - `start`, `defaultFallback`, posizioni sul canvas e variabili dichiarate.
 * Accetta blueprint-1 (tutti i campi, null compresi) e blueprint-2 (solo i campi del tipo di ogni blocco).
 * Ogni action ha i valori che l'editor si aspetta, perché aprire l'agente non la riscriva.
 * Regole per tipo: action-catalog.md e generator-actions.md; garanzie: generation-rules.md §5.
 *
 * Il file non ha import e usa solo sintassi TypeScript "cancellabile" (niente enum, decoratori o parameter
 * properties): lo usa il DS e lo testa Node direttamente (tools/ai-authoring/blueprint-compiler.test.mjs).
 */

export interface CompilableButton {
  label: string;
  goto?: string | null;
  url?: string | null;
}

/** Un ramo di ai_condition: etichetta leggibile, quando vale e dove porta. */
export interface CompilableBranch {
  label: string;
  description: string;
  goto: string;
}

/** Una condizione di data_table. `value` è null con gli operatori exists e not_exists. */
export interface CompilableCondition {
  column: string;
  operator: string;
  value?: string | null;
}

export interface CompilableColumnValue {
  column: string;
  value: string;
}

export interface CompilableLeadField {
  field: string;
  value: string;
}

export interface CompilableBlock {
  id: string;
  name: string;
  type: string;
  text?: string | null;
  buttons?: CompilableButton[] | null;
  options?: string[] | null;
  saveTo?: string | null;
  when?: string | null;
  destination?: string | null;
  value?: string | null;
  fromVariable?: string | null;
  department?: string | null;
  knowledgeBase?: string | null;
  question?: string | null;
  texts?: string[] | null;
  seconds?: number | null;
  variable?: string | null;
  tags?: string[] | null;
  target?: string | null;
  level?: string | null;
  log?: string | null;
  leadFields?: CompilableLeadField[] | null;
  instructions?: string | null;
  history?: boolean | null;
  iterable?: string | null;
  itemVariable?: string | null;
  bot?: string | null;
  title?: string | null;
  content?: string | null;
  to?: string | null;
  subject?: string | null;
  body?: string | null;
  replyTo?: string | null;
  table?: string | null;
  operation?: string | null;
  match?: string | null;
  conditions?: CompilableCondition[] | null;
  data?: CompilableColumnValue[] | null;
  branches?: CompilableBranch[] | null;
  next?: string | null;
  /** Uscite con nome: true/false, each/done, fallback/error. */
  exits?: { [name: string]: string } | null;
}

export interface CompilableBlueprint {
  version: string;
  name: string;
  language: string;
  start: string;
  fallbackText: string | null;
  fallbackNext: string | null;
  notes?: string[] | null;
  blocks: CompilableBlock[];
}

/** Una knowledge base del progetto: askgptv2 e add_kb_content vogliono l'id, il Blueprint ne conosce il nome. */
export interface KnowledgeBaseRef {
  id: string;
  name: string;
}

/** Un agente del progetto: replacebotv3 vuole l'id, il Blueprint ne conosce il nome. */
export interface ChatbotRef {
  id: string;
  name: string;
}

/** Una tabella del progetto con le sue colonne: data_table vuole l'id, il Blueprint ne conosce il nome. */
export interface DataTableRef {
  id: string;
  name: string;
  columns: string[];
}

/** Metadati della generazione, salvati nell'agente in attributes.aiGeneration. */
export interface GenerationInfo {
  finalPrompt?: string;
  model?: string;
  promptVersion?: string;
  catalogVersion?: string;
  /** Descrizione iniziale scritta dall'utente, prima dell'intervista. */
  initialPrompt?: string;
  /** True se l'utente ha modificato il prompt finale proposto dal planner. */
  finalPromptEdited?: boolean;
  /** Riassunto dell'intervista, al posto della conversazione completa: l'agente viaggia con ogni messaggio. */
  interview?: { questions: number; promptVersion?: string; model?: string };
  assumptions?: string[];
  unsupported?: string[];
}

export interface CompileOptions {
  /** Nome dell'agente; di default quello del Blueprint. */
  name?: string;
  description?: string;
  /** Nomi dei dipartimenti del progetto: un nome sconosciuto verrebbe azzerato dal DS. Senza elenco non si verifica. */
  departments?: string[];
  /** Knowledge base del progetto, per tradurre il nome in id. */
  namespaces?: KnowledgeBaseRef[];
  /** Agenti del progetto, per tradurre il nome in id (replacebotv3). */
  chatbots?: ChatbotRef[];
  /** Tabelle del progetto, per tradurre il nome in id (data_table). */
  dataTables?: DataTableRef[];
  /** Action del messaggio della macro `ask`: 'replyv2' (default) oppure 'reply' (v1), secondo lo spike (C9, C11). */
  askMessageType?: 'replyv2' | 'reply';
  generation?: GenerationInfo;
  /** Generatori di id; nei test sono deterministici. */
  ids?: { uuid: () => string; uid: () => string };
  /** Data della generazione in formato ISO; nei test è fissa. */
  now?: () => string;
}

export interface CompiledAgent {
  name: string;
  description: string;
  type: 'tilebot';
  subtype: 'chatbot';
  language: string;
  webhook_enabled: false;
  attributes: {
    variables: { [name: string]: string };
    aiGeneration: GenerationInfo & { blueprintVersion: string; notes: string[]; generatedAt: string };
  };
  intents: any[];
}

/** Blueprint non compilabile, oppure agente che non rispetta le garanzie: `problems` dice perché. */
export class CompileError extends Error {
  problems: string[];
  constructor(problems: string[]) {
    super('Blueprint non compilabile: ' + problems.join('; '));
    Object.setPrototypeOf(this, CompileError.prototype);
    this.name = 'CompileError';
    this.problems = problems;
  }
}

interface Position {
  x: number;
  y: number;
}

/** Regex dei nomi di blocco dell'editor V3 (panel-intent-header.component.ts). */
export const BLOCK_NAME_REGEX = /^[ _0-9a-zA-Z]+$/;
const NAME_MAX = 50;
/** RESERVED_INTENT_NAMES di utils.ts, confrontati senza distinguere maiuscole e minuscole. */
const RESERVED_NAMES = ['start', 'defaultfallback', 'webhook', 'close'];
const SPECIAL_LETTERS: { [letter: string]: string } = {
  'ß': 'ss', 'æ': 'ae', 'Æ': 'AE', 'ø': 'o', 'Ø': 'O', 'œ': 'oe', 'Œ': 'OE', 'đ': 'd', 'Đ': 'D', 'ł': 'l', 'Ł': 'L', 'ı': 'i'
};
/** Nome del blocco con il messaggio di fallback, a cui si collega il `defaultFallback` vuoto. */
const FALLBACK_NAME = 'Fallback';
/** Suffisso del blocco di capture della macro `ask`, nella lingua dell'agente. */
const REPLY_SUFFIX: { [language: string]: string } = {
  it: 'risposta', en: 'reply', es: 'respuesta', fr: 'reponse', de: 'Antwort', pt: 'resposta'
};
const KB_VARIABLES = ['kb_reply', 'kb_json_sources', 'kb_chunks'];
const BLOCK_COLOR = '156,163,205';
const X0 = 100;
const Y0 = 100;
const COLUMN = 420;
const ROW = 320;
/** Chiave del blocco di capture di una `ask` nel grafo del layout (gli id del Blueprint sono snake_case). */
const CAPTURE_KEY = '>capture';
/** Campi che contengono un riferimento `#<intent_id>`. */
const REFERENCE_FIELDS = ['intentName', 'trueIntent', 'falseIntent', 'goToIntent', 'action', 'fallbackIntent', 'errorIntent', 'conditionIntentId'];
/** Campi del contatto che l'editor di leadupdate offre (utils-variables.ts). */
const LEAD_FIELDS = ['email', 'fullname', 'phone', 'company', 'streetAddress', 'city', 'region', 'zipcode', 'country'];
const TAG_TARGETS = ['request', 'lead'];
/** Livelli accettati dall'engine: l'editor offre anche `native`, che l'engine rifiuta. */
const LOG_LEVELS = ['info', 'warn', 'error', 'debug'];
const TABLE_OPERATIONS = ['get', 'insert', 'update', 'upsert', 'delete'];
/** Modello dei blocchi AI, come per askgptv2: il componente lo riconosce al primo render e non lo riscrive. */
const AI_MODEL = { llm: 'openai', model: 'gpt-4o', modelName: 'GPT-4o' };
/** Istruzioni di default di ai_condition (createNewAction): il messaggio dell'utente da giudicare. */
const AI_CONDITION_INSTRUCTIONS = 'User said: {{lastUserText}}';

/**
 * Nome di blocco valido per l'editor: accenti traslitterati, solo lettere, cifre, spazi e underscore,
 * al massimo 50 caratteri, mai con il prefisso `untitled_block_`. Se non resta nulla, `fallback`.
 */
export function toBlockName(raw: string | null | undefined, fallback: string): string {
  let name = String(raw || '')
    .replace(/[ßæÆøØœŒđĐłŁı]/g, letter => SPECIAL_LETTERS[letter])
    .normalize('NFD').replace(/\p{M}/gu, '')
    .replace(/[^ _0-9a-zA-Z]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^untitled_block_/i, '')
    .trim();
  if (!name) name = String(fallback || '').replace(/[^ _0-9a-zA-Z]+/g, ' ').trim() || 'Block';
  return name.slice(0, NAME_MAX).trim();
}

/** Assegna nomi unici (senza distinguere maiuscole e minuscole), spostando quelli riservati. */
function createNameRegistry(): (base: string) => string {
  const used = new Set<string>(['start', 'defaultfallback']);
  return (base: string) => {
    const root = RESERVED_NAMES.includes(base.toLowerCase()) ? base.slice(0, NAME_MAX - 6).trim() + ' block' : base;
    let name = root;
    for (let n = 2; used.has(name.toLowerCase()); n++) {
      const suffix = ' ' + n;
      name = root.slice(0, NAME_MAX - suffix.length).trim() + suffix;
    }
    used.add(name.toLowerCase());
    return name;
  };
}

function defaultUuid(): string {
  const cryptoApi: any = (globalThis as any).crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') return cryptoApi.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r % 4) + 8).toString(16);
  });
}

const nonEmpty = (value: any) => typeof value === 'string' && !!value.trim();

/** Problemi del Blueprint che impediscono la compilazione: riferimenti, campi obbligatori, nomi del progetto. */
export function checkBlueprint(blueprint: any, options: CompileOptions = {}): string[] {
  if (!blueprint || typeof blueprint !== 'object') return ['il Blueprint non è un oggetto'];
  const blocks: any[] = Array.isArray(blueprint.blocks) ? blueprint.blocks : [];
  if (!blocks.length) return ['blocks: nessun blocco'];

  const problems: string[] = [];
  const ids = new Set<string>();
  blocks.forEach((b, i) => {
    if (!b || typeof b.id !== 'string' || !b.id) problems.push(`blocks[${i}]: manca l'id`);
    else if (ids.has(b.id)) problems.push(`blocks[${i}]: id "${b.id}" duplicato`);
    else ids.add(b.id);
  });
  const exists = (id: any) => typeof id === 'string' && ids.has(id);
  const knowledgeBases = new Set((options.namespaces || []).map(n => n.name));
  const chatbots = new Set((options.chatbots || []).map(c => c.name));
  const tables = new Set((options.dataTables || []).map(t => t.name));
  const departments = options.departments ? new Set(options.departments) : null;

  if (!exists(blueprint.start)) problems.push(`start: "${blueprint.start}" non è un blocco`);
  if (blueprint.fallbackNext != null && !exists(blueprint.fallbackNext)) {
    problems.push(`fallbackNext: "${blueprint.fallbackNext}" non è un blocco`);
  }

  blocks.forEach((b, i) => {
    if (!b || !b.id) return;
    const at = `blocks[${i}] (${b.id})`;
    const need = (field: string) => {
      if (!nonEmpty(b[field])) problems.push(`${at}: manca ${field}`);
    };
    const link = (field: string, id: any) => {
      if (!exists(id)) problems.push(`${at}.${field}: "${id}" non è un blocco`);
    };
    const optionalNext = () => { if (b.next != null) link('next', b.next); };
    const namedExits = (names: string[]) => {
      if (!b.exits || typeof b.exits !== 'object') problems.push(`${at}: mancano le uscite ${names.join(' e ')}`);
      else names.forEach(n => link(`exits.${n}`, b.exits[n]));
    };
    const twoWay = () => namedExits(['true', 'false']);
    const knowledgeBase = () => {
      need('knowledgeBase');
      if (b.knowledgeBase && !knowledgeBases.has(b.knowledgeBase)) {
        problems.push(`${at}: la knowledge base "${b.knowledgeBase}" non è nel progetto`);
      }
    };
    switch (b.type) {
      case 'replyv2':
        need('text');
        (Array.isArray(b.buttons) ? b.buttons : []).forEach((button: any, j: number) => {
          if (!button || typeof button.label !== 'string' || !button.label.trim()) problems.push(`${at}.buttons[${j}]: manca label`);
          else if (button.goto != null) link(`buttons[${j}].goto`, button.goto);
          else if (typeof button.url !== 'string' || !button.url.trim()) problems.push(`${at}.buttons[${j}]: serve goto oppure url`);
        });
        optionalNext();
        break;
      case 'randomreply':
        if (!Array.isArray(b.texts) || !b.texts.some(nonEmpty)) problems.push(`${at}: manca texts`);
        optionalNext();
        break;
      case 'ask':
        need('text');
        need('saveTo');
        link('next', b.next);
        break;
      case 'setattribute-v2':
        need('destination');
        if ((b.value == null) === (b.fromVariable == null)) problems.push(`${at}: serve esattamente uno fra value e fromVariable`);
        optionalNext();
        break;
      case 'delete':
        need('variable');
        optionalNext();
        break;
      case 'jsoncondition2':
        need('when');
        twoWay();
        break;
      case 'ai_condition':
        if (!Array.isArray(b.branches) || !b.branches.length) problems.push(`${at}: mancano i rami`);
        else b.branches.forEach((branch: any, j: number) => {
          if (!branch || !nonEmpty(branch.description)) problems.push(`${at}.branches[${j}]: manca description`);
          link(`branches[${j}].goto`, branch && branch.goto);
        });
        namedExits(['fallback', 'error']);
        break;
      case 'ifopenhours':
      case 'ifonlineagentsv2':
        twoWay();
        break;
      case 'askgptv2':
        knowledgeBase();
        twoWay();
        break;
      case 'ai_prompt':
        need('question');
        need('saveTo');
        twoWay();
        break;
      case 'add_kb_content':
        knowledgeBase();
        need('title');
        need('content');
        optionalNext();
        break;
      case 'data_table':
        need('table');
        if (b.table && !tables.has(b.table)) problems.push(`${at}: la tabella "${b.table}" non è nel progetto`);
        if (!TABLE_OPERATIONS.includes(b.operation)) problems.push(`${at}: operation "${b.operation}" non valida`);
        need('saveTo');
        twoWay();
        break;
      case 'iteration':
        need('iterable');
        need('itemVariable');
        namedExits(['each', 'done']);
        break;
      case 'wait':
        if (typeof b.seconds !== 'number' || !(b.seconds > 0)) problems.push(`${at}: manca seconds`);
        optionalNext();
        break;
      case 'add_tags':
        if (!Array.isArray(b.tags) || !b.tags.some(nonEmpty)) problems.push(`${at}: manca tags`);
        if (!TAG_TARGETS.includes(b.target)) problems.push(`${at}: target deve essere request oppure lead`);
        optionalNext();
        break;
      case 'leadupdate':
        if (!Array.isArray(b.leadFields) || !b.leadFields.length) problems.push(`${at}: manca leadFields`);
        else b.leadFields.forEach((f: any, j: number) => {
          if (!f || !LEAD_FIELDS.includes(f.field) || typeof f.value !== 'string') problems.push(`${at}.leadFields[${j}]: campo del contatto non valido`);
        });
        optionalNext();
        break;
      case 'email':
        need('to');
        need('subject');
        need('body');
        optionalNext();
        break;
      case 'flow_log':
        if (!LOG_LEVELS.includes(b.level)) problems.push(`${at}: level "${b.level}" non valido`);
        need('log');
        optionalNext();
        break;
      case 'clear_transcript':
        optionalNext();
        break;
      case 'department':
        need('department');
        if (b.department && departments && !departments.has(b.department)) {
          problems.push(`${at}: il dipartimento "${b.department}" non è nel progetto`);
        }
        optionalNext();
        break;
      case 'replacebotv3':
        need('bot');
        if (b.bot && !chatbots.has(b.bot)) problems.push(`${at}: l'agente "${b.bot}" non è nel progetto`);
        break;
      case 'agent':
      case 'move_to_unassigned':
      case 'close':
        break;
      default:
        problems.push(`${at}: il tipo "${b.type}" non è supportato`);
    }
  });
  return problems;
}

/**
 * Posizioni sul canvas: una colonna per livello di distanza dal blocco iniziale (visita in ampiezza),
 * le capture delle `ask` nella colonna dopo la domanda. Poi i blocchi raggiunti solo dal fallback, poi gli altri.
 */
function layout(blueprint: CompilableBlueprint, byId: Map<string, CompilableBlock>): Map<string, Position> {
  const edges = (key: string): string[] => {
    if (key.endsWith(CAPTURE_KEY)) {
      const ask = byId.get(key.slice(0, -CAPTURE_KEY.length));
      return ask && ask.next ? [ask.next] : [];
    }
    const block = byId.get(key);
    if (!block) return [];
    if (block.type === 'ask') return [key + CAPTURE_KEY];
    const out: string[] = [];
    (block.buttons || []).forEach(button => { if (button.goto) out.push(button.goto); });
    (block.branches || []).forEach(branch => { if (branch && branch.goto) out.push(branch.goto); });
    if (block.next) out.push(block.next);
    const exits = block.exits || {};
    Object.keys(exits).forEach(name => out.push(exits[name]));
    return out.filter(k => byId.has(k));
  };

  const level = new Map<string, number>();
  const order: string[] = [];
  const visit = (root: string | null | undefined, startLevel: number) => {
    if (!root || !byId.has(root) || level.has(root)) return;
    level.set(root, startLevel);
    const queue = [root];
    while (queue.length) {
      const key = queue.shift() as string;
      order.push(key);
      for (const next of edges(key)) {
        if (!level.has(next)) {
          level.set(next, (level.get(key) as number) + 1);
          queue.push(next);
        }
      }
    }
  };
  visit(blueprint.start, 1);
  visit(blueprint.fallbackNext, 1);
  blueprint.blocks.forEach(block => visit(block.id, Math.max(1, ...Array.from(level.values())) + 1));

  const rows = new Map<number, number>();
  const positions = new Map<string, Position>();
  order.forEach(key => {
    const column = level.get(key) as number;
    const row = rows.get(column) || 0;
    rows.set(column, row + 1);
    positions.set(key, { x: X0 + COLUMN * column, y: Y0 + ROW * row });
  });
  return positions;
}

/** Garanzie dell'agente compilato (generation-rules.md §5): se una manca, è un errore del compilatore. */
export function verifyAgent(agent: CompiledAgent): string[] {
  const problems: string[] = [];
  const intentIds = new Set(agent.intents.map(intent => intent.intent_id));
  /** Gli intent riservati sono solo-uscita: nessun riferimento deve puntare a loro (R4). */
  const reservedIds = new Set(agent.intents.filter(intent => ['start', 'defaultFallback'].includes(intent.intent_display_name)).map(intent => intent.intent_id));
  const names = new Set<string>();
  let starts = 0;
  let fallbacks = 0;

  agent.intents.forEach((intent, i) => {
    const name: string = intent.intent_display_name;
    const at = `intents[${i}] (${name})`;
    if (name === 'start') starts++;
    else if (name === 'defaultFallback') fallbacks++;
    else {
      if (!BLOCK_NAME_REGEX.test(name) || name.length > NAME_MAX) problems.push(`${at}: nome non valido`);
      if (RESERVED_NAMES.includes(name.toLowerCase()) || /^untitled_block_/i.test(name)) problems.push(`${at}: nome riservato`);
    }
    if (names.has(name.toLowerCase())) problems.push(`${at}: nome duplicato`);
    names.add(name.toLowerCase());
    const count = Array.isArray(intent.actions) ? intent.actions.length : 0;
    // Il defaultFallback resta vuoto: il messaggio di fallback sta nel blocco a cui si collega.
    if (name === 'defaultFallback') {
      if (count !== 0) problems.push(`${at}: ${count} action, deve essere vuoto`);
      if (!intent.attributes?.nextBlockAction?.intentName) problems.push(`${at}: non è collegato a nessun blocco`);
    } else if (count !== 1) {
      problems.push(`${at}: ${count} action, ne serve una`);
    }
  });
  if (starts !== 1) problems.push(`${starts} blocchi start, ne serve uno`);
  if (fallbacks !== 1) problems.push(`${fallbacks} blocchi defaultFallback, ne serve uno`);

  const walk = (node: any, path: string) => {
    if (Array.isArray(node)) {
      node.forEach((item, i) => walk(item, `${path}[${i}]`));
      return;
    }
    if (!node || typeof node !== 'object') return;
    Object.keys(node).forEach(key => {
      const value = node[key];
      if (key.startsWith('__') || key === 'createdAt') problems.push(`${path}.${key}: campo non ammesso`);
      if (REFERENCE_FIELDS.includes(key) && typeof value === 'string') {
        if (value && !(value.startsWith('#') && intentIds.has(value.slice(1)))) problems.push(`${path}.${key}: riferimento pendente "${value}"`);
        else if (value && reservedIds.has(value.slice(1))) problems.push(`${path}.${key}: riferimento a un blocco riservato "${value}"`);
      } else {
        walk(value, `${path}.${key}`);
      }
    });
  };
  walk(agent.intents, 'intents');
  return problems;
}

/**
 * Compila il Blueprint nell'agente V3 da importare.
 * @throws CompileError se il Blueprint non è compilabile o l'agente non rispetta le garanzie
 */
export function compileBlueprint(blueprint: CompilableBlueprint, options: CompileOptions = {}): CompiledAgent {
  const problems = checkBlueprint(blueprint, options);
  if (problems.length) throw new CompileError(problems);

  const ids = options.ids || { uuid: defaultUuid, uid: () => defaultUuid().replace(/-/g, '') };
  const now = options.now || (() => new Date().toISOString());
  const askMessageType = options.askMessageType || 'replyv2';
  const language = String(blueprint.language || 'en');
  const blocks = blueprint.blocks;
  const byId = new Map<string, CompilableBlock>();
  blocks.forEach(block => byId.set(block.id, block));
  const knowledgeBaseIds = new Map((options.namespaces || []).map(n => [n.name, n.id] as [string, string]));
  const chatbotIds = new Map((options.chatbots || []).map(c => [c.name, c.id] as [string, string]));
  const tablesByName = new Map((options.dataTables || []).map(t => [t.name, t] as [string, DataTableRef]));

  // Id: ogni blocco ha il suo intent di ingresso; la `ask` anche quello della capture.
  const entry = new Map<string, string>();
  const capture = new Map<string, string>();
  blocks.forEach(block => {
    entry.set(block.id, ids.uuid());
    if (block.type === 'ask') capture.set(block.id, ids.uuid());
  });
  const ref = (blockId: string | null | undefined) => (blockId ? '#' + entry.get(blockId) : '');

  // Nomi.
  const register = createNameRegistry();
  const names = new Map<string, string>();
  const captureNames = new Map<string, string>();
  const suffix = REPLY_SUFFIX[language.slice(0, 2).toLowerCase()] || 'reply';
  blocks.forEach(block => {
    const base = toBlockName(block.name, block.id);
    names.set(block.id, register(base));
    if (block.type === 'ask') {
      captureNames.set(block.id, register(base.slice(0, NAME_MAX - suffix.length - 1).trim() + ' ' + suffix));
    }
  });

  const positions = layout(blueprint, byId);
  const variables: string[] = [];
  const declare = (name: string) => { if (name && !variables.includes(name)) variables.push(name); };

  const button = (type: 'action' | 'url' | 'text', value: string, target: { link?: string; action?: string } = {}) => ({
    uid: ids.uid(), type, value, link: target.link || '', target: 'blank', action: target.action || '', attributes: '', show_echo: true
  });
  const message = (type: 'replyv2' | 'reply', text: string, buttons: any[]) => {
    const payload: any = { type: 'text', text };
    if (buttons.length) payload.attributes = { attachment: { type: 'template', buttons } };
    const attributes = { disableInputMessage: false, commands: [{ type: 'wait', time: 500 }, { type: 'message', message: payload }] };
    return type === 'reply'
      ? { _tdActionType: 'reply', _tdActionTitle: '', _tdActionId: ids.uuid(), text, attributes }
      : { _tdActionType: 'replyv2', _tdActionTitle: '', _tdActionId: ids.uuid(), noInputTimeout: 10000, attributes };
  };
  const simple = (type: string, fields: any = {}) => ({ _tdActionType: type, _tdActionTitle: '', _tdActionId: ids.uuid(), ...fields });
  const branches = (block: CompilableBlock) => ({
    trueIntent: ref(block.exits?.true),
    falseIntent: ref(block.exits?.false),
    trueIntentAttributes: '',
    falseIntentAttributes: '',
    stopOnConditionMet: true
  });
  const makeIntent = (spec: { id: string; name: string; action: any; position: Position; next?: string; readonly?: boolean; question?: string }) => {
    const intent: any = { webhook_enabled: false, enabled: true, intent_id: spec.id, intent_display_name: spec.name };
    if (spec.question) intent.question = spec.question;
    intent.language = language;
    intent.actions = spec.action ? [spec.action] : [];
    intent.attributes = {
      position: spec.position,
      readonly: !!spec.readonly,
      color: BLOCK_COLOR,
      nextBlockAction: { _tdActionTitle: '', _tdActionId: ids.uuid(), _tdActionType: 'intent', intentName: spec.next || '' },
      connectors: {}
    };
    intent.agents_available = false;
    return intent;
  };

  const intents: any[] = [];
  intents.push(makeIntent({
    id: ids.uuid(), name: 'start', question: '\\start', readonly: true, position: { x: X0, y: Y0 },
    action: { _tdActionType: 'intent', _tdActionId: ids.uuid(), intentName: ref(blueprint.start) }
  }));

  blocks.forEach(block => {
    const id = entry.get(block.id) as string;
    const name = names.get(block.id) as string;
    const position = positions.get(block.id) as Position;
    const add = (action: any, next?: string) => intents.push(makeIntent({ id, name, position, action, next }));
    switch (block.type) {
      case 'replyv2': {
        const buttons = (block.buttons || []).map(b => (b.goto
          ? button('action', b.label, { action: ref(b.goto) })
          : button('url', b.label, { link: b.url || '' })));
        add(message('replyv2', block.text as string, buttons), ref(block.next));
        break;
      }
      case 'randomreply': {
        // Coppie attesa + messaggio, una per variante: l'engine ne sceglie una a caso e vuole un numero pari di comandi.
        const commands: any[] = [];
        (block.texts || []).filter(nonEmpty).forEach(text => {
          commands.push({ type: 'wait', time: 500 }, { type: 'message', message: { type: 'text', text } });
        });
        add(simple('randomreply', { attributes: { disableInputMessage: false, commands } }), ref(block.next));
        break;
      }
      case 'ask': {
        const captureId = capture.get(block.id) as string;
        const buttons = (block.options || []).map(option => button('text', option));
        add(message(askMessageType, block.text as string, buttons), '#' + captureId);
        intents.push(makeIntent({
          id: captureId,
          name: captureNames.get(block.id) as string,
          position: positions.get(block.id + CAPTURE_KEY) as Position,
          action: simple('capture_user_reply', { assignResultTo: block.saveTo, goToIntent: ref(block.next) })
        }));
        declare(block.saveTo as string);
        break;
      }
      case 'setattribute-v2': {
        const operand = block.fromVariable != null
          ? { value: block.fromVariable, isVariable: true }
          : { value: String(block.value), isVariable: false };
        add(simple('setattribute-v2', { destination: block.destination, operation: { operands: [operand], operators: [] } }), ref(block.next));
        declare(block.destination as string);
        break;
      }
      case 'delete':
        add(simple('delete', { variableName: block.variable }), ref(block.next));
        break;
      case 'jsoncondition2':
        // groups vuoto: con il default [new Expression()] l'editor non ricostruisce i gruppi e al primo salvataggio svuota `when`.
        add(simple('jsoncondition2', { ...branches(block), groups: [], when: block.when }));
        break;
      case 'ai_condition':
        // Etichette come quelle dell'editor (uid): il componente ne ricava i connettori. L'engine sostituisce
        // le variabili solo nelle istruzioni, non nei prompt dei rami.
        add(simple('ai_condition', {
          ...AI_MODEL,
          max_tokens: 256,
          temperature: 0.7,
          instructions: block.instructions || AI_CONDITION_INSTRUCTIONS,
          intents: (block.branches || []).map(branch => ({ label: ids.uid(), prompt: branch.description, conditionIntentId: ref(branch.goto) })),
          fallbackIntent: ref(block.exits?.fallback),
          errorIntent: ref(block.exits?.error),
          assignReplyTo: 'ai_condition',
          preview: []
        }));
        break;
      case 'ifopenhours':
        add(simple('ifopenhours', branches(block)));
        break;
      case 'ifonlineagentsv2':
        add(simple('ifonlineagentsv2', { ...branches(block), selectedOption: 'all', ignoreOperatingHours: false }));
        break;
      case 'askgptv2':
        // I default di createNewAction, più llm/model/modelName che nel canvas imposterebbe il componente al primo render.
        add(simple('askgptv2', {
          question: block.question || '{{lastUserText}}',
          assignReplyTo: 'kb_reply',
          assignJsonSourcesTo: 'kb_json_sources',
          assignChunksTo: 'kb_chunks',
          max_tokens: 10000,
          temperature: 0.7,
          top_k: 5,
          alpha: 0.5,
          ...AI_MODEL,
          preview: [],
          history: false,
          citations: false,
          reranking: false,
          reranking_multiplier: 2,
          namespace: knowledgeBaseIds.get(block.knowledgeBase as string),
          namespaceAsName: false,
          ...branches(block)
        }));
        KB_VARIABLES.forEach(declare);
        break;
      case 'ai_prompt':
        // I default di createNewAction, con il modello che il componente riconosce al primo render.
        add(simple('ai_prompt', {
          question: block.question,
          ...(block.instructions ? { context: block.instructions } : {}),
          ...AI_MODEL,
          max_tokens: 256,
          temperature: 0.7,
          history: block.history === true,
          assignReplyTo: block.saveTo,
          preview: [],
          formatType: 'none',
          ...branches(block)
        }));
        declare(block.saveTo as string);
        break;
      case 'add_kb_content':
        // L'engine legge `content`: l'editor lo ricompone da titolo e testo solo all'uscita dal campo.
        add(simple('add_kb_content', {
          type: 'faq',
          name: block.title,
          source: block.content,
          content: `${block.title}\n${block.content}`,
          namespace: knowledgeBaseIds.get(block.knowledgeBase as string),
          namespaceAsName: false,
          tags: []
        }), ref(block.next));
        break;
      case 'data_table': {
        // Senza condizioni per insert, con la mappa colonna → valore: così il componente non le riscrive all'apertura.
        const table = tablesByName.get(block.table as string) as DataTableRef;
        const errorTo = `${block.saveTo}_error`;
        const data: { [column: string]: string } = {};
        (block.data || []).forEach(d => { data[d.column] = d.value; });
        add(simple('data_table', {
          tableId: table.id,
          tableName: table.name,
          operation: block.operation,
          must_match: block.match || 'all',
          conditions: (block.conditions || []).map(c => ({ column: c.column, operator: c.operator, value: c.value == null ? '' : c.value })),
          data,
          assignResultTo: block.saveTo,
          assignErrorTo: errorTo,
          ...branches(block)
        }));
        declare(block.saveTo as string);
        declare(errorTo);
        break;
      }
      case 'iteration':
        // Il corpo (each) torna al blocco dell'iterazione; finita la lista l'engine prosegue con nextBlockAction (done).
        add(simple('iteration', { iterable: block.iterable, assignOutputTo: block.itemVariable, goToIntent: ref(block.exits?.each) }), ref(block.exits?.done));
        declare(block.itemVariable as string);
        break;
      case 'wait':
        add(simple('wait', { millis: Math.round(Number(block.seconds) * 1000) }), ref(block.next));
        break;
      case 'add_tags':
        // Una stringa separata da virgole: con un array il canvas (split) e l'engine si bloccano.
        add(simple('add_tags', {
          tags: (block.tags || []).filter(nonEmpty).map(tag => tag.trim()).join(','),
          target: block.target,
          pushToList: false
        }), ref(block.next));
        break;
      case 'leadupdate': {
        const update: { [field: string]: string } = {};
        (block.leadFields || []).forEach(f => { update[f.field] = f.value; });
        add(simple('leadupdate', { update }), ref(block.next));
        break;
      }
      case 'email':
        add(simple('email', {
          to: block.to,
          subject: block.subject,
          text: block.body,
          ...(block.replyTo ? { replyto: block.replyTo } : {})
        }), ref(block.next));
        break;
      case 'flow_log':
        add(simple('flow_log', { level: block.level, log: block.log }), ref(block.next));
        break;
      case 'clear_transcript':
        add(simple('clear_transcript'), ref(block.next));
        break;
      case 'department':
        // triggerBot false: con true partirebbe il bot del dipartimento.
        add(simple('department', { depName: block.department, triggerBot: false }), ref(block.next));
        break;
      case 'replacebotv3':
        // Per id (useSlug false). Terminale: dopo il cambio la conversazione è dell'altro agente.
        add(simple('replacebotv3', { botId: chatbotIds.get(block.bot as string), useSlug: false, blockName: '' }));
        break;
      case 'agent':
      case 'move_to_unassigned':
      case 'close':
        add(simple(block.type));
        break;
    }
  });

  // Regola V3 sul fallback: `defaultFallback` c'è sempre, resta vuoto e nessuno vi punta; si collega a un blocco
  // «Fallback» che porta il messaggio (poi `fallbackNext`), oppure direttamente a `fallbackNext` se il messaggio manca.
  let fallbackTarget = ref(blueprint.fallbackNext);
  if (blueprint.fallbackText) {
    const fallbackId = ids.uuid();
    intents.push(makeIntent({
      id: fallbackId, name: register(FALLBACK_NAME), position: { x: X0, y: Y0 + 2 * ROW },
      action: message('replyv2', blueprint.fallbackText, []),
      next: ref(blueprint.fallbackNext)
    }));
    fallbackTarget = '#' + fallbackId;
  }
  intents.push(makeIntent({
    id: ids.uuid(), name: 'defaultFallback', readonly: true, position: { x: X0, y: Y0 + ROW }, action: null, next: fallbackTarget
  }));

  const agent: CompiledAgent = {
    name: (options.name || blueprint.name || '').trim() || 'AI agent',
    description: options.description || '',
    type: 'tilebot',
    subtype: 'chatbot',
    language,
    webhook_enabled: false,
    attributes: {
      variables: variables.reduce((map, v) => { map[v] = v; return map; }, {} as { [name: string]: string }),
      aiGeneration: {
        ...(options.generation || {}),
        blueprintVersion: blueprint.version,
        notes: Array.isArray(blueprint.notes) ? blueprint.notes : [],
        generatedAt: now()
      }
    },
    intents
  };

  const broken = verifyAgent(agent);
  if (broken.length) throw new CompileError(broken);
  return agent;
}
