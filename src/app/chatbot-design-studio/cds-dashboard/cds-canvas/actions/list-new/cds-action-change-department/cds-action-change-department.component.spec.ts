import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionChangeDepartmentComponent } from './cds-action-change-department.component';

describe('CdsActionChangeDepartmentComponent', () => {
  let component: CdsActionChangeDepartmentComponent;
  let fixture: ComponentFixture<CdsActionChangeDepartmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionChangeDepartmentComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionChangeDepartmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
