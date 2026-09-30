export interface ConnectorPropertyOption {
  label: string;
  value: string;
}

export interface ConnectorProperty {
  id: string;
  type: string;
  name: string;
  required: boolean;
  description: string;
  options?: ConnectorPropertyOption[];
  default?: unknown;
}

export interface ConnectorWebRequestHint {
  method: string;
  url: string;
  headers: { [k: string]: string };
  bodyTemplate: { [k: string]: unknown };
}

export interface ConnectorAuthConfig {
  type: string;
  installPath?: string;
  scopes?: string[];
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
  // Connector-level identity threaded through from the manifest at palette-build
  // time, so the action factory can stamp `_tdConnector` (baseUrl + OAuth config).
  baseUrl?: string;
  auth?: ConnectorAuthConfig;
}

export interface ConnectorManifestGroup {
  id: string;
  name: string;
  icon?: string;
  order?: number;
}

export interface ConnectorManifest {
  connector: {
    id: string;
    name: string;
    version: string;
    description: string;
    baseUrl: string;
    auth: ConnectorAuthConfig;
    icon?: string;
  };
  actions: ConnectorActionEntry[];
  triggers: ConnectorActionEntry[];
  groups?: ConnectorManifestGroup[];
}
