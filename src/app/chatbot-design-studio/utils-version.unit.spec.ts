import { agentDsVersion, cdsPathSegmentFor, cdsUrlForVersion } from './utils';

describe('versione dell\'agente e console in cui si apre', () => {
  const at = (origin: string, pathname: string, hash: string) => ({ origin, pathname, hash });

  it('la versione: v2 senza etichetta, l\'etichetta in minuscolo (anche quella vecchia negli attributi), null se non e\' una versione', () => {
    expect(agentDsVersion({})).toBe('v2');
    expect(agentDsVersion({ ds_version: '' })).toBe('v2');
    expect(agentDsVersion({ ds_version: ' V3 ' })).toBe('v3');
    expect(agentDsVersion({ attributes: { dsVersion: 'v3' } })).toBe('v3');
    expect(agentDsVersion({ ds_version: 'v4' })).toBe('v4');
    expect(agentDsVersion({ ds_version: 'legacy' })).toBeNull();
    expect(agentDsVersion({ ds_version: 3 })).toBeNull();
  });

  it('il segmento della console: cds per la V2, cds-vN per le altre', () => {
    expect(cdsPathSegmentFor('v2')).toBe('cds');
    expect(cdsPathSegmentFor('v3')).toBe('cds-v3');
    expect(cdsPathSegmentFor('beta')).toBeNull();
  });

  it('in produzione un agente V3 va su cds-v3, con la rotta dell\'agente', () => {
    expect(cdsUrlForVersion(at('https://panel.tiledesk.com', '/v3/cds/', '#/project/p1/chatbot/b1/blocks'), 'v3', 'p1', 'b1'))
      .toBe('https://panel.tiledesk.com/v3/cds-v3/#/project/p1/chatbot/b1/blocks');
  });

  it('sullo stage, con le impostazioni; un agente V4 va su cds-v4', () => {
    expect(cdsUrlForVersion(at('https://stage.eks.tiledesk.com', '/cds/', '#/project/p1/chatbot/b1/settings?active=bot_detail'), 'v3', 'p1', 'b1'))
      .toBe('https://stage.eks.tiledesk.com/cds-v3/#/project/p1/chatbot/b1/settings?active=bot_detail');
    expect(cdsUrlForVersion(at('https://panel.tiledesk.com', '/v3/cds/', ''), 'v4', 'p1', 'b1'))
      .toBe('https://panel.tiledesk.com/v3/cds-v4/#/project/p1/chatbot/b1/blocks');
  });

  it('null in locale, per la console in cui si e\' gia\', o senza dati', () => {
    expect(cdsUrlForVersion(at('http://localhost:4204', '/', '#/project/p1/chatbot/b1/blocks'), 'v3', 'p1', 'b1')).toBeNull();
    expect(cdsUrlForVersion(at('https://x.io', '/v3/cds/', ''), 'v2', 'p1', 'b1')).toBeNull();
    expect(cdsUrlForVersion(at('https://x.io', '/v3/cds/', ''), 'v3', 'p1', undefined)).toBeNull();
  });
});
