import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { AgentChatCapabilitiesService, AgentChatLlmModelsLoader } from './agent-chat-capabilities.service';
import { DashboardService } from 'src/app/services/dashboard.service';
import { McpService } from 'src/app/services/mcp.service';
import { ProjectPlanUtils } from 'src/app/utils/project-utils';
import { ACTIONS_LIST } from '../utils-actions';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

describe('AgentChatCapabilitiesService', () => {
  let service: AgentChatCapabilitiesService;
  let dashboardService: any;
  let mcpService: any;
  let planUtils: any;
  let planUtilsBuilt: number;
  let savedList: string;
  let llmLoader: any;
  let loaderBuilt: number;
  let translate: any;

  beforeEach(() => {
    LoggerInstance.setInstance({
      log() {}, error() {}, warn() {}, info() {}, debug() {}, setLoggerConfig() {}
    } as any);
    savedList = JSON.stringify(ACTIONS_LIST);
    dashboardService = { projectID: 'p1', selectedChatbot: { subtype: 'chatbot' } };
    planUtils = { checkIfCanLoad: jasmine.createSpy('checkIfCanLoad').and.returnValue(true) };
    mcpService = {
      loadNativeServers: jasmine.createSpy('loadNativeServers').and.returnValue(Promise.resolve([
        { id: 'tiledesk-communicator', name: 'Tiledesk Communicator', native: true,
          transport: 'streamable_http', url: 'https://secret.example.com/mcp', description: 'Talk to the visitor' }
      ])),
      connectNativeServer: jasmine.createSpy('connectNativeServer').and.returnValue(Promise.resolve([
        { name: 'REPLY_TO_USER', description: 'Send a message' },
        { name: 'TRANSFER_TO_AGENT', description: 'Hand off' }
      ])),
      loadMcpServers: jasmine.createSpy('loadMcpServers').and.returnValue(Promise.resolve([
        { name: 'Acme CRM', url: 'https://crm.example.com/mcp', transport: 'streamable_http',
          customHeaders: [{ enabled: true, key: 'x-api-key', value: 'secret' }],
          tools: [{ name: 'lookup_customer' }, { name: 'delete_customer' }],
          selectedTools: ['lookup_customer'] },
        { name: 'Stale native copy', native: true, url: 'x', transport: 'streamable_http' }
      ])),
      saveMcpIntegration: jasmine.createSpy('saveMcpIntegration').and.returnValue(Promise.resolve())
    };
    // What initLLMModels answers: every model, configured or not, in its own
    // order (OpenAI first), as the AI action pickers show them.
    llmLoader = { load: jasmine.createSpy('load').and.returnValue(Promise.resolve([
      { uid: 'openai::::gpt-4o', modelName: 'GPT-4o', llm: 'openai', llmLabel: 'OpenAI', model: 'gpt-4o',
        description: 'TYPE_GPT_MODEL.gpt-4o.description', src: 'x', status: 'active', configured: true,
        min_tokens: 1, max_output_tokens: 16384, reasoning: false, multiplier: '1 x tokens' },
      { uid: 'anthropic::::claude-sonnet-4', modelName: 'Claude Sonnet 4', llm: 'anthropic',
        llmLabel: 'Anthropic', model: 'claude-sonnet-4', description: 'TYPE_GPT_MODEL.untranslated.description',
        src: 'x', status: 'active', configured: false, max_output_tokens: 64000 },
      { uid: 'vllm::gpu-a::llama-3', modelName: 'gpu-a ・ llama-3', llm: 'vllm', llmLabel: 'vLLM',
        model: 'llama-3', description: '', src: 'x', status: 'active', configured: true,
        max_output_tokens: 128000, reasoning: true, server: 'gpu-a',
        url: 'https://secret.example.com/v1', apikey: 'secret' }
    ])) };
    translate = { instant: jasmine.createSpy('instant').and.callFake((key: string) =>
      key === 'TYPE_GPT_MODEL.gpt-4o.description' ? 'Fast and capable' : key) };
    TestBed.configureTestingModule({
      providers: [
        AgentChatCapabilitiesService,
        { provide: DashboardService, useValue: dashboardService },
        { provide: McpService, useValue: mcpService },
        { provide: AgentChatLlmModelsLoader, useFactory: () => { loaderBuilt++; return llmLoader; } },
        { provide: TranslateService, useValue: translate },
        { provide: ProjectPlanUtils, useFactory: () => { planUtilsBuilt++; return planUtils; } }
      ]
    });
    planUtilsBuilt = 0;
    loaderBuilt = 0;
    service = TestBed.inject(AgentChatCapabilitiesService);
  });

  // ProjectPlanUtils reads the current project in its constructor. This
  // service is built with the agent-chat host at dashboard start, before a
  // project is loaded; building ProjectPlanUtils then threw and the flow never
  // opened (found on stage).
  it('does not build ProjectPlanUtils until capabilities are asked for', async () => {
    expect(planUtilsBuilt).toBe(0);
    await service.snapshot();
    expect(planUtilsBuilt).toBe(1);
  });

  it('lists only the configured models, in initLLMModels\' order, with what the agent picks by', async () => {
    const snap = await service.snapshot();
    expect(snap.capabilities.llm_models).toEqual([
      { llm: 'openai', model: 'gpt-4o', label: 'OpenAI · GPT-4o', description: 'Fast and capable',
        cost_multiplier: '1 x tokens', max_output_tokens: 16384 },
      { llm: 'vllm', model: 'llama-3', label: 'vLLM · gpu-a ・ llama-3', server: 'gpu-a',
        reasoning: true, max_output_tokens: 128000 }
    ]);
    expect(snap.capabilities.llm_models_error).toBeUndefined();
    expect(snap.llmModels.map(m => m.uid)).toEqual(['openai::::gpt-4o', 'vllm::gpu-a::llama-3']);
  });

  it('never puts a model\'s key or url in what the agent is sent', async () => {
    const { capabilities } = await service.snapshot();
    expect(JSON.stringify(capabilities.llm_models)).not.toContain('secret');
    expect(JSON.stringify(capabilities.llm_models)).not.toContain('https://');
  });

  it('reads the models again on every call', async () => {
    await service.snapshot();
    await service.snapshot();
    expect(llmLoader.load).toHaveBeenCalledTimes(2);
  });

  it('reports llm_models_error when the models cannot be read, and still returns actions and servers', async () => {
    llmLoader.load.and.returnValue(Promise.reject(new Error('integrations 503')));
    const snap = await service.snapshot();
    expect(snap.capabilities.llm_models).toEqual([]);
    expect(snap.capabilities.llm_models_error).toContain('integrations 503');
    expect(snap.llmModels).toEqual([]);
    expect(snap.capabilities.actions.length).toBeGreaterThan(0);
    expect(snap.capabilities.mcp_servers.length).toBe(2);
  });

  // Same reason as ProjectPlanUtils above: the loader reaches ProjectService
  // and the app config, which this early service must not need to exist.
  it('does not build the models loader until capabilities are asked for', async () => {
    expect(loaderBuilt).toBe(0);
    await service.snapshot();
    expect(loaderBuilt).toBe(1);
  });

  afterEach(() => {
    // Restore statuses a test may have changed on the shared list.
    const saved = JSON.parse(savedList);
    Object.keys(saved).forEach(k => ACTIONS_LIST[k].status = saved[k].status);
  });

  it('marks plan-gated actions needs_upgrade with the plan name, and the rest available', async () => {
    planUtils.checkIfCanLoad.and.returnValue(false);
    const { capabilities } = await service.snapshot();
    const gated = capabilities.actions.filter(a => a.status === 'needs_upgrade');
    expect(gated.length).toBeGreaterThan(0);
    expect(gated.every(a => typeof a.plan === 'string' && a.plan.length > 0)).toBe(true);
    expect(capabilities.actions.some(a => a.status === 'available')).toBe(true);
    expect(capabilities.actions.every(a => a.status === 'available' ? a.plan === undefined : true)).toBe(true);
  });

  it('leaves out an action ProjectPlanUtils made inactive', async () => {
    const reply = Object.values(ACTIONS_LIST).find(el => el.type === 'reply');
    reply.status = 'inactive';
    const { capabilities } = await service.snapshot();
    expect(capabilities.actions.map(a => a.type)).not.toContain('reply');
  });

  it('lists native servers with discovered tools and no url', async () => {
    const { capabilities } = await service.snapshot();
    const native = capabilities.mcp_servers.find(s => s.native);
    expect(native).toEqual({
      id: 'tiledesk-communicator', name: 'Tiledesk Communicator', native: true,
      transport: 'streamable_http', description: 'Talk to the visitor', configured: false,
      tools: [{ name: 'REPLY_TO_USER', description: 'Send a message' },
              { name: 'TRANSFER_TO_AGENT', description: 'Hand off' }]
    });
    expect(JSON.stringify(capabilities)).not.toContain('secret');
    expect(JSON.stringify(capabilities)).not.toContain('https://');
  });

  it('lists custom servers with every tool the integration discovered, keeping their config apart', async () => {
    const snap = await service.snapshot();
    const custom = snap.capabilities.mcp_servers.filter(s => !s.native);
    expect(custom).toEqual([{ name: 'Acme CRM', native: false, transport: 'streamable_http',
      tools: [{ name: 'lookup_customer' }, { name: 'delete_customer' }] }]);
    expect(snap.customServerConfigs['Acme CRM'].url).toBe('https://crm.example.com/mcp');
  });

  it('treats a custom server tools value that is not an array, or null entries, as no tools', async () => {
    mcpService.loadMcpServers.and.returnValue(Promise.resolve([
      { name: 'Broken', transport: 'streamable_http', tools: 'oops' },
      { name: 'Holes', transport: 'streamable_http', tools: [null, { name: 'lookup_customer' }] }
    ]));
    const { capabilities } = await service.snapshot();
    const custom = capabilities.mcp_servers.filter(s => !s.native);
    expect(custom).toEqual([
      { name: 'Broken', native: false, transport: 'streamable_http', tools: [] },
      { name: 'Holes', native: false, transport: 'streamable_http', tools: [{ name: 'lookup_customer' }] }
    ]);
  });

  it('retries on the next call when loading the servers threw', async () => {
    mcpService.loadNativeServers.and.returnValue(Promise.resolve(null));
    await expectAsync(service.snapshot()).toBeRejected();
    mcpService.loadNativeServers.and.returnValue(Promise.resolve([]));
    const { capabilities } = await service.snapshot();
    expect(mcpService.loadNativeServers).toHaveBeenCalledTimes(2);
    expect(capabilities.mcp_servers.length).toBe(1);
  });

  it('gives up on a native server that has not connected within 10 seconds', async () => {
    jasmine.clock().install();
    try {
      let called: () => void;
      const connectCalled = new Promise<void>(resolve => called = resolve);
      mcpService.connectNativeServer.and.callFake(() => { called(); return new Promise(() => {}); });
      const pending = service.snapshot();
      await connectCalled;
      jasmine.clock().tick(10000);
      const { capabilities } = await pending;
      const native = capabilities.mcp_servers.find(s => s.native);
      expect(native.tools).toEqual([]);
      expect(native.tools_error).toBe('connect failed: timed out');
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('keeps a successful MCP answer for 60 seconds, then reads it again', async () => {
    jasmine.clock().install();
    try {
      jasmine.clock().mockDate(new Date(2026, 8, 25, 12, 0, 0));
      await service.snapshot();
      jasmine.clock().tick(59000);
      await service.snapshot();
      expect(mcpService.loadNativeServers).toHaveBeenCalledTimes(1);
      jasmine.clock().tick(2000);
      await service.snapshot();
      expect(mcpService.loadNativeServers).toHaveBeenCalledTimes(2);
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('marks a native server whose connect fails, without failing the call', async () => {
    mcpService.connectNativeServer.and.returnValue(Promise.reject(new Error('502 Bad Gateway')));
    const { capabilities } = await service.snapshot();
    const native = capabilities.mcp_servers.find(s => s.native);
    expect(native.tools).toEqual([]);
    expect(native.tools_error).toContain('502');
    expect(capabilities.actions.length).toBeGreaterThan(0);
  });

  it('reports mcp_error when the servers cannot be listed, and still returns actions', async () => {
    mcpService.loadNativeServers.and.returnValue(Promise.reject(new Error('503')));
    mcpService.loadMcpServers.and.returnValue(Promise.reject(new Error('503')));
    const { capabilities } = await service.snapshot();
    expect(capabilities.mcp_servers).toEqual([]);
    expect(capabilities.mcp_error).toContain('503');
    expect(capabilities.actions.length).toBeGreaterThan(0);
  });

  it('reads the MCP servers once per project, but recomputes actions on every call', async () => {
    await service.snapshot();
    dashboardService.selectedChatbot = { subtype: 'subagent' };
    const second = await service.snapshot();
    expect(mcpService.loadNativeServers).toHaveBeenCalledTimes(1);
    expect(mcpService.connectNativeServer).toHaveBeenCalledTimes(1);
    expect(second.capabilities.subagent).toBe(true);
    expect(second.capabilities.chatbot_subtype).toBe('chatbot');
  });

  it('retries on the next call when a server failed, instead of caching the failure', async () => {
    mcpService.connectNativeServer.and.returnValue(Promise.reject(new Error('502')));
    await service.snapshot();
    mcpService.connectNativeServer.and.returnValue(Promise.resolve([{ name: 'REPLY_TO_USER' }]));
    const { capabilities } = await service.snapshot();
    expect(capabilities.mcp_servers.find(s => s.native).tools_error).toBeUndefined();
    expect(mcpService.connectNativeServer).toHaveBeenCalledTimes(2);
  });

  it('reads the servers again after the project changes', async () => {
    await service.snapshot();
    dashboardService.projectID = 'p2';
    await service.snapshot();
    expect(mcpService.loadNativeServers).toHaveBeenCalledTimes(2);
  });

  it('marks configured true for a native matched by id or by name in the integration, false when absent; a custom server carries no configured', async () => {
    mcpService.loadNativeServers.and.returnValue(Promise.resolve([
      { id: 'tiledesk-communicator', name: 'Tiledesk Communicator', native: true, transport: 'streamable_http' },
      { id: 'tiledesk-data-table', name: 'Tiledesk Data Table', native: true, transport: 'streamable_http' },
      { id: 'tiledesk-unused', name: 'Tiledesk Unused', native: true, transport: 'streamable_http' }
    ]));
    mcpService.connectNativeServer.and.returnValue(Promise.resolve([]));
    mcpService.loadMcpServers.and.returnValue(Promise.resolve([
      // Matched by id, even though the copy stored in the integration has a
      // different name -- the same rule isConfigured uses.
      { id: 'tiledesk-communicator', name: 'Renamed copy', native: true, url: '', transport: 'streamable_http' },
      // Matched by name only, as a stale copy without an id would be.
      { name: 'Tiledesk Data Table', native: true, url: '', transport: 'streamable_http' },
      { name: 'Acme CRM', url: 'https://crm.example.com/mcp', transport: 'streamable_http', tools: [] }
    ]));
    const { capabilities } = await service.snapshot();
    const byId = (id: string) => capabilities.mcp_servers.find(s => s.id === id);
    expect(byId('tiledesk-communicator').configured).toBe(true);
    expect(byId('tiledesk-data-table').configured).toBe(true);
    expect(byId('tiledesk-unused').configured).toBe(false);
    const custom = capabilities.mcp_servers.find(s => !s.native);
    expect('configured' in custom).toBe(false);
  });

  describe('configureNativeServers', () => {
    it('reads the integration fresh, appends the missing native without selectedTools, keeps existing entries in order, saves once and invalidates', async () => {
      mcpService.loadNativeServers.and.returnValue(Promise.resolve([
        { id: 'tiledesk-data-table', name: 'Tiledesk Data Table', native: true,
          transport: 'streamable_http', description: 'Read and write rows' }
      ]));
      mcpService.connectNativeServer.and.returnValue(Promise.resolve([
        { name: 'GET_ROW', description: 'Read a row' }
      ]));
      const existing = [
        { name: 'Acme CRM', url: 'https://crm.example.com/mcp', transport: 'streamable_http', tools: [] }
      ];
      mcpService.loadMcpServers.and.returnValue(Promise.resolve(existing));
      // Populates the private catalogue entry the configurer reads from.
      await service.snapshot();
      mcpService.loadMcpServers.calls.reset();
      // Changed since the snapshot was taken: configureNativeServers must read
      // it again, not reuse the cached copy.
      const freshIntegration = [...existing, { name: 'Another one', url: 'x', transport: 'streamable_http', tools: [] }];
      mcpService.loadMcpServers.and.returnValue(Promise.resolve(freshIntegration));

      await service.configureNativeServers(['tiledesk-data-table']);

      expect(mcpService.loadMcpServers).toHaveBeenCalledTimes(1);
      expect(mcpService.saveMcpIntegration).toHaveBeenCalledTimes(1);
      const saved = mcpService.saveMcpIntegration.calls.mostRecent().args[0];
      expect(saved).toEqual([
        ...freshIntegration,
        { id: 'tiledesk-data-table', name: 'Tiledesk Data Table', url: '', transport: 'streamable_http',
          native: true, description: 'Read and write rows', tools: [{ name: 'GET_ROW', description: 'Read a row' }] }
      ]);

      mcpService.loadNativeServers.calls.reset();
      await service.snapshot();
      expect(mcpService.loadNativeServers).toHaveBeenCalledTimes(1);
    });

    it('does not save when the id is already configured', async () => {
      mcpService.loadNativeServers.and.returnValue(Promise.resolve([
        { id: 'tiledesk-communicator', name: 'Tiledesk Communicator', native: true, transport: 'streamable_http' }
      ]));
      mcpService.loadMcpServers.and.returnValue(Promise.resolve([
        { id: 'tiledesk-communicator', name: 'Tiledesk Communicator', native: true, url: '', transport: 'streamable_http' }
      ]));
      await service.configureNativeServers(['tiledesk-communicator']);
      expect(mcpService.saveMcpIntegration).not.toHaveBeenCalled();
    });

    it('rejects when saveMcpIntegration rejects', async () => {
      mcpService.loadNativeServers.and.returnValue(Promise.resolve([
        { id: 'tiledesk-data-table', name: 'Tiledesk Data Table', native: true, transport: 'streamable_http' }
      ]));
      mcpService.loadMcpServers.and.returnValue(Promise.resolve([]));
      mcpService.saveMcpIntegration.and.returnValue(Promise.reject(new Error('network down')));
      await expectAsync(service.configureNativeServers(['tiledesk-data-table']))
        .toBeRejectedWithError('network down');
    });

    // Silently dropping an id nobody could add would leave flow-ops thinking
    // the batch is safe to apply, with the native still unconfigured.
    it('throws naming the id when the requested native has no catalogue entry, and saves nothing', async () => {
      mcpService.loadNativeServers.and.returnValue(Promise.resolve([]));
      mcpService.loadMcpServers.and.returnValue(Promise.resolve([]));
      await expectAsync(service.configureNativeServers(['tiledesk-data-table']))
        .toBeRejectedWithError(/tiledesk-data-table/);
      expect(mcpService.saveMcpIntegration).not.toHaveBeenCalled();
    });

    it('treats a catalogue entry with no discovered tools (a failed connect) as missing, and saves nothing', async () => {
      mcpService.loadNativeServers.and.returnValue(Promise.resolve([
        { id: 'tiledesk-data-table', name: 'Tiledesk Data Table', native: true, transport: 'streamable_http' }
      ]));
      mcpService.connectNativeServer.and.returnValue(Promise.reject(new Error('502')));
      mcpService.loadMcpServers.and.returnValue(Promise.resolve([]));
      await expectAsync(service.configureNativeServers(['tiledesk-data-table']))
        .toBeRejectedWithError(/tiledesk-data-table/);
      expect(mcpService.saveMcpIntegration).not.toHaveBeenCalled();
    });
  });
});
