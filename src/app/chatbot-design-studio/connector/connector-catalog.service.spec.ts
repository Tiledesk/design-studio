import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ConnectorCatalogService } from './connector-catalog.service';
import { ConnectorManifest } from './connector-manifest.model';
import { TYPE_ACTION, TYPE_ACTION_CATEGORY } from '../utils-actions';

const manifest: ConnectorManifest = {
  connector: { id: 'google', name: 'Google', version: '1.0.0', description: '', baseUrl: 'https://c',
               auth: { type: 'oauth2', installPath: '/auth/google', scopes: [] } },
  actions: [{ id: 'gmail.send-email', name: 'Send Email', group: 'email', category: 'communication',
              inputs: [], outputs: [],
              webrequest: { method: 'POST', url: 'https://c/api/actions', headers: {}, bodyTemplate: {} } }],
  triggers: []
};

describe('ConnectorCatalogService', () => {
  let svc: ConnectorCatalogService; let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule], providers: [ConnectorCatalogService] });
    svc = TestBed.inject(ConnectorCatalogService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('fetches the manifest from {baseUrl}/api/manifest and unwraps data', (done) => {
    svc.fetchManifest('https://c').subscribe(m => { expect(m.connector.id).toBe('google'); done(); });
    const req = http.expectOne('https://c/api/manifest');
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: manifest });
  });

  it('maps manifest actions to INTEGRATIONS palette entries with CONNECTOR type', () => {
    const entries = svc.toPaletteEntries(manifest);
    expect(entries.length).toBe(1);
    expect(entries[0].type).toBe(TYPE_ACTION.CONNECTOR);
    expect(entries[0].category).toBe(TYPE_ACTION_CATEGORY.INTEGRATIONS);
    expect(entries[0].connectorRef).toBe('gmail.send-email');
    expect(entries[0].connectorEntry.id).toBe('gmail.send-email');
  });
});
