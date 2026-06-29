import { ConnectorActionEntry } from './connector-manifest.model';

// A trigger descriptor has the same manifest shape as an action entry.
export type ConnectorTriggerEntry = ConnectorActionEntry;

export interface ConnectorTriggerGroup {
  id: string;
  name: string;
  icon: string;
  baseUrl: string;     // connector base URL — needed to call /api/triggers
  apiKey?: string;     // Bearer key from the integration record (absent on the dev env path)
  entries: ConnectorTriggerEntry[];
}
