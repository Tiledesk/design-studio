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

  it('per un agente V2 risponde il servizio di master, e cio\' che e\' nato col V3 non fa nulla', async () => {
    const { facade, legacy, v3 } = build(false);
    expect(facade.isV3).toBeFalse();
    expect(facade.impl).toBe(legacy);
    spyOn(v3, 'blockRendered');
    spyOn(v3, 'missingConnectorIds');
    spyOn(v3, 'refreshConnectorsAroundIntent');
    facade.blockRendered('a');
    await facade.refreshConnectorsAroundIntent('a', []);
    const intents = flusso();
    facade.syncIntents(intents);
    expect(legacy.listOfIntents).toBe(intents);
    expect(facade.expectedConnectorIds(intents[0])).toEqual([]);
    expect(facade.missingConnectorIds(intents)).toEqual([]);
    expect(await facade.ensureConnectorsDrawn(intents)).toEqual({ missing: [], redrawnBlocks: 0, stillMissing: [] });
    expect(v3.blockRendered).not.toHaveBeenCalled();
    expect(v3.missingConnectorIds).not.toHaveBeenCalled();
    expect(v3.refreshConnectorsAroundIntent).not.toHaveBeenCalled();
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
});
