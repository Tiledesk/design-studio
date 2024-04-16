import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionDTMFFormComponent } from './cds-action-dtmf-form.component';

describe('CdsActionReplyComponent', () => {
  let component: CdsActionDTMFFormComponent;
  let fixture: ComponentFixture<CdsActionDTMFFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionDTMFFormComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionDTMFFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
