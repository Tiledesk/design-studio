import { fakeAsync, tick } from '@angular/core/testing';
import { ConnectorStore } from './connector-store.service';
import { normalizeFlow } from './flow-normalizer';

/**
 * Lo store: la lista dei connettori del flusso aperto, i suoi indici, e il riallineamento alle
 * action dopo ogni salvataggio, con la scrittura differita che raccoglie le modifiche vicine.
 */
describe('ConnectorStore', () => {

  const blocco = (id: string, actions: any[] = [], next?: string) => ({
    intent_id: id, intent_display_name: id, actions,
    attributes: next === undefined ? {} : { nextBlockAction: { _tdActionId: 'n_' + id, _tdActionType: 'intent', intentName: next } },
  });
  const flusso = () => [
    blocco('a', [{ _tdActionId: 'x', _tdActionType: 'ai_prompt', trueIntent: '#b', falseIntent: '#c' }], '#b'),
    blocco('b', [], '#c'), blocco('c'),
  ];
  const opts = { uid: () => 'u', now: () => '2026-10-09T00:00:00.000Z' };

  it('carica la lista e la indicizza per blocco di partenza e di arrivo', () => {
    const store = new ConnectorStore();
    store.load(normalizeFlow(flusso(), null, opts).collection);
    expect(store.records.map(r => r.id)).toEqual(['a/n_a/b', 'a/x/true/b', 'a/x/false/c', 'b/n_b/c']);
    expect(store.recordsOut('a').map(r => r.from.slot)).toEqual(['next', 'true', 'false']);
    expect(store.recordsIn('c').map(r => r.id)).toEqual(['a/x/false/c', 'b/n_b/c']);
    expect(store.recordById('b/n_b/c')!.kind).toBe('block');
    expect(store.recordById('nope')).toBeNull();
    store.reset();
    expect(store.records).toEqual([]);
    expect(store.lastRepairReport).toBeNull();
  });

  it('dopo un salvataggio si riallinea alle action e salva la lista una volta sola, con ritardo', fakeAsync(() => {
    const store = new ConnectorStore();
    const saved: any[] = [];
    store.bindPersistence({ saveCollection: async collection => { saved.push(collection); } });
    const intents = flusso();
    store.load(normalizeFlow(intents, null, opts).collection);

    expect(store.syncFromIntents(intents)).toBeFalse();      // niente e' cambiato: niente da salvare
    tick(1000);
    expect(saved.length).toBe(0);

    intents[0].actions[0].falseIntent = '';                  // scollegato da qualunque strada
    intents[1].attributes.nextBlockAction.intentName = '#a'; // e un altro collegamento cambiato
    expect(store.syncFromIntents(intents)).toBeTrue();
    expect(store.records.map(r => r.id)).toEqual(['a/n_a/b', 'a/x/true/b', 'b/n_b/a']);
    expect(store.syncFromIntents(intents)).toBeFalse();      // una seconda chiamata ravvicinata non cambia nulla
    tick(399);
    expect(saved.length).toBe(0);
    tick(1);
    expect(saved.length).toBe(1);
    expect(saved[0].items.map((r: any) => r.id)).toEqual(['a/n_a/b', 'a/x/true/b', 'b/n_b/a']);
  }));

  describe('un connettore nato o morto sul canvas', () => {
    it('scrive il campo della action, e salva il blocco solo per i tipi di cui lo store risponde', () => {
      const store = new ConnectorStore();
      const saved: any[] = [];
      store.bindPersistence({ saveCollection: async () => {}, updateIntent: intent => { saved.push(intent.intent_id); } });
      const intents = flusso();
      // ai_prompt e' dello store: scrive e salva
      expect(store.applyRendererChange({ fromId: 'a/x/false', toId: 'b', save: true }, intents)).toEqual({ written: true, saved: true });
      expect(intents[0].actions[0].falseIntent).toBe('#b');
      expect(saved).toEqual(['a']);
      // senza `save` scrive e basta (il pannello, le cancellazioni di passaggio)
      expect(store.applyRendererChange({ fromId: 'a/x/false', deleted: true, toId: 'b' }, intents)).toEqual({ written: true, saved: false });
      expect(intents[0].actions[0].falseIntent).toBe('');
      // il pallino del blocco
      expect(store.applyRendererChange({ fromId: 'b/n_b', toId: 'a', save: true }, intents)).toEqual({ written: true, saved: true });
      expect(intents[1].attributes.nextBlockAction.intentName).toBe('#a');
      // un'ancora che non esiste
      expect(store.applyRendererChange({ fromId: 'a/zzz', toId: 'b', save: true }, intents)).toEqual({ written: false, saved: false });
    });

    it('un bottone collegato diventa action e scollegato torna di testo, con lo stato che il template legge', () => {
      const store = new ConnectorStore();
      const saved: any[] = [];
      store.bindPersistence({ saveCollection: async () => {}, updateIntent: intent => { saved.push(intent.intent_id); } });
      const button = { uid: 'k1', type: 'text', value: 'Uno', action: '' };
      const intents = [blocco('r', [{ _tdActionId: 'q', _tdActionType: 'reply', attributes: { attachment: { buttons: [button] } } }]), blocco('b')];
      expect(store.applyRendererChange({ fromId: 'r/q/k1', toId: 'b', save: true }, intents).saved).toBeTrue();
      expect(button).toEqual(jasmine.objectContaining({ type: 'action', action: '#b', __idConnector: 'r/q/k1', __isConnected: true, __idConnection: 'r/q/k1/b' }));
      expect(store.applyRendererChange({ fromId: 'r/q/k1', toId: 'b', deleted: true, save: true }, intents).saved).toBeTrue();
      expect(button).toEqual(jasmine.objectContaining({ type: 'text', action: '', __isConnected: false, __idConnection: null }));
      expect(saved).toEqual(['r', 'r']);
    });

    it('per un tipo non ancora dello store scrive il campo ma non salva', () => {
      const store = new ConnectorStore();
      const saved: any[] = [];
      store.bindPersistence({ saveCollection: async () => {}, updateIntent: intent => { saved.push(intent.intent_id); } });
      const intents = [blocco('v', [{ _tdActionId: 'd', _tdActionType: 'dtmf_form', attributes: { commands: [{ settings: { noInputIntent: '' } }] } }]), blocco('b')];
      expect(store.applyRendererChange({ fromId: 'v/d/noInput', toId: 'b', save: true }, intents)).toEqual({ written: true, saved: false });
      expect(intents[0].actions[0].attributes.commands[0].settings.noInputIntent).toBe('#b');
    });
  });

  it('la lista segue subito un connettore nato o morto sul canvas, e la modalita\' dice da dove si disegna', fakeAsync(() => {
    const store = new ConnectorStore();
    const saved: any[] = [];
    store.bindPersistence({ saveCollection: async collection => { saved.push(collection); } });
    const intents = flusso();
    store.load(normalizeFlow(intents, null, opts).collection);
    expect(store.drawsFromCollection).toBeFalse();
    store.mode = 'collection';
    expect(store.drawsFromCollection).toBeTrue();

    store.applyRendererChange({ fromId: 'a/x/false', toId: 'a', save: false }, intents);  // ritargettato da c ad a
    expect(store.recordsOut('a').map(r => r.id)).toEqual(['a/n_a/b', 'a/x/true/b', 'a/x/false/a']);
    expect(store.recordsIn('c').map(r => r.id)).toEqual(['b/n_b/c']);
    store.applyRendererChange({ fromId: 'b/n_b', toId: 'c', deleted: true }, intents);
    expect(store.recordsIn('c')).toEqual([]);
    tick(400);
    expect(saved.length).toBe(1);
    expect(saved[0].items.map((r: any) => r.id)).toEqual(['a/n_a/b', 'a/x/true/b', 'a/x/false/a']);
    // e le action dicono la stessa cosa: un riallineamento non cambia nulla
    expect(store.syncFromIntents(intents)).toBeFalse();
  }));

  it('senza chi salva, il riallineamento aggiorna solo lo stato', fakeAsync(() => {
    const store = new ConnectorStore();
    const intents = flusso();
    store.load(null);
    expect(store.syncFromIntents(intents)).toBeTrue();
    tick(1000);
    expect(store.records.length).toBe(4);
  }));
});
