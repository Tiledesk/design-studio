import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionAssignVariableV2Component } from './cds-action-assign-variable-v2.component';

describe('CdsActionAssignVariableV2Component', () => {
  let component: CdsActionAssignVariableV2Component;
  let fixture: ComponentFixture<CdsActionAssignVariableV2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionAssignVariableV2Component ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionAssignVariableV2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
