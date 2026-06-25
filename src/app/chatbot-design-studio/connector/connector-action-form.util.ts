// connector-action-form.util.ts
import { ConnectorActionEntry } from './connector-manifest.model';

export interface ConnectorFormInput { id: string; name: string; type: string; required: boolean; description: string; }
export interface ConnectorMeta { name: string; inputs: ConnectorFormInput[]; }

export function connectorMetaFromEntry(entry: ConnectorActionEntry): ConnectorMeta {
  return {
    name: entry.name,
    inputs: (entry.inputs || []).map(i => ({
      id: i.id, name: i.name, type: i.type, required: !!i.required, description: i.description || '',
    })),
  };
}

export function readConnectorInputs(action: any): { [id: string]: string } {
  try {
    const body = JSON.parse(action && action.jsonBody);
    return (body && body.inputs && typeof body.inputs === 'object') ? body.inputs : {};
  } catch {
    return {};
  }
}

export function writeConnectorInputs(action: any, values: { [id: string]: string }): void {
  let body: any = {};
  try { body = JSON.parse(action.jsonBody) || {}; } catch { body = {}; }
  body.inputs = values;
  action.jsonBody = JSON.stringify(body);
}
