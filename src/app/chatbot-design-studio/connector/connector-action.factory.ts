import { ActionWebRequestV2 } from '../../models/action-model';
import { ConnectorActionEntry } from './connector-manifest.model';

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
  return a as ActionWebRequestV2 & { _tdConnectorRef: string };
}
