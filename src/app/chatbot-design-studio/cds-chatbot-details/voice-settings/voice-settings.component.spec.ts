import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VoiceSettingsComponent } from './voice-settings.component';

describe('VoiceSettingsComponent', () => {
  let component: VoiceSettingsComponent;
  let fixture: ComponentFixture<VoiceSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ VoiceSettingsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VoiceSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
