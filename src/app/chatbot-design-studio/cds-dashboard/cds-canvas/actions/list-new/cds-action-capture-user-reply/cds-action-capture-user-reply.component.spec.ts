import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionCaptureUserReplyComponent } from './cds-action-capture-user-reply.component';

describe('CdsActionCaptureUserReplyComponent', () => {
  let component: CdsActionCaptureUserReplyComponent;
  let fixture: ComponentFixture<CdsActionCaptureUserReplyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionCaptureUserReplyComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionCaptureUserReplyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
