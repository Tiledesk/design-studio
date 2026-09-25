import { McpServer } from 'src/app/models/mcp.model';

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
}

export interface ProjectCapabilities {
  chatbot_subtype: string;
  subagent: boolean;
  actions: ActionCapability[];
  mcp_servers: McpServerCapability[];
  /** Set when the MCP servers could not be read at all. */
  mcp_error?: string;
}

/** The capabilities plus what FlowOpsService needs to store an attached custom
 *  server (its url and headers), which the agent is never sent. */
export interface CapabilitiesSnapshot {
  capabilities: ProjectCapabilities;
  customServerConfigs: Record<string, McpServer>;
}
