import { TestBed } from '@angular/core/testing';
import { AgentChatHostService } from './agent-chat-host.service';
import { FlowOpsService } from './flow-ops.service';
import { IntentService } from '../services/intent.service';
import { DashboardService } from 'src/app/services/dashboard.service';
import { AppConfigService } from 'src/app/services/app-config';
import { moduleImporter } from './agent-chat-loader';

describe('AgentChatHostService', () => {
  let service: AgentChatHostService;
  let flowOps: any;
  let registered: Record<string, Function>;
  let created: any;
  let originalImport: any;

  beforeEach(() => {
    registered = {};
    created = null;
    originalImport = moduleImporter.load;
    moduleImporter.load = () => Promise.resolve({
      PROTOCOL_VERSION: 1,
      createAgentChatHost: (opts: any) => {
        created = opts;
        return {
          registerTool: (name: string, fn: Function) => { registered[name] = fn; },
          setContext: jasmine.createSpy('setContext'),
          setToken: jasmine.createSpy('setToken'),
          destroy: jasmine.createSpy('destroy')
        };
      }
    });

    flowOps = {
      readFlow: jasmine.createSpy('readFlow').and.returnValue({ id_faq_kb: 'kb1', intents: [] }),
      apply: jasmine.createSpy('apply').and.returnValue(
        Promise.resolve({ ok: true, rejected_before_applying: false, results: [] }))
    };

    TestBed.configureTestingModule({
      providers: [
        AgentChatHostService,
        { provide: FlowOpsService, useValue: flowOps },
        { provide: IntentService, useValue: { intentSelected: { intent_id: 'i1' } } },
        { provide: DashboardService, useValue: { projectID: 'p1', id_faq_kb: 'kb1' } },
        { provide: AppConfigService, useValue: {
            getConfig: () => ({ agentChatUrl: 'https://chat.example.com' }) } }
      ]
    });
    service = TestBed.inject(AgentChatHostService);
    localStorage.setItem('tiledesk_token', 'jwt-abc');
  });

  afterEach(() => {
    moduleImporter.load = originalImport;
    localStorage.removeItem('tiledesk_token');
  });

  it('is configured when the url is present', () => {
    expect(service.isConfigured()).toBe(true);
  });

  it('names this page as the host origin in the iframe src', () => {
    expect(service.iframeSrc())
      .toBe(`https://chat.example.com/?hostOrigin=${encodeURIComponent(location.origin)}`);
  });

  it('posts to the origin derived from the same url as the src', async () => {
    await service.attach(document.createElement('iframe'));
    expect(created.chatOrigin).toBe('https://chat.example.com');
  });

  it('hands the chat the chat url as its runtime base, never the runtime itself', async () => {
    await service.attach(document.createElement('iframe'));
    const config = created.getConfig();
    expect(config.baseUrl).toBe('https://chat.example.com');
    expect(config.token).toBe('jwt-abc');
    expect(config.projectId).toBe('p1');
    expect(config.flowId).toBe('kb1');
  });

  it('registers exactly the three client tools', async () => {
    await service.attach(document.createElement('iframe'));
    expect(Object.keys(registered).sort())
      .toEqual(['apply_flow_patch', 'get_canvas_selection', 'get_flow']);
  });

  it('answers get_flow from the canvas', async () => {
    await service.attach(document.createElement('iframe'));
    const result = await registered['get_flow']({});
    expect(flowOps.readFlow).toHaveBeenCalled();
    expect(result).toEqual({ id_faq_kb: 'kb1', intents: [] });
  });

  it('answers get_canvas_selection with the selected intent id', async () => {
    await service.attach(document.createElement('iframe'));
    expect(await registered['get_canvas_selection']({}))
      .toEqual({ intent_ids: ['i1'] });
  });

  it('passes apply_flow_patch operations to FlowOpsService', async () => {
    await service.attach(document.createElement('iframe'));
    const ops = [{ op: 'move', intent_id: 'i1', position: { x: 1, y: 2 } }];
    await registered['apply_flow_patch']({ operations: ops });
    expect(flowOps.apply).toHaveBeenCalledWith(ops);
  });

  it('reports the load failure rather than leaving the panel blank', async () => {
    moduleImporter.load = () => Promise.reject(new TypeError('Failed to fetch'));
    await expectAsync(service.attach(document.createElement('iframe'))).toBeRejected();
    expect(service.lastError).toContain('did not serve a usable adapter');
  });

  it('is not configured when the url is missing', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        AgentChatHostService,
        { provide: FlowOpsService, useValue: flowOps },
        { provide: IntentService, useValue: {} },
        { provide: DashboardService, useValue: {} },
        { provide: AppConfigService, useValue: { getConfig: () => ({}) } }
      ]
    });
    expect(TestBed.inject(AgentChatHostService).isConfigured()).toBe(false);
  });
});
