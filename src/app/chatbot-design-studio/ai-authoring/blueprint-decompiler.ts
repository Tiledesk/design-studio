/**
 * Decompilatore agente V3 → vista compatta sul modello del Blueprint (`blueprint-2`).
 *
 * È l'inverso del compilatore, per i 25 tipi del catalogo: un blocco per intent, con `id = intent_id`,
 * i campi del catalogo e le uscite lette dalle action (`#<intent_id>` → id). La macro `ask` viene ricomposta
 * dalla coppia domanda + capture. Serve alla modifica via prompt: la vista è ciò che il servizio di
 * generazione riceve, e su cui propone le operazioni.
 *
 * Ciò che il decompilatore non sa leggere diventa un blocco **opaco**: si vede (nome, tipi delle action,
 * uscite), si può collegare, ma non si può modificare né rimuovere. Meglio non toccare che rompere.
 * `start` e `defaultFallback` sono **riservati**: si può cambiare solo dove portano.
 */
import type { ChatbotRef, CompilableBlock, DataTableRef, KnowledgeBaseRef, Position } from './blueprint-compiler';
import { REFERENCE_FIELDS } from './blueprint-compiler';

export interface DecompiledBlock extends CompilableBlock {
  /** `start` e `defaultFallback`: solo l'uscita `next` si può cambiare. */
  reserved?: boolean;
  /** Intent che il decompilatore non sa leggere: si può collegare, non modificare né rimuovere. */
  opaque?: boolean;
  /** Per i blocchi opachi: i tipi delle action, per capire cosa sono. */
  actionTypes?: string[];
  /** Posizione sul canvas: serve a piazzare i blocchi nuovi accanto a quelli esistenti. Non va al servizio. */
  position?: Position | null;
}

export interface DecompiledAgent {
  name: string;
  language: string;
  /** L'id del primo blocco (dopo `start`), oppure null. */
  start: string | null;
  /** Tutti i blocchi, riservati e opachi compresi. */
  blocks: DecompiledBlock[];
  /** Per le `ask`: id del blocco → intent_id della capture, che nella vista non compare. */
  captures: { [blockId: string]: string };
  /** Gli id dei blocchi opachi. */
  opaque: string[];
  /** Gli intent_id dei blocchi riservati. */
  reserved: { start: string | null; defaultFallback: string | null };
}

export interface DecompileOptions {
  namespaces?: KnowledgeBaseRef[];
  chatbots?: ChatbotRef[];
  dataTables?: DataTableRef[];
}

/** I tipi che il decompilatore sa leggere (gli stessi del compilatore, più la macro `ask`). */
export const DECOMPILABLE_TYPES = [
  'replyv2', 'reply', 'randomreply', 'capture_user_reply', 'setattribute-v2', 'delete', 'jsoncondition2', 'ai_condition',
  'ifopenhours', 'ifonlineagentsv2', 'askgptv2', 'ai_prompt', 'add_kb_content', 'data_table', 'iteration', 'wait',
  'add_tags', 'leadupdate', 'email', 'flow_log', 'clear_transcript', 'department', 'replacebotv3', 'agent',
  'move_to_unassigned', 'close'
];

const id = (ref: any): string | null => (typeof ref === 'string' && ref.startsWith('#') && ref.length > 1 ? ref.slice(1) : null);
const nextOf = (intent: any): string | null => id(intent?.attributes?.nextBlockAction?.intentName);
const actionOf = (intent: any): any => (Array.isArray(intent?.actions) && intent.actions.length === 1 ? intent.actions[0] : null);
const str = (v: any): string | null => (typeof v === 'string' ? v : v == null ? null : String(v));

/** Testi e pulsanti di una action di messaggio; `clean` è false se c'è qualcosa che la vista non rappresenta. */
function readMessage(action: any): { texts: string[]; buttons: any[]; clean: boolean } {
  const commands: any[] = Array.isArray(action?.attributes?.commands) ? action.attributes.commands : [];
  const texts: string[] = [];
  let buttons: any[] = [];
  let clean = true;
  commands.forEach(command => {
    if (command?.type === 'wait') return;
    if (command?.type !== 'message' || !command.message) { clean = false; return; }
    const message = command.message;
    if (message.type && message.type !== 'text') clean = false;
    if (typeof message.text === 'string') texts.push(message.text);
    const attachment = message.attributes?.attachment;
    if (attachment) {
      if (Array.isArray(attachment.buttons)) {
        if (buttons.length) clean = false;
        buttons = attachment.buttons;
      } else {
        clean = false;
      }
    }
  });
  if (!texts.length && typeof action?.text === 'string') texts.push(action.text);
  return { texts, buttons, clean };
}

/** Tutti i riferimenti `#<intent_id>` dentro un intent (action e nextBlockAction). */
export function referencesOf(intent: any): string[] {
  const refs: string[] = [];
  const walk = (node: any) => {
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (!node || typeof node !== 'object') return;
    Object.keys(node).forEach(key => {
      const value = node[key];
      if (REFERENCE_FIELDS.includes(key) && typeof value === 'string') {
        const target = id(value);
        if (target) refs.push(target);
      } else if (typeof value === 'object') {
        walk(value);
      }
    });
  };
  walk(intent?.actions);
  const next = nextOf(intent);
  if (next) refs.push(next);
  return refs;
}

/**
 * La vista compatta dell'agente. `intents` sono i blocchi come li restituisce il server
 * (o come li tiene il canvas); nomi e id sono quelli reali.
 */
export function decompileAgent(intents: any[], meta: { name?: string; language?: string } = {}, options: DecompileOptions = {}): DecompiledAgent {
  const list = (intents || []).filter(i => i && typeof i === 'object');
  const byId = new Map<string, any>(list.map(i => [String(i.intent_id), i]));
  const knowledgeBaseNames = new Map((options.namespaces || []).map(n => [n.id, n.name] as [string, string]));
  const chatbotNames = new Map((options.chatbots || []).map(c => [c.id, c.name] as [string, string]));
  const tableNames = new Map((options.dataTables || []).map(t => [t.id, t.name] as [string, string]));

  // Quante volte ogni intent è puntato: serve a riconoscere la capture di una `ask`.
  const inbound = new Map<string, number>();
  list.forEach(intent => referencesOf(intent).forEach(target => inbound.set(target, (inbound.get(target) || 0) + 1)));

  const startIntent = list.find(i => i.intent_display_name === 'start') || null;
  const fallbackIntent = list.find(i => i.intent_display_name === 'defaultFallback') || null;
  const captures: { [blockId: string]: string } = {};
  const captureIds = new Set<string>();

  // Prima passata: le `ask` (domanda → capture puntata solo da lei).
  list.forEach(intent => {
    const action = actionOf(intent);
    if (!action || (action._tdActionType !== 'replyv2' && action._tdActionType !== 'reply')) return;
    const next = nextOf(intent);
    if (!next) return;
    const capture = byId.get(next);
    const captureAction = actionOf(capture);
    if (!captureAction || captureAction._tdActionType !== 'capture_user_reply') return;
    if ((inbound.get(next) || 0) !== 1) return;
    if (capture.intent_display_name === 'start' || capture.intent_display_name === 'defaultFallback') return;
    captures[String(intent.intent_id)] = String(capture.intent_id);
    captureIds.add(String(capture.intent_id));
  });

  const blocks: DecompiledBlock[] = [];
  const opaque: string[] = [];

  list.forEach(intent => {
    const blockId = String(intent.intent_id);
    if (captureIds.has(blockId)) return;
    const base: DecompiledBlock = { id: blockId, name: String(intent.intent_display_name || blockId), type: '', position: intent.attributes?.position || null };
    const action = actionOf(intent);
    const next = nextOf(intent);

    if (intent === startIntent) {
      blocks.push({ ...base, type: 'start', reserved: true, next: id(action?.intentName) || next });
      return;
    }
    if (intent === fallbackIntent) {
      blocks.push({ ...base, type: 'defaultFallback', reserved: true, next });
      return;
    }

    const block = action ? readBlock(action, intent, next, {
      capture: captures[blockId] ? byId.get(captures[blockId]) : null,
      knowledgeBaseNames, chatbotNames, tableNames
    }) : null;
    if (block) {
      blocks.push({ ...base, ...block });
    } else {
      const actionTypes = (Array.isArray(intent.actions) ? intent.actions : []).map((a: any) => String(a?._tdActionType || '?'));
      const exits: { [name: string]: string } = {};
      referencesOf(intent).forEach((target, i) => { exits[i === 0 && target === next ? 'next' : 'ref' + i] = target; });
      if (next) exits.next = next;
      blocks.push({ ...base, type: 'opaque', opaque: true, actionTypes, next, exits: Object.keys(exits).length ? exits : null });
      opaque.push(blockId);
    }
  });

  return {
    name: meta.name || '',
    language: meta.language || str(list[0]?.language) || 'en',
    start: startIntent ? id(actionOf(startIntent)?.intentName) : null,
    blocks,
    captures,
    opaque,
    reserved: { start: startIntent ? String(startIntent.intent_id) : null, defaultFallback: fallbackIntent ? String(fallbackIntent.intent_id) : null }
  };
}

interface ReadContext {
  capture: any | null;
  knowledgeBaseNames: Map<string, string>;
  chatbotNames: Map<string, string>;
  tableNames: Map<string, string>;
}

/** I campi del catalogo per una action; null se la action non si può rappresentare (→ opaco). */
function readBlock(action: any, intent: any, next: string | null, ctx: ReadContext): Partial<DecompiledBlock> | null {
  const type = String(action._tdActionType || '');
  const twoWay = () => ({ exits: { true: id(action.trueIntent) || '', false: id(action.falseIntent) || '' } });
  switch (type) {
    case 'replyv2':
    case 'reply': {
      const { texts, buttons, clean } = readMessage(action);
      if (!clean || texts.length !== 1) return null;
      if (ctx.capture) {
        // Macro ask: domanda + capture
        if (buttons.some(b => b?.type !== 'text')) return null;
        const captureAction = actionOf(ctx.capture);
        return {
          type: 'ask', text: texts[0], options: buttons.length ? buttons.map(b => String(b.value ?? b.label ?? '')) : null,
          // La destinazione della capture sta sul blocco; goToIntent resta come ripiego per gli agenti compilati prima.
          saveTo: str(captureAction.assignResultTo), next: nextOf(ctx.capture) || id(captureAction.goToIntent)
        };
      }
      const mapped: any[] = [];
      for (const b of buttons) {
        if (b?.type === 'action') mapped.push({ label: String(b.value ?? ''), goto: id(b.action) });
        else if (b?.type === 'url') mapped.push({ label: String(b.value ?? ''), url: String(b.link ?? '') });
        else return null;
      }
      return { type: 'replyv2', text: texts[0], buttons: mapped.length ? mapped : null, next };
    }
    case 'randomreply': {
      const { texts, buttons, clean } = readMessage(action);
      if (!clean || buttons.length) return null;
      return { type: 'randomreply', texts, next };
    }
    case 'setattribute-v2': {
      const operands = action.operation?.operands;
      const operators = action.operation?.operators;
      if (!Array.isArray(operands) || operands.length !== 1 || (Array.isArray(operators) && operators.length)) return null;
      const operand = operands[0] || {};
      return operand.isVariable
        ? { type, destination: str(action.destination), fromVariable: str(operand.value), next }
        : { type, destination: str(action.destination), value: str(operand.value), next };
    }
    case 'delete':
      return { type, variable: str(action.variableName), next };
    case 'jsoncondition2':
      return { type, when: str(action.when), ...twoWay() };
    case 'ai_condition':
      return {
        type,
        instructions: str(action.instructions),
        branches: (Array.isArray(action.intents) ? action.intents : []).map((b: any) => ({ label: str(b.label) || '', description: str(b.prompt) || '', goto: id(b.conditionIntentId) || '' })),
        exits: { fallback: id(action.fallbackIntent) || '', error: id(action.errorIntent) || '' }
      };
    case 'ifopenhours':
    case 'ifonlineagentsv2':
      return { type, ...twoWay() };
    case 'askgptv2':
      return { type, knowledgeBase: ctx.knowledgeBaseNames.get(action.namespace) || str(action.namespace), question: str(action.question), ...twoWay() };
    case 'ai_prompt':
      return { type, question: str(action.question), instructions: str(action.context), history: action.history === true, saveTo: str(action.assignReplyTo), ...twoWay() };
    case 'add_kb_content':
      return { type, knowledgeBase: ctx.knowledgeBaseNames.get(action.namespace) || str(action.namespace), title: str(action.name), content: str(action.source), next };
    case 'data_table': {
      const data = action.data && typeof action.data === 'object' ? Object.keys(action.data).map(column => ({ column, value: String(action.data[column]) })) : [];
      return {
        type, table: ctx.tableNames.get(action.tableId) || str(action.tableName) || str(action.tableId), operation: str(action.operation),
        match: str(action.must_match),
        conditions: (Array.isArray(action.conditions) ? action.conditions : []).map((c: any) => ({ column: str(c.column) || '', operator: str(c.operator) || '', value: str(c.value) })),
        data: data.length ? data : null, saveTo: str(action.assignResultTo), ...twoWay()
      };
    }
    case 'iteration':
      return { type, iterable: str(action.iterable), itemVariable: str(action.assignOutputTo), exits: { each: id(action.goToIntent) || '', done: next || '' } };
    case 'wait':
      return { type, seconds: Number(action.millis) / 1000, next };
    case 'add_tags':
      return { type, tags: String(action.tags || '').split(',').map((t: string) => t.trim()).filter(Boolean), target: str(action.target), next };
    case 'leadupdate':
      return { type, leadFields: Object.keys(action.update || {}).map(field => ({ field, value: String(action.update[field]) })), next };
    case 'email':
      return { type, to: str(action.to), subject: str(action.subject), body: str(action.text), replyTo: str(action.replyto), next };
    case 'flow_log':
      return { type, level: str(action.level), log: str(action.log), next };
    case 'clear_transcript':
      return { type, next };
    case 'department':
      return { type, department: str(action.depName), next };
    case 'replacebotv3':
      return { type, bot: ctx.chatbotNames.get(action.botId) || str(action.botId) };
    case 'agent':
    case 'move_to_unassigned':
    case 'close':
      return { type };
    default:
      return null;
  }
}

/** La vista da mandare al servizio: senza posizioni e senza campi vuoti. */
export function compactView(agent: DecompiledAgent): { name: string; language: string; start: string | null; blocks: any[] } {
  const clean = (block: DecompiledBlock) => {
    const out: any = {};
    Object.keys(block).forEach(key => {
      const value = (block as any)[key];
      if (key === 'position' || value === null || value === undefined || value === '') return;
      if (Array.isArray(value) && !value.length) return;
      out[key] = value;
    });
    return out;
  };
  return { name: agent.name, language: agent.language, start: agent.start, blocks: agent.blocks.map(clean) };
}
