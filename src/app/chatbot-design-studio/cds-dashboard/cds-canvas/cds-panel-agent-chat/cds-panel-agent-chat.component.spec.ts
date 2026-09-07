import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CdsPanelAgentChatComponent } from './cds-panel-agent-chat.component';
import { AgentChatHostService } from 'src/app/chatbot-design-studio/agent-chat/agent-chat-host.service';
import { TranslateModule } from '@ngx-translate/core';

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
      providers: [{ provide: AgentChatHostService, useValue: hostService }]
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
});
