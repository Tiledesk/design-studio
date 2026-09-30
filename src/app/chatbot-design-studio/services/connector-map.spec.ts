import { ConnectorService } from './connector.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

/**
 * Gli id dei connettori ATTESI dal canvas.
 *
 * Il canvas, prima di disegnare, deduce quali connettori dovranno esistere
 * camminando i blocchi e raccogliendo ogni stringa che inizia con `#`. Resta
 * sulla schermata di caricamento finche' ognuno di quelli attesi non risulta
 * disegnato.
 *
 * Da qui il guasto che questi test presidiano: se la deduzione non riconosce una
 * destinazione, l'id che produce e' la stringa vuota -- e una voce vuota, che
 * nessun connettore reale potra' mai marcare come disegnata, tiene il canvas
 * fermo per sempre. E' successo con la condizione a piu' casi, le cui
 * destinazioni vivono in `cases[].intent` e in `elseIntent`.
 */
describe('ConnectorService — i connettori attesi dal canvas', () => {

  function unBlocco(id: string, actions: any[] = []): any {
    return { intent_id: id, intent_display_name: id, actions, attributes: {} };
  }

  function conCondizioneMultipla(): any[] {
    return [
      unBlocco('i1', [{
        _tdActionId: 'a1',
        _tdActionType: 'jsonconditionmulti',
        cases: [
          { _tdCaseId: 'c1', when: 'x == "1"', intent: '#i2' },
          { _tdCaseId: 'c2', when: 'x == "2"', intent: '#i3' }
        ],
        elseIntent: '#i3'
      }]),
      unBlocco('i2'), unBlocco('i3')
    ];
  }

  let service: ConnectorService;

  beforeEach(() => {
    // Il servizio prende il logger al momento della costruzione: senza istanza
    // configurata ogni chiamata esplode prima di arrivare alla deduzione.
    LoggerInstance.setInstance({
      log() {}, error() {}, warn() {}, info() {}, debug() {}, setLoggerConfig() {}
    } as any);
    service = new ConnectorService();
  });

  it('riconosce la destinazione di ogni caso e quella dell\'altrimenti', async () => {
    const mappa = await service.createMapOfConnectors(conCondizioneMultipla());
    const attesi = Object.keys(mappa);
    expect(attesi).toContain('i1/a1/case/c1/i2');
    expect(attesi).toContain('i1/a1/case/c2/i3');
    expect(attesi).toContain('i1/a1/else/i3');
  });

  it('non lascia NESSUNA voce con id vuoto: e\' quella che blocca il caricamento', async () => {
    const mappa = await service.createMapOfConnectors(conCondizioneMultipla());
    expect(Object.keys(mappa)).not.toContain('');
  });

  it('expectedConnectorIds concorda con la mappa: sono la stessa deduzione', async () => {
    const blocchi = conCondizioneMultipla();
    await service.createMapOfConnectors(blocchi);
    const ids = service.expectedConnectorIds(blocchi[0]);
    expect(ids).toContain('i1/a1/case/c1/i2');
    expect(ids).toContain('i1/a1/case/c2/i3');
    expect(ids).toContain('i1/a1/else/i3');
  });

  it('un caso senza destinazione non produce un connettore atteso', async () => {
    const blocchi = [
      unBlocco('i1', [{
        _tdActionId: 'a1', _tdActionType: 'jsonconditionmulti',
        cases: [{ _tdCaseId: 'c1', when: 'x == "1"', intent: '' }], elseIntent: ''
      }]),
      unBlocco('i2')
    ];
    const mappa = await service.createMapOfConnectors(blocchi);
    expect(Object.keys(mappa).length).toBe(0);
  });

  it('le condition che la precedono continuano a essere riconosciute', async () => {
    const blocchi = [
      unBlocco('i1', [{
        _tdActionId: 'a1', _tdActionType: 'jsoncondition2',
        trueIntent: '#i2', falseIntent: '#i3'
      }]),
      unBlocco('i2'), unBlocco('i3')
    ];
    const attesi = Object.keys(await service.createMapOfConnectors(blocchi));
    expect(attesi).toContain('i1/a1/true/i2');
    expect(attesi).toContain('i1/a1/false/i3');
    expect(attesi).not.toContain('');
  });

});
