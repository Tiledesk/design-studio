import { Subject } from 'rxjs';
import { CdsDashboardComponent } from './cds-dashboard.component';

/** Il rifiuto di un agente di un'altra versione, chiamato su un `this` finto: il componente vero ha troppe
 *  dipendenze, e qui conta solo cosa decide il metodo. */
describe('CdsDashboardComponent — un agente di un\'altra versione non si apre in questa console', () => {

  function refuse(chatbot: any, pathname = '/v3/cds/', withDialog = true) {
    const opened: any[] = [];
    const closed = new Subject<void>();
    const went: string[] = [];
    const self: any = {
      dashboardService: { projectID: 'p1', selectedChatbot: chatbot },
      appConfigService: { getConfig: () => ({ dashboardBaseUrl: 'https://panel.tiledesk.com/v3/dashboard/' }) },
      logger: { warn() {}, log() {} },
      dialog: withDialog ? { open: (_c: any, config: any) => { opened.push(config.data); return { afterClosed: () => closed }; } } : undefined,
      translate: { instant: (key: string) => key },
      currentLocation: () => ({ origin: 'https://panel.tiledesk.com', pathname, hash: `#/project/p1/chatbot/${chatbot._id}/blocks` }),
      replaceLocation: (url: string) => went.push(url)
    };
    const refused = (CdsDashboardComponent.prototype as any).refuseOtherVersionAgent.call(self);
    return { refused, opened, went, close: () => closed.next() };
  }

  it('un agente V2 (senza etichetta) si apre qui', () => {
    const r = refuse({ _id: 'b1' });
    expect(r.refused).toBeFalse();
    expect(r.opened).toEqual([]);
  });

  it('un\'etichetta che non e\' una versione resta qui, come sempre', () => {
    expect(refuse({ _id: 'b1', ds_version: 'legacy' }).refused).toBeFalse();
  });

  it('un agente V3: prima l\'avviso, alla chiusura la console V3 sullo stesso agente', () => {
    const r = refuse({ _id: 'b3', name: 'Nuovo', ds_version: 'v3' });
    expect(r.refused).toBeTrue();
    expect(r.opened.length).toBe(1);
    expect(r.opened[0].no).toBe('');
    expect(r.went).toEqual([]);
    r.close();
    expect(r.went).toEqual(['https://panel.tiledesk.com/v3/cds-v3/#/project/p1/chatbot/b3/blocks']);
  });

  it('anche con l\'etichetta vecchia negli attributi', () => {
    const r = refuse({ _id: 'b3', attributes: { dsVersion: 'v3' } });
    expect(r.refused).toBeTrue();
    r.close();
    expect(r.went[0]).toContain('/v3/cds-v3/');
  });

  it('dove la console V3 non si ricava (in locale) l\'avviso rinvia alla dashboard', () => {
    const open = spyOn(window, 'open');
    const r = refuse({ _id: 'b3', ds_version: 'v3' }, '/');
    expect(r.refused).toBeTrue();
    r.close();
    expect(r.went).toEqual([]);
    expect(open).toHaveBeenCalledWith('https://panel.tiledesk.com/v3/dashboard/#/project/p1/bots/my-chatbots/all', '_self');
  });

  it('senza dialog si va subito nella console giusta', () => {
    const r = refuse({ _id: 'b3', ds_version: 'v3' }, '/v3/cds/', false);
    expect(r.went).toEqual(['https://panel.tiledesk.com/v3/cds-v3/#/project/p1/chatbot/b3/blocks']);
  });
});
