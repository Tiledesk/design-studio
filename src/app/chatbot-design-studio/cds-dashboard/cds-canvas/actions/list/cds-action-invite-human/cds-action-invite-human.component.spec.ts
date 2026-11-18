import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { CdsActionInviteHumanComponent } from './cds-action-invite-human.component';
import { IntentService } from '../../../../../services/intent.service';
import { DashboardService } from 'src/app/services/dashboard.service';
import { ActionInviteHuman } from 'src/app/models/action-model';

describe('CdsActionInviteHumanComponent', () => {
  let component: CdsActionInviteHumanComponent;
  let fixture: ComponentFixture<CdsActionInviteHumanComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      declarations: [CdsActionInviteHumanComponent],
      providers: [
        { provide: IntentService, useValue: { isChangedConnector$: new Subject<any>(), getListOfIntents: () => [] } },
        { provide: DashboardService, useValue: { departments: [{ _id: 'dep1', name: 'SRE' }] } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(CdsActionInviteHumanComponent);
    component = fixture.componentInstance;
    component.action = new ActionInviteHuman();
    component.intentSelected = { intent_id: 'intent1' } as any;
    component.previewMode = false;
  });

  it('creates an action with type invite_human', () => {
    fixture.detectChanges();
    expect(component.action._tdActionType).toBe('invite_human');
  });

  it('drops a department that does not belong to the project', () => {
    component.action.departmentId = 'missing';
    fixture.detectChanges();
    expect(component.action.departmentId).toBeNull();
  });

  it('saves department and members', () => {
    fixture.detectChanges();
    const emitSpy = spyOn(component.updateAndSaveAction, 'emit');

    component.onChangeDepartment({ _id: 'dep1', name: 'SRE' });
    component.onChangeMembers('a@acme.it, {{oncall}}');

    expect(component.action.departmentId).toBe('dep1');
    expect(component.action.members).toBe('a@acme.it, {{oncall}}');
    expect(emitSpy).toHaveBeenCalledTimes(2);
  });

  it('emits connector changes for the invited and no-human connectors', () => {
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
