import { IntentService } from '../services/intent.service';
import { ConnectorService } from '../services/connector.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

/** Per-flow state that used to be cleared by a page reload.
 *
 *  Until the agent gained `open_flow`, the only way to change flow was a full
 *  reload, which threw the whole Angular app away and with it every
 *  `providedIn: 'root'` singleton. These maps could therefore accumulate
 *  without anyone noticing. Now the canvas is rebuilt in place, so a map that
 *  keeps the previous flow's blocks makes the canvas wait forever for a block
 *  that will never render -- and the connectors, drawn only once every block
 *  has reported in, are never drawn at all.
 *
 *  The services are built directly rather than through TestBed: neither map
 *  touches a dependency, and stubbing eight injected services to assert on a
 *  plain object would test the stubs. */
describe('per-flow state does not survive a flow switch', () => {

  // Both services log through the app-wide singleton, which only exists once
  // APP_INITIALIZER has run. Without it every call here dies on `logger.log`
  // before reaching the behaviour under test.
  beforeEach(() => {
    LoggerInstance.setInstance({
      log() {}, error() {}, warn() {}, info() {}, debug() {}, setLoggerConfig() {}
    } as any);
  });

  const intentService = () => new IntentService(
    {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);

  it('setMapOfIntents describes the flow now open, not the one before it', () => {
    const service = intentService();

    service.listOfIntents = [{ intent_id: 'a1' }, { intent_id: 'a2' }] as any;
    expect(Object.keys(service.setMapOfIntents())).toEqual(['a1', 'a2']);

    // The canvas moved to another flow: three blocks, none of them the first
    // flow's. A map still holding a1/a2 can never be "all shown".
    service.listOfIntents = [{ intent_id: 'b1' }, { intent_id: 'b2' }, { intent_id: 'b3' }] as any;
    expect(Object.keys(service.setMapOfIntents())).toEqual(['b1', 'b2', 'b3']);
  });

  it('every entry of a rebuilt map starts unshown', () => {
    const service = intentService();

    service.listOfIntents = [{ intent_id: 'a1' }] as any;
    const first = service.setMapOfIntents();
    first['a1'].shown = 'true';

    service.listOfIntents = [{ intent_id: 'a1' }] as any;
    // The same block, in a freshly opened flow, has not rendered yet: carrying
    // "true" over would let the canvas declare itself loaded before the block
    // it is waiting for exists.
    expect(service.setMapOfIntents()['a1'].shown).toBe(false);
  });

  it('createMapOfConnectors describes the flow now open', async () => {
    const service = new ConnectorService();

    await service.createMapOfConnectors([{ intent_id: 'a1', actions: [] }]);
    const before = Object.keys(service.mapOfConnectors).length;

    await service.createMapOfConnectors([{ intent_id: 'b1', actions: [] }]);
    expect(Object.keys(service.mapOfConnectors).length).toBeLessThanOrEqual(before);
    expect(service.listOfConnectors).toEqual({});
  });
});
