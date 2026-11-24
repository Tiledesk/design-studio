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

  // ── Barge-in timings (BARGE_IN_DUCK_* / BARGE_IN_GUARD_MS / BARGE_IN_MIN_WORDS) ──

  function setTiming(key: string, value: string): void {
    component.onChangeBargeInTiming(key, value);
  }

  it('reads the barge-in timing globals', fakeAsync(() => {
    load(makeChatbot(TYPE_CHATBOT.CHATBOT, [
      { key: 'BARGE_IN', value: 'true' },
      { key: 'BARGE_IN_DUCK_VOLUME', value: '30' },
      { key: 'BARGE_IN_DUCK_MAX_MS', value: '4000' },
    ]));

    expect(component.bargeInTimingValues['BARGE_IN_DUCK_VOLUME']).toBe('30');
    expect(component.bargeInTimingValues['BARGE_IN_DUCK_MAX_MS']).toBe('4000');
    expect(component.bargeInTimingValues['BARGE_IN_DUCK_RELEASE_MS']).toBe('');
  }));

  it('saves a timing as a whole number string', fakeAsync(() => {
    load(makeChatbot(TYPE_CHATBOT.CHATBOT, [{ key: 'BARGE_IN', value: 'true' }]));

    setTiming('BARGE_IN_DUCK_RELEASE_MS', ' 800 ');

    expect(savedGlobals()).toContain({ key: 'BARGE_IN_DUCK_RELEASE_MS', value: '800' });
    expect(savedGlobals()).toContain({ key: 'BARGE_IN', value: 'true' });
  }));

  it('clearing a timing saves null, so the default applies', fakeAsync(() => {
    load(makeChatbot(TYPE_CHATBOT.CHATBOT, [
      { key: 'BARGE_IN', value: 'true' },
      { key: 'BARGE_IN_GUARD_MS', value: '1500' },
    ]));

    setTiming('BARGE_IN_GUARD_MS', '');

    expect(savedGlobals()).toContain({ key: 'BARGE_IN_GUARD_MS', value: null });
  }));

  it('does not save an out-of-range timing and keeps the previous value', fakeAsync(() => {
    load(makeChatbot(TYPE_CHATBOT.CHATBOT, [
      { key: 'BARGE_IN', value: 'true' },
      { key: 'BARGE_IN_DUCK_VOLUME', value: '30' },
    ]));
    faqKbService.addNodeToChatbotAttributes.calls.reset();

    setTiming('BARGE_IN_DUCK_VOLUME', '150');
    setTiming('BARGE_IN_MIN_WORDS', '0');
    setTiming('BARGE_IN_DUCK_MAX_MS', '-5');

    expect(faqKbService.addNodeToChatbotAttributes).not.toHaveBeenCalled();
    expect(component.bargeInTimingValues['BARGE_IN_DUCK_VOLUME']).toBe('30');
  }));

  it('shows the timing fields only while barge-in is on', fakeAsync(() => {
    load(makeChatbot(TYPE_CHATBOT.CHATBOT));
    expect(fixture.debugElement.query(By.css('#bargeInTimings'))).toBeNull();

    component.onChangeBargeIn(true);
    fixture.detectChanges();

    expect(fixture.debugElement.queryAll(By.css('#bargeInTimings input')).length).toBe(5);
  }));
});
