import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionAudioRecordComponent } from './cds-action-audio-record.component';

describe('CdsActionRecordComponent', () => {
  let component: CdsActionAudioRecordComponent;
  let fixture: ComponentFixture<CdsActionAudioRecordComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionAudioRecordComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionAudioRecordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
