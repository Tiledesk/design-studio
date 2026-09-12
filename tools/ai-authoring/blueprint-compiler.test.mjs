// Test del compilatore Blueprint → agente V3, senza browser: Node esegue direttamente il TypeScript.
// Uso: npm run test:ai-authoring
// Fixture: i Blueprint di prova del servizio di generazione (blueprint-1 e blueprint-2) e uno generato su Render (06).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  compileBlueprint, CompileError, toBlockName, BLOCK_NAME_REGEX,
} from '../../src/app/chatbot-design-studio/ai-authoring/blueprint-compiler.ts';

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const load = (file) => JSON.parse(readFileSync(join(FIXTURES, file), 'utf8'));
const FIXTURE_FILES = readdirSync(FIXTURES).filter((f) => f.endsWith('.json')).sort();

const DEPARTMENTS = ['Vendite', 'Supporto'];
const NAMESPACES = [{ id: 'ns-faq-0001', name: 'FAQ sito' }, { id: 'ns-note-0002', name: 'Note clienti' }];
const CHATBOTS = [{ id: 'bot-0001', name: 'Assistente supporto' }];
const DATA_TABLES = [{ id: 'tbl-0001', name: 'Prodotti', columns: ['nome', 'prezzo', 'offerta'] }];
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const AI_MODEL = ['openai', 'gpt-4o', 'GPT-4o'];

function sequentialIds() {
  let uuids = 0;
  let uids = 0;
  return {
    uuid: () => `00000000-0000-4000-8000-${String(++uuids).padStart(12, '0')}`,
    uid: () => String(++uids).padStart(32, '0'),
  };
}
const compile = (blueprint, extra = {}) => compileBlueprint(blueprint, {
  departments: DEPARTMENTS, namespaces: NAMESPACES, chatbots: CHATBOTS, dataTables: DATA_TABLES,
  ids: sequentialIds(), now: () => '2026-09-11T00:00:00.000Z', ...extra,
});
const tiny = (blocks, extra = {}) => ({
  version: 'blueprint-2', name: 'Prova', language: 'it', start: blocks[0].id,
  fallbackText: 'Non ho capito.', fallbackNext: null, notes: [], blocks, ...extra,
});

const byName = (agent, name) => agent.intents.find((i) => i.intent_display_name === name);
const byRef = (agent, ref) => agent.intents.find((i) => `#${i.intent_id}` === ref);
const nameOf = (bp, id) => toBlockName(bp.blocks.find((b) => b.id === id).name, id);
const intentOf = (agent, bp, id) => {
  const intent = byName(agent, nameOf(bp, id));
  assert.ok(intent, `nessun intent per il blocco ${id}`);
  return intent;
};
const refTo = (agent, bp, id) => `#${intentOf(agent, bp, id).intent_id}`;
const buttonsOf = (action) => action.attributes.commands[1].message.attributes?.attachment?.buttons || [];
const expectError = (fn, pattern) => assert.throws(fn, (e) => e instanceof CompileError && e.problems.some((p) => pattern.test(p)));

/** Ogni blocco del Blueprint ha il suo intent, con l'action e le uscite giuste. */
function checkBlock(agent, bp, block) {
  const intent = intentOf(agent, bp, block.id);
  const action = intent.actions[0];
  const next = intent.attributes.nextBlockAction.intentName;
  const variables = agent.attributes.variables;
  const branches = () => {
    assert.equal(action.trueIntent, refTo(agent, bp, block.exits.true));
    assert.equal(action.falseIntent, refTo(agent, bp, block.exits.false));
    assert.equal(action.stopOnConditionMet, true);
    assert.equal(next, '');
  };
  const optionalNext = () => assert.equal(next, block.next ? refTo(agent, bp, block.next) : '');
  switch (block.type) {
    case 'replyv2': {
      assert.equal(action._tdActionType, 'replyv2');
      assert.equal(action.attributes.commands[1].message.text, block.text);
      const buttons = buttonsOf(action);
      assert.equal(buttons.length, (block.buttons || []).length);
      (block.buttons || []).forEach((b, j) => {
        assert.equal(buttons[j].value, b.label);
        if (b.goto) assert.deepEqual([buttons[j].type, buttons[j].action], ['action', refTo(agent, bp, b.goto)]);
        else assert.deepEqual([buttons[j].type, buttons[j].link], ['url', b.url]);
      });
      optionalNext();
      break;
    }
    case 'randomreply': {
      assert.equal(action._tdActionType, 'randomreply');
      const commands = action.attributes.commands;
      assert.equal(commands.length, block.texts.length * 2, 'una coppia attesa + messaggio per variante');
      block.texts.forEach((text, j) => {
        assert.equal(commands[2 * j].type, 'wait');
        assert.deepEqual(commands[2 * j + 1], { type: 'message', message: { type: 'text', text } });
      });
      optionalNext();
      break;
    }
    case 'ask': {
      assert.equal(action._tdActionType, 'replyv2');
      assert.equal(action.attributes.commands[1].message.text, block.text);
      assert.deepEqual(buttonsOf(action).map((b) => [b.type, b.value, b.action]), (block.options || []).map((o) => ['text', o, '']));
      const captureIntent = byRef(agent, next);
      assert.equal(captureIntent.intent_display_name, `${intent.intent_display_name} ${bp.language === 'it' ? 'risposta' : 'reply'}`);
      assert.equal(captureIntent.actions[0]._tdActionType, 'capture_user_reply');
      assert.equal(captureIntent.actions[0].assignResultTo, block.saveTo);
      assert.equal(captureIntent.actions[0].goToIntent, refTo(agent, bp, block.next));
      assert.equal(variables[block.saveTo], block.saveTo);
      break;
    }
    case 'jsoncondition2':
      assert.deepEqual([action._tdActionType, action.groups, action.when], ['jsoncondition2', [], block.when]);
      branches();
      break;
    case 'ai_condition': {
      assert.equal(action._tdActionType, 'ai_condition');
      assert.deepEqual([action.llm, action.model, action.modelName], AI_MODEL);
      assert.equal(action.instructions, block.instructions || 'User said: {{lastUserText}}');
      assert.equal(action.intents.length, block.branches.length);
      block.branches.forEach((branch, j) => {
        assert.match(action.intents[j].label, /^[0-9a-f]{32}$/, 'etichette come uid, da cui il DS ricava i connettori');
        assert.equal(action.intents[j].prompt, branch.description);
        assert.equal(action.intents[j].conditionIntentId, refTo(agent, bp, branch.goto));
      });
      assert.equal(new Set(action.intents.map((i) => i.label)).size, block.branches.length);
      assert.equal(action.fallbackIntent, refTo(agent, bp, block.exits.fallback));
      assert.equal(action.errorIntent, refTo(agent, bp, block.exits.error));
      assert.deepEqual(action.preview, []);
      assert.equal(next, '');
      break;
    }
    case 'ifopenhours':
      assert.equal(action._tdActionType, 'ifopenhours');
      branches();
      break;
    case 'ifonlineagentsv2':
      assert.deepEqual([action._tdActionType, action.selectedOption, action.ignoreOperatingHours], ['ifonlineagentsv2', 'all', false]);
      branches();
      break;
    case 'askgptv2':
      assert.equal(action._tdActionType, 'askgptv2');
      assert.equal(action.namespace, NAMESPACES.find((n) => n.name === block.knowledgeBase).id);
      assert.deepEqual([action.namespaceAsName, action.llm, action.model, action.modelName], [false, ...AI_MODEL]);
      assert.equal(action.question, block.question || '{{lastUserText}}');
      assert.equal(action.assignReplyTo, 'kb_reply');
      for (const v of ['kb_reply', 'kb_json_sources', 'kb_chunks']) assert.equal(variables[v], v);
      branches();
      break;
    case 'ai_prompt':
      assert.equal(action._tdActionType, 'ai_prompt');
      assert.deepEqual([action.llm, action.model, action.modelName], AI_MODEL);
      assert.deepEqual([action.question, action.context, action.history], [block.question, block.instructions || undefined, block.history === true]);
      assert.deepEqual([action.assignReplyTo, action.max_tokens, action.temperature, action.formatType, action.preview], [block.saveTo, 256, 0.7, 'none', []]);
      assert.equal(variables[block.saveTo], block.saveTo);
      branches();
      break;
    case 'add_kb_content':
      assert.equal(action._tdActionType, 'add_kb_content');
      assert.equal(action.namespace, NAMESPACES.find((n) => n.name === block.knowledgeBase).id);
      assert.deepEqual([action.type, action.name, action.source, action.content, action.namespaceAsName, action.tags],
        ['faq', block.title, block.content, `${block.title}\n${block.content}`, false, []]);
      optionalNext();
      break;
    case 'data_table': {
      assert.equal(action._tdActionType, 'data_table');
      const table = DATA_TABLES.find((t) => t.name === block.table);
      assert.deepEqual([action.tableId, action.tableName, action.operation, action.must_match], [table.id, table.name, block.operation, block.match || 'all']);
      assert.deepEqual(action.conditions, (block.conditions || []).map((c) => ({ column: c.column, operator: c.operator, value: c.value ?? '' })));
      assert.deepEqual(action.data, Object.fromEntries((block.data || []).map((d) => [d.column, d.value])));
      assert.deepEqual([action.assignResultTo, action.assignErrorTo], [block.saveTo, `${block.saveTo}_error`]);
      assert.equal(variables[block.saveTo], block.saveTo);
      assert.equal(variables[`${block.saveTo}_error`], `${block.saveTo}_error`);
      branches();
      break;
    }
    case 'iteration':
      assert.equal(action._tdActionType, 'iteration');
      assert.deepEqual([action.iterable, action.assignOutputTo, action.goToIntent], [block.iterable, block.itemVariable, refTo(agent, bp, block.exits.each)]);
      assert.equal(next, refTo(agent, bp, block.exits.done), 'done è il nextBlockAction: l\'engine prosegue lì a lista finita');
      assert.ok(!('fallbackIntent' in action) && !('delay' in action), 'campi che l\'engine ignora');
      assert.equal(variables[block.itemVariable], block.itemVariable);
      break;
    case 'setattribute-v2':
      assert.equal(action.destination, block.destination);
      assert.deepEqual(action.operation, {
        operands: [block.fromVariable != null ? { value: block.fromVariable, isVariable: true } : { value: block.value, isVariable: false }],
        operators: [],
      });
      assert.equal(variables[block.destination], block.destination);
      optionalNext();
      break;
    case 'delete':
      assert.deepEqual([action._tdActionType, action.variableName], ['delete', block.variable]);
      assert.ok(!(block.variable in variables) || bp.blocks.some((b) => b.itemVariable === block.variable || b.saveTo === block.variable), 'delete non dichiara la variabile');
      optionalNext();
      break;
    case 'wait':
      assert.deepEqual([action._tdActionType, action.millis], ['wait', Math.round(block.seconds * 1000)]);
      optionalNext();
      break;
    case 'add_tags':
      assert.deepEqual([action._tdActionType, action.tags, action.target, action.pushToList], ['add_tags', block.tags.join(','), block.target, false]);
      assert.equal(typeof action.tags, 'string', 'stringa separata da virgole, mai un array');
      optionalNext();
      break;
    case 'leadupdate':
      assert.equal(action._tdActionType, 'leadupdate');
      assert.deepEqual(action.update, Object.fromEntries(block.leadFields.map((f) => [f.field, f.value])));
      optionalNext();
      break;
    case 'email':
      assert.deepEqual([action._tdActionType, action.to, action.subject, action.text, action.replyto],
        ['email', block.to, block.subject, block.body, block.replyTo || undefined]);
      optionalNext();
      break;
    case 'flow_log':
      assert.deepEqual([action._tdActionType, action.level, action.log], ['flow_log', block.level, block.log]);
      optionalNext();
      break;
    case 'clear_transcript':
      assert.equal(action._tdActionType, 'clear_transcript');
      optionalNext();
      break;
    case 'department':
      assert.deepEqual([action._tdActionType, action.depName, action.triggerBot], ['department', block.department, false]);
      assert.equal(next, refTo(agent, bp, block.next));
      break;
    case 'replacebotv3':
      assert.deepEqual([action._tdActionType, action.botId, action.useSlug, action.blockName], ['replacebotv3', CHATBOTS.find((c) => c.name === block.bot).id, false, '']);
      assert.equal(next, '', 'terminale');
      break;
    default:
      assert.ok(['agent', 'close', 'move_to_unassigned'].includes(block.type), `tipo non previsto dal test: ${block.type}`);
      assert.equal(action._tdActionType, block.type);
      assert.equal(next, '');
  }
}

/** I riferimenti #id dell'agente: nomi dei campi come nel compilatore. */
function references(agent) {
  const out = [];
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    for (const [k, v] of Object.entries(node)) {
      if (['intentName', 'trueIntent', 'falseIntent', 'goToIntent', 'action', 'fallbackIntent', 'errorIntent', 'conditionIntentId'].includes(k) && typeof v === 'string') {
        if (v) out.push(v);
      } else walk(v);
    }
  };
  walk(agent.intents);
  return out;
}

// --- Le fixture ---------------------------------------------------------------------
for (const file of FIXTURE_FILES) {
  test(`${file}: struttura dell'agente V3`, () => {
    const bp = load(file);
    const agent = compile(bp);
    const asks = bp.blocks.filter((b) => b.type === 'ask').length;
    assert.equal(agent.intents.length, bp.blocks.length + asks + 2 + (bp.fallbackText ? 1 : 0));
    assert.deepEqual([agent.type, agent.subtype, agent.language, agent.webhook_enabled], ['tilebot', 'chatbot', bp.language, false]);
    assert.equal(agent.attributes.aiGeneration.blueprintVersion, bp.version);

    const starts = agent.intents.filter((i) => i.intent_display_name === 'start');
    assert.equal(starts.length, 1);
    assert.deepEqual([starts[0].question, starts[0].attributes.readonly], ['\\start', true]);
    assert.deepEqual(starts[0].actions.map((a) => [a._tdActionType, a.intentName]), [['intent', refTo(agent, bp, bp.start)]]);

    // Regola V3: defaultFallback sempre presente, vuoto, senza collegamenti in ingresso, collegato al messaggio di fallback.
    const fallbacks = agent.intents.filter((i) => i.intent_display_name === 'defaultFallback');
    assert.equal(fallbacks.length, 1);
    assert.equal(fallbacks[0].attributes.readonly, true);
    assert.deepEqual(fallbacks[0].actions, []);
    const fallbackNextRef = bp.fallbackNext ? refTo(agent, bp, bp.fallbackNext) : '';
    if (bp.fallbackText) {
      const fallbackMessage = byRef(agent, fallbacks[0].attributes.nextBlockAction.intentName);
      assert.equal(fallbackMessage.intent_display_name, 'Fallback');
      assert.equal(fallbackMessage.actions[0].attributes.commands[1].message.text, bp.fallbackText);
      assert.equal(fallbackMessage.attributes.nextBlockAction.intentName, fallbackNextRef);
    } else {
      assert.equal(fallbacks[0].attributes.nextBlockAction.intentName, fallbackNextRef);
    }
    for (const reserved of [...starts, ...fallbacks]) {
      assert.ok(!references(agent).includes(`#${reserved.intent_id}`), `${reserved.intent_display_name}: nessun collegamento in ingresso`);
    }

    const others = agent.intents.filter((i) => !['start', 'defaultFallback'].includes(i.intent_display_name));
    for (const intent of others) {
      assert.equal(intent.actions.length, 1, `${intent.intent_display_name}: una sola action`);
      assert.match(intent.intent_display_name, BLOCK_NAME_REGEX);
      assert.ok(intent.intent_display_name.length <= 50);
    }
    const names = agent.intents.map((i) => i.intent_display_name.toLowerCase());
    assert.equal(new Set(names).size, names.length, 'nomi unici');

    const intentIds = new Set(agent.intents.map((i) => i.intent_id));
    for (const ref of references(agent)) assert.ok(ref.startsWith('#') && intentIds.has(ref.slice(1)), `riferimento ${ref}`);

    const json = JSON.stringify(agent);
    assert.doesNotMatch(json, /"__|"createdAt"/);
    const positions = agent.intents.map((i) => `${i.attributes.position.x},${i.attributes.position.y}`);
    assert.equal(new Set(positions).size, positions.length, 'posizioni distinte');

    for (const block of bp.blocks) checkBlock(agent, bp, block);
  });
}

test('le fixture coprono tutti i tipi del catalogo v3-catalog-2', () => {
  const catalog = JSON.parse(readFileSync(join(FIXTURES, '../../../src/assets/ai-authoring/v3-catalog-2.json'), 'utf8'));
  const used = new Set(FIXTURE_FILES.flatMap((f) => load(f).blocks.map((b) => b.type)));
  assert.deepEqual(catalog.types.map((t) => t.type).filter((t) => !used.has(t)), []);
});

// --- Casi particolari ---------------------------------------------------------------
test('nomi: accenti, punteggiatura, prefisso untitled, vuoti e lunghi', () => {
  assert.equal(toBlockName('Città e perché?', 'x'), 'Citta e perche');
  assert.equal(toBlockName("Un'altra domanda", 'x'), 'Un altra domanda');
  assert.equal(toBlockName('Straße', 'x'), 'Strasse');
  assert.equal(toBlockName('untitled_block_7', 'x'), '7');
  assert.equal(toBlockName('¿¡!', 'blocco_vuoto'), 'blocco_vuoto');
  assert.equal(toBlockName('Привет', 'saluto'), 'saluto');
  assert.equal(toBlockName('x'.repeat(60), 'x').length, 50);
});

test('nomi unici e mai riservati, capture entro 50 caratteri', () => {
  const blocks = ['close', 'Close', 'Menu', 'menu', 'start'].map((name, i) => ({ id: `b${i}`, name, type: 'replyv2', text: 'Ciao', next: `b${i + 1}` }));
  blocks.push({ id: 'b5', name: 'y'.repeat(49), type: 'ask', text: 'Nome?', saveTo: 'user_name', next: 'b6' });
  blocks.push({ id: 'b6', name: 'Fine', type: 'close' });
  const agent = compile(tiny(blocks));
  const names = agent.intents.map((i) => i.intent_display_name);
  assert.deepEqual(names.slice(1, 6), ['close block', 'Close block 2', 'Menu', 'menu 2', 'start block']);
  const captureName = names[7];
  assert.ok(captureName.length <= 50 && captureName.endsWith(' risposta'), captureName);
});

test('Blueprint non compilabile → CompileError con i problemi', () => {
  expectError(() => compile(tiny([{ id: 'a', name: 'A', type: 'replyv2', text: 'x', next: 'nowhere' }])), /nowhere/);
  expectError(() => compile(tiny([{ id: 'a', name: 'A', type: 'askgptv2', knowledgeBase: 'Manuali', exits: { true: 'a', false: 'a' } }])), /Manuali/);
  expectError(() => compile(tiny([{ id: 'a', name: 'A', type: 'department', department: 'Marketing', next: 'b' }, { id: 'b', name: 'B', type: 'agent' }])), /Marketing/);
  expectError(() => compile(tiny([{ id: 'a', name: 'A', type: 'webrequestv2' }])), /webrequestv2/);
  expectError(() => compile(tiny([{ id: 'a', name: 'A', type: 'ifopenhours' }])), /uscite/);
  expectError(() => compile(tiny([{ id: 'a', name: 'A', type: 'ask', text: 'Q?', next: 'a' }])), /saveTo/);
  expectError(() => compile(tiny([{ id: 'a', name: 'A', type: 'close' }], { start: 'zzz' })), /start/);
  // Tipi nuovi: dati del progetto, uscite con nome, campi obbligatori.
  expectError(() => compile(tiny([{ id: 'a', name: 'A', type: 'replacebotv3', bot: 'Nessuno' }])), /Nessuno/);
  expectError(() => compile(tiny([{ id: 'a', name: 'A', type: 'data_table', table: 'Clienti', operation: 'get', saveTo: 'righe', exits: { true: 'a', false: 'a' } }])), /Clienti/);
  expectError(() => compile(tiny([{ id: 'a', name: 'A', type: 'iteration', iterable: 'righe', itemVariable: 'riga', exits: { each: 'a' } }])), /exits\.done/);
  expectError(() => compile(tiny([{ id: 'a', name: 'A', type: 'ai_condition', branches: [{ label: 'x', description: 'y', goto: 'a' }], exits: { fallback: 'a' } }])), /exits\.error/);
  expectError(() => compile(tiny([{ id: 'a', name: 'A', type: 'add_tags', tags: ['x'], target: 'conversation' }])), /target/);
  expectError(() => compile(tiny([{ id: 'a', name: 'A', type: 'flow_log', level: 'native', log: 'x' }])), /level/);
  expectError(() => compile(tiny([{ id: 'a', name: 'A', type: 'leadupdate', leadFields: [{ field: 'nickname', value: 'x' }] }])), /contatto/);
  expectError(() => compile(tiny([{ id: 'a', name: 'A', type: 'email', to: 'x@y.z', subject: 's' }])), /body/);
});

test('senza elenco dei dipartimenti il nome non si verifica', () => {
  const bp = tiny([{ id: 'a', name: 'A', type: 'department', department: 'Marketing', next: 'b' }, { id: 'b', name: 'B', type: 'agent' }]);
  assert.equal(compile(bp, { departments: undefined }).intents[1].actions[0].depName, 'Marketing');
});

test('fallback senza testo: il defaultFallback vuoto si collega direttamente a fallbackNext', () => {
  const bp = tiny([{ id: 'a', name: 'A', type: 'close' }], { fallbackText: null, fallbackNext: 'a' });
  const agent = compile(bp);
  const fallback = byName(agent, 'defaultFallback');
  assert.deepEqual(fallback.actions, []);
  assert.equal(fallback.attributes.nextBlockAction.intentName, refTo(agent, bp, 'a'));
  assert.equal(byName(agent, 'Fallback'), undefined);
});

test('un blocco chiamato Fallback dal Blueprint non entra in conflitto con il blocco del messaggio di fallback', () => {
  const bp = tiny([{ id: 'f', name: 'Fallback', type: 'replyv2', text: 'Ciao' }], { fallbackText: 'Non ho capito.', fallbackNext: 'f' });
  const agent = compile(bp);
  const names = agent.intents.map((i) => i.intent_display_name);
  assert.ok(names.includes('Fallback') && names.includes('Fallback 2'), names.join(', '));
  const fallback = byName(agent, 'defaultFallback');
  const message = byRef(agent, fallback.attributes.nextBlockAction.intentName);
  assert.equal(message.actions[0].attributes.commands[1].message.text, 'Non ho capito.');
  assert.equal(message.attributes.nextBlockAction.intentName, refTo(agent, bp, 'f'));
});

test('macro ask con reply v1, se lo spike lo richiede', () => {
  const bp = tiny([{ id: 'q', name: 'Chiedi email', type: 'ask', text: 'Email?', saveTo: 'user_email', next: 'f' }, { id: 'f', name: 'Fine', type: 'close' }]);
  const action = byName(compile(bp, { askMessageType: 'reply' }), 'Chiedi email').actions[0];
  assert.deepEqual([action._tdActionType, action.text, action.attributes.commands[1].message.text], ['reply', 'Email?', 'Email?']);
});

test('ai_prompt senza istruzioni e senza history: nessun context, history false; il ramo true segue exits', () => {
  const bp = tiny([
    { id: 'p', name: 'Riassumi', type: 'ai_prompt', question: 'Riassumi: {{lastUserText}}', saveTo: 'riassunto', exits: { true: 'm', false: 'e' } },
    { id: 'm', name: 'Mostra', type: 'replyv2', text: '{{riassunto}}' },
    { id: 'e', name: 'Errore', type: 'replyv2', text: 'Riprova.' },
  ]);
  const action = byName(compile(bp), 'Riassumi').actions[0];
  assert.ok(!('context' in action));
  assert.equal(action.history, false);
});

test('email con replyTo e senza: replyto solo quando c\'è', () => {
  const withReply = tiny([{ id: 'e', name: 'Email', type: 'email', to: 'a@b.c', subject: 's', body: 'b', replyTo: '{{user_email}}' }]);
  const without = tiny([{ id: 'e', name: 'Email', type: 'email', to: 'a@b.c', subject: 's', body: 'b' }]);
  assert.equal(byName(compile(withReply), 'Email').actions[0].replyto, '{{user_email}}');
  assert.ok(!('replyto' in byName(compile(without), 'Email').actions[0]));
});

test('uscita deterministica con gli stessi generatori di id', () => {
  const bp = load(FIXTURE_FILES[0]);
  assert.deepEqual(compile(bp), compile(bp));
});

test('id reali: uuid v4 per intent e action, uid di 32 caratteri esadecimali per bottoni ed etichette di ai_condition', () => {
  const agent = compileBlueprint(load('02-menu.json'), { departments: DEPARTMENTS, namespaces: NAMESPACES });
  for (const intent of agent.intents) {
    assert.match(intent.intent_id, UUID_V4);
    for (const action of intent.actions) assert.match(action._tdActionId, UUID_V4);
  }
  const uids = agent.intents.flatMap((i) => i.actions.flatMap((a) => (a.attributes?.commands?.[1]?.message?.attributes?.attachment?.buttons || []).map((b) => b.uid)));
  assert.ok(uids.length > 0);
  for (const uid of uids) assert.match(uid, /^[0-9a-f]{32}$/);
  const routing = compileBlueprint(load('09-ai-condition.json'), { departments: DEPARTMENTS, namespaces: NAMESPACES });
  const labels = routing.intents.flatMap((i) => i.actions.filter((a) => a._tdActionType === 'ai_condition').flatMap((a) => a.intents.map((x) => x.label)));
  assert.equal(labels.length, 3);
  for (const label of labels) assert.match(label, /^[0-9a-f]{32}$/);
});

test('metadati della generazione, riassunto dell\'intervista e nome scelto dall\'utente', () => {
  const generation = {
    finalPrompt: 'Brief', model: 'openai:gpt-4.1', promptVersion: 'gen-v3-2+36062098', catalogVersion: 'v3-catalog-2',
    initialPrompt: 'Un bot che qualifica i lead', finalPromptEdited: true,
    interview: { questions: 3, promptVersion: 'plan-v3-2+947a9e14', model: 'openai:gpt-4.1' },
    assumptions: ['Tono cordiale'], unsupported: [],
  };
  const agent = compile(load('01-linear.json'), { name: 'Il mio agente', description: 'Creato con l\'AI', generation });
  assert.equal(agent.name, 'Il mio agente');
  assert.equal(agent.description, 'Creato con l\'AI');
  assert.deepEqual(agent.attributes.aiGeneration, {
    ...generation, blueprintVersion: 'blueprint-1', notes: [], generatedAt: '2026-09-11T00:00:00.000Z',
  });
});

test('layout: start a sinistra, primo blocco nella colonna successiva; i rami di ai_condition e le uscite each/done sono raggiunti', () => {
  const bp = load('01-linear.json');
  const agent = compile(bp);
  assert.deepEqual(byName(agent, 'start').attributes.position, { x: 100, y: 100 });
  assert.deepEqual(intentOf(agent, bp, bp.start).attributes.position, { x: 520, y: 100 });
  for (const file of ['08-data-table-loop.json', '09-ai-condition.json']) {
    const flow = load(file);
    const compiled = compile(flow);
    const columns = flow.blocks.map((b) => intentOf(compiled, flow, b.id).attributes.position.x);
    assert.ok(columns.every((x) => x > 100), `${file}: ogni blocco ha una colonna oltre start`);
  }
});
