import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionReplyTTSComponent } from './cds-action-reply-tts.component';

describe('CdsActionReplyTTSComponent', () => {
  let component: CdsActionReplyTTSComponent;
  let fixture: ComponentFixture<CdsActionReplyTTSComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionReplyTTSComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionReplyTTSComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
