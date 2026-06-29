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

  it('injects the connector icon into palette entries and src', () => {
    const withIcon = { ...manifest, connector: { ...manifest.connector, icon: 'https://c/assets/connector-icon.svg' } };
    const entries = svc.toPaletteEntries(withIcon);
    expect(entries[0].src).toBe('https://c/assets/connector-icon.svg');
    expect((entries[0].connectorEntry as any).icon).toBe('https://c/assets/connector-icon.svg');
  });

  it('projects a manifest into a connector group (id/name/icon + entries)', () => {
    const withIcon = { ...manifest, connector: { ...manifest.connector, name: 'Google Services', icon: 'https://c/icon.svg' } };
    const group = svc.toConnectorGroup(withIcon);
    expect(group.id).toBe('google');
    expect(group.name).toBe('Google Services');
    expect(group.icon).toBe('https://c/icon.svg');
    expect(group.entries.length).toBe(1);
    expect(group.entries[0].connectorRef).toBe('gmail.send-email');
  });

  it('falls back to the web_request icon when the manifest connector has none', () => {
    const group = svc.toConnectorGroup(manifest);
    expect(group.icon).toBe('assets/images/actions/web_request.svg');
  });

  const multiManifest: ConnectorManifest = {
    connector: { id: 'google', name: 'Google Services', version: '1', description: '', baseUrl: 'https://c',
                 icon: 'https://c/icon.svg', auth: { type: 'oauth2', installPath: '/auth/google', scopes: [] } },
    actions: [
      { id: 'gmail.send-email', name: 'Send Email', group: 'email', category: 'communication',
        inputs: [], outputs: [], webrequest: { method: 'POST', url: 'https://c/api/actions', headers: {}, bodyTemplate: {} } },
      { id: 'cal.create-event', name: 'Create Event', group: 'calendar', category: 'productivity',
        inputs: [], outputs: [], webrequest: { method: 'POST', url: 'https://c/api/actions', headers: {}, bodyTemplate: {} } },
      { id: 'cal.list-events', name: 'List Events', group: 'calendar', category: 'productivity',
        inputs: [], outputs: [], webrequest: { method: 'POST', url: 'https://c/api/actions', headers: {}, bodyTemplate: {} } },
    ],
    triggers: [],
    groups: [
      { id: 'calendar', name: 'Calendar', icon: 'https://c/cal.svg', order: 20 },
      { id: 'email', name: 'Gmail', order: 10 },
    ],
  };

  it('buckets palette entries into subgroups by group, ordered by the groups[] table', () => {
    const subs = svc.toConnectorSubgroups(multiManifest);
    expect(subs.map(s => s.id)).toEqual(['email', 'calendar']); // order 10 before 20
    expect(subs.find(s => s.id === 'calendar')!.entries.length).toBe(2);
    expect(subs.find(s => s.id === 'email')!.name).toBe('Gmail');
  });

  it('uses the group icon when present and the connector icon as fallback', () => {
    const subs = svc.toConnectorSubgroups(multiManifest);
    expect(subs.find(s => s.id === 'calendar')!.icon).toBe('https://c/cal.svg');
    expect(subs.find(s => s.id === 'email')!.icon).toBe('https://c/icon.svg');
  });

  it('title-cases groups missing from the groups[] table and appends them last', () => {
    const m = { ...multiManifest, groups: [] };
    const subs = svc.toConnectorSubgroups(m);
    expect(subs.find(s => s.id === 'email')!.name).toBe('Email');
    expect(subs.find(s => s.id === 'calendar')!.name).toBe('Calendar');
  });

  it('attaches subgroups to the connector group and groups[] to the trigger group', () => {
    const group = svc.toConnectorGroup(multiManifest);
    expect(group.subgroups.length).toBe(2);
    const tg = svc.toTriggerGroup(multiManifest, 'https://c');
    expect(tg.groups!.map(g => g.id)).toEqual(['calendar', 'email']);
  });
});
