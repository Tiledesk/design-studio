import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionMoveUnassignedComponent } from './cds-action-move-unassigned.component';

describe('CdsMoveUnassignedComponent', () => {
  let component: CdsActionMoveUnassignedComponent;
  let fixture: ComponentFixture<CdsActionMoveUnassignedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionMoveUnassignedComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionMoveUnassignedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
