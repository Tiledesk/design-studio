/** The host half of the agent-chat protocol, as design-studio uses it.
 *
 *  Mirrors `web/chat/dist-adapter/index.d.ts` in tiledesk-agent-runtime. The
 *  module itself is fetched from the chat's origin at runtime, so this file is
 *  the only thing keeping our calls honest at compile time. Keep it in step
 *  with the runtime's version; PROTOCOL_VERSION is what catches drift at run
 *  time. */

export interface HostConfig {
  baseUrl?: string;
  token?: string;
  projectId?: string;
  flowId?: string;
}

export type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;

export interface AgentChatHostOptions {
  iframe: HTMLIFrameElement;
  chatOrigin: string;
  allowedOrigin?: string;
  getConfig: () => HostConfig;
  target?: Window;
}

export interface AgentChatHost {
  registerTool(name: string, handler: ToolHandler): void;
  setContext(ctx: { projectId: string; flowId: string }): void;
  setToken(token: string): void;
  /** Told when the chat starts working and when it has come to rest.
   *
   *  Optional because the chat is deployed on its own: a studio pointed at an
   *  older chat gets no `onStatus` at all, and must keep working from the
   *  timed checks instead of failing. Call it as `host.onStatus?.(...)`. */
  onStatus?(handler: (state: 'busy' | 'idle') => void): void;
  destroy(): void;
}

export interface AgentChatAdapterModule {
  createAgentChatHost(opts: AgentChatHostOptions): AgentChatHost;
  PROTOCOL_VERSION: number;
}
