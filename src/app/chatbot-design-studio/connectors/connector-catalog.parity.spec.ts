import { ConnectorService } from '../services/connector.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { TYPE_ACTION } from '../utils-actions';
import { isReturnStackIntent } from '../utils-actions';
import { edgesOfFlow, ensureTechnicalIds, FlowEdges } from './connector-catalog';

declare const require: any;

/**
 * La parita' tra il catalogo nuovo e il codice attuale.
 *
 * Il criterio di uscita della fase 1: su ogni fixture, i connettori che il catalogo ricava dalle
 * action devono essere ESATTAMENTE quelli che `ConnectorService.createConnectorsOfIntent` disegna
 * oggi. Finche' questa spec non passa al 100%, il disegno non si tocca.
 *
 * Il confronto con la previsione del canvas (`createMapOfConnectors`) e' deliberatamente piu'
 * lasco: la previsione ha difetti noti, elencati in `KNOWN_PREDICTION_DEFECTS`, e ogni differenza
 * deve rientrare in uno di quelli. Cosi' la spec dimostra anche che il catalogo li chiude.
 *
 * Le fixture `synthetic-*` sono costruite a mano: vanno sostituite da flussi reali esportati
 * (vedi fixtures/README.md), e la spec li raccoglie da sola.
 */
const FIXTURES: Array<{ name: string; data: any }> = [
  { name: 'synthetic-legacy-reply', data: require('./fixtures/synthetic-legacy-reply.json') },
  { name: 'synthetic-bare-ids', data: require('./fixtures/synthetic-bare-ids.json') },
  { name: 'synthetic-v3-flow', data: require('./fixtures/synthetic-v3-flow.json') },
  { name: 'synthetic-voice', data: require('./fixtures/synthetic-voice.json') },
  { name: 'synthetic-dangling', data: require('./fixtures/synthetic-dangling.json') },
];

function intentsOf(data: any): any[] {
  if (Array.isArray(data)) { return data; }
  return data?.faqs || data?.intents || [];
}

const clone = (x: any) => JSON.parse(JSON.stringify(x));

/** Una base deterministica: id tecnici assegnati con un contatore, cosi' legacy e catalogo vedono gli stessi uid. */
function baseOf(fixture: any): any[] {
  const intents = clone(intentsOf(fixture));
  let n = 0;
  ensureTechnicalIds(intents, () => 'fx' + (++n));
  return intents;
}

function legacyService(intents: any[]): ConnectorService {
  const service = new ConnectorService();
  service.syncIntents(intents);
  return service;
}

/** Gli id che il codice attuale disegnerebbe, intercettando il passo che tocca il DOM. */
async function legacyDrawnIds(intents: any[]): Promise<string[]> {
  const service = legacyService(intents);
  const ids: string[] = [];
  spyOn<any>(service, 'createConnector').and.callFake((_intent: any, from: string, to: string) => {
    if (from && to) { ids.push(from + '/' + to); }
  });
  for (const intent of intents) { await service.createConnectorsOfIntent(intent); }
  return ids;
}

/** Gli id che il canvas si aspetta prima di mostrare il flusso (senza le voci di errore). */
async function legacyPredictedIds(intents: any[]): Promise<string[]> {
  const service = legacyService(intents);
  const map = await service.createMapOfConnectors(clone(intents));
  return Object.keys(map).filter(id => !id.startsWith('ERROR_') && !id.startsWith('DUPLICATE_'));
}

/**
 * Le differenze tra la previsione del canvas e il disegno che gia' esistono oggi. Ogni voce
 * spiega una differenza; una differenza che nessuna voce spiega fa fallire la spec.
 */
const KNOWN_PREDICTION_DEFECTS = {
  /** La capture disegna `i/a/to`, la previsione si aspetta `i/a/goto/to`. */
  captureGoto: (id: string, edges: FlowEdges, predicted: Set<string>) => {
    const slot = edges.slots.get(id);
    const action = slot?.holder;
    return !!slot && action?._tdActionType === TYPE_ACTION.CAPTURE_USER_REPLY && predicted.has(slot.fromId + '/goto/' + slot.toId);
  },
  /** Un bottone con la coda `{...}`: la previsione tiene la coda nell'id del blocco e lo scarta come errore. */
  buttonWithAttrs: (id: string, edges: FlowEdges) => !!edges.slots.get(id)?.attrs,
  /** Un id nudo (senza `#`) si disegna ma non viene previsto. */
  bareId: (id: string, edges: FlowEdges) => edges.slots.get(id)?.hasHash === false,
  /** La previsione non salta il pallino dei blocchi Return to parent agent; il disegno si'. */
  returnStackDot: (id: string, intents: any[]) => {
    const intent = intents.find(i => id.startsWith(i.intent_id + '/' + i.attributes?.nextBlockAction?._tdActionId + '/'));
    return !!intent && isReturnStackIntent(intent);
  },
  /** La previsione del `goto` della capture, che il disegno non produce. */
  captureGotoPredicted: (id: string, edges: FlowEdges) => {
    const m = id.match(/^(.*)\/goto\/([^/]+)$/);
    return !!m && edges.byId.has(m[1] + '/' + m[2]) && edges.slots.get(m[1] + '/' + m[2])?.holder?._tdActionType === TYPE_ACTION.CAPTURE_USER_REPLY;
  },
};

describe('connector-catalog — parita\' col codice attuale', () => {

  beforeEach(() => {
    LoggerInstance.setInstance({ log() {}, error() {}, warn() {}, info() {}, debug() {}, setLoggerConfig() {} } as any);
  });

  for (const fixture of FIXTURES) {
    describe(fixture.name, () => {

      it('produce gli stessi connettori che il codice attuale disegna', async () => {
        const base = baseOf(fixture.data);
        const legacy = (await legacyDrawnIds(clone(base))).sort();
        const nuovo = edgesOfFlow(base).records.map(r => r.id).sort();
        expect(nuovo).toEqual(legacy);
        expect(nuovo.length).withContext('la fixture deve avere connettori').toBeGreaterThan(0);
      });

      it('segnala come pendenti esattamente i riferimenti che il codice attuale azzera', async () => {
        const base = baseOf(fixture.data);
        const toccato = clone(base);
        await legacyDrawnIds(toccato);
        // Dopo il passaggio legacy i riferimenti nel vuoto sono stati svuotati: il catalogo non
        // deve trovarne piu', e i connettori devono essere gli stessi di prima.
        const dopo = edgesOfFlow(toccato);
        expect(dopo.dangling).toEqual([]);
        expect(dopo.records.map(r => r.id).sort()).toEqual(edgesOfFlow(base).records.map(r => r.id).sort());
        // ...e le stesse uscite che il catalogo diceva pendenti sulla base sono quelle svuotate.
        const prima = edgesOfFlow(base);
        for (const ref of prima.dangling) {
          const intent = toccato.find((i: any) => i.intent_id === ref.intentId);
          const valori = JSON.stringify(intent);
          expect(valori.includes('"' + ref.raw + '"')).withContext(`${fixture.name}: ${ref.fromId} -> ${ref.raw} doveva essere svuotato`).toBeFalse();
        }
      });

      it('ogni differenza con la previsione del canvas e\' un difetto noto della previsione', async () => {
        const base = baseOf(fixture.data);
        const edges = edgesOfFlow(base);
        const predicted = new Set(await legacyPredictedIds(clone(base)));
        const nuovo = new Set(edges.records.map(r => r.id));
        const nonPrevisti = [...nuovo].filter(id => !predicted.has(id));
        expect(predicted.size).withContext('la previsione deve vedere qualcosa').toBeGreaterThan(0);
        for (const id of nonPrevisti) {
          const spiegato = KNOWN_PREDICTION_DEFECTS.captureGoto(id, edges, predicted)
            || KNOWN_PREDICTION_DEFECTS.buttonWithAttrs(id, edges)
            || KNOWN_PREDICTION_DEFECTS.bareId(id, edges);
          expect(spiegato).withContext(`${fixture.name}: disegnato ma non previsto senza una ragione nota: ${id}`).toBeTrue();
        }
        const nonDisegnati = [...predicted].filter(id => !nuovo.has(id));
        for (const id of nonDisegnati) {
          const spiegato = KNOWN_PREDICTION_DEFECTS.returnStackDot(id, base)
            || KNOWN_PREDICTION_DEFECTS.captureGotoPredicted(id, edges);
          expect(spiegato).withContext(`${fixture.name}: previsto ma non disegnato senza una ragione nota: ${id}`).toBeTrue();
        }
      });
    });
  }
});
