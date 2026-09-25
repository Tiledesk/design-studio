import { actionTypeRefusal, resolveAttachedServers } from './agent-chat-capabilities.rules';
import { CapabilitiesSnapshot } from './agent-chat-capabilities.model';

function aSnapshot(overrides: Partial<CapabilitiesSnapshot['capabilities']> = {}): CapabilitiesSnapshot {
  return {
    capabilities: {
      chatbot_subtype: 'chatbot', subagent: false,
      actions: [
        { type: 'reply', status: 'available' },
        { type: 'ai_prompt', status: 'available' },
        { type: 'code', status: 'needs_upgrade', plan: 'Custom' }
      ],
      mcp_servers: [
        { id: 'tiledesk-communicator', name: 'Tiledesk Communicator', native: true,
          transport: 'streamable_http',
          tools: [{ name: 'REPLY_TO_USER' }, { name: 'TRANSFER_TO_AGENT' }] },
        { id: 'tiledesk-data-table', name: 'Tiledesk Data Table', native: true,
          transport: 'streamable_http', tools: [], tools_error: 'connect failed: 502' },
        { name: 'Acme CRM', native: false, transport: 'streamable_http',
          tools: [{ name: 'lookup_customer' }] }
      ],
      ...overrides
    },
    customServerConfigs: {
      'Acme CRM': { name: 'Acme CRM', url: 'https://crm.example.com/mcp', transport: 'streamable_http',
        customHeaders: [{ enabled: true, key: 'x-api-key', value: 'secret' }] }
    }
  };
}

describe('actionTypeRefusal', () => {
  const caps = aSnapshot().capabilities;

  it('allows an available type', () => {
    expect(actionTypeRefusal('reply', caps)).toBeNull();
  });

  it('refuses a plan-gated type, naming the plan and telling the agent to tell the user', () => {
    const error = actionTypeRefusal('code', caps);
    expect(error).toContain('Custom');
    expect(error).toContain('tell the user');
  });

  it('refuses a type the project does not have, pointing at get_project_capabilities', () => {
    expect(actionTypeRefusal('gpt_task', caps)).toContain('get_project_capabilities');
  });
});

describe('resolveAttachedServers', () => {
  it('builds a native entry from the capability, with no url', () => {
    const r = resolveAttachedServers(
      [{ id: 'tiledesk-communicator', tools: ['TRANSFER_TO_AGENT'] }], aSnapshot());
    expect(r.error).toBeUndefined();
    expect(r.servers).toEqual([jasmine.objectContaining({
      id: 'tiledesk-communicator', name: 'Tiledesk Communicator', native: true,
      transport: 'streamable_http', tools: ['TRANSFER_TO_AGENT']
    })]);
    expect(r.servers[0].url).toBeUndefined();
  });

  it('builds a custom entry with url and headers from the integration, never from the agent', () => {
    const r = resolveAttachedServers(
      [{ name: 'Acme CRM', url: 'https://evil.example.com', tools: ['lookup_customer'] }], aSnapshot());
    expect(r.servers[0].url).toBe('https://crm.example.com/mcp');
    expect(r.servers[0].customHeaders).toEqual(
      [{ enabled: true, key: 'x-api-key', value: 'secret' }]);
    expect(r.servers[0].native).toBe(false);
    expect(r.servers[0].id).toBeUndefined();
  });

  it('refuses a native server addressed by name, listing attachable ids', () => {
    const r = resolveAttachedServers(
      [{ name: 'Tiledesk Communicator', tools: ['REPLY_TO_USER'] }], aSnapshot());
    expect(r.error).toContain('tiledesk-communicator');
    expect(r.servers).toBeUndefined();
  });

  it('refuses an unknown server', () => {
    expect(resolveAttachedServers([{ id: 'nope', tools: ['X'] }], aSnapshot()).error)
      .toContain('"nope"');
  });

  it('refuses a server whose tools could not be read', () => {
    expect(resolveAttachedServers([{ id: 'tiledesk-data-table', tools: ['DATATABLE_QUERY_ROWS'] }],
      aSnapshot()).error).toContain('connect failed: 502');
  });

  it('refuses an unknown tool, listing the server tools', () => {
    const error = resolveAttachedServers(
      [{ id: 'tiledesk-communicator', tools: ['CLOSE_EVERYTHING'] }], aSnapshot()).error;
    expect(error).toContain('CLOSE_EVERYTHING');
    expect(error).toContain('REPLY_TO_USER');
  });

  it('says a server has no tools instead of listing an empty set', () => {
    const snap = aSnapshot({ mcp_servers: [
      { name: 'Empty CRM', native: false, transport: 'streamable_http', tools: [] }
    ] });
    const error = resolveAttachedServers([{ name: 'Empty CRM', tools: ['lookup_customer'] }], snap).error;
    expect(error).toContain('has no tools');
    expect(error).not.toContain('Its tools are');
  });

  it('refuses an empty or missing tools list', () => {
    expect(resolveAttachedServers([{ id: 'tiledesk-communicator', tools: [] }], aSnapshot()).error)
      .toContain('tools');
    expect(resolveAttachedServers([{ id: 'tiledesk-communicator' }], aSnapshot()).error)
      .toContain('tools');
  });

  it('refuses the same server twice', () => {
    expect(resolveAttachedServers([
      { id: 'tiledesk-communicator', tools: ['REPLY_TO_USER'] },
      { id: 'tiledesk-communicator', tools: ['TRANSFER_TO_AGENT'] }
    ], aSnapshot()).error).toContain('twice');
  });

  it('refuses a non-array', () => {
    expect(resolveAttachedServers({ id: 'x' }, aSnapshot()).error).toContain('array');
  });

  it('accepts an empty array, which clears the tools', () => {
    expect(resolveAttachedServers([], aSnapshot())).toEqual({ servers: [] });
  });

  it('says why nothing is attachable when the MCP servers could not be read', () => {
    const snap = aSnapshot({ mcp_servers: [], mcp_error: 'native MCP servers could not be read: 503' });
    expect(resolveAttachedServers([{ id: 'tiledesk-communicator', tools: ['REPLY_TO_USER'] }], snap).error)
      .toContain('503');
  });
});
