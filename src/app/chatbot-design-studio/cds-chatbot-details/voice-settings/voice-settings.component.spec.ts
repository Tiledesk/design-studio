import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CDSVoiceSettingsComponent } from './voice-settings.component';

describe('VoiceSettingsComponent', () => {
  let component: CDSVoiceSettingsComponent;
  let fixture: ComponentFixture<CDSVoiceSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CDSVoiceSettingsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CDSVoiceSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
