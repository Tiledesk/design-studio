import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionClearTranscriptComponent } from './cds-action-clear-transcript.component';

describe('CdsClearTranscriptComponent', () => {
  let component: CdsActionClearTranscriptComponent;
  let fixture: ComponentFixture<CdsActionClearTranscriptComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionClearTranscriptComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionClearTranscriptComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
