import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { CdsActionRemoveCurrentBotComponent } from './cds-action-remove-current-bot.component';
import { ActionRemoveCurrentBot } from 'src/app/models/action-model';
import { ACTIONS_LIST, TYPE_ACTION } from 'src/app/chatbot-design-studio/utils-actions';
import { IntentService } from 'src/app/chatbot-design-studio/services/intent.service';

describe('CdsActionRemoveCurrentBotComponent', () => {
  let component: CdsActionRemoveCurrentBotComponent;
  let fixture: ComponentFixture<CdsActionRemoveCurrentBotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      declarations: [CdsActionRemoveCurrentBotComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(CdsActionRemoveCurrentBotComponent);
    component = fixture.componentInstance;
    component.action = new ActionRemoveCurrentBot();
  });

  it('creates an action with type removecurrentbot and no fields or outputs', () => {
    const action: any = new ActionRemoveCurrentBot();
    expect(action._tdActionType).toBe('removecurrentbot');
    expect(action._tdActionId).toBeTruthy();
    expect(Object.keys(action).sort()).toEqual(['_tdActionId', '_tdActionTitle', '_tdActionType']);
  });

  it('is registered for conversational chatbots under the same key', () => {
    expect(TYPE_ACTION.REMOVE_CURRENT_BOT).toBe('removecurrentbot');
    const entry = ACTIONS_LIST.REMOVE_CURRENT_BOT;
    expect(entry.type).toBe(TYPE_ACTION.REMOVE_CURRENT_BOT);
    expect(entry.status).toBe('active');
    expect(entry.doc).toBe('CDSActionList.DOC.RemoveCurrentBot');
    expect(entry.chatbot_types.length).toBe(1);
  });

  it('renders the block preview and the panel without outputs', () => {
    component.previewMode = true;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.cds-action-preview')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('cds-connector')).toBeNull();

    component.previewMode = false;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.action-description')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('cds-connector')).toBeNull();
  });

  it('createNewAction builds it', () => {
    const service: any = Object.create(IntentService.prototype);
    service.logger = { log: () => {}, warn: () => {}, error: () => {} };
    const action = service.createNewAction(TYPE_ACTION.REMOVE_CURRENT_BOT);
    expect(action instanceof ActionRemoveCurrentBot).toBeTrue();
  });
});
