import { McpSelectedServer, toPersistedMcpServer } from 'src/app/models/mcp.model';
import { CapabilitiesSnapshot, McpServerCapability, ProjectCapabilities } from './agent-chat-capabilities.model';
import { TYPE_ACTION } from '../utils-actions';
import { DEFAULT_MODEL } from '../utils-ai_models';
import { ActionWithServer, LlmModel, applySelectedServerToAction } from '../utils-llm-models';

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

/** The action types whose panel picks a model from the project's list. */
const LLM_MODEL_ACTION_TYPES: string[] = [TYPE_ACTION.AI_PROMPT, TYPE_ACTION.AI_CONDITION, TYPE_ACTION.ASKGPTV2];

/** The fields an agent picks a model with. Setting any of them is choosing a
 *  model, and is checked; setting none leaves the model alone. */
const LLM_MODEL_SELECTION_FIELDS = ['llm', 'model', 'vllmServer', 'agentPlatformServer'];

/** Where each multi-server provider keeps its server on the action. */
const SERVER_FIELD: Record<string, keyof ActionWithServer> = {
  vllm: 'vllmServer',
  agentplatform: 'agentPlatformServer'
};

const MAX_LISTED_MODELS = 40;

export type LlmModelResolution =
  | { fields: Record<string, any> | undefined; error?: undefined }
  | { fields?: undefined; error: string };

export function setsLlmModel(fields: Record<string, any> | undefined): boolean {
  return !!fields && LLM_MODEL_SELECTION_FIELDS.some(key => key in fields);
}

function describeModel(llm: unknown, model: unknown, server?: unknown): string {
  return `${llm} / ${model}${server ? ` @ ${server}` : ''}`;
}

function describeModels(models: LlmModel[]): string {
  const listed = models.slice(0, MAX_LISTED_MODELS).map(m => describeModel(m.llm, m.model, m.server));
  const more = models.length - listed.length;
  return listed.join(', ') + (more > 0 ? ` …and ${more} more` : '');
}

/** What each of the three panels' own setModel() writes when a model is
 *  picked (cds-action-ai-prompt, cds-action-ai-condition, cds-action-askgpt-v2
 *  alike): llm, model and modelName -- modelName is what the panel finds the
 *  model by when it opens -- then the server through
 *  applySelectedServerToAction. That one deletes both server fields first; a
 *  patch can only assign, so the one that does not apply is written as
 *  undefined, which is dropped when the flow is saved. */
function llmModelFields(entry: LlmModel): Record<string, any> {
  const server: ActionWithServer = {};
  applySelectedServerToAction(server, entry);
  return {
    llm: entry.llm,
    model: entry.model,
    modelName: entry.modelName,
    vllmServer: server.vllmServer,
    agentPlatformServer: server.agentPlatformServer
  };
}

/** Checks the model an AI action's `fields` pick, and returns the fields to
 *  store: the agent names a provider and a model (and, for a multi-server
 *  provider, a server); everything the panel needs besides comes from the
 *  project's own list. `fields` that pick no model come back unchanged. */
export function resolveLlmModel(
  type: string, fields: Record<string, any> | undefined, snapshot: CapabilitiesSnapshot
): LlmModelResolution {
  if (LLM_MODEL_ACTION_TYPES.indexOf(type) === -1 || !setsLlmModel(fields)) { return { fields }; }
  const models = snapshot.llmModels;
  const serverField = SERVER_FIELD[fields.llm];
  const server = serverField ? fields[serverField] : undefined;
  const sent = describeModel(fields.llm, fields.model, server);
  if (models.length === 0) {
    const why = snapshot.capabilities.llm_models_error
      ? `this project's models could not be read (${snapshot.capabilities.llm_models_error})`
      : `this project has no model configured`;
    return { error: `The model of "${type}" cannot be set: ${why}. Leave llm and model out, `
      + `and tell the user.` };
  }
  const candidates = models.filter(m => m.llm === fields.llm && m.model === fields.model);
  const matches = server ? candidates.filter(m => m.server === server) : candidates;
  if (matches.length > 1) {
    return { error: `"${sent}" is served by more than one server: set "${serverField}" to one of `
      + `${matches.map(m => `"${m.server}"`).join(', ')}.` };
  }
  if (matches.length === 0) {
    return { error: `"${type}" cannot use the model "${sent}": this project does not have it. `
      + `Set llm and model (and the server, where shown after @) to one of: ${describeModels(models)}.` };
  }
  return { fields: { ...fields, ...llmModelFields(matches[0]) } };
}

/** `fields` for a newly added AI action that picks no model, with the default
 *  one filled in: GPT-4o, the studio's own DEFAULT_MODEL, when the project has
 *  it, otherwise the first of its models. Unchanged when the action picks its
 *  own model, is of another type, or the project has no model at all. */
export function withDefaultLlmModel(
  type: string, fields: Record<string, any> | undefined, snapshot: CapabilitiesSnapshot
): Record<string, any> | undefined {
  const models = snapshot.llmModels;
  if (LLM_MODEL_ACTION_TYPES.indexOf(type) === -1 || setsLlmModel(fields) || models.length === 0) {
    return fields;
  }
  const entry = models.find(m => m.llm === 'openai' && m.model === DEFAULT_MODEL.value) ?? models[0];
  return { ...(fields || {}), ...llmModelFields(entry) };
}
