import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { ConnectorStore } from '../connectors/connector-store.service';
import { ConnectorServiceLegacy } from './connector-legacy.service';
import { ConnectorServiceV3 } from './connector-v3.service';
import { ConnectorService } from './connector.service';

/**
 * La facciata dei connettori: per un agente V2 risponde il servizio preso da master, per un V3
 * il servizio nuovo. Qui si fissa quella scelta, e che cio' che e' nato col V3 non tocchi un V2.
 */
describe('ConnectorService — la facciata V2/V3', () => {

  beforeEach(() => {
    LoggerInstance.setInstance({ log() {}, error() {}, warn() {}, info() {}, debug() {}, setLoggerConfig() {} } as any);
  });

  const build = (isV3: boolean | null) => {
    const legacy = new ConnectorServiceLegacy();
    const store = new ConnectorStore();
    const v3 = new ConnectorServiceV3(store);
    const dashboard = isV3 === null ? undefined : ({ isV3 } as any);
    return { facade: new ConnectorService(legacy, v3, dashboard, store), legacy, v3, store };
  };

  const flusso = () => [
    { intent_id: 'a', intent_display_name: 'a', actions: [{ _tdActionId: 'x', _tdActionType: 'ai_prompt', trueIntent: '', falseIntent: '' }], attributes: {} },
    { intent_id: 'b', intent_display_name: 'b', actions: [], attributes: {} },
  ];

  it('per un agente V2 risponde il servizio di master, e il V3 non viene mai chiamato', async () => {
    const { facade, legacy, v3 } = build(false);
    expect(facade.isV3).toBeFalse();
    expect(facade.impl).toBe(legacy);
    spyOn(v3, 'blockRendered');
    spyOn(v3, 'missingConnectorIds');
    spyOn(v3, 'refreshConnectorsAroundIntent');
    spyOn(v3, 'ensureConnectorsDrawn');
    spyOn(legacy, 'createConnectorsOfIntent').and.returnValue(Promise.resolve());
    spyOn(legacy, 'updateConnector').and.returnValue(Promise.resolve());
    facade.blockRendered('a');
    const intents = flusso();
    facade.syncIntents(intents);
    expect(legacy.listOfIntents).toBe(intents);
    // nessun collegamento: niente da aspettarsi, niente da disegnare
    expect(facade.expectedConnectorIds(intents[0])).toEqual([]);
    expect(facade.missingConnectorIds(intents)).toEqual([]);
    expect(await facade.ensureConnectorsDrawn(intents)).toEqual({ missing: [], redrawnBlocks: 0, stillMissing: [] });
    expect(legacy.createConnectorsOfIntent).not.toHaveBeenCalled();
    await facade.refreshConnectorsAroundIntent('b', intents);
    expect(v3.blockRendered).not.toHaveBeenCalled();
    expect(v3.missingConnectorIds).not.toHaveBeenCalled();
    expect(v3.refreshConnectorsAroundIntent).not.toHaveBeenCalled();
    expect(v3.ensureConnectorsDrawn).not.toHaveBeenCalled();
  });

  it('V2: i connettori mancanti e il ridisegno intorno a un blocco nuovo passano dal legacy, come prima del refactor', async () => {
    const { facade, legacy } = build(false);
    const drawn: string[] = [];
    spyOn(legacy, 'createConnectorsOfIntent').and.callFake(async (intent: any) => { drawn.push(intent.intent_id); });
    spyOn(legacy, 'updateConnector').and.returnValue(Promise.resolve());
    const intents = flusso();
    intents[0].actions[0].trueIntent = '#b';
    intents[1].attributes = { nextBlockAction: { _tdActionId: 'n_b', _tdActionType: 'intent', intentName: '#a' } };
    facade.syncIntents(intents);
    expect(facade.expectedConnectorIds(intents[0])).toEqual(['a/x/true/b']);
    expect(facade.expectedConnectorIds(intents[1])).toEqual(['b/n_b/a']);
    expect(facade.missingConnectorIds(intents)).toEqual(['a/x/true/b', 'b/n_b/a']);
    // il disegno e' finto: dopo i tentativi i connettori mancano ancora, e si dice
    const result = await facade.ensureConnectorsDrawn(intents);
    expect(result.missing).toEqual(['a/x/true/b', 'b/n_b/a']);
    expect(result.stillMissing).toEqual(['a/x/true/b', 'b/n_b/a']);
    expect(result.redrawnBlocks).toBe(6);                         // 2 blocchi x 3 tentativi
    drawn.length = 0;
    // intorno a `b`: il suo blocco, poi `a` che lo punta, poi l'aggiornamento di `b`
    await facade.refreshConnectorsAroundIntent('b', intents);
    expect(drawn).toEqual(['b', 'a']);
    expect(legacy.updateConnector).toHaveBeenCalledWith('b');
  });

  it('per un agente V3 risponde il servizio nuovo', () => {
    const { facade, v3, legacy } = build(true);
    expect(facade.isV3).toBeTrue();
    expect(facade.impl).toBe(v3);
    spyOn(v3, 'setScale');
    spyOn(v3, 'syncIntents');
    spyOn(v3, 'blockRendered');
    facade.setScale(2);
    facade.syncIntents([]);
    facade.blockRendered('a');
    expect(v3.setScale).toHaveBeenCalledWith(2);
    expect(v3.syncIntents).toHaveBeenCalledWith([]);
    expect(v3.blockRendered).toHaveBeenCalledWith('a');
    expect(legacy.listOfIntents).toBeUndefined();
  });

  it('V3: un connettore verso un blocco che entra nel DOM un attimo dopo aspetta e risponde true (il canvas salva il blocco nuovo solo allora)', async () => {
    const { facade, v3 } = build(true);
    const draw = jasmine.createSpy('draw');
    (v3 as any).renderer = { draw, update() {} };
    const from = document.createElement('div'); from.id = 'a/x'; document.body.appendChild(from);
    const to = document.createElement('div'); to.id = 'b';
    try {
      const drawn = facade.createConnectorFromId('a/x', 'b', true, null);
      setTimeout(() => document.body.appendChild(to), 50);
      expect(await drawn).toBeTrue();
      expect(draw).toHaveBeenCalledWith('a/x', 'b', from, to, null, true);
    } finally {
      from.remove(); to.remove();
    }
  });

  it('V3: un connettore verso un blocco che non compare torna false e resta in attesa del blocco', async () => {
    const { facade, v3 } = build(true);
    const draw = jasmine.createSpy('draw');
    (v3 as any).renderer = { draw, update() {} };
    const from = document.createElement('div'); from.id = 'a/x'; document.body.appendChild(from);
    const to = document.createElement('div'); to.id = 'b';
    try {
      expect(await facade.createConnectorFromId('a/x', 'b', false, null)).toBeFalse();
      expect(draw).not.toHaveBeenCalled();
      document.body.appendChild(to);
      facade.blockRendered('b');
      await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
      expect(draw).toHaveBeenCalledWith('a/x', 'b', from, to, null, false);
    } finally {
      from.remove(); to.remove();
    }
  });

  it('senza un DashboardService (le spec che istanziano a mano) risponde il V3', () => {
    const built = build(null);
    expect(built.facade.impl).toBe(built.v3);
  });

  it('V2: un connettore nato o morto sul canvas scrive il campo della action attraverso lo store, senza lista', () => {
    const { facade, legacy, store } = build(false);
    spyOn(legacy, 'initializeConnectors');
    facade.initializeConnectors();
    expect(legacy.initializeConnectors).toHaveBeenCalled();
    const intents = flusso();
    facade.syncIntents(intents);
    document.dispatchEvent(new CustomEvent('connector-created', { detail: { connector: { id: 'a/x/true/b', fromId: 'a/x/true', toId: 'b', save: false } } }));
    expect(intents[0].actions[0].trueIntent).toBe('#b');
    document.dispatchEvent(new CustomEvent('connector-deleted', { detail: { connector: { id: 'a/x/true/b', fromId: 'a/x/true', toId: 'b' } } }));
    expect(intents[0].actions[0].trueIntent).toBe('');
    expect(store.records).toEqual([]);
    expect(store.collection).toBeNull();
  });

  // Dalla pre: la facciata risponde anche prima che il canvas abbia inizializzato il disegno.
  it('getConnectorsInByIntent returns empty array when not initialized', () => {
    const result = build(false).facade.getConnectorsInByIntent('any-intent-id');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it('connectorsInChanged$ is defined and subscribable', () => {
    const { facade } = build(false);
    expect(facade.connectorsInChanged$).toBeDefined();
    expect(typeof facade.connectorsInChanged$.subscribe).toBe('function');
  });

  it('clearRetryQueue does not throw', () => {
    expect(() => build(false).facade.clearRetryQueue()).not.toThrow();
    expect(() => build(true).facade.clearRetryQueue()).not.toThrow();
  });
});
