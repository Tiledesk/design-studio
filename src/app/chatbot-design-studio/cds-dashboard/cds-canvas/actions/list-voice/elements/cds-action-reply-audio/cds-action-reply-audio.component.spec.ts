import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionReplyAudioComponent } from './cds-action-reply-audio.component';

describe('CdsActionReplyFrameComponent', () => {
  let component: CdsActionReplyAudioComponent;
  let fixture: ComponentFixture<CdsActionReplyAudioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionReplyAudioComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionReplyAudioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
