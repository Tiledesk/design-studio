import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, flush } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { CDSVoiceSettingsComponent } from './voice-settings.component';
import { FaqKbService } from 'src/app/services/faq-kb.service';
import { AiService } from 'src/app/services/ai.service';
import { TYPE_CHATBOT } from '../../utils-actions';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { CustomLogger } from 'src/chat21-core/providers/logger/customLogger';

describe('VoiceSettingsComponent', () => {
  let component: CDSVoiceSettingsComponent;
  let fixture: ComponentFixture<CDSVoiceSettingsComponent>;
  let faqKbService: jasmine.SpyObj<FaqKbService>;

  function makeChatbot(subtype: string, globals: { key: string; value: string | null }[] = []): any {
    return { _id: 'bot1', subtype, attributes: { globals } };
  }

  /** Must run inside fakeAsync: initialize() awaits the (mocked) ElevenLabs lookups. */
  function load(chatbot: any): void {
    component.selectedChatbot = chatbot;
    component.ngOnChanges();
    flush();
    fixture.detectChanges();
  }

  function savedGlobals(): { key: string; value: string | null }[] {
    const calls = faqKbService.addNodeToChatbotAttributes.calls;
    return calls.mostRecent().args[2] as { key: string; value: string | null }[];
  }

  beforeEach(async () => {
    const ngxLogger = jasmine.createSpyObj('NGXLogger', ['log', 'trace', 'debug', 'info', 'warn', 'error']);
    LoggerInstance.setInstance(new CustomLogger(ngxLogger));
    faqKbService = jasmine.createSpyObj<FaqKbService>('FaqKbService', ['addNodeToChatbotAttributes']);
    faqKbService.addNodeToChatbotAttributes.and.returnValue(of({}) as any);
    const aiService = jasmine.createSpyObj<AiService>('AiService', ['getElevenLabsVoices', 'getElevenLabsModels']);
    aiService.getElevenLabsVoices.and.returnValue(Promise.resolve([]) as any);
    aiService.getElevenLabsModels.and.returnValue(Promise.resolve([]) as any);

    await TestBed.configureTestingModule({
      declarations: [ CDSVoiceSettingsComponent ],
      imports: [ TranslateModule.forRoot() ],
      providers: [
        { provide: FaqKbService, useValue: faqKbService },
        { provide: AiService, useValue: aiService },
      ],
      schemas: [ NO_ERRORS_SCHEMA ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(CDSVoiceSettingsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── Barge-in (BARGE_IN global, SPEC-003) ───────────────────────────────────

  it('reads barge-in as on when the BARGE_IN global is "true"', fakeAsync(() => {
    load(makeChatbot(TYPE_CHATBOT.CHATBOT, [{ key: 'BARGE_IN', value: 'true' }]));

    expect(component.bargeIn).toBeTrue();
  }));

  it('reads barge-in as off when the BARGE_IN global is missing', fakeAsync(() => {
    load(makeChatbot(TYPE_CHATBOT.CHATBOT));

    expect(component.bargeIn).toBeFalse();
  }));

  it('turning barge-in on saves BARGE_IN = "true" in the chatbot globals', fakeAsync(() => {
    load(makeChatbot(TYPE_CHATBOT.CHATBOT, [{ key: 'VOICE_PROVIDER', value: 'elevenlabs' }]));

    component.onChangeBargeIn(true);

    expect(faqKbService.addNodeToChatbotAttributes).toHaveBeenCalledWith('bot1', 'globals', jasmine.anything());
    expect(savedGlobals()).toContain({ key: 'BARGE_IN', value: 'true' });
    expect(savedGlobals()).toContain({ key: 'VOICE_PROVIDER', value: 'elevenlabs' });
  }));

  it('turning barge-in off saves BARGE_IN = "false"', fakeAsync(() => {
    load(makeChatbot(TYPE_CHATBOT.CHATBOT, [{ key: 'BARGE_IN', value: 'true' }]));

    component.onChangeBargeIn(false);

    expect(savedGlobals()).toContain({ key: 'BARGE_IN', value: 'false' });
    expect(savedGlobals().filter((g) => g.key === 'BARGE_IN').length).toBe(1);
  }));

  it('shows the barge-in toggle for web-widget chatbots', fakeAsync(() => {
    load(makeChatbot(TYPE_CHATBOT.CHATBOT));

    expect(fixture.debugElement.query(By.css('#bargeIn'))).not.toBeNull();
  }));

  it('hides the barge-in toggle for Twilio voice chatbots', fakeAsync(() => {
    load(makeChatbot(TYPE_CHATBOT.VOICE_TWILIO));

    expect(fixture.debugElement.query(By.css('#bargeIn'))).toBeNull();
  }));
});
