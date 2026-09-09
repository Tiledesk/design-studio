import { Component, OnDestroy, OnInit } from '@angular/core';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NavigationStart, Router } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { AgentChatHostService } from './agent-chat-host.service';
import { AgentChatFamilyService } from './agent-chat-family.service';
import { FlowOpsService } from './flow-ops.service';
import { IntentService } from '../services/intent.service';
import { DashboardService } from 'src/app/services/dashboard.service';
import { AppConfigService } from 'src/app/services/app-config';
import { TiledeskAuthService } from 'src/chat21-core/providers/tiledesk/tiledesk-auth.service';
import { FaqService } from 'src/app/services/faq.service';
import { moduleImporter } from './agent-chat-loader';
import { RouterTestingModule } from '@angular/router/testing';
import { Subject } from 'rxjs';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { CdsDashboardComponent } from '../cds-dashboard/cds-dashboard.component';

/** Standing in for CdsCanvasComponent: all this test needs from it is that it
 *  is created and destroyed by the router outlet, which is a property of the
 *  outlet's position in the template, not of the component inside it. */
@Component({ selector: 'flow-switch-canvas', template: '<span>canvas</span>' })
class FakeCanvasComponent implements OnInit, OnDestroy {
  static events: string[] = [];
  static instances = 0;
  private id: number;
  ngOnInit(): void { this.id = ++FakeCanvasComponent.instances; FakeCanvasComponent.events.push(`init:${this.id}`); }
  ngOnDestroy(): void { FakeCanvasComponent.events.push(`destroy:${this.id}`); }
}

/** Standing in for cds-panel-agent-chat: it must NOT be destroyed by a flow
 *  switch, because the conversation lives in an iframe inside it. */
@Component({ selector: 'flow-switch-panel', template: '<span>panel</span>' })
class FakePanelComponent implements OnDestroy {
  static destroyed = 0;
  ngOnDestroy(): void { FakePanelComponent.destroyed++; }
}

/** The shape of cds-dashboard.component.html that matters here: the panel is
 *  the outlet's SIBLING, and only the outlet sits inside the toggled region. */
@Component({
  selector: 'flow-switch-host',
  template: `
    <flow-switch-panel *ngIf="isBlockSectionActive"></flow-switch-panel>
    <ng-container *ngIf="flowVisible">
      <router-outlet></router-outlet>
    </ng-container>`
})
class HostComponent {
  isBlockSectionActive = true;
  flowVisible = true;
}

describe('flow switch: the canvas is destroyed and rebuilt, the chat panel is not', () => {

  beforeEach(() => {
    FakeCanvasComponent.events = [];
    FakeCanvasComponent.instances = 0;
    FakePanelComponent.destroyed = 0;
    TestBed.configureTestingModule({
      declarations: [HostComponent, FakeCanvasComponent, FakePanelComponent],
      imports: [RouterTestingModule.withRoutes([
        { path: 'project/:projectid/chatbot/:faqkbid/blocks', component: FakeCanvasComponent }
      ])]
    });
  });

  // The whole point of the task, and the way it fails is by looking right:
  // set false and true in the same turn and change detection sees one value,
  // the *ngIf never goes away, and the canvas is reused with the previous
  // flow's stage still on it.
  it('destroys and rebuilds what the outlet holds when the flag is flipped with a detectChanges between', fakeAsync(() => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    TestBed.inject(Router).navigate(['project', 'p1', 'chatbot', 'kb1', 'blocks']);
    tick();
    fixture.detectChanges();
    expect(FakeCanvasComponent.events).toEqual(['init:1']);

    fixture.componentInstance.flowVisible = false;
    fixture.detectChanges();
    expect(FakeCanvasComponent.events).toEqual(['init:1', 'destroy:1']);

    fixture.componentInstance.flowVisible = true;
    fixture.detectChanges();
    // A NEW instance: the outlet re-activates the stored route on ngOnInit,
    // so the component is constructed again rather than re-attached.
    expect(FakeCanvasComponent.events).toEqual(['init:1', 'destroy:1', 'init:2']);
  }));

  // The control: this is what openFlow() would do without detectChanges().
  it('does not destroy anything when false and true are set in the same change-detection pass', fakeAsync(() => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    TestBed.inject(Router).navigate(['project', 'p1', 'chatbot', 'kb1', 'blocks']);
    tick();
    fixture.detectChanges();

    fixture.componentInstance.flowVisible = false;
    fixture.componentInstance.flowVisible = true;
    fixture.detectChanges();

    expect(FakeCanvasComponent.events).toEqual(['init:1']);
  }));

  // If the panel ever falls inside the toggled region, the iframe and the
  // conversation in it go with the canvas -- and nothing errors.
  it('leaves the chat panel, the outlet\'s sibling, untouched across the rebuild', fakeAsync(() => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    TestBed.inject(Router).navigate(['project', 'p1', 'chatbot', 'kb1', 'blocks']);
    tick();
    fixture.detectChanges();
    const panel = fixture.nativeElement.querySelector('flow-switch-panel');

    fixture.componentInstance.flowVisible = false;
    fixture.detectChanges();
    fixture.componentInstance.flowVisible = true;
    fixture.detectChanges();

    expect(FakePanelComponent.destroyed).toBe(0);
    // Same DOM node, so the iframe inside it was never re-created either.
    expect(fixture.nativeElement.querySelector('flow-switch-panel')).toBe(panel);
  }));

  // A flow switch does raise a NavigationStart -- openFlow() navigates the
  // router. The gate survives it because :faqkbid is on the PARENT route and
  // the URL's last segment is 'blocks' on both sides of the switch.
  it('keeps the blocks gate true across a flow switch, so the panel is never torn down', () => {
    const events = new Subject<any>();
    const component = makeDashboard({
      router: {
        url: '/project/p1/chatbot/kb1/blocks',
        events,
        navigate: () => Promise.resolve(true)
      }
    });
    expect(component.isBlockSectionActive).toBe(true);
    events.next(new NavigationStart(1, '/project/p1/chatbot/sub1/blocks'));
    expect(component.isBlockSectionActive).toBe(true);
  });
});

/** Builds CdsDashboardComponent by hand: its constructor only touches the
 *  router (manageRouteChanges), so everything else can be left empty. */
function makeDashboard(parts: any): any {
  LoggerInstance.setInstance({
    log() {}, error() {}, warn() {}, info() {}, debug() {}, setLoggerConfig() {}
  } as any);
  const args = [
    parts.route ?? { params: { subscribe: () => {} } },
    parts.router,
    { getConfig: () => ({}) },
    { getItem: () => null, setItem: () => {} },
    parts.dashboardService ?? {},
    {}, {}, {}, {}, {}, {}, {}, {}, {}, {},
    parts.controllerService ?? { isOpenAgentChatPanel$: new Subject() },
    parts.agentChatHostService ?? { setFlowNavigator: () => {} },
    parts.intentService ?? { getAllIntents: () => Promise.resolve(true) },
    parts.changeDetectorRef ?? { detectChanges: () => {} }
  ];
  return new (CdsDashboardComponent as any)(...args);
}

describe('CdsDashboardComponent.openFlow', () => {

  function build(): { component: any, order: string[], dashboardService: any } {
    const order: string[] = [];
    const dashboardService: any = {
      projectID: 'p1',
      id_faq_kb: 'kb1',
      selectedChatbot: { _id: 'kb1', name: 'Parent' },
      openFlow: null,
      getBotById: () => {
        order.push('getBotById');
        dashboardService.selectedChatbot = { _id: dashboardService.id_faq_kb, name: 'Alfa' };
        return Promise.resolve(true);
      }
    };
    const component = makeDashboard({
      dashboardService,
      intentService: {
        getAllIntents: (id: string) => {
          order.push('getAllIntents:' + id);
          return Promise.resolve(true);
        }
      },
      router: {
        url: '/project/p1/chatbot/kb1/blocks',
        events: new Subject(),
        navigate: (commands: any[]) => {
          order.push('navigate:' + commands.join('/'));
          // The router re-emits route.params on the reused route, and
          // getUrlParams() is still subscribed: setParams() has run by the
          // time navigate() resolves.
          dashboardService.id_faq_kb = commands[3];
          return Promise.resolve(true);
        }
      },
      changeDetectorRef: {
        detectChanges: () => order.push('detectChanges:flowVisible=' + component.flowVisible)
      }
    });
    return { component, order, dashboardService };
  }

  // Without the detectChanges between the two assignments Angular sees one
  // value and the canvas is never destroyed -- and the first switch still
  // looks correct, because the canvas it kept was already the right one.
  it('destroys the canvas, loads the new bot, and only then brings the canvas back', async () => {
    const { component, order } = build();
    await component.openFlow('sub1');
    expect(order).toEqual([
      'navigate:project/p1/chatbot/sub1/blocks',
      'detectChanges:flowVisible=false',
      'getBotById',
      // Before the canvas comes back, and before this promise resolves: what
      // get_flow reads must already be the new flow's.
      'getAllIntents:sub1',
      'detectChanges:flowVisible=true'
    ]);
    expect(component.flowVisible).toBe(true);
  });

  // The canvas reads dashboardService.selectedChatbot in its own ngOnInit,
  // so it may only be re-created once that names the new flow.
  it('has the new chatbot in hand before the canvas comes back', async () => {
    const { component } = build();
    await component.openFlow('sub1');
    expect(component.selectedChatbot).toEqual({ _id: 'sub1', name: 'Alfa' });
  });

  // getBotById() rejects on an HTTP failure. Leaving flowVisible false there
  // would be a blank studio with no canvas and no way back.
  it('brings the canvas back even when the new bot fails to load, and still reports the failure', async () => {
    const { component, dashboardService, order } = build();
    // The bare `false` DashboardService.getBotById() really rejects with.
    dashboardService.getBotById = () => { order.push('getBotById'); return Promise.reject(false); };
    await expectAsync(component.openFlow('sub1'))
      .toBeRejectedWithError(/^Opened "sub1" but could not load it\. Read it with get_flow/);
    expect(component.flowVisible).toBe(true);
    expect(order).toEqual([
      'navigate:project/p1/chatbot/sub1/blocks',
      'detectChanges:flowVisible=false',
      'getBotById',
      // No intent load: the flow could not be read at all, so the previous
      // flow's intents stay put -- and open_flow rejects rather than letting
      // the agent patch against them.
      'detectChanges:flowVisible=true'
    ]);
  });

  // The detail matters when there is one: it is all the agent gets.
  it('keeps the underlying message when the failure is a real Error', async () => {
    const { component, dashboardService } = build();
    dashboardService.getBotById = () => Promise.reject(new Error('403 forbidden'));
    await expectAsync(component.openFlow('sub1'))
      .toBeRejectedWithError(/Opened "sub1" but could not load it: 403 forbidden\./);
  });

  it('does nothing for the flow that is already open', async () => {
    const { component, order } = build();
    await component.openFlow('kb1');
    expect(order).toEqual([]);
  });

  it('does nothing for an empty id', async () => {
    const { component, order } = build();
    await component.openFlow('');
    expect(order).toEqual([]);
  });

  // Both the agent and the Subagents panel must reach the same method; the
  // panel finds it on DashboardService, which it already depends on.
  it('publishes the same navigator to the chat host and to DashboardService', () => {
    const { component, dashboardService } = build();
    let chatNavigator: any = null;
    (component as any).agentChatHostService = { setFlowNavigator: (fn: any) => chatNavigator = fn };
    component.ngOnInit();
    expect(typeof chatNavigator).toBe('function');
    expect(typeof dashboardService.openFlow).toBe('function');
  });

  // Left behind on an app-scoped service, it would navigate through a
  // destroyed component's router and change detector.
  it('withdraws the navigator from DashboardService when the dashboard goes away', () => {
    const { component, dashboardService } = build();
    (component as any).agentChatHostService = { setFlowNavigator: () => {} };
    component.ngOnInit();
    component.ngOnDestroy();
    expect(dashboardService.openFlow).toBeNull();
  });
});


/** The bug this describe exists for.
 *
 *  CdsCanvasComponent.ngOnInit calls initialize() fire-and-forget, and
 *  initialize() only replaces IntentService.listOfIntents after an HTTP
 *  round trip. Nothing clears that array when the canvas is destroyed. So
 *  between open_flow resolving and that fetch landing, get_flow answers with
 *  the NEW id and the PREVIOUS flow's intents -- and because the id is the
 *  new one, apply_flow_patch's guard passes. The agent then patches the new
 *  flow with intent ids that exist only in the old one: exactly the silent
 *  cross-flow write the guard was built to stop, through the one door the
 *  guard cannot see. It hides whenever the model's round trip is slower than
 *  the fetch, which is most of the time.
 *
 *  The state below is real, not narrated: one mutable IntentService stand-in
 *  shared by the dashboard and by the REAL FlowOpsService that get_flow reads
 *  through, and a getAllIntents() that only swaps the array on a macrotask. */
describe('open_flow resolves only once get_flow would see the new flow', () => {

  const FLOWS: { [id: string]: any[] } = {
    kb1: [{ intent_id: 'parent-start', intent_display_name: 'start' }],
    sub1: [{ intent_id: 'refund-start', intent_display_name: 'refund start' }]
  };

  let intentService: any;
  let dashboardService: any;
  let host: AgentChatHostService;
  let dashboard: any;
  let registered: { [name: string]: Function };
  let fetched: string[];
  let originalImport: any;
  let navigateResult: boolean;

  beforeEach(() => {
    LoggerInstance.setInstance({
      log() {}, error() {}, warn() {}, info() {}, debug() {}, setLoggerConfig() {}
    } as any);
    registered = {};
    fetched = [];
    navigateResult = true;
    originalImport = moduleImporter.load;
    moduleImporter.load = () => Promise.resolve({
      PROTOCOL_VERSION: 1,
      createAgentChatHost: () => ({
        registerTool: (name: string, fn: Function) => { registered[name] = fn; },
        setContext: () => {}, setToken: () => {}, destroy: () => {}
      })
    });

    intentService = {
      // What the destroyed canvas left behind: the parent's blocks. Nothing
      // in CdsCanvasComponent.ngOnDestroy clears this.
      listOfIntents: FLOWS['kb1'],
      intentSelected: null,
      getAllIntents: (id: string) => {
        fetched.push(id);
        return new Promise<boolean>(resolve => setTimeout(() => {
          intentService.listOfIntents = FLOWS[id] || [];
          resolve(true);
        }, 0));
      }
    };

    dashboardService = {
      projectID: 'p1',
      id_faq_kb: 'kb1',
      selectedChatbot: { _id: 'kb1', name: 'Parent' },
      selectedChatbot$: new BehaviorSubject<any>(null),
      openFlow: null,
      getBotById: () => {
        dashboardService.selectedChatbot =
          { _id: dashboardService.id_faq_kb, name: 'Alfa',
            subtype: 'subagent', parent_id: 'kb1' };
        return Promise.resolve(true);
      }
    };

    // Shared with the FlowOpsService instance built by hand below: a second,
    // separately-shaped stub passed positionally could drift from this one
    // and hide a real disagreement behind two different fakes.
    const familyServiceStub = {
      rootId: () => 'kb1',
      isSubagent: () => dashboardService.selectedChatbot?.subtype === 'subagent',
      read: () => Promise.resolve({ root_id: 'kb1', root_name: 'Parent',
        is_subagent: false, subagents: [{ _id: 'sub1', name: 'Alfa' }] }),
      contains: (id: string) => Promise.resolve(['kb1', 'sub1'].includes(id)),
      createSubagent: (name: string) => Promise.resolve({ _id: 'new1', name })
    };
    // FlowOpsService reads FaqService only for a batch that actually mentions
    // callsubagent, which none of these open_flow / get_flow tests build --
    // this stub exists only so the constructor has something to inject.
    const faqServiceStub = { getAllFaqByFaqKbId: () => of([]) };

    TestBed.configureTestingModule({
      providers: [
        AgentChatHostService,
        // The real one: get_flow's answer must come through the real read
        // path, or the staleness this test is about could not appear.
        { provide: FlowOpsService,
          useValue: new (FlowOpsService as any)(
            intentService, {}, dashboardService, familyServiceStub, faqServiceStub) },
        { provide: IntentService, useValue: intentService },
        { provide: DashboardService, useValue: dashboardService },
        { provide: TiledeskAuthService, useValue: { tiledeskTokenChanged$: new Subject<string>() } },
        { provide: AppConfigService,
          useValue: { getConfig: () => ({ agentChatUrl: 'https://chat.example.com' }) } },
        { provide: AgentChatFamilyService, useValue: familyServiceStub },
        { provide: FaqService, useValue: faqServiceStub }
      ]
    });
    host = TestBed.inject(AgentChatHostService);

    dashboard = makeDashboard({
      dashboardService,
      intentService,
      agentChatHostService: host,
      router: {
        url: '/project/p1/chatbot/kb1/blocks',
        events: new Subject(),
        navigate: (commands: any[]) => {
          dashboardService.id_faq_kb = navigateResult ? commands[3] : dashboardService.id_faq_kb;
          return Promise.resolve(navigateResult);
        }
      },
      changeDetectorRef: { detectChanges: () => {} }
    });
  });

  afterEach(() => { moduleImporter.load = originalImport; });

  async function wire(): Promise<void> {
    await host.attach({} as any);
    host.setFlowNavigator((id: string) => dashboard.openFlow(id));
  }

  it('leaves the previous flow\'s intents in place until something reloads them', async () => {
    await wire();
    // The premise, stated as a fact of the fixture rather than assumed.
    expect((await registered['get_flow']({})).intents).toEqual(FLOWS['kb1']);
  });

  it('answers the very next get_flow with the new flow\'s intents, not the previous ones', async () => {
    await wire();

    await registered['open_flow']({ faq_kb_id: 'sub1' });

    // No tick, no flush: this is the first thing the agent does after
    // open_flow resolves, and awaiting get_flow only drains microtasks -- the
    // canvas's own fetch is a macrotask and has not landed.
    const snapshot = await registered['get_flow']({});
    expect(snapshot.id_faq_kb).toBe('sub1');
    expect(snapshot.intents).toEqual(FLOWS['sub1']);
    // The id moved and the intents did not: that is what makes it dangerous.
    // apply_flow_patch compares only the id, so its guard would pass while
    // every intent_id in the batch belonged to the parent.
    expect(snapshot.intents).not.toEqual(FLOWS['kb1']);
  });

  it('loads the intents of the flow it navigated to', async () => {
    await wire();
    await registered['open_flow']({ faq_kb_id: 'sub1' });
    expect(fetched).toEqual(['sub1']);
  });

  // A route guard can cancel the navigation: navigate() then resolves false,
  // the studio is still on the old flow, and rebuilding the canvas there and
  // returning normally would tell the agent it moved when it did not.
  it('refuses when the navigation is cancelled instead of reporting success', async () => {
    await wire();
    navigateResult = false;
    await expectAsync(registered['open_flow']({ faq_kb_id: 'sub1' }))
      .toBeRejectedWithError(/could not open|refused/i);
    expect(dashboardService.id_faq_kb).toBe('kb1');
    expect(fetched).toEqual([]);
  });

  // DashboardService.getBotById() rejects with the bare value `false`, not an
  // Error. Passed through untouched the agent would be handed an empty
  // message; this is the only failure text it ever sees.
  it('turns a bare-false load failure into a message the agent can read', async () => {
    await wire();
    dashboardService.getBotById = () => Promise.reject(false);
    await expectAsync(registered['open_flow']({ faq_kb_id: 'sub1' }))
      .toBeRejectedWithError(/sub1[\s\S]*load/i);
    // Still visible: the alternative is a studio with no canvas at all.
    expect(dashboard.flowVisible).toBe(true);
  });
});
