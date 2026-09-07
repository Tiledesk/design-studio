/** Everything the agent chat needs, derived from one configured string.
 *
 *  Design-studio is told the chat's address and nothing else: the chat's mount
 *  point reverse proxies to the runtime, so the runtime's address is not ours
 *  to know. Deriving the origin here rather than letting each caller parse the
 *  URL again is what stops the iframe's src and the postMessage target from
 *  ever disagreeing -- a disagreement that fails closed and silently. */
export interface AgentChatConfig {
  /** The configured URL, without a trailing slash. */
  chatUrl: string;
  /** The origin of `chatUrl`. Every message is posted to exactly this. */
  chatOrigin: string;
}

export function readAgentChatConfig(appConfig: any): AgentChatConfig | null {
  const raw = appConfig?.agentChatUrl;
  if (!raw || typeof raw !== 'string' || raw === 'CHANGEIT') {
    return null;
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  // `data:`, `file:` and `javascript:` all parse, and all yield the opaque
  // origin "null", which can never match a real framing page. An embed built
  // on one is inert rather than wrong, so refuse it here where it is visible.
  if (url.origin === 'null') {
    return null;
  }
  return { chatUrl: raw.replace(/\/+$/, ''), chatOrigin: url.origin };
}
