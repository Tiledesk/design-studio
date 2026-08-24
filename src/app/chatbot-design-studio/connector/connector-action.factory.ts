import { ActionWebRequestV2 } from '../../models/action-model';
import { ConnectorActionEntry } from './connector-manifest.model';
import { connectorMetaFromEntry, writeConnectorInputs } from './connector-action-form.util';

// Returns a persistence-ready webrequestv2 action carrying the connector ref.
//
// entry.webrequest.bodyTemplate.external_id arrives as the literal placeholder
// string '{projectId}' (see google-services-connector's manifest.ts). The bot
// runtime's Filler only resolves '${x}' (legacy) or '{{x}}' (LiquidJS) at
// execution time, and never seeds a projectId/id_project variable into a
// conversation's parameter store — so that placeholder is never substituted
// and every connector action fails connector-side auth ("no credential for
// project {projectId}"). Bake the real project id in here instead, client-side
// at action-creation time, the same way connector-trigger.orchestrator.ts
// already does for trigger subscriptions (external_id: dashboardService.projectID).
export function buildConnectorAction(entry: ConnectorActionEntry, projectId?: string): ActionWebRequestV2 & { _tdConnectorRef: string } {
  const a = new ActionWebRequestV2();
  a.method = entry.webrequest.method;
  a.url = entry.webrequest.url;
  a.headersString = { ...a.headersString, ...entry.webrequest.headers };
  a.bodyType = 'json';
  const bodyTemplate: any = { ...entry.webrequest.bodyTemplate };
  if (projectId) {
    bodyTemplate.external_id = projectId;
  }
  a.jsonBody = JSON.stringify(bodyTemplate);
  a.assignResultTo = 'result';
  a.assignStatusTo = 'status';
  a.assignErrorTo = 'error';
  (a as any)._tdConnectorRef = entry.id;
  (a as any)._tdConnectorMeta = connectorMetaFromEntry(entry);
  // Connector identity for the OAuth auth row on the action panel (Approach A).
  (a as any)._tdConnector = { ref: entry.id, baseUrl: entry.baseUrl, auth: entry.auth };
  const seededValues: { [id: string]: string } = {};
  (entry.inputs || []).forEach(i => {
    seededValues[i.id] = (i.default !== undefined && i.default !== null) ? String(i.default) : '';
  });
  writeConnectorInputs(a, seededValues);
  return a as ActionWebRequestV2 & { _tdConnectorRef: string };
}
