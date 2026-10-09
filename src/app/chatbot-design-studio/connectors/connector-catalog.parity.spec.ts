import { ConnectorService } from '../services/connector.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { edgesOfFlow, ensureTechnicalIds } from './connector-catalog';

declare const require: any;

/**
 * La parita' degli id dei connettori.
 *
 * Per ogni fixture, gli id che il catalogo produce sono congelati nel file `.expected.json`
 * accanto a lei. Quegli id sono stati verificati uguali, uno per uno, a quelli che il codice
 * precedente (`createConnectorsOfIntent`, 850 righe con un ramo per tipo di action) disegnava:
 * la spec che li confrontava dal vivo e' passata al 100% al commit 1af7d6b5, prima che quel
 * codice venisse sostituito dal catalogo. Da allora questa spec e' una regressione: un cambio al
 * catalogo che sposti un id -- e quindi stacchi i collegamenti dei flussi salvati -- fallisce qui.
 *
 * In piu' verifica che il servizio, che oggi deriva sia il disegno sia la previsione del canvas
 * dal catalogo, dica la stessa cosa in tutti e tre i punti in cui lo fa.
 *
 * Le fixture `synthetic-*` sono costruite a mano: vanno affiancate da flussi reali esportati
 * (vedi fixtures/README.md). Per aggiungerne una: metterla qui con il suo `.expected.json`
 * (gli id li stampa la spec se il file manca).
 */
const FIXTURES: Array<{ name: string; data: any; expected: string[] }> = [
  { name: 'synthetic-legacy-reply', data: require('./fixtures/synthetic-legacy-reply.json'), expected: require('./fixtures/synthetic-legacy-reply.expected.json') },
  { name: 'synthetic-bare-ids', data: require('./fixtures/synthetic-bare-ids.json'), expected: require('./fixtures/synthetic-bare-ids.expected.json') },
  { name: 'synthetic-v3-flow', data: require('./fixtures/synthetic-v3-flow.json'), expected: require('./fixtures/synthetic-v3-flow.expected.json') },
  { name: 'synthetic-voice', data: require('./fixtures/synthetic-voice.json'), expected: require('./fixtures/synthetic-voice.expected.json') },
  { name: 'synthetic-dangling', data: require('./fixtures/synthetic-dangling.json'), expected: require('./fixtures/synthetic-dangling.expected.json') },
];

function intentsOf(data: any): any[] {
  if (Array.isArray(data)) { return data; }
  return data?.faqs || data?.intents || [];
}

const clone = (x: any) => JSON.parse(JSON.stringify(x));

/** Una base deterministica: id tecnici assegnati con un contatore, come nel file degli id attesi. */
function baseOf(fixture: any): any[] {
  const intents = clone(intentsOf(fixture));
  let n = 0;
  ensureTechnicalIds(intents, () => 'fx' + (++n));
  return intents;
}

describe('connector-catalog — gli id dei connettori restano quelli di sempre', () => {

  beforeEach(() => {
    LoggerInstance.setInstance({ log() {}, error() {}, warn() {}, info() {}, debug() {}, setLoggerConfig() {} } as any);
  });

  for (const fixture of FIXTURES) {
    describe(fixture.name, () => {

      it('produce esattamente gli id congelati, nello stesso ordine', () => {
        const ids = edgesOfFlow(baseOf(fixture.data)).records.map(r => r.id);
        if (!fixture.expected || fixture.expected.length === 0) {
          fail(`${fixture.name}: manca il file degli id attesi; questi sono gli id prodotti:\n${JSON.stringify(ids, null, 1)}`);
        }
        expect(ids).toEqual(fixture.expected);
        expect(ids.length).toBeGreaterThan(0);
      });

      it('la previsione del canvas e il disegno chiedono gli stessi connettori', async () => {
        const base = baseOf(fixture.data);
        const service = new ConnectorService();
        const map = await service.createMapOfConnectors(clone(base));
        expect(Object.keys(map).sort()).toEqual([...fixture.expected].sort());
        expect(Object.keys(map).some(id => id.startsWith('ERROR_') || id.startsWith('DUPLICATE_'))).toBeFalse();
        service.syncIntents(base);
        const perBlock = base.flatMap(intent => service.expectedConnectorIds(intent)).sort();
        expect(perBlock).toEqual([...fixture.expected].sort());
      });

      it('un riferimento pendente non produce mai un connettore', () => {
        const edges = edgesOfFlow(baseOf(fixture.data));
        for (const ref of edges.dangling) {
          expect(edges.byId.has(ref.fromId + '/' + ref.raw.replace('#', ''))).withContext(ref.fromId).toBeFalse();
        }
        expect(edges.records.length + edges.dangling.length).toBeGreaterThan(0);
      });
    });
  }
});
