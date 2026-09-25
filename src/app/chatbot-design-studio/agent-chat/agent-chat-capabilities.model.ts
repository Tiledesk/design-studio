import { McpServer } from 'src/app/models/mcp.model';
import { LlmModel } from '../utils-llm-models';

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
