// Test del decompilatore V3 → vista compatta: round-trip sulle fixture del compilatore.
// Uso: npm run test:ai-authoring
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { compileBlueprint } from '../../src/app/chatbot-design-studio/ai-authoring/blueprint-compiler.ts';
import { decompileAgent, compactView } from '../../src/app/chatbot-design-studio/ai-authoring/blueprint-decompiler.ts';

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const load = (file) => JSON.parse(readFileSync(join(FIXTURES, file), 'utf8'));
const FIXTURE_FILES = readdirSync(FIXTURES).filter((f) => f.endsWith('.json')).sort();

const DEPARTMENTS = ['Vendite', 'Supporto'];
const NAMESPACES = [{ id: 'ns-faq-0001', name: 'FAQ sito' }, { id: 'ns-note-0002', name: 'Note clienti' }];
const CHATBOTS = [{ id: 'bot-0001', name: 'Assistente supporto' }];
const DATA_TABLES = [{ id: 'tbl-0001', name: 'Prodotti', columns: ['nome', 'prezzo', 'offerta'] }];
const REFS = { namespaces: NAMESPACES, chatbots: CHATBOTS, dataTables: DATA_TABLES };

function sequentialIds() {
  let uuids = 0;
  let uids = 0;
  return {
    uuid: () => `00000000-0000-4000-8000-${String(++uuids).padStart(12, '0')}`,
    uid: () => String(++uids).padStart(32, '0'),
  };
}
const compile = (bp) => compileBlueprint(bp, { departments: DEPARTMENTS, ...REFS, ids: sequentialIds() });

/** I campi del Blueprint che il round-trip deve conservare, per tipo (le uscite a parte). */
const FIELDS = {
  replyv2: ['text'], randomreply: ['texts'], ask: ['text', 'options', 'saveTo'], 'setattribute-v2': ['destination', 'value', 'fromVariable'],
  delete: ['variable'], jsoncondition2: ['when'], ai_condition: ['instructions'], ifopenhours: [], ifonlineagentsv2: [],
  askgptv2: ['knowledgeBase', 'question'], ai_prompt: ['question', 'instructions', 'saveTo'], add_kb_content: ['knowledgeBase', 'title', 'content'],
  data_table: ['table', 'operation', 'saveTo'], iteration: ['iterable', 'itemVariable'], wait: ['seconds'], add_tags: ['tags', 'target'],
  leadupdate: ['leadFields'], email: ['to', 'subject', 'body'], flow_log: ['level', 'log'], clear_transcript: [], department: ['department'],
  replacebotv3: ['bot'], agent: [], move_to_unassigned: [], close: [],
};
const norm = (v) => (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length) ? null : v);

for (const file of FIXTURE_FILES) {
  test(`round-trip ${file}: decompile(compile(bp)) conserva tipi, campi e uscite`, () => {
    const bp = load(file);
    const agent = compile(bp);
    const view = decompileAgent(agent.intents, { name: agent.name, language: agent.language }, REFS);

    assert.equal(view.opaque.length, 0, `blocchi opachi: ${view.opaque.join(', ')}`);
    assert.equal(view.start, agent.idMap[bp.start]);
    assert.ok(view.reserved.start && view.reserved.defaultFallback);
    const fallbackBlocks = bp.fallbackText ? 1 : 0;
    assert.equal(view.blocks.length, bp.blocks.length + 2 + fallbackBlocks);

    for (const block of bp.blocks) {
      const id = agent.idMap[block.id];
      const got = view.blocks.find((b) => b.id === id);
      assert.ok(got, `blocco ${block.id} non decompilato`);
      assert.equal(got.type, block.type, `${block.id}: tipo`);
      assert.equal(got.reserved, undefined);
      for (const field of FIELDS[block.type] || []) {
        const expected = field === 'seconds' ? Number(block[field]) : block[field];
        assert.deepEqual(norm(got[field]), norm(expected), `${block.id}.${field}`);
      }
      // Uscite: next e exits con nome, tradotte in id reali
      if (block.next !== undefined) assert.equal(norm(got.next), block.next ? agent.idMap[block.next] : null, `${block.id}.next`);
      if (block.exits) {
        for (const [name, target] of Object.entries(block.exits)) {
          assert.equal(norm(got.exits?.[name]), target ? agent.idMap[target] : null, `${block.id}.exits.${name}`);
        }
      }
      if (block.type === 'replyv2' && block.buttons?.length) {
        assert.deepEqual(got.buttons.map((b) => [b.label, b.goto ? 'goto' : 'url', b.goto || b.url]),
          block.buttons.map((b) => [b.label, b.goto ? 'goto' : 'url', b.goto ? agent.idMap[b.goto] : b.url]));
      }
      if (block.type === 'ai_condition') {
        assert.deepEqual(got.branches.map((b) => [b.description, b.goto]), block.branches.map((b) => [b.description, agent.idMap[b.goto]]));
      }
      if (block.type === 'ask') assert.ok(view.captures[id], `${block.id}: capture non riconosciuta`);
    }

    // La vista compatta non porta posizioni ne' campi vuoti
    const compact = compactView(view);
    assert.equal(compact.blocks.length, view.blocks.length);
    for (const b of compact.blocks) {
      assert.equal(b.position, undefined);
      for (const v of Object.values(b)) assert.notEqual(v, null);
    }
  });
}

test('un intent con due action, o con una action fuori catalogo, diventa opaco ma resta collegabile', () => {
  const agent = compile(load('01-linear.json'));
  const intents = JSON.parse(JSON.stringify(agent.intents));
  const first = intents.find((i) => i.intent_display_name !== 'start' && i.intent_display_name !== 'defaultFallback' && i.actions.length === 1);
  first.actions.push({ _tdActionType: 'reply', text: 'seconda action' });
  const custom = intents.find((i) => i !== first && i.actions.length === 1 && i.intent_display_name !== 'start' && i.intent_display_name !== 'defaultFallback');
  custom.actions = [{ _tdActionType: 'web_request', url: 'https://x', goToIntent: '#' + first.intent_id }];
  const view = decompileAgent(intents, {}, REFS);
  // I due intent toccati sono opachi; se uno era la domanda di una ask, anche la sua capture (orfana) lo diventa
  assert.ok(view.opaque.includes(first.intent_id) && view.opaque.includes(custom.intent_id));
  const allowed = new Set([first.intent_id, custom.intent_id, first.attributes.nextBlockAction.intentName.slice(1), (custom.attributes.nextBlockAction.intentName || '').slice(1)]);
  for (const id of view.opaque) assert.ok(allowed.has(id), `opaco inatteso: ${id}`);
  const opaque = view.blocks.find((b) => b.id === custom.intent_id);
  assert.equal(opaque.type, 'opaque');
  assert.deepEqual(opaque.actionTypes, ['web_request']);
  assert.ok(Object.values(opaque.exits).includes(first.intent_id));
});

test('una capture puntata da due blocchi non e\' una ask: resta opaca', () => {
  const agent = compile(load('03-ask-condition.json'));
  const intents = JSON.parse(JSON.stringify(agent.intents));
  const capture = intents.find((i) => i.actions[0]?._tdActionType === 'capture_user_reply');
  const other = intents.find((i) => i.intent_display_name === 'defaultFallback');
  other.attributes.nextBlockAction.intentName = '#' + capture.intent_id;
  const view = decompileAgent(intents, {}, REFS);
  assert.ok(view.opaque.includes(capture.intent_id));
  assert.equal(Object.values(view.captures).includes(capture.intent_id), false);
});

test('start e defaultFallback sono riservati e portano la loro uscita', () => {
  const bp = load('01-linear.json');
  const agent = compile(bp);
  const view = decompileAgent(agent.intents, {}, REFS);
  const start = view.blocks.find((b) => b.type === 'start');
  const fallback = view.blocks.find((b) => b.type === 'defaultFallback');
  assert.equal(start.reserved, true);
  assert.equal(start.next, agent.idMap[bp.start]);
  assert.equal(fallback.reserved, true);
  assert.ok(fallback.next);
});
