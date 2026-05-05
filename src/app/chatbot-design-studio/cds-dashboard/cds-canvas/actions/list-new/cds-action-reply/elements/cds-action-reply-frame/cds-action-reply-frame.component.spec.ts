import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionReplyFrameComponent } from './cds-action-reply-frame.component';

describe('CdsActionReplyFrameComponent', () => {
  let component: CdsActionReplyFrameComponent;
  let fixture: ComponentFixture<CdsActionReplyFrameComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionReplyFrameComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionReplyFrameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
