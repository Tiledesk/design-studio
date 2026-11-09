import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { CdsActionGetRatingComponent } from './cds-action-get-rating.component';
import { ActionGetRating } from 'src/app/models/action-model';
import { ACTIONS_LIST, TYPE_ACTION } from 'src/app/chatbot-design-studio/utils-actions';
import { IntentService } from 'src/app/chatbot-design-studio/services/intent.service';
import { variableList } from 'src/app/chatbot-design-studio/utils-variables';

describe('CdsActionGetRatingComponent', () => {
  let component: CdsActionGetRatingComponent;
  let fixture: ComponentFixture<CdsActionGetRatingComponent>;

  beforeEach(async () => {
    // in the app the logger is set by AppModule
    const silent = () => {};
    LoggerInstance.setInstance({ log: silent, debug: silent, info: silent, warn: silent, error: silent } as any);
    await TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      declarations: [CdsActionGetRatingComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(CdsActionGetRatingComponent);
    component = fixture.componentInstance;
    component.action = new ActionGetRating();
    component.action.assignRatingTo = 'rating_value';
    component.action.assignRatingMessageTo = 'rating_message';
  });

  it('creates an action with type get_rating', () => {
    expect(new ActionGetRating()._tdActionType).toBe('get_rating');
  });

  it('is registered under the same key, in the Special category', () => {
    expect(TYPE_ACTION.GET_RATING).toBe('get_rating');
    const entry = ACTIONS_LIST.GET_RATING;
    expect(entry.type).toBe(TYPE_ACTION.GET_RATING);
    expect(entry.status).toBe('active');
    expect(entry.doc).toBe('CDSActionList.DOC.GetRating');
  });

  it('createNewAction builds it with the default variable names', () => {
    const service: any = Object.create(IntentService.prototype);
    service.logger = { log: () => {}, warn: () => {}, error: () => {} };
    const action = service.createNewAction(TYPE_ACTION.GET_RATING);
    expect(action instanceof ActionGetRating).toBeTrue();
    expect(action.assignRatingTo).toBe('rating_value');
    expect(action.assignRatingMessageTo).toBe('rating_message');
  });

  it('adds the default variables to the picker once', () => {
    fixture.detectChanges();
    component.ngOnInit();
    const names = variableList.find(el => el.key === 'userDefined').elements.map(v => v.name);
    expect(names.filter(n => n === 'rating_value').length).toBe(1);
    expect(names.filter(n => n === 'rating_message').length).toBe(1);
  });

  it('renders the block preview and two variable fields in the panel', () => {
    component.previewMode = true;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.cds-action-preview').textContent).toContain('rating_value');

    component.previewMode = false;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('cds-textarea').length).toBe(2);
    expect(fixture.nativeElement.querySelector('cds-connector')).toBeNull();
  });

  it('a picked variable is saved on its field', () => {
    const emitted: any[] = [];
    component.updateAndSaveAction.subscribe(e => emitted.push(e));
    component.onSelectedAttribute({ value: 'voto' }, 'assignRatingTo');
    expect(component.action.assignRatingTo).toBe('voto');
    expect(emitted.length).toBe(1);
  });
});
