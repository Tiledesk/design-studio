import { sortSubagentsByName } from './cds-panel-subagents.component';

/**
 * L'ordinamento e' l'unica logica pura del pannello, ed e' esportato apposta:
 * si testa senza montare il componente ne' toccare TestBed.
 */
describe('sortSubagentsByName', () => {

  const names = (items: Array<{ _id: string, name: string }>) => items.map(i => i.name);
  const build = (...values: string[]) => values.map((name, i) => ({ _id: 'id' + i, name }));

  it('ordina i nomi in ordine alfabetico', () => {
    const sorted = sortSubagentsByName(build('Vendite', 'Assistenza', 'Ordini'));
    expect(names(sorted)).toEqual(['Assistenza', 'Ordini', 'Vendite']);
  });

  it('ignora maiuscole e minuscole', () => {
    const sorted = sortSubagentsByName(build('ordini', 'Assistenza', 'ORDINI', 'assistenza'));
    expect(names(sorted).map(n => n.toLowerCase()))
      .toEqual(['assistenza', 'assistenza', 'ordini', 'ordini']);
  });

  it('ignora gli accenti', () => {
    const sorted = sortSubagentsByName(build('Zeta', 'Èlite', 'Alfa'));
    expect(names(sorted)).toEqual(['Alfa', 'Èlite', 'Zeta']);
  });

  it('confronta i numeri come numeri, non come stringhe', () => {
    const sorted = sortSubagentsByName(build('Agente 10', 'Agente 2', 'Agente 1'));
    expect(names(sorted)).toEqual(['Agente 1', 'Agente 2', 'Agente 10']);
  });

  it('non modifica l\'array originale', () => {
    const original = build('B', 'A');
    sortSubagentsByName(original);
    expect(names(original)).toEqual(['B', 'A']);
  });

  it('regge lista vuota, nomi mancanti e nomi uguali', () => {
    expect(sortSubagentsByName([])).toEqual([]);
    const withEmpty = sortSubagentsByName([
      { _id: '1', name: 'Beta' },
      { _id: '2', name: undefined as any },
      { _id: '3', name: 'Beta' }
    ]);
    expect(withEmpty.length).toBe(3);
    expect(withEmpty[0].name).toBeFalsy();
  });
});
