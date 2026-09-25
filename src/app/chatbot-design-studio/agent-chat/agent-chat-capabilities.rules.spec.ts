import {
  actionTypeRefusal, resolveAttachedServers, resolveLlmModel, withDefaultLlmModel
} from './agent-chat-capabilities.rules';
import { CapabilitiesSnapshot } from './agent-chat-capabilities.model';
import { LlmModel, applySelectedServerToAction } from '../utils-llm-models';

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
      llm_models: [],
      ...overrides
    },
    llmModels: [],
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

function aModel(llm: string, model: string, modelName: string, server?: string): LlmModel {
  return {
    uid: `${llm}::${server ?? ''}::${model}`, modelName, llm, llmLabel: llm, model,
    description: '', src: '', status: 'active', configured: true,
    ...(server ? { server } : {})
  };
}

/** A snapshot whose models are `models`, exposed and kept alike. */
function withModels(models: LlmModel[], error?: string): CapabilitiesSnapshot {
  const snap = aSnapshot({
    llm_models: models.map(m => ({ llm: m.llm, model: m.model, label: `${m.llmLabel} · ${m.modelName}`,
      ...(m.server ? { server: m.server } : {}) })),
    ...(error ? { llm_models_error: error } : {})
  });
  snap.llmModels = models;
  return snap;
}

const MODELS: LlmModel[] = [
  aModel('openai', 'gpt-4.1-mini', 'GPT-4.1 mini'),
  aModel('openai', 'gpt-4o', 'GPT-4o'),
  aModel('anthropic', 'claude-sonnet-4', 'Claude Sonnet 4'),
  aModel('vllm', 'llama-3', 'gpu-a ・ llama-3', 'gpu-a'),
  aModel('vllm', 'llama-3', 'gpu-b ・ llama-3', 'gpu-b'),
  aModel('agentplatform', 'gemini-2.5-flash', 'eu ・ gemini-2.5-flash', 'eu')
];

/** What the three panels' own setModel() writes for `model` -- the same four
 *  lines in cds-action-ai-prompt, cds-action-ai-condition and
 *  cds-action-askgpt-v2 -- as it is saved (undefined keys dropped). */
function whatThePanelStores(model: LlmModel, existing: Record<string, any> = {}): Record<string, any> {
  const action: any = { ...existing };
  action.llm = model?.llm ? model.llm : '';
  action.model = model?.model ? model.model : '';
  action.modelName = model?.modelName ? model.modelName : '';
  applySelectedServerToAction(action, model);
  return action;
}

function saved(fields: Record<string, any>): Record<string, any> {
  return JSON.parse(JSON.stringify(fields));
}

describe('resolveLlmModel', () => {
  const snap = withModels(MODELS);

  it('leaves fields that set no model untouched, for any type', () => {
    const fields = { question: 'q', max_tokens: 100 };
    expect(resolveLlmModel('ai_prompt', fields, snap)).toEqual({ fields });
    expect(resolveLlmModel('ai_prompt', undefined, snap)).toEqual({ fields: undefined });
  });

  it('leaves an action type without a model alone, whatever its fields', () => {
    const fields = { llm: 'nope', model: 'nope' };
    expect(resolveLlmModel('reply', fields, snap)).toEqual({ fields });
  });

  for (const type of ['ai_prompt', 'ai_condition', 'askgptv2']) {
    it(`stores for ${type} exactly what its panel's setModel writes, keeping the other fields`, () => {
      const r = resolveLlmModel(type, { question: 'q', llm: 'anthropic', model: 'claude-sonnet-4' }, snap);
      expect(r.error).toBeUndefined();
      expect(saved(r.fields)).toEqual({ question: 'q', ...whatThePanelStores(MODELS[2]) });
    });
  }

  it('replaces a modelName or labelModel the agent made up with the entry\'s own', () => {
    const r = resolveLlmModel('ai_prompt',
      { llm: 'openai', model: 'gpt-4o', modelName: 'made up', labelModel: 'x' }, snap);
    expect(r.fields.modelName).toBe('GPT-4o');
  });

  it('clears the server fields for a single-server provider, so an old server does not linger', () => {
    const r = resolveLlmModel('ai_prompt', { llm: 'openai', model: 'gpt-4o', vllmServer: 'gpu-a' }, snap);
    expect('vllmServer' in r.fields).toBe(true);
    expect(r.fields.vllmServer).toBeUndefined();
    expect(r.fields.agentPlatformServer).toBeUndefined();
  });

  it('takes the vLLM server from vllmServer, as the panel stores it', () => {
    const r = resolveLlmModel('ai_prompt', { llm: 'vllm', model: 'llama-3', vllmServer: 'gpu-b' }, snap);
    expect(saved(r.fields)).toEqual(whatThePanelStores(MODELS[4]));
    expect(r.fields.vllmServer).toBe('gpu-b');
    expect(r.fields.modelName).toBe('gpu-b ・ llama-3');
  });

  it('infers the server when only one serves that model, and stores it under the provider\'s field', () => {
    const r = resolveLlmModel('askgptv2', { llm: 'agentplatform', model: 'gemini-2.5-flash' }, snap);
    expect(r.error).toBeUndefined();
    expect(saved(r.fields)).toEqual(whatThePanelStores(MODELS[5]));
    expect(r.fields.agentPlatformServer).toBe('eu');
    expect(r.fields.vllmServer).toBeUndefined();
  });

  it('asks for the server when several serve that model, listing them', () => {
    const r = resolveLlmModel('ai_prompt', { llm: 'vllm', model: 'llama-3' }, snap);
    expect(r.fields).toBeUndefined();
    expect(r.error).toContain('vllmServer');
    expect(r.error).toContain('gpu-a');
    expect(r.error).toContain('gpu-b');
  });

  it('refuses a server that does not serve that model', () => {
    const r = resolveLlmModel('ai_prompt', { llm: 'vllm', model: 'llama-3', vllmServer: 'gpu-z' }, snap);
    expect(r.error).toContain('gpu-z');
    expect(r.error).toContain('vllm / llama-3 @ gpu-a');
  });

  it('refuses an unknown model, naming what was sent and listing every valid choice', () => {
    const r = resolveLlmModel('ai_condition', { llm: 'openai', model: 'gpt-9' }, snap);
    expect(r.fields).toBeUndefined();
    expect(r.error).toContain('openai / gpt-9');
    expect(r.error).toContain('openai / gpt-4o');
    expect(r.error).toContain('anthropic / claude-sonnet-4');
    expect(r.error).toContain('vllm / llama-3 @ gpu-b');
    expect(r.error).toContain('agentplatform / gemini-2.5-flash @ eu');
  });

  it('refuses a model given without its provider', () => {
    expect(resolveLlmModel('ai_prompt', { model: 'gpt-4o' }, snap).error).toContain('gpt-4o');
  });

  it('caps the list of choices at 40', () => {
    const many = Array.from({ length: 45 }, (_, i) => aModel('openai', `m-${i}`, `M ${i}`));
    const error = resolveLlmModel('ai_prompt', { llm: 'openai', model: 'nope' }, withModels(many)).error;
    expect(error).toContain('openai / m-39');
    expect(error).not.toContain('openai / m-40');
    expect(error).toContain('and 5 more');
  });

  it('says the model cannot be set, and why, when the project\'s models could not be read', () => {
    const error = resolveLlmModel('ai_prompt', { llm: 'openai', model: 'gpt-4o' },
      withModels([], 'integrations 503')).error;
    expect(error).toContain('integrations 503');
    expect(error).toContain('cannot be set');
  });

  it('says the model cannot be set when the project has no model configured', () => {
    const error = resolveLlmModel('ai_prompt', { llm: 'openai', model: 'gpt-4o' }, withModels([])).error;
    expect(error).toContain('cannot be set');
  });
});

describe('withDefaultLlmModel', () => {
  it('gives an action that sets no model the default, GPT-4o, when the project has it', () => {
    const fields = withDefaultLlmModel('ai_condition', { instructions: 'i' }, withModels(MODELS));
    expect(saved(fields)).toEqual({ instructions: 'i', ...whatThePanelStores(MODELS[1]) });
  });

  it('gives the first model when the project has no GPT-4o', () => {
    const fields = withDefaultLlmModel('ai_prompt', undefined, withModels(MODELS.slice(2)));
    expect(saved(fields)).toEqual(whatThePanelStores(MODELS[2]));
  });

  it('leaves an action that sets its own model, another type, or a project with no model alone', () => {
    const own = { llm: 'anthropic', model: 'claude-sonnet-4' };
    expect(withDefaultLlmModel('ai_prompt', own, withModels(MODELS))).toBe(own);
    const reply = { text: 'hi' };
    expect(withDefaultLlmModel('reply', reply, withModels(MODELS))).toBe(reply);
    const none = { question: 'q' };
    expect(withDefaultLlmModel('askgptv2', none, withModels([]))).toBe(none);
  });
});
