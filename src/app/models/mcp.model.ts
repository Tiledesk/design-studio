/**
 * Canonical MCP (Model Context Protocol) data model.
 *
 * Replaces the interfaces that were previously duplicated (and drifting) inside the AI Prompt
 * action dialogs. Field names match EXACTLY what is persisted today, so no data migration is
 * needed:
 *  - Integration side ("mcp" integration → value.servers[]): each server carries `tools`
 *    (available/discovered McpTool[]) and `selectedTools` (last selected tool NAMES, string[]).
 *  - Action side (action.servers[]): each server carries `tools` = SELECTED tool NAMES (string[]).
 *
 * The word `tools` therefore means different things on the two sides (McpServer.tools vs
 * McpSelectedServer.tools). This is intentional and preserved for backward compatibility.
 */

/** A discovered/available tool, as returned by MCP tool discovery / native connect. */
export interface McpTool {
  name: string;
  title?: string;
  description?: string;
}

/** Custom header entry for a server. In this branch auth is ONLY via customHeaders (no oauth). */
export interface McpCustomHeader {
  enabled: boolean;
  key: string;
  value: string;
  /** UI-only reveal toggle, never used for the dirty check / persistence. */
  revealValue?: boolean;
}

/**
 * INTEGRATION-level server, as persisted in the "mcp" integration `value.servers[]`.
 * `tools`         = available/discovered tools (objects).
 * `selectedTools` = last selected tool NAMES, kept even when the server is not selected.
 */
export interface McpServer {
  /** nativeId: present only on Tiledesk native servers. */
  id?: string;
  name: string;
  url: string;
  transport: string;
  /** true = Tiledesk native MCP server (catalog /mcp/native). */
  native?: boolean;
  description?: string;
  customHeaders?: McpCustomHeader[];
  tools?: McpTool[];
  selectedTools?: string[];
  /** Total available tools count from the last Connect/Refresh (for the "X available" label). */
  availableToolsCount?: number;
}

/**
 * ACTION-level selection, as persisted in `action.servers[]`.
 * NOTE (backward-compat): selected tool NAMES are stored under `tools` (string[]),
 * NOT under `selectedTools` — this matches existing saved agents and must not change.
 */
export interface McpSelectedServer {
  id?: string;
  name: string;
  url: string;
  transport: string;
  native?: boolean;
  customHeaders?: McpCustomHeader[];
  /** Selected tool names for this action. */
  tools?: string[];
}

/** Envelope persisted through ProjectService.saveIntegration for the "mcp" integration. */
export interface McpIntegration {
  id_project: string;
  name: string;
  value: {
    servers: McpServer[];
  };
}

/**
 * Single shared normalizer (replaces the copies previously duplicated across the AI Prompt
 * component and the MCP dialogs). Accepts a `string[]` or a legacy `{ name }[]` and returns a
 * deduplicated `string[]` of tool names.
 */
export function normalizeMcpToolNames(tools: unknown): string[] {
  if (!Array.isArray(tools)) {
    return [];
  }
  return [...new Set(
    tools
      .map(t => (typeof t === 'string' ? t : (t as { name?: string })?.name))
      .filter((name): name is string => !!name)
  )];
}

/**
 * Normalize a selected server to the canonical shape persisted in `action.servers[]`:
 * - `native` is ALWAYS present (boolean);
 * - `id` is included ONLY for native servers;
 * - `tools` is an array of tool NAMES (strings), never objects;
 * - `url` / `transport` / `customHeaders` are preserved (the engine forwards them to the backend).
 */
export function toPersistedMcpServer(server: McpSelectedServer): McpSelectedServer {
  const native = !!server.native;
  const result: McpSelectedServer = {
    name: server.name,
    native,
    url: server.url,
    transport: server.transport,
    tools: normalizeMcpToolNames(server.tools)
  };
  if (native && server.id) {
    result.id = server.id;
  }
  if (server.customHeaders) {
    result.customHeaders = server.customHeaders;
  }
  return result;
}
