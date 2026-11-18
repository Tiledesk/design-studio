import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { CdsActionRemoveHumanComponent } from './cds-action-remove-human.component';
import { IntentService } from '../../../../../services/intent.service';
import { ActionRemoveHuman } from 'src/app/models/action-model';

describe('CdsActionRemoveHumanComponent', () => {
  let component: CdsActionRemoveHumanComponent;
  let fixture: ComponentFixture<CdsActionRemoveHumanComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      declarations: [CdsActionRemoveHumanComponent],
      providers: [
        { provide: IntentService, useValue: { isChangedConnector$: new Subject<any>(), getListOfIntents: () => [] } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(CdsActionRemoveHumanComponent);
    component = fixture.componentInstance;
    component.action = new ActionRemoveHuman();
    component.intentSelected = { intent_id: 'intent1' } as any;
    component.previewMode = false;
  });

  it('creates an action with type remove_human and scope invited', () => {
    const action = new ActionRemoveHuman();
    expect(action._tdActionType).toBe('remove_human');
    expect(action.scope).toBe('invited');
  });

  it('falls back to invited for a missing or unknown scope', () => {
    component.action.scope = 'everyone';
    fixture.detectChanges();
    expect(component.action.scope).toBe('invited');
  });

  it('saves the selected scope', () => {
    fixture.detectChanges();
    const emitSpy = spyOn(component.updateAndSaveAction, 'emit');

    component.onChangeScope({ name: 'x', value: 'all_humans' });

    expect(component.action.scope).toBe('all_humans');
    expect(emitSpy).toHaveBeenCalledTimes(1);
  });

  it('emits connector changes for the removed and error connectors', () => {
    fixture.detectChanges();
    const connectorSpy = spyOn(component.onConnectorChange, 'emit');
    const actionId = component.action._tdActionId;

    component.onChangeSelect({ name: 'next', value: '#next' }, 'trueIntent');
    component.onResetBlockSelect({ name: 'next', value: '#next' }, 'falseIntent');

    expect(connectorSpy).toHaveBeenCalledWith({ type: 'create', fromId: 'intent1/' + actionId + '/true', toId: '#next' });
    expect(connectorSpy).toHaveBeenCalledWith({ type: 'delete', fromId: 'intent1/' + actionId + '/false', toId: undefined });
    expect(component.action.falseIntent).toBeNull();
  });
});
