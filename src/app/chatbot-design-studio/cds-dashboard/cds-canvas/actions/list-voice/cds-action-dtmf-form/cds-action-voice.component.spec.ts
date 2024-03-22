import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionVoiceComponent } from './cds-action-voice.component';

describe('CdsActionReplyComponent', () => {
  let component: CdsActionVoiceComponent;
  let fixture: ComponentFixture<CdsActionVoiceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionVoiceComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionVoiceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
