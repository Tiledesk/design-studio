import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionReplyToolsVoiceComponent } from './cds-action-reply-tools-voice.component';

describe('CdsActionReplyToolsComponent', () => {
  let component: CdsActionReplyToolsVoiceComponent;
  let fixture: ComponentFixture<CdsActionReplyToolsVoiceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionReplyToolsVoiceComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionReplyToolsVoiceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
