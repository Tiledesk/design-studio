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
    component.isPanelVisible = true;
    component.ngOnChanges({ isPanelVisible: { currentValue: true } } as any);
    await fixture.whenStable();
    expect(hostService.attach).toHaveBeenCalled();
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
    expect(component.error).toContain('nothing at /adapter/');
    expect(component.iframeSrc).toBeNull();
  });
});
