import { clearAllTargets, isCollection, normalizeFlow, preparedPastedIntent } from './flow-normalizer';
import { CONNECTORS_COLLECTION_VERSION } from './connector-config';

/**
 * Il normalizzatore: ripara il flusso all'apertura, costruisce la lista dei connettori e la
 * riconcilia con quella salvata. Qui si fissano le regole che contano quando il risultato
 * viene salvato: cosa si tocca, cosa si lascia, e che un secondo passaggio non cambi nulla.
 */
describe('flow-normalizer', () => {

  const uid = () => { let n = 0; return () => 'u' + (++n); };
  const now = () => '2026-10-09T00:00:00.000Z';
  const opts = (extra: any = {}) => ({ uid: uid(), now, faqKbId: 'bot', ...extra });
  const blocco = (id: string, actions: any[] = [], next?: string, name?: string, attrs: any = {}) => ({
    intent_id: id, intent_display_name: name || id, actions,
    attributes: { ...(next === undefined ? {} : { nextBlockAction: { _tdActionId: 'n_' + id, _tdActionType: 'intent', intentName: next } }), ...attrs },
  });
  const clone = (x: any) => JSON.parse(JSON.stringify(x));

  it('e\' idempotente: un secondo passaggio non ripara nulla e lascia la lista com\'e\'', () => {
    const flusso = [
      blocco('start', [{ _tdActionType: 'intent', intentName: 'a' }], undefined, 'start'),
      blocco('a', [{ _tdActionId: 'x', _tdActionType: 'ai_prompt', trueIntent: '#b', falseIntent: '#nope' }], '#b'),
      blocco('b', [null, { _tdActionId: 'y', _tdActionType: 'reply' }], ''),
    ];
    const prima = normalizeFlow(flusso, null, opts());
    expect(prima.changedIntentIds.sort()).toEqual(['a', 'b', 'start']);
    expect(prima.collectionChanged).toBeTrue();
    const seconda = normalizeFlow(prima.intents, prima.collection, opts());
    expect(seconda.changedIntentIds).toEqual([]);
    expect(seconda.report.counts).toEqual({});
    expect(seconda.collectionChanged).toBeFalse();
    expect(seconda.collection.items).toEqual(prima.collection.items);
    expect(seconda.collection.updatedAt).toBe(prima.collection.updatedAt);
  });

  it('aggiunge il # a un id nudo di ogni uscita, pallino e bottoni compresi, mai a un nome di blocco', () => {
    const flusso = [
      blocco('p1', [{ _tdActionId: 'a1', _tdActionType: 'ai_prompt', trueIntent: 'r1', falseIntent: 'f1' }], 'r1', 'Process'),
      blocco('r1', [{ _tdActionId: 'a2', _tdActionType: 'intent', intentName: 'f1' }], undefined, 'Add Result'),
      blocco('f1', [{ _tdActionId: 'a3', _tdActionType: 'reply', attributes: { attachment: { buttons: [{ uid: 'b', type: 'action', action: 'r1{"k":1}' }] } } }], undefined, 'Add Failure'),
      blocco('c1', [{ _tdActionId: 'a4', _tdActionType: 'jsoncondition', trueIntent: 'Add Result', falseIntent: '#f1' }], undefined, 'Legacy'),
    ];
    const r = normalizeFlow(flusso, null, opts());
    expect(flusso[0].actions[0].trueIntent).toBe('#r1');
    expect(flusso[0].actions[0].falseIntent).toBe('#f1');
    expect(flusso[0].attributes.nextBlockAction.intentName).toBe('#r1');
    expect(flusso[1].actions[0].intentName).toBe('#f1');
    expect(flusso[2].actions[0].attributes.attachment.buttons[0].action).toBe('#r1{"k":1}');
    expect(flusso[3].actions[0].trueIntent).toBe('Add Result');
    expect(r.report.counts['hash-added']).toBe(5);
    expect(r.report.unresolved.map(u => [u.fromId, u.reason])).toEqual([['c1/a4/true', 'bare-name']]);
    expect(r.collection.items.map(i => i.id)).toContain('f1/a3/b/r1');
  });

  it('svuota i riferimenti con # verso blocchi che non esistono, e lascia quelli senza # segnalandoli', () => {
    const flusso = [
      blocco('a', [{ _tdActionId: 'x', _tdActionType: 'ai_prompt', trueIntent: '#gone', falseIntent: 'boh' }], '#gone'),
    ];
    const r = normalizeFlow(flusso, null, opts());
    expect(flusso[0].actions[0].trueIntent).toBe('');
    expect(flusso[0].actions[0].falseIntent).toBe('boh');
    expect(flusso[0].attributes.nextBlockAction.intentName).toBe('');
    expect(r.report.counts['dangling-cleared']).toBe(2);
    expect(r.report.unresolved.map(u => u.reason)).toEqual(['bare-unknown']);
    expect(r.report.items.find(i => i.kind === 'dangling-cleared' && i.path === 'actions[0].true.trueIntent')!.before).toBe('#gone');
    expect(r.collection.items).toEqual([]);
  });

  it('da\' gli id tecnici mancanti e toglie le action nulle', () => {
    const flusso = [blocco('a', [null, { _tdActionType: 'jsonconditionmulti', cases: [{ intent: '' }] }])];
    const r = normalizeFlow(flusso, null, opts());
    expect(flusso[0].actions.length).toBe(1);
    expect(flusso[0].actions[0]._tdActionId).toBe('u1');
    expect(flusso[0].actions[0].cases[0]._tdCaseId).toBe('u2');
    expect(r.report.counts).toEqual({ 'null-action-removed': 1, 'action-id': 1, 'case-id': 1 });
  });

  it('svuota il pallino di un blocco Return to parent agent', () => {
    const flusso = [blocco('r', [{ _tdActionId: 'x', _tdActionType: 'returnstack' }], '#r')];
    const r = normalizeFlow(flusso, null, opts());
    expect(flusso[0].attributes.nextBlockAction.intentName).toBe('');
    expect(r.report.counts['next-block-cleared-return-stack']).toBe(1);
  });

  it('i default non contano: attributi, connectors vuoto, readonly sui riservati', () => {
    const flusso: any[] = [{ intent_id: 's', intent_display_name: 'start', actions: [] }, { intent_id: 'd', intent_display_name: 'defaultFallback', actions: [] }];
    const r = normalizeFlow(flusso, null, opts());
    expect(flusso[0].attributes.connectors).toEqual({});
    expect(flusso[0].attributes.readonly).toBeTrue();
    expect(flusso[1].attributes.readonly).toBeTrue();
    expect(r.changedIntentIds).toEqual([]);
  });

  describe('gli attributi visivi per blocco', () => {
    it('vengono ripuliti quando orfani, completati dell\'id, e migrati nei props della lista', () => {
      const flusso = [
        blocco('a', [{ _tdActionId: 'x', _tdActionType: 'ai_prompt', trueIntent: '#b', falseIntent: '' }], '#b', 'a', { connectors: {
          'a/x/true': { label: 'ok', display: false },
          'a/x/false': { id: 'a/x/false/b', label: 'orfano' },
          'a/vecchia/true': { label: 'orfano' },
          'a/n_a': { id: 'a/n_a/zzz', display: false },
        } }),
        blocco('b'),
      ];
      const r = normalizeFlow(flusso, null, opts());
      expect(Object.keys(flusso[0].attributes.connectors).sort()).toEqual(['a/n_a', 'a/x/true']);
      expect(flusso[0].attributes.connectors['a/x/true'].id).toBe('a/x/true/b');
      expect(flusso[0].attributes.connectors['a/n_a'].id).toBe('a/n_a/b');
      expect(r.report.counts['stale-connector-attr-removed']).toBe(2);
      expect(r.report.counts['connector-attr-id-filled']).toBe(2);
      const byId = new Map(r.collection.items.map(i => [i.id, i]));
      expect(byId.get('a/x/true/b')!.props).toEqual({ label: 'ok', display: false });
      expect(byId.get('a/n_a/b')!.props).toEqual({ display: false });
    });
  });

  describe('la lista', () => {
    const flusso = () => [
      blocco('a', [{ _tdActionId: 'x', _tdActionType: 'ai_prompt', trueIntent: '#b', falseIntent: '#c' }], '#b'),
      blocco('b', [], '#c'), blocco('c'),
    ];

    it('nasce dalle action quando non c\'e\', con versione e data', () => {
      const r = normalizeFlow(flusso(), null, opts());
      expect(isCollection(r.collection)).toBeTrue();
      expect(r.collection.version).toBe(CONNECTORS_COLLECTION_VERSION);
      expect(r.collection.updatedAt).toBe(now());
      expect(r.collection.items.map(i => i.id)).toEqual(['a/n_a/b', 'a/x/true/b', 'a/x/false/c', 'b/n_b/c']);
      expect(r.collection.items[1]).toEqual({ id: 'a/x/true/b', from: { intentId: 'a', actionId: 'x', slot: 'true' }, to: { intentId: 'b' }, kind: 'action' });
      expect(r.report.collection).toEqual({ existed: false, changed: true, records: 4, missing: [], extra: [] });
    });

    it('quando non coincide con le action, vincono le action e la differenza va nel rapporto', () => {
      const prima = normalizeFlow(flusso(), null, opts());
      const salvata = clone(prima.collection);
      salvata.items = salvata.items.filter((i: any) => i.id !== 'a/x/false/c');            // un record in meno
      salvata.items.push({ id: 'c/n_c/a', from: { intentId: 'c', actionId: 'n_c', slot: 'next' }, to: { intentId: 'a' }, kind: 'block' }); // uno che le action non hanno
      const r = normalizeFlow(flusso(), salvata, opts());
      expect(r.collectionChanged).toBeTrue();
      expect(r.collection.items.map(i => i.id)).toEqual(prima.collection.items.map(i => i.id));
      expect(r.report.collection).toEqual({ existed: true, changed: true, records: 4, missing: ['c/n_c/a'], extra: ['a/x/false/c'] });
      expect(r.changedIntentIds).toEqual([]);
    });

    it('conserva l\'aspetto per id dal record precedente, e lo preferisce agli attributi del blocco', () => {
      const prima = normalizeFlow(flusso(), null, opts());
      const salvata = clone(prima.collection);
      salvata.items[0].props = { label: 'dalla lista' };
      const intents = flusso();
      intents[0].attributes.connectors = { 'a/n_a': { id: 'a/n_a/b', label: 'dal blocco' } };
      const r = normalizeFlow(intents, salvata, opts());
      expect(r.collection.items[0].props).toEqual({ label: 'dalla lista' });
      expect(r.collectionChanged).toBeFalse();
    });

    it('una lista di un\'altra versione o malformata vale come assente', () => {
      const r = normalizeFlow(flusso(), { version: 99, updatedAt: '', items: [] } as any, opts());
      expect(r.report.collection.existed).toBeFalse();
      expect(normalizeFlow(flusso(), { foo: 1 } as any, opts()).report.collection.existed).toBeFalse();
    });
  });

  describe('incolla', () => {
    it('cambia l\'id del blocco, svuota solo le destinazioni e azzera gli attributi visivi', () => {
      const intent = blocco('old', [
        { _tdActionId: 'x', _tdActionType: 'reply', text: '#promo resta', attributes: { attachment: { buttons: [{ uid: 'b', type: 'action', action: '#b{"k":1}' }] } } },
        { _tdActionId: 'y', _tdActionType: 'ai_prompt', trueIntent: '#old', falseIntent: '#c', prompt: '#non-toccare' },
      ], '#c', 'old', { connectors: { 'old/y/true': { id: 'old/y/true/old' } } });
      preparedPastedIntent(intent, 'new');
      expect(intent.intent_id).toBe('new');
      expect(intent.actions[0].text).toBe('#promo resta');
      expect(intent.actions[0].attributes.attachment.buttons[0].action).toBe('');
      expect(intent.actions[1].trueIntent).toBe('');
      expect(intent.actions[1].falseIntent).toBe('');
      expect(intent.actions[1].prompt).toBe('#non-toccare');
      expect(intent.attributes.nextBlockAction.intentName).toBe('');
      expect(intent.attributes.connectors).toEqual({});
      expect(clearAllTargets(intent)).toBe(0);
    });
  });
});
