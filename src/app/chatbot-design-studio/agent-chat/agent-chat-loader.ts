import { AgentChatAdapterModule } from './agent-chat-adapter.types';

export const SUPPORTED_PROTOCOL_VERSION = 1;

export class AgentChatLoadError extends Error {
  constructor(message: string) {
    super(message);
    // Defensive, not load-bearing: tsconfig targets es2020, where extending a
    // built-in works and this is a no-op. It is here so that lowering the
    // target -- which is what breaks `instanceof` on a subclassed Error --
    // does not quietly break the loader's error handling with it.
    Object.setPrototypeOf(this, AgentChatLoadError.prototype);
    this.name = 'AgentChatLoadError';
  }
}

/** Import a module by an address only known at run time.
 *
 *  Angular 14 builds on webpack 5, which sees `import(someVariable)` and tries
 *  to resolve it into a chunk at build time -- it cannot, and the import fails.
 *  Building the import inside `new Function` puts it beyond the bundler's
 *  view, which is the point. It is also the seam the tests replace. */
export const moduleImporter = {
  load: new Function('url', 'return import(url)') as (url: string) => Promise<any>
};

export async function loadAgentChatAdapter(chatUrl: string): Promise<AgentChatAdapterModule> {
  const url = `${chatUrl}/adapter/agent-chat-host.js`;
  let mod: any;
  try {
    mod = await moduleImporter.load(url);
  } catch {
    throw new AgentChatLoadError(
      `The chat at ${chatUrl} did not serve a usable adapter at ` +
      `/adapter/agent-chat-host.js. Either it is unreachable, or its /adapter/ ` +
      `location is missing an Access-Control-Allow-Origin header for ` +
      `${location.origin}.`);
  }
  // The chat's nginx serves index.html for any unmatched path, with status
  // 200. A wrong address therefore does not 404 -- it arrives as HTML, and
  // fails as a module parse error whose text explains nothing.
  if (typeof mod?.createAgentChatHost !== 'function') {
    throw new AgentChatLoadError(
      `${url} answered, but exports no createAgentChatHost. The chat is ` +
      `probably serving its index page there instead of the adapter.`);
  }
  if (mod.PROTOCOL_VERSION !== SUPPORTED_PROTOCOL_VERSION) {
    throw new AgentChatLoadError(
      `The chat speaks protocol v${mod.PROTOCOL_VERSION}; this design studio ` +
      `speaks v${SUPPORTED_PROTOCOL_VERSION}.`);
  }
  return mod as AgentChatAdapterModule;
}
