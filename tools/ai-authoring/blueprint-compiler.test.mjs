// Test del compilatore Blueprint → agente V3, senza browser: Node esegue direttamente il TypeScript.
// Uso: npm run test:ai-authoring
// Fixture: i Blueprint di prova del servizio di generazione e uno generato su Render (06).
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
const NAMESPACES = [{ id: 'ns-faq-0001', name: 'FAQ sito' }];
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function sequentialIds() {
  let uuids = 0;
  let uids = 0;
  return {
    uuid: () => `00000000-0000-4000-8000-${String(++uuids).padStart(12, '0')}`,
    uid: () => String(++uids).padStart(32, '0'),
  };
}
const compile = (blueprint, extra = {}) => compileBlueprint(blueprint, {
  departments: DEPARTMENTS, namespaces: NAMESPACES, ids: sequentialIds(), now: () => '2026-09-11T00:00:00.000Z', ...extra,
});
const tiny = (blocks, extra = {}) => ({
  version: 'blueprint-1', name: 'Prova', language: 'it', start: blocks[0].id,
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
  const branches = () => {
    assert.equal(action.trueIntent, refTo(agent, bp, block.exits.true));
    assert.equal(action.falseIntent, refTo(agent, bp, block.exits.false));
    assert.equal(action.stopOnConditionMet, true);
    assert.equal(next, '');
  };
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
      assert.equal(next, block.next ? refTo(agent, bp, block.next) : '');
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
      assert.equal(agent.attributes.variables[block.saveTo], block.saveTo);
      break;
    }
    case 'jsoncondition2':
      assert.deepEqual([action._tdActionType, action.groups, action.when], ['jsoncondition2', [], block.when]);
      branches();
      break;
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
      assert.deepEqual([action.namespaceAsName, action.llm, action.model, action.modelName], [false, 'openai', 'gpt-4o', 'GPT-4o']);
      assert.equal(action.question, block.question || '{{lastUserText}}');
      assert.equal(action.assignReplyTo, 'kb_reply');
      for (const v of ['kb_reply', 'kb_json_sources', 'kb_chunks']) assert.equal(agent.attributes.variables[v], v);
      branches();
      break;
    case 'setattribute-v2':
      assert.equal(action.destination, block.destination);
      assert.deepEqual(action.operation, {
        operands: [block.fromVariable != null ? { value: block.fromVariable, isVariable: true } : { value: block.value, isVariable: false }],
        operators: [],
      });
      assert.equal(agent.attributes.variables[block.destination], block.destination);
      assert.equal(next, block.next ? refTo(agent, bp, block.next) : '');
      break;
    case 'department':
      assert.deepEqual([action._tdActionType, action.depName, action.triggerBot], ['department', block.department, false]);
      assert.equal(next, refTo(agent, bp, block.next));
      break;
    default:
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
      if (['intentName', 'trueIntent', 'falseIntent', 'goToIntent', 'action'].includes(k) && typeof v === 'string') { if (v) out.push(v); }
      else walk(v);
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
    assert.equal(agent.intents.length, bp.blocks.length + asks + 2);
    assert.deepEqual([agent.type, agent.subtype, agent.language, agent.webhook_enabled], ['tilebot', 'chatbot', bp.language, false]);

    const starts = agent.intents.filter((i) => i.intent_display_name === 'start');
    assert.equal(starts.length, 1);
    assert.deepEqual([starts[0].question, starts[0].attributes.readonly], ['\\start', true]);
    assert.deepEqual(starts[0].actions.map((a) => [a._tdActionType, a.intentName]), [['intent', refTo(agent, bp, bp.start)]]);

    const fallbacks = agent.intents.filter((i) => i.intent_display_name === 'defaultFallback');
    assert.equal(fallbacks.length, 1);
    assert.equal(fallbacks[0].attributes.readonly, true);
    assert.equal(fallbacks[0].attributes.nextBlockAction.intentName, bp.fallbackNext ? refTo(agent, bp, bp.fallbackNext) : '');
    assert.equal(fallbacks[0].actions[0]?.attributes.commands[1].message.text, bp.fallbackText ?? undefined);

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
});

test('senza elenco dei dipartimenti il nome non si verifica', () => {
  const bp = tiny([{ id: 'a', name: 'A', type: 'department', department: 'Marketing', next: 'b' }, { id: 'b', name: 'B', type: 'agent' }]);
  assert.equal(compile(bp, { departments: undefined }).intents[1].actions[0].depName, 'Marketing');
});

test('fallback senza testo: nessuna action, solo il collegamento', () => {
  const bp = tiny([{ id: 'a', name: 'A', type: 'close' }], { fallbackText: null, fallbackNext: 'a' });
  const fallback = byName(compile(bp), 'defaultFallback');
  assert.deepEqual(fallback.actions, []);
  assert.ok(fallback.attributes.nextBlockAction.intentName.startsWith('#'));
});

test('macro ask con reply v1, se lo spike lo richiede', () => {
  const bp = tiny([{ id: 'q', name: 'Chiedi email', type: 'ask', text: 'Email?', saveTo: 'user_email', next: 'f' }, { id: 'f', name: 'Fine', type: 'close' }]);
  const action = byName(compile(bp, { askMessageType: 'reply' }), 'Chiedi email').actions[0];
  assert.deepEqual([action._tdActionType, action.text, action.attributes.commands[1].message.text], ['reply', 'Email?', 'Email?']);
});

test('uscita deterministica con gli stessi generatori di id', () => {
  const bp = load(FIXTURE_FILES[0]);
  assert.deepEqual(compile(bp), compile(bp));
});

test('id reali: uuid v4 per intent e action, uid di 32 caratteri esadecimali per i bottoni', () => {
  const agent = compileBlueprint(load('02-menu.json'), { departments: DEPARTMENTS, namespaces: NAMESPACES });
  for (const intent of agent.intents) {
    assert.match(intent.intent_id, UUID_V4);
    for (const action of intent.actions) assert.match(action._tdActionId, UUID_V4);
  }
  const uids = agent.intents.flatMap((i) => i.actions.flatMap((a) => (a.attributes?.commands?.[1]?.message?.attributes?.attachment?.buttons || []).map((b) => b.uid)));
  assert.ok(uids.length > 0);
  for (const uid of uids) assert.match(uid, /^[0-9a-f]{32}$/);
});

test('metadati della generazione e nome scelto dall\'utente', () => {
  const agent = compile(load('01-linear.json'), {
    name: 'Il mio agente', description: 'Creato con l\'AI',
    generation: { finalPrompt: 'Brief', model: 'openai:gpt-4.1', promptVersion: 'gen-v3-1+36062098', catalogVersion: 'v3-catalog-1' },
  });
  assert.equal(agent.name, 'Il mio agente');
  assert.equal(agent.description, 'Creato con l\'AI');
  assert.deepEqual(agent.attributes.aiGeneration, {
    finalPrompt: 'Brief', model: 'openai:gpt-4.1', promptVersion: 'gen-v3-1+36062098', catalogVersion: 'v3-catalog-1',
    blueprintVersion: 'blueprint-1', notes: [], generatedAt: '2026-09-11T00:00:00.000Z',
  });
});

test('layout: start a sinistra, primo blocco nella colonna successiva', () => {
  const bp = load('01-linear.json');
  const agent = compile(bp);
  assert.deepEqual(byName(agent, 'start').attributes.position, { x: 100, y: 100 });
  assert.deepEqual(intentOf(agent, bp, bp.start).attributes.position, { x: 520, y: 100 });
});
