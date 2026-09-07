import { TestBed } from '@angular/core/testing';
import { AgentChatHostService } from './agent-chat-host.service';
import { FlowOpsService } from './flow-ops.service';
import { IntentService } from '../services/intent.service';
import { DashboardService } from 'src/app/services/dashboard.service';
import { AppConfigService } from 'src/app/services/app-config';
import { TiledeskAuthService } from 'src/chat21-core/providers/tiledesk/tiledesk-auth.service';
import { moduleImporter } from './agent-chat-loader';
import { BehaviorSubject, Subject } from 'rxjs';

describe('AgentChatHostService', () => {
  let service: AgentChatHostService;
  let flowOps: any;
  let registered: Record<string, Function>;
  let created: any;
  let createdHosts: any[];
  let originalImport: any;
  let tokenChanged: Subject<string>;
  let selectedChatbot: BehaviorSubject<any>;
  let dashboardService: any;

  beforeEach(() => {
    registered = {};
    created = null;
    createdHosts = [];
    originalImport = moduleImporter.load;
    moduleImporter.load = () => Promise.resolve({
      PROTOCOL_VERSION: 1,
      createAgentChatHost: (opts: any) => {
        created = opts;
        const host = {
          registerTool: (name: string, fn: Function) => { registered[name] = fn; },
          setContext: jasmine.createSpy('setContext'),
          setToken: jasmine.createSpy('setToken'),
          destroy: jasmine.createSpy('destroy')
        };
        createdHosts.push(host);
        return host;
      }
    });

    flowOps = {
      readFlow: jasmine.createSpy('readFlow').and.returnValue({ id_faq_kb: 'kb1', intents: [] }),
      apply: jasmine.createSpy('apply').and.returnValue(
        Promise.resolve({ ok: true, rejected_before_applying: false, results: [] }))
    };

    tokenChanged = new Subject<string>();
    selectedChatbot = new BehaviorSubject<any>(null);
    dashboardService = {
      projectID: 'p1', id_faq_kb: 'kb1', selectedChatbot$: selectedChatbot
    };

    TestBed.configureTestingModule({
      providers: [
        AgentChatHostService,
        { provide: FlowOpsService, useValue: flowOps },
        { provide: IntentService, useValue: { intentSelected: { intent_id: 'i1' } } },
        { provide: DashboardService, useValue: dashboardService },
        { provide: TiledeskAuthService, useValue: { tiledeskTokenChanged$: tokenChanged } },
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

  it('destroys the previous host before creating another, so re-attaching does not leak a listener', async () => {
    await service.attach(document.createElement('iframe'));
    const firstHost = createdHosts[0];
    await service.attach(document.createElement('iframe'));
    expect(createdHosts.length).toBe(2);
    expect(firstHost.destroy).toHaveBeenCalled();
  });

  it('never sets the iframe src itself, so the caller controls the ready race', async () => {
    const iframe = document.createElement('iframe');
    await service.attach(iframe);
    expect(iframe.getAttribute('src')).toBeNull();
    expect(Object.keys(registered).length).toBe(3);
  });

  it('emits the flow ops report on applied$ after apply_flow_patch', async () => {
    await service.attach(document.createElement('iframe'));
    const report = { ok: true, rejected_before_applying: false, results: [{ op: 'move', ok: true }] };
    flowOps.apply.and.returnValue(Promise.resolve(report));
    const emitted: any[] = [];
    service.applied$.subscribe(r => emitted.push(r));
    await registered['apply_flow_patch']({ operations: [] });
    expect(emitted).toEqual([report]);
  });

  it('pushes a refreshed token into the running chat rather than reloading it', async () => {
    // The error table promises token expiry is handled by setToken() without
    // reloading the iframe. Until this was wired up, setToken() had no caller
    // anywhere but its own spec, and a session outliving its JWT just failed.
    const iframe = document.createElement('iframe');
    await service.attach(iframe);
    iframe.setAttribute('src', 'https://chat.example.com/');

    tokenChanged.next('jwt-fresh');

    expect(createdHosts[0].setToken).toHaveBeenCalledWith('jwt-fresh');
    // The conversation lives in that frame; reloading it to refresh a token
    // would throw the conversation away.
    expect(iframe.getAttribute('src')).toBe('https://chat.example.com/');
  });

  it('ignores a token refresh while nothing is attached', () => {
    expect(() => tokenChanged.next('jwt-fresh')).not.toThrow();
  });

  it('follows the user to another chatbot without reloading the frame', async () => {
    await service.attach(document.createElement('iframe'));
    createdHosts[0].setContext.calls.reset();

    dashboardService.projectID = 'p2';
    dashboardService.id_faq_kb = 'kb2';
    selectedChatbot.next({ _id: 'kb2' });

    expect(createdHosts[0].setContext)
      .toHaveBeenCalledWith({ projectId: 'p2', flowId: 'kb2' });
  });

  it('is not configured when the url is missing', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        AgentChatHostService,
        { provide: FlowOpsService, useValue: flowOps },
        { provide: IntentService, useValue: {} },
        { provide: DashboardService, useValue: { selectedChatbot$: new BehaviorSubject(null) } },
        { provide: TiledeskAuthService, useValue: { tiledeskTokenChanged$: new Subject<string>() } },
        { provide: AppConfigService, useValue: { getConfig: () => ({}) } }
      ]
    });
    expect(TestBed.inject(AgentChatHostService).isConfigured()).toBe(false);
  });
});
