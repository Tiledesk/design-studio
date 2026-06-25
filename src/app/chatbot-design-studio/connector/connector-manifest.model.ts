export interface ConnectorProperty {
  id: string;
  type: string;
  name: string;
  required: boolean;
  description: string;
  allowedValues?: string[];
  default?: unknown;
}

export interface ConnectorWebRequestHint {
  method: string;
  url: string;
  headers: { [k: string]: string };
  bodyTemplate: { [k: string]: unknown };
}

export interface ConnectorActionEntry {
  id: string;            // "pluginId.actionId"
  name: string;
  group: string;
  category: string;
  inputs: ConnectorProperty[];
  outputs: ConnectorProperty[];
  webrequest: ConnectorWebRequestHint;
  icon?: string;
}

export interface ConnectorManifest {
  connector: {
    id: string;
    name: string;
    version: string;
    description: string;
    baseUrl: string;
    auth: { type: string; installPath: string; scopes: string[] };
    icon?: string;
  };
  actions: ConnectorActionEntry[];
  triggers: ConnectorActionEntry[];
}
