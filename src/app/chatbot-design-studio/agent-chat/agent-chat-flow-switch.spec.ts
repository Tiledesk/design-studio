import { Component, OnDestroy, OnInit } from '@angular/core';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NavigationStart, Router } from '@angular/router';
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
    dashboardService.getBotById = () => { order.push('getBotById'); return Promise.reject(new Error('boom')); };
    await expectAsync(component.openFlow('sub1')).toBeRejectedWithError('boom');
    expect(component.flowVisible).toBe(true);
    expect(order).toEqual([
      'navigate:project/p1/chatbot/sub1/blocks',
      'detectChanges:flowVisible=false',
      'getBotById',
      'detectChanges:flowVisible=true'
    ]);
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
