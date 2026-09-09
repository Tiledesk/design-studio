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
      flowSwitched$: new Subject<string>(),
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

  // This panel is mounted above the canvas precisely so it survives a flow
  // switch -- which means its summary row survives one too, Undo button and
  // all. That button belongs to a flow the canvas has left: FlowOpsService
  // refuses an undo across a switch, so leaving it on screen offers the user
  // a control that now does nothing. The whole row goes: "Applied 2 changes"
  // describes a flow that is no longer in front of them.
  it('drops what it was saying about the last batch when the canvas moves to another flow', async () => {
    const reports = new Subject<any>();
    hostService.applied$ = reports;
    fixture.detectChanges();
    component.isPanelVisible = true;
    component.ngOnChanges({ isPanelVisible: { currentValue: true } } as any);
    await fixture.whenStable();

    reports.next({ ok: true, rejected_before_applying: false, results: [
      { op: 'add_intent', ok: true }, { op: 'add_action', ok: false, error: 'network down' }
    ]});
    fixture.detectChanges();
    expect(component.canUndo).toBe(true);

    hostService.flowSwitched$.next('sub1');
    fixture.detectChanges();

    expect(component.canUndo).toBe(false);
    expect(component.lastReport).toBeNull();
    expect(component.appliedCount).toBe(0);
    expect(component.failedCount).toBe(0);
    expect(component.firstError).toBeNull();
    // Nothing left on screen either -- no Undo button, no stale count.
    expect(fixture.nativeElement.querySelector('.agent-chat-applied')).toBeNull();
  });

  describe('resize', () => {
    const STORAGE_KEY = 'cds.agentChatPanel.width';
    // A real, attached, explicitly-sized parent: maxWidth() reads
    // parentElement.clientWidth as "the canvas host's width", and that is
    // only ever non-zero for an element actually in the rendered document.
    let hostDiv: HTMLDivElement;
    let start: number;

    beforeEach(() => {
      localStorage.removeItem(STORAGE_KEY);
      fixture.detectChanges();
      hostDiv = document.createElement('div');
      hostDiv.style.width = '1000px';
      document.body.appendChild(hostDiv);
      hostDiv.appendChild(fixture.nativeElement);
      // Inline style beats every stylesheet rule, including :host's own, so
      // the drag math below is deterministic regardless of whether this
      // narrow test bundle even loads the app's global --agent-chat-width
      // default.
      (fixture.nativeElement as HTMLElement).style.width = '420px';
      start = Math.round(fixture.nativeElement.getBoundingClientRect().width);
    });

    afterEach(() => {
      localStorage.removeItem(STORAGE_KEY);
      hostDiv.remove();
    });

    function handle(): HTMLElement {
      return fixture.nativeElement.querySelector('.agent-chat-resize-handle');
    }

    function mask(): HTMLElement | null {
      return fixture.nativeElement.querySelector('.agent-chat-drag-mask');
    }

    function currentWidthVar(): string {
      return (fixture.nativeElement as HTMLElement).style.getPropertyValue('--agent-chat-width');
    }

    function mousedown(clientX: number): void {
      handle().dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX, buttons: 1 }));
    }

    function mousemove(clientX: number, buttons = 1): void {
      document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, cancelable: true, clientX, buttons }));
    }

    function mouseup(clientX: number): void {
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, clientX }));
    }

    it('clamps a drag to the 320px floor', () => {
      mousedown(start);
      mousemove(start - 10000);
      expect(currentWidthVar()).toBe('320px');
      mouseup(start - 10000);
    });

    it('clamps a drag to 50% of the canvas host width', () => {
      mousedown(start);
      mousemove(start + 10000);
      // hostDiv is 1000px; half of it is 500px.
      expect(currentWidthVar()).toBe('500px');
      mouseup(start + 10000);
    });

    it('tracks the cursor 1:1 for an in-range drag and persists the result', () => {
      mousedown(start);
      mousemove(start + 50);
      expect(currentWidthVar()).toBe(`${start + 50}px`);
      mouseup(start + 50);
      expect(localStorage.getItem(STORAGE_KEY)).toBe(String(start + 50));
    });

    it('does not persist a plain click with no movement', () => {
      mousedown(start);
      mouseup(start);
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    // Finding 1: a drag that never gets a mouseup delivered to this document
    // -- released past the browser edge, over another application -- must
    // not leave the full-viewport mask attached forever.
    it('ends the drag and removes the mask when the window loses focus mid-drag', () => {
      mousedown(start);
      fixture.detectChanges();
      expect(mask()).toBeTruthy();
      expect(component.resizing).toBe(true);

      window.dispatchEvent(new Event('blur'));
      fixture.detectChanges();

      expect(component.resizing).toBe(false);
      expect(mask()).toBeNull();
    });

    it('ends the drag and removes the mask on Escape', () => {
      mousedown(start);
      fixture.detectChanges();
      expect(mask()).toBeTruthy();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      fixture.detectChanges();

      expect(component.resizing).toBe(false);
      expect(mask()).toBeNull();
    });

    it('ends the drag and removes the mask when the pointer re-enters with no button held', () => {
      // Simulates the button having been released outside the window: the
      // next mousemove this document sees carries buttons === 0.
      mousedown(start);
      fixture.detectChanges();
      expect(mask()).toBeTruthy();

      mousemove(start + 40, 0);
      fixture.detectChanges();

      expect(component.resizing).toBe(false);
      expect(mask()).toBeNull();
    });

    it('leaves no dangling document/window listeners after any exit path', () => {
      // Regression guard for Finding 1's root cause: every exit routes
      // through stopDragListeners(), so a *second* drag started right after
      // must behave like a fresh one rather than being affected by
      // leftover handlers from the first.
      mousedown(start);
      window.dispatchEvent(new Event('blur'));
      fixture.detectChanges();

      mousedown(start);
      mousemove(start + 25);
      mouseup(start + 25);

      expect(currentWidthVar()).toBe(`${start + 25}px`);
      expect(mask()).toBeNull();
    });

    it('ignores a corrupt, non-numeric stored width and falls back to the default', () => {
      localStorage.setItem(STORAGE_KEY, 'not-a-number');
      component.ngOnInit();
      expect(currentWidthVar()).toBe('');
    });

    it('clamps a huge stored width down to the max on restore', () => {
      localStorage.setItem(STORAGE_KEY, '999999');
      component.ngOnInit();
      expect(currentWidthVar()).toBe('500px');
    });

    it('clamps a negative stored width up to the min on restore', () => {
      localStorage.setItem(STORAGE_KEY, '-50');
      component.ngOnInit();
      expect(currentWidthVar()).toBe('320px');
    });

    it('re-clamps to a shrunk window without touching storage, and restores the full value on regrow', () => {
      mousedown(start);
      mousemove(start + 10000); // clamps to 500 (half of the 1000px host)
      mouseup(start + 10000);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('500');

      hostDiv.style.width = '400px'; // shrink the canvas host
      window.dispatchEvent(new Event('resize'));
      expect(currentWidthVar()).toBe('320px'); // half of 400 is 200, clamped up to the 320 floor
      expect(localStorage.getItem(STORAGE_KEY)).toBe('500'); // untouched by the live re-clamp

      hostDiv.style.width = '1000px'; // regrow
      window.dispatchEvent(new Event('resize'));
      expect(currentWidthVar()).toBe('500px'); // restored from the same unmodified preferred value
    });
  });
});
