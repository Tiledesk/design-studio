import { ActionWebRequestV2 } from '../../models/action-model';
import { ConnectorActionEntry } from './connector-manifest.model';
import { connectorMetaFromEntry, writeConnectorInputs } from './connector-action-form.util';

// Returns a persistence-ready webrequestv2 action carrying the connector ref.
export function buildConnectorAction(entry: ConnectorActionEntry): ActionWebRequestV2 & { _tdConnectorRef: string } {
  const a = new ActionWebRequestV2();
  a.method = entry.webrequest.method;
  a.url = entry.webrequest.url;
  a.headersString = { ...a.headersString, ...entry.webrequest.headers };
  a.bodyType = 'json';
  a.jsonBody = JSON.stringify(entry.webrequest.bodyTemplate);
  a.assignResultTo = 'result';
  a.assignStatusTo = 'status';
  a.assignErrorTo = 'error';
  (a as any)._tdConnectorRef = entry.id;
  (a as any)._tdConnectorMeta = connectorMetaFromEntry(entry);
  const emptyValues: { [id: string]: string } = {};
  (entry.inputs || []).forEach(i => { emptyValues[i.id] = ''; });
  writeConnectorInputs(a, emptyValues);
  return a as ActionWebRequestV2 & { _tdConnectorRef: string };
}
