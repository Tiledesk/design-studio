import { TestBed } from '@angular/core/testing';
import { AgentChatCapabilitiesService } from './agent-chat-capabilities.service';
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
  let savedList: string;

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
      ]))
    };
    TestBed.configureTestingModule({
      providers: [
        AgentChatCapabilitiesService,
        { provide: DashboardService, useValue: dashboardService },
        { provide: McpService, useValue: mcpService },
        { provide: ProjectPlanUtils, useValue: planUtils }
      ]
    });
    service = TestBed.inject(AgentChatCapabilitiesService);
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
      transport: 'streamable_http', description: 'Talk to the visitor',
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
});
