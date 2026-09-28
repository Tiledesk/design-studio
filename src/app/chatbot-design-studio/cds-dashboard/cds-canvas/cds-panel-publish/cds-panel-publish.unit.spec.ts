import { buildPublishTargets, resolveTargetsToPublish } from './cds-panel-publish.component';
import { buildPublishMultiBody } from 'src/app/services/faq-kb.service';

/**
 * Cosa viene proposto per la pubblicazione. La preselezione segue `modified`, che e' il
 * flag del server: lo accende ogni modifica di un intent e lo spegne la pubblicazione.
 */
describe('buildPublishTargets', () => {

  const parent = { _id: 'p1', name: 'Assistenza', modified: true };

  it('puts the parent first and ticks whoever has unpublished changes', () => {
    const targets = buildPublishTargets(parent, [
      { _id: 's1', name: 'Ordini', modified: false },
      { _id: 's2', name: 'Resi', modified: true },
    ]);

    expect(targets.map(t => t._id)).toEqual(['p1', 's1', 's2']);
    expect(targets[0].isParent).toBeTrue();
    expect(targets.filter(t => t.selected).map(t => t._id)).toEqual(['p1', 's2']);
  });

  it('leaves everything unticked when nothing has changed', () => {
    const targets = buildPublishTargets(
      { _id: 'p1', name: 'Assistenza', modified: false },
      [{ _id: 's1', name: 'Ordini', modified: false }]
    );

    expect(targets.some(t => t.selected)).toBeFalse();
  });

  it('treats a missing modified as "no changes" rather than as a change', () => {
    const targets = buildPublishTargets({ _id: 'p1', name: 'Assistenza' }, [{ _id: 's1', name: 'Ordini' }]);

    expect(targets.every(t => t.modified === false)).toBeTrue();
    expect(targets.some(t => t.selected)).toBeFalse();
  });

  it('sorts the subagents by name, numbers as numbers', () => {
    const targets = buildPublishTargets(parent, [
      { _id: 's10', name: 'Agente 10' },
      { _id: 's2', name: 'agente 2' },
    ]);

    expect(targets.map(t => t.name)).toEqual(['Assistenza', 'agente 2', 'Agente 10']);
  });

  it('drops entries with no id, which cannot be published', () => {
    const targets = buildPublishTargets(parent, [{ name: 'senza id' }, { _id: 's1', name: 'Ordini' }]);

    expect(targets.map(t => t._id)).toEqual(['p1', 's1']);
  });

  it('gives back the parent alone when there are no subagents, so the panel can hide the list', () => {
    const targets = buildPublishTargets({ _id: 'p1', name: 'Assistenza', modified: false }, []);

    expect(targets.length).toBe(1);
    expect(targets.filter(t => !t.isParent).length).toBe(0);
  });

  it('still lists the subagents when the parent could not be loaded', () => {
    const targets = buildPublishTargets(null, [{ _id: 's1', name: 'Ordini', modified: true }]);

    expect(targets.map(t => t._id)).toEqual(['s1']);
    expect(targets[0].isParent).toBeFalse();
  });
});

/**
 * Senza subagent l'elenco e' nascosto, quindi non c'e' selezione a cui obbedire: si
 * pubblica l'agent aperto, com'era prima dei subagent.
 */
describe('resolveTargetsToPublish', () => {

  const parent = { _id: 'p1', name: 'Assistenza', isParent: true, modified: false, selected: false };
  const child = { _id: 's1', name: 'Ordini', isParent: false, modified: false, selected: false };

  it('publishes the lone agent even when it has no unpublished changes', () => {
    expect(resolveTargetsToPublish([{ ...parent }]).map(t => t._id)).toEqual(['p1']);
  });

  it('obeys the selection as soon as there is a subagent to choose from', () => {
    const targets = [{ ...parent, selected: true }, { ...child, selected: false }];

    expect(resolveTargetsToPublish(targets).map(t => t._id)).toEqual(['p1']);
  });

  it('publishes nothing when there are subagents and nothing is ticked', () => {
    expect(resolveTargetsToPublish([{ ...parent }, { ...child }])).toEqual([]);
  });
});

/**
 * Il servizio pretende oggetti con `id`: una lista di stringhe torna 400, e tornerebbe
 * indietro solo a pubblicazione gia' avviata.
 */
describe('buildPublishMultiBody', () => {

  it('wraps every id in an object', () => {
    expect(buildPublishMultiBody(['a', 'b'], null).chatbots).toEqual([{ id: 'a' }, { id: 'b' }]);
  });

  it('carries the release note when there is one', () => {
    expect(buildPublishMultiBody(['a'], 'prima versione').release_note).toBe('prima versione');
  });

  it('leaves the release note out when it is missing or blank, so the service writes its own', () => {
    expect('release_note' in buildPublishMultiBody(['a'], null)).toBeFalse();
    expect('release_note' in buildPublishMultiBody(['a'], '   ')).toBeFalse();
  });
});
