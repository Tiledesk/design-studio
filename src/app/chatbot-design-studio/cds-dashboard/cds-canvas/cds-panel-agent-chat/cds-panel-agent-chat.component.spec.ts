import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CdsPanelAgentChatComponent } from './cds-panel-agent-chat.component';
import { AgentChatHostService } from 'src/app/chatbot-design-studio/agent-chat/agent-chat-host.service';
import { FlowOpsService } from 'src/app/chatbot-design-studio/agent-chat/flow-ops.service';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';

describe('CdsPanelAgentChatComponent', () => {
  let fixture: ComponentFixture<CdsPanelAgentChatComponent>;
  let component: CdsPanelAgentChatComponent;
  let hostService: any;

  beforeEach(async () => {
    hostService = {
      isConfigured: () => true,
      iframeSrc: () => 'https://chat.example.com/?hostOrigin=x',
      attach: jasmine.createSpy('attach').and.returnValue(Promise.resolve()),
      detach: jasmine.createSpy('detach'),
      applied$: { subscribe: () => ({ unsubscribe: () => {} }) },
      lastError: null
    };
    await TestBed.configureTestingModule({
      declarations: [CdsPanelAgentChatComponent],
      imports: [TranslateModule.forRoot()],
      providers: [
        { provide: AgentChatHostService, useValue: hostService },
        { provide: FlowOpsService, useValue: { undoLast: jasmine.createSpy('undoLast') } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(CdsPanelAgentChatComponent);
    component = fixture.componentInstance;
  });

  it('does not touch the iframe until it is made visible', () => {
    fixture.detectChanges();
    expect(hostService.attach).not.toHaveBeenCalled();
    expect(component.iframeSrc).toBeNull();
  });

  it('attaches the host before setting the src, never the other way round', async () => {
    // A spy that resolves immediately would let this test pass even if the
    // component wrote iframeSrc first and awaited attach() second -- both
    // assertions would just observe the already-finished state. Holding the
    // promise open lets us inspect the component mid-flight, while attach()
    // has been called but has not yet resolved, and prove the src is still
    // unset at that point.
    let resolveAttach: () => void;
    const attachPromise = new Promise<void>((resolve) => { resolveAttach = resolve; });
    hostService.attach.and.returnValue(attachPromise);

    component.isPanelVisible = true;
    component.ngOnChanges({ isPanelVisible: { currentValue: true } } as any);

    expect(hostService.attach).toHaveBeenCalled();
    expect(component.iframeSrc).toBeNull();

    resolveAttach();
    // wire()'s own `await` on this same promise was registered before this
    // one, so its continuation (which sets iframeSrc) is guaranteed to run
    // first -- this is what actually lets us observe the post-attach state,
    // rather than racing it via whenStable() alone.
    await attachPromise;
    await fixture.whenStable();

    expect(component.iframeSrc).toBe('https://chat.example.com/?hostOrigin=x');
  });

  it('surfaces a load failure instead of showing an empty frame', async () => {
    hostService.attach.and.callFake(() => {
      hostService.lastError = 'nothing at /adapter/';
      return Promise.reject(new Error('nothing at /adapter/'));
    });
    component.isPanelVisible = true;
    component.ngOnChanges({ isPanelVisible: { currentValue: true } } as any);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.error).toContain('nothing at /adapter/');
    expect(component.iframeSrc).toBeNull();

    // Not just the field: the user has to actually see it.
    const errorEl: HTMLElement = fixture.nativeElement.querySelector('.agent-chat-error');
    expect(errorEl).toBeTruthy();
    expect(errorEl.textContent).toContain('nothing at /adapter/');
  });

  it('rewires the same rendered iframe on a retry after a failed attach(), not a detached placeholder', async () => {
    fixture.detectChanges();
    const realIframe: HTMLIFrameElement = component.agentChatIframe.nativeElement;

    hostService.attach.and.callFake(() => {
      hostService.lastError = 'boom';
      return Promise.reject(new Error('boom'));
    });
    component.isPanelVisible = true;
    component.ngOnChanges({ isPanelVisible: { currentValue: true } } as any);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.error).toBe('boom');
    // The ViewChild must survive the error: if the iframe were removed from
    // the DOM while the error is shown, this would resolve to undefined.
    expect(component.agentChatIframe).toBeTruthy();
    expect(component.agentChatIframe.nativeElement).toBe(realIframe);

    // Retry: close and reopen the panel. attach() now succeeds.
    hostService.attach.and.returnValue(Promise.resolve());
    component.ngOnChanges({ isPanelVisible: { currentValue: true } } as any);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(hostService.attach).toHaveBeenCalledTimes(2);
    // The retry must attach to the real, rendered iframe -- the same element
    // the ViewChild resolved to before -- and not a freshly created,
    // never-inserted node.
    expect(hostService.attach.calls.mostRecent().args[0]).toBe(realIframe);
    expect(component.error).toBeNull();
  });

  it('summarises what was applied and offers undo', async () => {
    const reports = new Subject<any>();
    hostService.applied$ = reports;
    component.isPanelVisible = true;
    component.ngOnChanges({ isPanelVisible: { currentValue: true } } as any);
    await fixture.whenStable();

    reports.next({ ok: true, rejected_before_applying: false, results: [
      { op: 'add_intent', ok: true }, { op: 'add_action', ok: true }
    ]});
    expect(component.appliedCount).toBe(2);
    expect(component.canUndo).toBe(true);
  });

  it('offers no undo for a batch that was refused before it applied', async () => {
    const reports = new Subject<any>();
    hostService.applied$ = reports;
    component.isPanelVisible = true;
    component.ngOnChanges({ isPanelVisible: { currentValue: true } } as any);
    await fixture.whenStable();

    reports.next({ ok: false, rejected_before_applying: true, results: [
      { op: 'move', ok: false, error: 'No intent with intent_id "x"' }
    ]});
    expect(component.canUndo).toBe(false);
  });

  it('says a refused batch was refused, and why, instead of rendering nothing', async () => {
    // Deriving only a success count meant a refusal showed no row at all --
    // indistinguishable, to the user, from the agent having done nothing. The
    // report carries the reason; the panel must not throw it away.
    const reports = new Subject<any>();
    hostService.applied$ = reports;
    component.isPanelVisible = true;
    component.ngOnChanges({ isPanelVisible: { currentValue: true } } as any);
    await fixture.whenStable();

    reports.next({ ok: false, rejected_before_applying: true, results: [
      { op: 'move', ok: false, error: 'No intent with intent_id "x" is on the canvas.' }
    ]});
    fixture.detectChanges();

    expect(component.failedCount).toBe(1);
    const row: HTMLElement = fixture.nativeElement.querySelector('.agent-chat-applied');
    expect(row).toBeTruthy();
    expect(row.textContent).toContain('No intent with intent_id "x" is on the canvas.');
    // Nothing applied, so nothing is offered back.
    expect(fixture.nativeElement.querySelector('.agent-chat-applied button')).toBeNull();
  });

  it('mentions the failures of a batch that only partly applied', async () => {
    const reports = new Subject<any>();
    hostService.applied$ = reports;
    component.isPanelVisible = true;
    component.ngOnChanges({ isPanelVisible: { currentValue: true } } as any);
    await fixture.whenStable();

    reports.next({ ok: false, rejected_before_applying: false, results: [
      { op: 'update_intent', ok: true },
      { op: 'update_intent', ok: false, error: 'network down' }
    ]});
    fixture.detectChanges();

    expect(component.appliedCount).toBe(1);
    expect(component.failedCount).toBe(1);
    const row: HTMLElement = fixture.nativeElement.querySelector('.agent-chat-applied');
    // Both halves of the truth: what landed, and what did not.
    expect(row.textContent).toContain('Applied');
    expect(row.textContent).toContain('network down');
  });

  it('still offers undo when a batch partially applied before failing midway', async () => {
    // Distinguishes canUndo from report.ok: this batch is not ok (it failed
    // partway through), but it is not rejected_before_applying either -- one
    // operation actually changed the flow, so there is something to undo. An
    // implementation that read canUndo off report.ok instead of
    // rejected_before_applying would wrongly withhold Undo here.
    const reports = new Subject<any>();
    hostService.applied$ = reports;
    component.isPanelVisible = true;
    component.ngOnChanges({ isPanelVisible: { currentValue: true } } as any);
    await fixture.whenStable();

    reports.next({ ok: false, rejected_before_applying: false, results: [
      { op: 'update_intent', ok: true }, { op: 'update_intent', ok: false, error: 'network down' }
    ]});
    expect(component.appliedCount).toBe(1);
    expect(component.canUndo).toBe(true);
  });

  it('undoes the last change when the button is clicked, and stops offering it', async () => {
    // Clicking the rendered button, rather than calling component.onUndo()
    // directly, also pins the template wiring -- (click)="onUndo()" and the
    // *ngIf="canUndo" that puts the button there in the first place.
    const reports = new Subject<any>();
    hostService.applied$ = reports;
    const flowOps: any = TestBed.inject(FlowOpsService);
    component.isPanelVisible = true;
    component.ngOnChanges({ isPanelVisible: { currentValue: true } } as any);
    await fixture.whenStable();

    reports.next({ ok: true, rejected_before_applying: false, results: [
      { op: 'add_intent', ok: true }
    ]});
    fixture.detectChanges();

    const undoButton: HTMLButtonElement =
      fixture.nativeElement.querySelector('.agent-chat-applied button');
    expect(undoButton).toBeTruthy();
    undoButton.click();

    expect(flowOps.undoLast).toHaveBeenCalled();
    // The offer must be withdrawn once it has been taken -- a stale button
    // clicked twice would ask the studio to undo a second, nonexistent change.
    expect(component.canUndo).toBe(false);
    // And the count goes with it: undo takes back the whole batch, so a row
    // still claiming "Applied 1 change" is wrong about the flow's state.
    expect(component.appliedCount).toBe(0);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.agent-chat-applied')).toBeNull();
  });
});
