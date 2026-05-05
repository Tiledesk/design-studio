import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionAssignFunctionComponent } from './cds-action-assign-function.component';

describe('ActionAssignFunctionComponent', () => {
  let component: CdsActionAssignFunctionComponent;
  let fixture: ComponentFixture<CdsActionAssignFunctionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionAssignFunctionComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionAssignFunctionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
