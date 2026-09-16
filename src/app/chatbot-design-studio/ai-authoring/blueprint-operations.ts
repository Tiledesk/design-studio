/**
 * Applica al V3 le operazioni proposte dal servizio di generazione per la modifica via prompt.
 *
 * Le operazioni parlano il linguaggio del Blueprint (blocchi `blueprint-2`, id = `intent_id` reali,
 * segnaposto per i blocchi nuovi) e qui diventano operazioni sui blocchi V3 per la rotta `edit` del
 * modulo delle revisioni (`post` / `put` / `delete`), che le applica in modo atomico.
 *
 * Regole:
 * - `add` compila il blocco con il compilatore (stesse regole della creazione) e lo piazza accanto a `after`;
 * - `update` ricompila SOLO le action del blocco: `attributes` dell'intent (posizione, colore, connettori) restano;
 * - `remove` cancella; i riferimenti che restavano appesi vengono azzerati e segnalati;
 * - `connect` è una patch mirata del solo campo dell'uscita: le personalizzazioni fatte a mano restano;
 * - `start` e `defaultFallback` si possono solo ricollegare; i blocchi opachi solo collegare.
 */
import type { BlockContext, CompilableBlock, CompileOptions, DataTableRef } from './blueprint-compiler';
import { COLUMN, CompileError, NAME_MAX, RESERVED_NAMES, REFERENCE_FIELDS, compileBlock, captureNameOf, toBlockName } from './blueprint-compiler';
import type { DecompiledAgent, DecompiledBlock } from './blueprint-decompiler';
import { decompileAgent, referencesOf } from './blueprint-decompiler';

export type EditOperation =
  | { op: 'add'; block: CompilableBlock; after?: string | null }
  | { op: 'update'; id: string; block: CompilableBlock }
  | { op: 'remove'; id: string }
  | { op: 'connect'; from: string; exit: string; to: string };

export interface BlockOperation { type: 'post' | 'put' | 'delete'; intent: any; }

export interface BlockSummary { id: string; name: string; type: string; }

export interface OperationsSummary {
  added: BlockSummary[];
  updated: BlockSummary[];
  removed: BlockSummary[];
  connections: number;
  warnings: string[];
}

export interface CompiledOperations {
  /** Per la rotta `edit` del server. */
  faqOperations: BlockOperation[];
  summary: OperationsSummary;
  /** Gli intent dopo le operazioni, per una verifica o un'anteprima. */
  intents: any[];
  /** Segnaposto dei blocchi nuovi → intent_id assegnato. */
  idMap: { [placeholder: string]: string };
}

export interface OperationsOptions extends Pick<CompileOptions, 'namespaces' | 'chatbots' | 'dataTables' | 'messageType' | 'askMessageType' | 'ids'> {
  /** La vista decompilata, se già calcolata. */
  decompiled?: DecompiledAgent;
  language?: string;
}

const ROW_STEP = 160;
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const refId = (ref: any): string | null => (typeof ref === 'string' && ref.startsWith('#') && ref.length > 1 ? ref.slice(1) : null);

function defaultUuid(): string {
  const cryptoApi: any = (globalThis as any).crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') return cryptoApi.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

/** Il nome dell'uscita di un blocco → dove sta nel V3. */
type ExitTarget =
  | { kind: 'next' }
  | { kind: 'field'; field: string }
  | { kind: 'capture' }
  | { kind: 'button'; label: string }
  | { kind: 'branch'; description: string }
  | { kind: 'start' };

function exitTarget(block: DecompiledBlock, exit: string): ExitTarget | null {
  if (block.type === 'start') return exit === 'next' ? { kind: 'start' } : null;
  if (block.type === 'defaultFallback') return exit === 'next' ? { kind: 'next' } : null;
  if (exit.startsWith('button:')) return block.type === 'replyv2' ? { kind: 'button', label: exit.slice(7) } : null;
  if (exit.startsWith('branch:')) return block.type === 'ai_condition' ? { kind: 'branch', description: exit.slice(7) } : null;
  switch (exit) {
    case 'next':
      if (block.type === 'ask') return { kind: 'capture' };
      if (['jsoncondition2', 'ai_condition', 'ifopenhours', 'ifonlineagentsv2', 'askgptv2', 'ai_prompt', 'data_table', 'replacebotv3', 'agent', 'move_to_unassigned', 'close'].includes(block.type)) return null;
      return { kind: 'next' };
    case 'true': return ['jsoncondition2', 'ifopenhours', 'ifonlineagentsv2', 'askgptv2', 'ai_prompt', 'data_table'].includes(block.type) ? { kind: 'field', field: 'trueIntent' } : null;
    case 'false': return ['jsoncondition2', 'ifopenhours', 'ifonlineagentsv2', 'askgptv2', 'ai_prompt', 'data_table'].includes(block.type) ? { kind: 'field', field: 'falseIntent' } : null;
    case 'fallback': return block.type === 'ai_condition' ? { kind: 'field', field: 'fallbackIntent' } : null;
    case 'error': return block.type === 'ai_condition' ? { kind: 'field', field: 'errorIntent' } : null;
    case 'each': return block.type === 'iteration' ? { kind: 'field', field: 'goToIntent' } : null;
    case 'done': return block.type === 'iteration' ? { kind: 'next' } : null;
    default: return null;
  }
}

/**
 * Applica le operazioni. Lancia CompileError con l'elenco dei problemi se un'operazione non è ammessa
 * o se l'agente risultante ha riferimenti pendenti.
 */
export function compileOperations(intents: any[], operations: EditOperation[], options: OperationsOptions = {}): CompiledOperations {
  const problems: string[] = [];
  const warnings: string[] = [];
  const decompiled = options.decompiled || decompileAgent(intents, { language: options.language }, options);
  const language = options.language || decompiled.language || 'en';
  const ids = options.ids || { uuid: defaultUuid, uid: () => defaultUuid().replace(/-/g, '') };
  const blocks = new Map(decompiled.blocks.map(b => [b.id, b]));
  const working = new Map<string, any>((intents || []).map(i => [String(i.intent_id), clone(i)]));
  const created = new Set<string>();
  const touched = new Set<string>();
  const removed = new Set<string>();
  const idMap: { [placeholder: string]: string } = {};
  const summary: OperationsSummary = { added: [], updated: [], removed: [], connections: 0, warnings };
  const captures: { [blockId: string]: string } = { ...decompiled.captures };

  // Nomi in uso (senza distinguere maiuscole e minuscole), per dare nomi unici ai blocchi nuovi.
  const usedNames = new Set<string>(Array.from(working.values()).map(i => String(i.intent_display_name || '').toLowerCase()));
  const uniqueName = (raw: string, fallback: string, keep?: string) => {
    const base = toBlockName(raw, fallback);
    const root = RESERVED_NAMES.includes(base.toLowerCase()) ? base.slice(0, NAME_MAX - 6).trim() + ' block' : base;
    let name = root;
    for (let n = 2; usedNames.has(name.toLowerCase()) && name.toLowerCase() !== (keep || '').toLowerCase(); n++) {
      const suffix = ' ' + n;
      name = root.slice(0, NAME_MAX - suffix.length).trim() + suffix;
    }
    usedNames.add(name.toLowerCase());
    return name;
  };

  const knowledgeBaseIds = new Map((options.namespaces || []).map(n => [n.name, n.id] as [string, string]));
  const chatbotIds = new Map((options.chatbots || []).map(c => [c.name, c.id] as [string, string]));
  const tablesByName = new Map((options.dataTables || []).map(t => [t.name, t] as [string, DataTableRef]));

  // 1. Segnaposto dei blocchi nuovi → intent_id nuovi. I riferimenti si risolvono solo dopo.
  const adds = operations.filter(o => o.op === 'add') as Extract<EditOperation, { op: 'add' }>[];
  adds.forEach((o, i) => {
    const placeholder = o.block?.id;
    if (!placeholder || typeof placeholder !== 'string') { problems.push(`add[${i}]: manca block.id`); return; }
    if (working.has(placeholder) || idMap[placeholder]) { problems.push(`add[${i}]: id "${placeholder}" già in uso`); return; }
    idMap[placeholder] = ids.uuid();
  });
  const resolve = (blockId: string | null | undefined): string | null => {
    if (!blockId) return null;
    if (idMap[blockId]) return idMap[blockId];
    if (working.has(blockId) && !removed.has(blockId)) return blockId;
    return null;
  };
  const ref = (blockId: string | null | undefined) => {
    if (!blockId) return '';
    const target = resolve(blockId);
    if (!target) { problems.push(`riferimento a un blocco inesistente: "${blockId}"`); return ''; }
    return '#' + target;
  };
  const exists = (blockId: string) => working.has(blockId) && !removed.has(blockId);
  const summaryOf = (blockId: string, block?: CompilableBlock): BlockSummary => {
    const intent = working.get(blockId);
    return { id: blockId, name: block?.name || intent?.intent_display_name || blockId, type: block?.type || blocks.get(blockId)?.type || '?' };
  };

  const context = (entry: (blockId: string) => string, name: (blockId: string) => string, captureId: (blockId: string) => string,
    position: (blockId: string) => any): BlockContext => ({
    ids, language, messageType: options.messageType || options.askMessageType || 'reply', ref,
    entryId: entry, captureId,
    name, captureName: blockId => uniqueName(captureNameOf(toBlockName(name(blockId), blockId), language), blockId),
    position, capturePosition: blockId => { const p = position(blockId); return { x: p.x + COLUMN, y: p.y }; },
    knowledgeBaseIds, chatbotIds, tablesByName, declare: () => undefined
  });

  // 2. add
  adds.forEach((o, i) => {
    const placeholder = o.block?.id;
    const intentId = placeholder && idMap[placeholder];
    if (!intentId) return;
    const after = o.after ? working.get(o.after) : null;
    if (o.after && !after) problems.push(`add[${i}]: after "${o.after}" non è un blocco`);
    const basePosition = after?.attributes?.position || { x: 100, y: 100 };
    const position = { x: basePosition.x + (after ? COLUMN : 0), y: basePosition.y + i * ROW_STEP };
    const ctx = context(() => intentId, () => uniqueName(o.block.name, placeholder), () => ids.uuid(), () => position);
    const compiled = compileBlock({ ...o.block, id: placeholder } as CompilableBlock, ctx);
    if (!compiled.length) { problems.push(`add[${i}]: il tipo "${o.block?.type}" non è supportato`); return; }
    compiled.forEach(intent => { working.set(intent.intent_id, intent); created.add(intent.intent_id); });
    if (compiled.length > 1) captures[intentId] = compiled[1].intent_id;
    blocks.set(intentId, { ...(o.block as DecompiledBlock), id: intentId, position });
    summary.added.push({ id: intentId, name: compiled[0].intent_display_name, type: o.block.type });
    if (after && !o.block.type.startsWith('opaque')) {
      // Aggancio: la prima uscita libera del blocco `after` punta al nuovo blocco
      const afterBlock = blocks.get(o.after as string);
      if (afterBlock) {
        const patched = patchExit(afterBlock, 'next', intentId, { onlyIfFree: true });
        if (patched) summary.connections++;
      }
    }
  });

  // 3. update
  (operations.filter(o => o.op === 'update') as Extract<EditOperation, { op: 'update' }>[]).forEach((o, i) => {
    const block = blocks.get(o.id);
    const current = working.get(o.id);
    if (!block || !current || removed.has(o.id)) { problems.push(`update[${i}]: "${o.id}" non è un blocco`); return; }
    if (block.reserved) { problems.push(`update[${i}]: "${block.name}" è riservato e non si può modificare`); return; }
    if (block.opaque) { problems.push(`update[${i}]: "${block.name}" non si può modificare con l'AI: va cambiato a mano`); return; }
    const keepName = String(current.intent_display_name || '');
    const name = o.block.name && toBlockName(o.block.name, o.id).toLowerCase() !== keepName.toLowerCase() ? uniqueName(o.block.name, o.id, keepName) : keepName;
    const existingCapture = captures[o.id];
    const ctx = context(() => o.id, () => name, () => existingCapture || ids.uuid(), () => current.attributes?.position || { x: 100, y: 100 });
    const compiled = compileBlock({ ...o.block, id: o.id } as CompilableBlock, ctx);
    if (!compiled.length) { problems.push(`update[${i}]: il tipo "${o.block?.type}" non è supportato`); return; }
    const merge = (target: any, source: any) => {
      target.actions = source.actions;
      target.intent_display_name = source.intent_display_name;
      target.attributes = { ...(target.attributes || {}), nextBlockAction: { ...(target.attributes?.nextBlockAction || source.attributes.nextBlockAction), intentName: source.attributes.nextBlockAction.intentName } };
    };
    merge(current, compiled[0]);
    touched.add(o.id);
    if (compiled.length > 1) {
      const captureIntent = compiled[1];
      if (existingCapture && working.has(existingCapture)) {
        merge(working.get(existingCapture), captureIntent);
        touched.add(existingCapture);
      } else {
        working.set(captureIntent.intent_id, captureIntent);
        created.add(captureIntent.intent_id);
        captures[o.id] = captureIntent.intent_id;
      }
    } else if (existingCapture) {
      // Da ask a un altro tipo: la capture non serve più
      removed.add(existingCapture);
      delete captures[o.id];
    }
    blocks.set(o.id, { ...(o.block as DecompiledBlock), id: o.id, name, position: current.attributes?.position || null });
    summary.updated.push({ id: o.id, name, type: o.block.type });
  });

  // 4. remove
  (operations.filter(o => o.op === 'remove') as Extract<EditOperation, { op: 'remove' }>[]).forEach((o, i) => {
    const block = blocks.get(o.id);
    if (!block || !exists(o.id)) { problems.push(`remove[${i}]: "${o.id}" non è un blocco`); return; }
    if (block.reserved) { problems.push(`remove[${i}]: "${block.name}" è riservato e non si può rimuovere`); return; }
    if (block.opaque) { problems.push(`remove[${i}]: "${block.name}" non si può rimuovere con l'AI: va tolto a mano`); return; }
    summary.removed.push(summaryOf(o.id, block));
    removed.add(o.id);
    if (captures[o.id]) { removed.add(captures[o.id]); delete captures[o.id]; }
  });

  // 5. connect
  function patchExit(block: DecompiledBlock, exit: string, toId: string, opts: { onlyIfFree?: boolean } = {}): boolean {
    const intent = working.get(block.id);
    if (!intent) return false;
    const target = exitTarget(block, exit);
    if (!target) { problems.push(`connect: il blocco "${block.name}" (${block.type}) non ha l'uscita "${exit}"`); return false; }
    const value = '#' + toId;
    const set = (holder: any, field: string) => {
      if (opts.onlyIfFree && refId(holder[field])) return false;
      holder[field] = value;
      return true;
    };
    let done = false;
    switch (target.kind) {
      case 'start': done = set(intent.actions[0], 'intentName'); break;
      case 'next':
        intent.attributes = intent.attributes || {};
        intent.attributes.nextBlockAction = intent.attributes.nextBlockAction || { _tdActionTitle: '', _tdActionId: ids.uuid(), _tdActionType: 'intent', intentName: '' };
        done = set(intent.attributes.nextBlockAction, 'intentName');
        break;
      case 'capture': {
        const capture = captures[block.id] ? working.get(captures[block.id]) : null;
        if (!capture) { problems.push(`connect: la domanda "${block.name}" non ha la capture`); return false; }
        // La capture esce dal pallino del blocco, come il ramo 'next': la destinazione sta in nextBlockAction.
        capture.attributes = capture.attributes || {};
        capture.attributes.nextBlockAction = capture.attributes.nextBlockAction || { _tdActionTitle: '', _tdActionId: ids.uuid(), _tdActionType: 'intent', intentName: '' };
        done = set(capture.attributes.nextBlockAction, 'intentName');
        if (done) touched.add(capture.intent_id);
        return done;
      }
      case 'field': done = set(intent.actions[0], target.field); break;
      case 'button': {
        const buttons: any[] = intent.actions[0]?.attributes?.commands?.find((c: any) => c?.message?.attributes?.attachment?.buttons)?.message.attributes.attachment.buttons || [];
        const button = buttons.find(b => String(b.value) === target.label);
        if (!button) { problems.push(`connect: il pulsante "${target.label}" non esiste in "${block.name}"`); return false; }
        button.type = 'action';
        button.link = '';
        done = set(button, 'action');
        break;
      }
      case 'branch': {
        const branch = (intent.actions[0]?.intents || []).find((b: any) => String(b.prompt) === target.description);
        if (!branch) { problems.push(`connect: il ramo "${target.description}" non esiste in "${block.name}"`); return false; }
        done = set(branch, 'conditionIntentId');
        break;
      }
    }
    if (done && !created.has(block.id)) touched.add(block.id);
    return done;
  }

  (operations.filter(o => o.op === 'connect') as Extract<EditOperation, { op: 'connect' }>[]).forEach((o, i) => {
    const fromId = resolve(o.from);
    const toId = resolve(o.to);
    if (!fromId || !blocks.get(fromId)) { problems.push(`connect[${i}]: "${o.from}" non è un blocco`); return; }
    if (!toId) { problems.push(`connect[${i}]: "${o.to}" non è un blocco`); return; }
    const toBlock = blocks.get(toId);
    if (toBlock?.reserved) { problems.push(`connect[${i}]: non si può puntare a "${toBlock.name}"`); return; }
    if (patchExit(blocks.get(fromId) as DecompiledBlock, o.exit, toId)) summary.connections++;
  });

  // 6. Riferimenti rimasti appesi dopo le rimozioni: si azzerano e si segnalano.
  const clearDangling = (node: any, intentId: string) => {
    if (Array.isArray(node)) { node.forEach(n => clearDangling(n, intentId)); return; }
    if (!node || typeof node !== 'object') return;
    Object.keys(node).forEach(key => {
      const value = node[key];
      if (REFERENCE_FIELDS.includes(key) && typeof value === 'string') {
        const target = refId(value);
        if (target && (removed.has(target) || !working.has(target))) {
          node[key] = '';
          if (!created.has(intentId)) touched.add(intentId);
          const name = working.get(intentId)?.intent_display_name || intentId;
          warnings.push(`"${name}" puntava a un blocco rimosso: il collegamento è stato tolto`);
        }
      } else if (typeof value === 'object') {
        clearDangling(value, intentId);
      }
    });
  };
  working.forEach((intent, intentId) => {
    if (removed.has(intentId)) return;
    clearDangling(intent.actions, intentId);
    clearDangling(intent.attributes?.nextBlockAction, intentId);
  });

  if (problems.length) throw new CompileError(problems);

  // 7. Verifica finale: una action per blocco toccato, nessun riferimento pendente, nessun nome doppio.
  const remaining = Array.from(working.values()).filter(i => !removed.has(String(i.intent_id)));
  const remainingIds = new Set(remaining.map(i => String(i.intent_id)));
  const names = new Set<string>();
  remaining.forEach(intent => {
    const name = String(intent.intent_display_name || '').toLowerCase();
    if (names.has(name)) problems.push(`nome duplicato: "${intent.intent_display_name}"`);
    names.add(name);
    if ((created.has(intent.intent_id) || touched.has(intent.intent_id)) && intent.intent_display_name !== 'defaultFallback' && (!Array.isArray(intent.actions) || intent.actions.length !== 1)) {
      problems.push(`"${intent.intent_display_name}": ${intent.actions?.length || 0} action, ne serve una`);
    }
    referencesOf(intent).forEach(target => {
      if (!remainingIds.has(target)) problems.push(`"${intent.intent_display_name}" punta a un blocco inesistente`);
    });
  });
  if (problems.length) throw new CompileError(problems);

  const faqOperations: BlockOperation[] = [];
  created.forEach(intentId => { if (!removed.has(intentId)) faqOperations.push({ type: 'post', intent: working.get(intentId) }); });
  touched.forEach(intentId => { if (!removed.has(intentId) && !created.has(intentId)) faqOperations.push({ type: 'put', intent: working.get(intentId) }); });
  removed.forEach(intentId => { if (intents.some(i => String(i.intent_id) === intentId)) faqOperations.push({ type: 'delete', intent: { intent_id: intentId } }); });

  return { faqOperations, summary, intents: remaining, idMap };
}
