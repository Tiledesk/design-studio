import { McpServer } from 'src/app/models/mcp.model';
import { LlmModel } from '../utils-llm-models';
import type { StartPointDescriptor } from '../services/start-point-manager.service';

/** What `get_project_capabilities` answers: what the open flow can be built
 *  with in this project. `actions` is the element panel's own list (see
 *  availableActionEntries); an action hidden from the panel is absent, one the
 *  panel greys out behind an upgrade prompt is `needs_upgrade`. */
export type ActionStatus = 'available' | 'needs_upgrade';

export interface ActionCapability {
  type: string;
  status: ActionStatus;
  /** The plan's display name (PLAN_NAME value), only on `needs_upgrade`. */
  plan?: string;
}

export interface McpToolCapability {
  name: string;
  description?: string;
}

/** An MCP server an `ai_prompt` can attach. Native servers are matched by
 *  `id`, the project's own by `name`. No url, headers or keys: the agent never
 *  needs them, and must not copy them into a flow. */
export interface McpServerCapability {
  id?: string;
  name: string;
  native: boolean;
  transport: string;
  description?: string;
  tools: McpToolCapability[];
  /** Set when this server's tools could not be read; it cannot be attached. */
  tools_error?: string;
  /** Native servers only: whether the project's own `mcp` integration already
   *  lists this native (same match rule as the Native Tools dialog's own
   *  `isConfigured`). A custom server is configured by definition -- it only
   *  exists here because it is in that same list -- so it never carries this
   *  field. */
  configured?: boolean;
}

/** A model an AI action (ai_prompt, ai_condition, askgptv2) can run on: one
 *  the project has configured, from the same list the actions' own model
 *  picker shows. The agent picks one by `llm` + `model` (+ `server`); flow-ops
 *  fills in the rest. No key or url. */
export interface LlmModelCapability {
  /** The provider value stored on action.llm, e.g. 'openai', 'anthropic', 'vllm'. */
  llm: string;
  /** The model id stored on action.model. */
  model: string;
  /** What the picker shows: `${llmLabel} · ${modelName}`. */
  label: string;
  /** Only for multi-server providers (vllm, agentplatform). */
  server?: string;
  /** The translated description; absent when there is no translation. */
  description?: string;
  /** Only when true. */
  reasoning?: boolean;
  /** The quota multiplier the studio shows, when it has one. */
  cost_multiplier?: string;
  max_output_tokens?: number;
}

/** A project integration (the dashboard's Integrations page: openai,
 *  openrouter, anthropic, hubspot, ...). Only the name and whether a key is
 *  stored: no value, not even masked. The agent uses it to pick the provider
 *  a web request authenticates with, and names the Global that holds the
 *  key (`<name>_api_key`); the key itself never reaches the flow. */
export interface IntegrationCapability {
  name: string;
  /** Whether the integration holds a key (`value.apikey`, or a server with
   *  one). An integration saved without a key is listed but unusable. */
  configured: boolean;
}

export interface ProjectCapabilities {
  chatbot_subtype: string;
  subagent: boolean;
  actions: ActionCapability[];
  mcp_servers: McpServerCapability[];
  /** Set when the MCP servers could not be read at all. */
  mcp_error?: string;
  llm_models: LlmModelCapability[];
  /** Set when the project's models could not be read; llm_models is then empty. */
  llm_models_error?: string;
  /** The start boxes (web, webhook, scheduled) this flow has or could add. */
  start_points?: StartPointDescriptor[];
  /** Set when the start points could not be described; start_points is then absent. */
  start_points_error?: string;
  integrations: IntegrationCapability[];
  /** Set when the integrations could not be read; integrations is then empty. */
  integrations_error?: string;
  /** The names of this agent's Globals (Design Studio -> Globals), values
   *  left out. The agent checks here whether the Global a web request reads
   *  (`{{openrouter_api_key}}`) already exists, or has to be created by the
   *  user. */
  globals: string[];
}

/** The capabilities plus what FlowOpsService needs to store an attached custom
 *  server (its url and headers), and the full picker entry of each model in
 *  `llm_models` (in the same order) to fill an AI action's model fields from
 *  -- none of which the agent is ever sent. */
export interface CapabilitiesSnapshot {
  capabilities: ProjectCapabilities;
  customServerConfigs: Record<string, McpServer>;
  llmModels: LlmModel[];
}
