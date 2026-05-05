import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionAssignVariableComponent } from './cds-action-assign-variable.component';

describe('CdsActionAssignVariableComponent', () => {
  let component: CdsActionAssignVariableComponent;
  let fixture: ComponentFixture<CdsActionAssignVariableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionAssignVariableComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionAssignVariableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
