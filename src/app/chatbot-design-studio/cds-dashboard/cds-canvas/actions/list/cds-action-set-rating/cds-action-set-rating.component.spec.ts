import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, Input, NO_ERRORS_SCHEMA, Pipe, PipeTransform } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { By } from '@angular/platform-browser';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { CdsActionSetRatingComponent } from './cds-action-set-rating.component';
import { ActionSetRating } from 'src/app/models/action-model';
import { ACTIONS_LIST, TYPE_ACTION } from 'src/app/chatbot-design-studio/utils-actions';
import { IntentService } from 'src/app/chatbot-design-studio/services/intent.service';

@Pipe({ name: 'variableCssClass' })
class VariableCssClassStubPipe implements PipeTransform { transform(value: any) { return ''; } }

@Pipe({ name: 'getVariableName' })
class GetVariableNameStubPipe implements PipeTransform { transform(value: any) { return value; } }

@Component({ selector: 'cds-connector', template: '' })
class CdsConnectorStubComponent {
  @Input() intent: any;
  @Input() action: any;
  @Input() slot: string;
}

describe('CdsActionSetRatingComponent', () => {
  let component: CdsActionSetRatingComponent;
  let fixture: ComponentFixture<CdsActionSetRatingComponent>;

  beforeEach(async () => {
    // in the app the logger is set by AppModule
    const silent = () => {};
    LoggerInstance.setInstance({ log: silent, debug: silent, info: silent, warn: silent, error: silent } as any);
    await TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      declarations: [CdsActionSetRatingComponent, VariableCssClassStubPipe, GetVariableNameStubPipe, CdsConnectorStubComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(CdsActionSetRatingComponent);
    component = fixture.componentInstance;
    component.action = new ActionSetRating();
    component.action.rating = '';
    component.action.forceUpdate = false;
  });

  it('creates an action with type set_rating', () => {
    expect(new ActionSetRating()._tdActionType).toBe('set_rating');
  });

  it('is registered under the same key, in the Special category', () => {
    expect(TYPE_ACTION.SET_RATING).toBe('set_rating');
    const entry = ACTIONS_LIST.SET_RATING;
    expect(entry.type).toBe(TYPE_ACTION.SET_RATING);
    expect(entry.status).toBe('active');
    expect(entry.doc).toBe('CDSActionList.DOC.SetRating');
  });

  it('createNewAction builds it with an empty rating and force update off', () => {
    const service: any = Object.create(IntentService.prototype);
    service.logger = { log: () => {}, warn: () => {}, error: () => {} };
    const action = service.createNewAction(TYPE_ACTION.SET_RATING);
    expect(action instanceof ActionSetRating).toBeTrue();
    expect(action.rating).toBe('');
    expect(action.ratingMessage).toBe('');
    expect(action.forceUpdate).toBeFalse();
    expect(action.assignErrorTo).toBe('rating_error');
  });

  it('renders the block preview with the Success and else exits', () => {
    component.intentSelected = { intent_id: 'block-1' } as any;
    component.previewMode = true;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.cds-action-preview')).toBeTruthy();
    const connectors = fixture.debugElement.queryAll(By.directive(CdsConnectorStubComponent)).map(d => d.componentInstance);
    expect(connectors.map(c => c.slot)).toEqual(['true', 'false']);
    expect(connectors.every(c => c.action === component.action && c.intent === component.intentSelected)).toBeTrue();
    expect(component.idConnectorTrue).toBe('block-1/' + component.action._tdActionId + '/true');
    expect(component.idConnectorFalse).toBe('block-1/' + component.action._tdActionId + '/false');
  });

  it('renders the panel with the values 1-5, the message and the error variable', () => {
    component.previewMode = false;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.rating-value').length).toBe(5);
    expect(fixture.nativeElement.querySelector('cds-textarea.rating-message')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('cds-textarea.assign-error-to')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('cds-connector')).toBeNull();
  });

  it('a picked error variable is saved', () => {
    const emitted: any[] = [];
    component.updateAndSaveAction.subscribe(e => emitted.push(e));
    component.onSelectedAttribute({ value: 'errore_voto' }, 'assignErrorTo');
    expect(component.action.assignErrorTo).toBe('errore_voto');
    expect(emitted.length).toBe(1);
  });

  it('a quick value fills the field and saves', () => {
    component.previewMode = false;
    fixture.detectChanges();
    const emitted: any[] = [];
    component.updateAndSaveAction.subscribe(e => emitted.push(e));

    fixture.nativeElement.querySelectorAll('.rating-value')[3].click();

    expect(component.action.rating).toBe('4');
    expect(component.ratingControl.value).toBe('4');
    expect(emitted.length).toBe(1);
  });

  it('the checkbox toggles force update and saves', () => {
    const emitted: any[] = [];
    component.updateAndSaveAction.subscribe(e => emitted.push(e));
    component.onChangeCheckbox({}, 'forceUpdate');
    expect(component.action.forceUpdate).toBeTrue();
    component.onChangeCheckbox({}, 'forceUpdate');
    expect(component.action.forceUpdate).toBeFalse();
    expect(emitted.length).toBe(2);
  });

  it('the panel has the Request ID field, saved in requestId and shown in the preview', () => {
    component.previewMode = false;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('cds-textarea.request-id')).toBeTruthy();
    component.onChangeTextarea('{{payload.payload.request_id}}', 'requestId');
    expect(component.action.requestId).toBe('{{payload.payload.request_id}}');

    component.previewMode = true;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.cds-action-preview').textContent).toContain('{{payload.payload.request_id}}');
  });
});
