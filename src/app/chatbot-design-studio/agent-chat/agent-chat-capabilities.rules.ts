import { McpSelectedServer, toPersistedMcpServer } from 'src/app/models/mcp.model';
import { CapabilitiesSnapshot, McpServerCapability, ProjectCapabilities } from './agent-chat-capabilities.model';

/** Why `type` cannot be added to this flow, or null when it can. Only adding is
 *  checked: an action already on the canvas stays editable whatever its type. */
export function actionTypeRefusal(type: string, caps: ProjectCapabilities): string | null {
  const found = caps.actions.find(a => a.type === type);
  if (found?.status === 'available') { return null; }
  if (found?.status === 'needs_upgrade') {
    return `"${type}" needs the ${found.plan} plan on this project, so it cannot be added. `
      + `Do not build around it silently: tell the user which plan it needs, and offer the `
      + `nearest action that get_project_capabilities lists as available.`;
  }
  return `"${type}" is not available in this project (or in this chatbot or subagent). `
    + `Call get_project_capabilities for the action types you can use.`;
}

export type ServersResolution =
  | { servers: McpSelectedServer[]; error?: undefined }
  | { servers?: undefined; error: string };

function describeAttachable(caps: ProjectCapabilities): string {
  const attachable = caps.mcp_servers.filter(s => !s.tools_error && s.tools.length > 0);
  if (attachable.length === 0) {
    return caps.mcp_error ? `none (${caps.mcp_error})` : 'none';
  }
  return attachable
    .map(s => s.native ? `{"id": "${s.id}"} (${s.name})` : `{"name": "${s.name}"}`)
    .join(', ');
}

function findServer(entry: any, caps: ProjectCapabilities): McpServerCapability | undefined {
  // Native servers only by id, the project's own only by name: a name is a
  // label a person can reuse, and matching loosely could attach the wrong one.
  if (typeof entry?.id === 'string') {
    return caps.mcp_servers.find(s => s.native && s.id === entry.id);
  }
  if (typeof entry?.name === 'string') {
    return caps.mcp_servers.find(s => !s.native && s.name === entry.name);
  }
  return undefined;
}

/** Checks the `servers` value an agent sent for an `ai_prompt` and builds what
 *  is stored. The agent names a server and its tools; everything else -- url,
 *  transport, headers -- comes from the capabilities, whatever the agent sent. */
export function resolveAttachedServers(value: unknown, snapshot: CapabilitiesSnapshot): ServersResolution {
  const caps = snapshot.capabilities;
  if (!Array.isArray(value)) {
    return { error: `"servers" must be an array of {"id", "tools"} for a native server or `
      + `{"name", "tools"} for one of the project's own servers.` };
  }
  const servers: McpSelectedServer[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    const label = String(entry?.id ?? entry?.name ?? '');
    const server = findServer(entry, caps);
    if (!server) {
      return { error: `No MCP server ${typeof entry?.id === 'string' ? `with id "${label}"` : `named "${label}"`} `
        + `can be attached in this project. Native servers go by "id", the project's own by `
        + `"name". Attachable servers: ${describeAttachable(caps)}.` };
    }
    if (server.tools_error) {
      return { error: `MCP server "${label}" cannot be attached: its tools could not be read `
        + `(${server.tools_error}).` };
    }
    const key = server.native ? `native:${server.id}` : `custom:${server.name}`;
    if (seen.has(key)) {
      return { error: `MCP server "${label}" is listed twice; list it once with all its tools.` };
    }
    seen.add(key);
    const tools = entry?.tools;
    if (!Array.isArray(tools) || tools.length === 0 || tools.some((t: unknown) => typeof t !== 'string')) {
      return { error: `MCP server "${label}" needs "tools": a non-empty array of tool names.` };
    }
    const known = server.tools.map(t => t.name);
    const unknown = tools.filter((t: string) => known.indexOf(t) === -1);
    if (unknown.length > 0) {
      return { error: `MCP server "${label}" has no tool ${unknown.map((t: string) => `"${t}"`).join(', ')}. `
        + (known.length ? `Its tools are: ${known.join(', ')}.` : `It has no tools.`) };
    }
    // A native entry carries no url: the studio's own native catalogue dialog
    // stores none, and the engine resolves it by id (DirAiPrompt.js).
    const config = server.native ? undefined : snapshot.customServerConfigs[server.name];
    servers.push(toPersistedMcpServer({
      id: server.native ? server.id : undefined,
      name: server.name,
      native: server.native,
      transport: config?.transport ?? server.transport,
      url: config?.url,
      customHeaders: config?.customHeaders,
      tools
    }));
  }
  return { servers };
}
