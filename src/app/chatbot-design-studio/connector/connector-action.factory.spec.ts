import { buildConnectorAction } from './connector-action.factory';
import { ConnectorActionEntry } from './connector-manifest.model';

const entry: ConnectorActionEntry = {
  id: 'gmail.send-email', name: 'Send Email', group: 'email', category: 'communication',
  inputs: [{ id: 'to', type: 'string', name: 'To', required: true, description: '' }],
  outputs: [],
  webrequest: {
    method: 'POST', url: 'https://conn.example.com/api/actions',
    headers: { 'Content-Type': 'application/json' },
    bodyTemplate: { id: 'gmail.send-email', external_id: '{projectId}', inputs: { to: '{{to}}' } }
  }
};

describe('buildConnectorAction', () => {
  it('persists as a webrequestv2 action carrying the connector ref', () => {
    const a: any = buildConnectorAction(entry);
    expect(a._tdActionType).toBe('webrequestv2');
    expect(a._tdConnectorRef).toBe('gmail.send-email');
    expect(a.method).toBe('POST');
    expect(a.url).toBe('https://conn.example.com/api/actions');
    expect(a.bodyType).toBe('json');
    expect(JSON.parse(a.jsonBody).inputs.to).toBe('');
    expect(a.assignResultTo).toBe('result');
    expect(a.settings.timeout).toBe(20000);
  });
  it('merges connector headers over the defaults', () => {
    const a: any = buildConnectorAction(entry);
    expect(a.headersString['Content-Type']).toBe('application/json');
  });
  it('stamps _tdConnectorMeta from the entry and seeds empty input values', () => {
    const a: any = buildConnectorAction(entry);   // `entry` already defined in this spec (gmail.send-email with a `to` input)
    expect(a._tdConnectorMeta.name).toBe('Send Email');
    expect(a._tdConnectorMeta.inputs.map((i: any) => i.id)).toContain('to');
    const body = JSON.parse(a.jsonBody);
    expect(body.inputs.to).toBe('');     // seeded empty, not the {{to}} placeholder
    expect(body.id).toBe('gmail.send-email');
    expect(body.external_id).toBe('{projectId}');
  });
  it('seeds input values from default when present, empty otherwise', () => {
    const withDefault: any = {
      ...entry,
      inputs: [
        { id: 'pageSize', type: 'number', name: 'Page Size', required: false, description: 'n', default: 10 },
        { id: 'query', type: 'string', name: 'Query', required: false, description: 'q' },
      ],
    };
    const a: any = buildConnectorAction(withDefault);
    const body = JSON.parse(a.jsonBody);
    expect(body.inputs.pageSize).toBe('10');
    expect(body.inputs.query).toBe('');
  });
});
