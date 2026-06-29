import { ConnectorActionEntry, ConnectorManifestGroup } from './connector-manifest.model';
import { ConnectorFormInput, connectorMetaFromEntry } from './connector-action-form.util';

// A trigger descriptor has the same manifest shape as an action entry.
export type ConnectorTriggerEntry = ConnectorActionEntry;

export interface ConnectorTriggerGroup {
  id: string;
  name: string;
  icon: string;
  baseUrl: string;     // connector base URL — needed to call /api/triggers
  apiKey?: string;     // Bearer key from the integration record (absent on the dev env path)
  entries: ConnectorTriggerEntry[];
  groups?: ConnectorManifestGroup[];   // manifest group table — for label resolution in the dropdown
}

// One subscription recorded on the entrypoint intent.
export interface ConnectorTriggerSub {
  ref: string;                         // entry.id, e.g. "gmail.new-email"
  name: string;
  icon?: string;
  inputs: ConnectorFormInput[];        // filter descriptors (for the editor)
  filters: { [id: string]: string };  // filter values
}

export function buildTriggerSub(entry: ConnectorTriggerEntry): ConnectorTriggerSub {
  const meta = connectorMetaFromEntry(entry);
  const filters: { [id: string]: string } = {};
  (entry.inputs || []).forEach(i => {
    filters[i.id] = (i.default !== undefined && i.default !== null) ? String(i.default) : '';
  });
  return { ref: entry.id, name: meta.name, icon: meta.icon, inputs: meta.inputs, filters };
}

export function readTriggerSubs(intent: any): ConnectorTriggerSub[] {
  const list = intent?.attributes?._tdConnectorTriggers;
  return Array.isArray(list) ? list : [];
}

export function writeTriggerSubs(intent: any, subs: ConnectorTriggerSub[]): void {
  if (!intent.attributes) { intent.attributes = {}; }
  intent.attributes._tdConnectorTriggers = subs;
}
