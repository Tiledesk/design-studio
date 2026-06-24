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
    expect(JSON.parse(a.jsonBody).inputs.to).toBe('{{to}}');
    expect(a.assignResultTo).toBe('result');
    expect(a.settings.timeout).toBe(20000);
  });
  it('merges connector headers over the defaults', () => {
    const a: any = buildConnectorAction(entry);
    expect(a.headersString['Content-Type']).toBe('application/json');
  });
});
