import {
  loadAgentChatAdapter, moduleImporter, AgentChatLoadError, SUPPORTED_PROTOCOL_VERSION
} from './agent-chat-loader';

describe('loadAgentChatAdapter', () => {
  let original: (url: string) => Promise<any>;

  beforeEach(() => { original = moduleImporter.load; });
  afterEach(() => { moduleImporter.load = original; });

  it('requests the adapter from the chat url', async () => {
    let requested: string;
    moduleImporter.load = (url) => {
      requested = url;
      return Promise.resolve({ createAgentChatHost: () => null, PROTOCOL_VERSION: 1 });
    };
    await loadAgentChatAdapter('https://chat.example.com');
    expect(requested).toBe('https://chat.example.com/adapter/agent-chat-host.js');
  });

  it('returns the module when it is well formed', async () => {
    const mod = { createAgentChatHost: () => null, PROTOCOL_VERSION: 1 };
    moduleImporter.load = () => Promise.resolve(mod);
    await expectAsync(loadAgentChatAdapter('https://chat.example.com'))
      .toBeResolvedTo(mod as any);
  });

  it('explains a failed import in terms of what could cause it', async () => {
    moduleImporter.load = () => Promise.reject(new TypeError('Failed to fetch'));
    await expectAsync(loadAgentChatAdapter('https://chat.example.com'))
      .toBeRejectedWithError(AgentChatLoadError, /did not serve a usable adapter/);
  });

  it('rejects a module with no createAgentChatHost', async () => {
    // The chat's nginx answers an unknown path with index.html and status 200,
    // so a wrong path arrives here as an object that is not the adapter rather
    // than as a 404.
    moduleImporter.load = () => Promise.resolve({});
    await expectAsync(loadAgentChatAdapter('https://chat.example.com'))
      .toBeRejectedWithError(AgentChatLoadError, /exports no createAgentChatHost/);
  });

  it('refuses a protocol version it does not speak', async () => {
    moduleImporter.load = () => Promise.resolve({
      createAgentChatHost: () => null, PROTOCOL_VERSION: 2
    });
    await expectAsync(loadAgentChatAdapter('https://chat.example.com'))
      .toBeRejectedWithError(AgentChatLoadError, /speaks protocol v2/);
  });

  it('speaks version 1', () => {
    expect(SUPPORTED_PROTOCOL_VERSION).toBe(1);
  });
});
