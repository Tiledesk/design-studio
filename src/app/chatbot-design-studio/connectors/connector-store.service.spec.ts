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
    store.bindPersistence(async collection => { saved.push(collection); });
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

  it('senza chi salva, il riallineamento aggiorna solo lo stato', fakeAsync(() => {
    const store = new ConnectorStore();
    const intents = flusso();
    store.load(null);
    expect(store.syncFromIntents(intents)).toBeTrue();
    tick(1000);
    expect(store.records.length).toBe(4);
  }));
});
