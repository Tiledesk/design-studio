// connector-action-form.util.unit.spec.ts
import { connectorMetaFromEntry, readConnectorInputs, writeConnectorInputs } from './connector-action-form.util';
import { ConnectorActionEntry } from './connector-manifest.model';

const entry: ConnectorActionEntry = {
  id: 'gmail.send-email', name: 'Send Email', group: 'email', category: 'communication',
  inputs: [
    { id: 'to', type: 'string', name: 'To', required: true, description: 'Recipient' },
    { id: 'subject', type: 'string', name: 'Subject', required: false, description: 'Subj' },
  ],
  outputs: [],
  webrequest: { method: 'POST', url: 'https://c/api/actions', headers: {},
    bodyTemplate: { id: 'gmail.send-email', external_id: '{projectId}', inputs: { to: '{{to}}', subject: '{{subject}}' } } },
};

describe('connectorMetaFromEntry', () => {
  it('projects entry to a compact meta (name + input descriptors)', () => {
    const m = connectorMetaFromEntry(entry);
    expect(m.name).toBe('Send Email');
    expect(m.inputs.map(i => i.id)).toEqual(['to', 'subject']);
    expect(m.inputs[0]).toEqual({ id: 'to', name: 'To', type: 'string', required: true, description: 'Recipient' });
  });

  it('carries the icon into the meta', () => {
    const m = connectorMetaFromEntry({ ...entry, icon: 'https://c/assets/connector-icon.svg' } as any);
    expect(m.icon).toBe('https://c/assets/connector-icon.svg');
  });
});

describe('readConnectorInputs', () => {
  it('returns the inputs map from a valid jsonBody', () => {
    const action = { jsonBody: JSON.stringify({ id: 'x', external_id: '{projectId}', inputs: { to: 'a@b.com' } }) };
    expect(readConnectorInputs(action)).toEqual({ to: 'a@b.com' });
  });
  it('returns {} for missing/malformed jsonBody (never throws)', () => {
    expect(readConnectorInputs({})).toEqual({});
    expect(readConnectorInputs({ jsonBody: 'not json' })).toEqual({});
    expect(readConnectorInputs({ jsonBody: JSON.stringify({ id: 'x' }) })).toEqual({});
  });
});

describe('writeConnectorInputs', () => {
  it('rebuilds jsonBody preserving id and external_id, replacing inputs', () => {
    const action: any = { jsonBody: JSON.stringify({ id: 'gmail.send-email', external_id: '{projectId}', inputs: { to: '' } }) };
    writeConnectorInputs(action, { to: '{{attributes.email}}', subject: 'Hi' });
    const body = JSON.parse(action.jsonBody);
    expect(body.id).toBe('gmail.send-email');
    expect(body.external_id).toBe('{projectId}');
    expect(body.inputs).toEqual({ to: '{{attributes.email}}', subject: 'Hi' });
  });
});
