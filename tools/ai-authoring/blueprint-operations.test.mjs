// Test dell'applicazione delle operazioni di modifica via prompt al V3.
// Uso: npm run test:ai-authoring
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { compileBlueprint, CompileError } from '../../src/app/chatbot-design-studio/ai-authoring/blueprint-compiler.ts';
import { decompileAgent } from '../../src/app/chatbot-design-studio/ai-authoring/blueprint-decompiler.ts';
import { compileOperations } from '../../src/app/chatbot-design-studio/ai-authoring/blueprint-operations.ts';

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const load = (file) => JSON.parse(readFileSync(join(FIXTURES, file), 'utf8'));
const NAMESPACES = [{ id: 'ns-faq-0001', name: 'FAQ sito' }, { id: 'ns-note-0002', name: 'Note clienti' }];
const CHATBOTS = [{ id: 'bot-0001', name: 'Assistente supporto' }];
const DATA_TABLES = [{ id: 'tbl-0001', name: 'Prodotti', columns: ['nome', 'prezzo', 'offerta'] }];
const REFS = { namespaces: NAMESPACES, chatbots: CHATBOTS, dataTables: DATA_TABLES };

function sequentialIds(prefix = '0') {
  let uuids = 0;
  let uids = 0;
  return {
    uuid: () => `${prefix}0000000-0000-4000-8000-${String(++uuids).padStart(12, '0')}`,
    uid: () => prefix + String(++uids).padStart(31, '0'),
  };
}
const setup = (file) => {
  const bp = load(file);
  const agent = compileBlueprint(bp, { departments: ['Vendite', 'Supporto'], ...REFS, ids: sequentialIds() });
  return { bp, agent, intents: agent.intents, idOf: (blockId) => agent.idMap[blockId] };
};
const apply = (intents, ops) => compileOperations(intents, ops, { ...REFS, ids: sequentialIds('f') });
const byId = (list, id) => list.find((i) => i.intent_id === id);
const expectError = (fn, pattern) => assert.throws(fn, (e) => e instanceof CompileError && e.problems.some((p) => pattern.test(p)));

test('add: un blocco nuovo compilato, piazzato accanto ad `after` e agganciato alla sua uscita libera', () => {
  const { bp, intents, idOf } = setup('01-linear.json');
  // Un blocco terminale (senza next) a cui agganciare il nuovo
  const terminal = bp.blocks.find((b) => b.next === null || b.next === undefined) || bp.blocks[bp.blocks.length - 1];
  const afterId = idOf(terminal.id);
  const before = byId(intents, afterId);
  const hadNext = !!before.attributes.nextBlockAction.intentName;
  const res = apply(intents, [{ op: 'add', after: afterId, block: { id: 'n1', name: 'Orari', type: 'replyv2', text: '12-15, 19-23', next: null } }]);
  assert.equal(res.summary.added.length, 1);
  assert.equal(res.summary.added[0].name, 'Orari');
  const newId = res.idMap.n1;
  assert.ok(newId);
  const post = res.faqOperations.find((o) => o.type === 'post');
  assert.equal(post.intent.intent_id, newId);
  assert.equal(post.intent.actions[0]._tdActionType, 'reply');
  assert.deepEqual(post.intent.attributes.position, { x: before.attributes.position.x + 420, y: before.attributes.position.y });
  if (!hadNext) {
    const put = res.faqOperations.find((o) => o.type === 'put' && o.intent.intent_id === afterId);
    assert.ok(put, 'il blocco after va aggiornato');
    assert.equal(put.intent.attributes.nextBlockAction.intentName, '#' + newId);
    assert.equal(res.summary.connections, 1);
  }
});

test('update: ricompila solo le action e conserva posizione, colore e connettori', () => {
  const { bp, intents, idOf } = setup('01-linear.json');
  const block = bp.blocks.find((b) => b.type === 'replyv2');
  const id = idOf(block.id);
  const current = byId(intents, id);
  current.attributes.position = { x: 999, y: 777 };
  current.attributes.color = '1,2,3';
  current.attributes.connectors = { a: 1 };
  const res = apply(intents, [{ op: 'update', id, block: { ...block, id, text: 'Testo nuovo', next: block.next ? idOf(block.next) : null } }]);
  assert.equal(res.summary.updated.length, 1);
  const put = res.faqOperations.find((o) => o.type === 'put' && o.intent.intent_id === id);
  assert.ok(put);
  assert.equal(put.intent.actions.length, 1);
  assert.equal(put.intent.actions[0].attributes.commands[1].message.text, 'Testo nuovo');
  assert.deepEqual(put.intent.attributes.position, { x: 999, y: 777 });
  assert.equal(put.intent.attributes.color, '1,2,3');
  assert.deepEqual(put.intent.attributes.connectors, { a: 1 });
  assert.equal(put.intent.intent_display_name, current.intent_display_name);
  assert.equal(put.intent.attributes.nextBlockAction.intentName, block.next ? '#' + idOf(block.next) : '');
});

test('remove: cancella il blocco e azzera i riferimenti rimasti appesi, con un avviso', () => {
  const { bp, intents, idOf } = setup('01-linear.json');
  // Un blocco puntato da un altro
  const pointed = bp.blocks.find((b) => bp.blocks.some((o) => o.next === b.id));
  const pointer = bp.blocks.find((o) => o.next === pointed.id);
  const res = apply(intents, [{ op: 'remove', id: idOf(pointed.id) }]);
  assert.equal(res.summary.removed.length, 1);
  assert.ok(res.faqOperations.some((o) => o.type === 'delete' && o.intent.intent_id === idOf(pointed.id)));
  const put = res.faqOperations.find((o) => o.type === 'put' && o.intent.intent_id === idOf(pointer.id));
  assert.ok(put, 'chi puntava al blocco rimosso va aggiornato');
  assert.equal(put.intent.attributes.nextBlockAction.intentName, '');
  assert.ok(res.summary.warnings.length >= 1);
  assert.equal(res.intents.some((i) => i.intent_id === idOf(pointed.id)), false);
});

test('remove + connect: ricucire una catena (predecessore → successore)', () => {
  const { bp, intents, idOf } = setup('01-linear.json');
  const chain = bp.blocks.filter((b) => b.next).map((b) => [b.id, b.next]);
  const [a, b] = chain.find(([, mid]) => bp.blocks.find((x) => x.id === mid)?.next) || chain[0];
  const c = bp.blocks.find((x) => x.id === b).next;
  const res = apply(intents, [
    { op: 'remove', id: idOf(b) },
    { op: 'connect', from: idOf(a), exit: 'next', to: idOf(c) },
  ]);
  const put = res.faqOperations.find((o) => o.type === 'put' && o.intent.intent_id === idOf(a));
  assert.equal(put.intent.attributes.nextBlockAction.intentName, '#' + idOf(c));
  assert.equal(res.summary.warnings.length, 0);
  assert.equal(res.summary.connections, 1);
});

test('connect con le uscite con nome: true/false, pulsante, ramo AI, capture di una ask', () => {
  const { bp, intents, idOf } = setup('03-ask-condition.json');
  const cond = bp.blocks.find((b) => b.exits && b.exits.true);
  const ask = bp.blocks.find((b) => b.type === 'ask');
  const target = bp.blocks.find((b) => b.id !== cond.id && b.id !== ask.id);
  const res = apply(intents, [
    { op: 'connect', from: idOf(cond.id), exit: 'false', to: idOf(target.id) },
    { op: 'connect', from: idOf(ask.id), exit: 'next', to: idOf(target.id) },
  ]);
  const condPut = res.faqOperations.find((o) => o.type === 'put' && o.intent.intent_id === idOf(cond.id));
  assert.equal(condPut.intent.actions[0].falseIntent, '#' + idOf(target.id));
  const view = decompileAgent(intents, {}, REFS);
  const capturePut = res.faqOperations.find((o) => o.type === 'put' && o.intent.intent_id === view.captures[idOf(ask.id)]);
  assert.ok(capturePut, 'la capture della ask va aggiornata');
  assert.equal(capturePut.intent.attributes.nextBlockAction.intentName, '#' + idOf(target.id));

  const menu = setup('02-menu.json');
  const menuBlock = menu.bp.blocks.find((b) => b.buttons?.some((x) => x.goto));
  const button = menuBlock.buttons.find((x) => x.goto);
  const other = menu.bp.blocks.find((b) => b.id !== menuBlock.id && b.id !== button.goto);
  const r2 = apply(menu.intents, [{ op: 'connect', from: menu.idOf(menuBlock.id), exit: 'button:' + button.label, to: menu.idOf(other.id) }]);
  const put = r2.faqOperations.find((o) => o.type === 'put');
  const buttons = put.intent.actions[0].attributes.commands[1].message.attributes.attachment.buttons;
  assert.equal(buttons.find((x) => x.value === button.label).action, '#' + menu.idOf(other.id));

  const ai = setup('09-ai-condition.json');
  const aiBlock = ai.bp.blocks.find((b) => b.type === 'ai_condition');
  const branch = aiBlock.branches[0];
  const dest = ai.bp.blocks.find((b) => b.id !== aiBlock.id && b.id !== branch.goto);
  const r3 = apply(ai.intents, [{ op: 'connect', from: ai.idOf(aiBlock.id), exit: 'branch:' + branch.description, to: ai.idOf(dest.id) }]);
  const aiPut = r3.faqOperations.find((o) => o.type === 'put');
  assert.equal(aiPut.intent.actions[0].intents[0].conditionIntentId, '#' + ai.idOf(dest.id));
});

test('start si puo\' solo ricollegare; defaultFallback pure; nessuno puo\' puntare a loro', () => {
  const { bp, intents, idOf } = setup('01-linear.json');
  const view = decompileAgent(intents, {}, REFS);
  const second = bp.blocks[1];
  const res = apply(intents, [{ op: 'connect', from: view.reserved.start, exit: 'next', to: idOf(second.id) }]);
  const put = res.faqOperations.find((o) => o.type === 'put' && o.intent.intent_id === view.reserved.start);
  assert.equal(put.intent.actions[0].intentName, '#' + idOf(second.id));
  expectError(() => apply(intents, [{ op: 'update', id: view.reserved.start, block: { id: view.reserved.start, name: 'x', type: 'replyv2', text: 'y' } }]), /riservato/);
  expectError(() => apply(intents, [{ op: 'remove', id: view.reserved.defaultFallback }]), /riservato/);
  expectError(() => apply(intents, [{ op: 'connect', from: idOf(second.id), exit: 'next', to: view.reserved.start }]), /non si può puntare/);
});

test('i blocchi opachi non si modificano ne\' si rimuovono, ma si collegano', () => {
  const { bp, intents, idOf } = setup('01-linear.json');
  const copy = JSON.parse(JSON.stringify(intents));
  const first = bp.blocks[0];
  const opaqueIntent = byId(copy, idOf(first.id));
  opaqueIntent.actions.push({ _tdActionType: 'reply', text: 'seconda' });
  const other = bp.blocks[1];
  expectError(() => apply(copy, [{ op: 'update', id: idOf(first.id), block: { id: idOf(first.id), name: 'x', type: 'replyv2', text: 'y' } }]), /a mano/);
  expectError(() => apply(copy, [{ op: 'remove', id: idOf(first.id) }]), /a mano/);
  const res = apply(copy, [{ op: 'connect', from: idOf(other.id), exit: 'next', to: idOf(first.id) }]);
  assert.equal(res.summary.connections, 1);
});

test('riferimenti a blocchi inesistenti e uscite che il tipo non ha → CompileError', () => {
  const { bp, intents, idOf } = setup('01-linear.json');
  expectError(() => apply(intents, [{ op: 'connect', from: idOf(bp.blocks[0].id), exit: 'next', to: 'nope' }]), /non è un blocco/);
  expectError(() => apply(intents, [{ op: 'add', after: null, block: { id: 'n1', name: 'x', type: 'replyv2', text: 'y', next: 'nope' } }]), /inesistente/);
  const cond = setup('03-ask-condition.json');
  const c = cond.bp.blocks.find((b) => b.exits && b.exits.true);
  expectError(() => apply(cond.intents, [{ op: 'connect', from: cond.idOf(c.id), exit: 'next', to: cond.idOf(cond.bp.blocks[0].id) }]), /non ha l'uscita/);
});

test('add di una ask crea domanda e capture; update da ask a replyv2 toglie la capture', () => {
  const { bp, intents, idOf } = setup('01-linear.json');
  const after = idOf(bp.blocks[0].id);
  const res = apply(intents, [{ op: 'add', after: null, block: { id: 'q1', name: 'Email', type: 'ask', text: 'La tua email?', saveTo: 'email', next: after } }]);
  const posts = res.faqOperations.filter((o) => o.type === 'post');
  assert.equal(posts.length, 2);
  assert.equal(posts[1].intent.actions[0]._tdActionType, 'capture_user_reply');
  assert.equal(posts[1].intent.attributes.nextBlockAction.intentName, '#' + after);
  assert.equal(posts[0].intent.attributes.nextBlockAction.intentName, '#' + posts[1].intent.intent_id);

  const askFixture = setup('03-ask-condition.json');
  const ask = askFixture.bp.blocks.find((b) => b.type === 'ask');
  const view = decompileAgent(askFixture.intents, {}, REFS);
  const captureId = view.captures[askFixture.idOf(ask.id)];
  const r2 = apply(askFixture.intents, [{ op: 'update', id: askFixture.idOf(ask.id), block: { id: askFixture.idOf(ask.id), name: ask.name, type: 'replyv2', text: 'Solo un messaggio', next: null } }]);
  assert.ok(r2.faqOperations.some((o) => o.type === 'delete' && o.intent.intent_id === captureId));
});
