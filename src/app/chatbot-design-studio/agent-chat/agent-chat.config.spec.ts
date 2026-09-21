import { readAgentChatConfig } from './agent-chat.config';

describe('readAgentChatConfig', () => {

  it('returns null when the key is missing', () => {
    expect(readAgentChatConfig({})).toBeNull();
  });

  it('returns null for the CHANGEIT placeholder', () => {
    expect(readAgentChatConfig({ agentChatUrl: 'CHANGEIT' })).toBeNull();
  });

  it('returns null for a relative value', () => {
    expect(readAgentChatConfig({ agentChatUrl: '/chat' })).toBeNull();
  });

  it('returns null for an opaque origin', () => {
    expect(readAgentChatConfig({ agentChatUrl: 'data:text/html,x' })).toBeNull();
  });

  it('derives the origin from the url', () => {
    const cfg = readAgentChatConfig({ agentChatUrl: 'https://chat.example.com' });
    expect(cfg).toEqual({
      chatUrl: 'https://chat.example.com',
      chatOrigin: 'https://chat.example.com'
    });
  });

  it('strips a trailing slash so derived urls do not double up', () => {
    const cfg = readAgentChatConfig({ agentChatUrl: 'https://chat.example.com/' });
    expect(cfg.chatUrl).toBe('https://chat.example.com');
  });

  it('keeps a path prefix but reports only the origin as the origin', () => {
    const cfg = readAgentChatConfig({ agentChatUrl: 'https://example.com/chat' });
    expect(cfg.chatUrl).toBe('https://example.com/chat');
    expect(cfg.chatOrigin).toBe('https://example.com');
  });
});
