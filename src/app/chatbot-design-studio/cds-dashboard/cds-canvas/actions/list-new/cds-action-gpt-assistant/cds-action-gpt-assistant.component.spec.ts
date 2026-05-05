import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionGptAssistantComponent } from './cds-action-gpt-assistant.component';

describe('CdsActionGptAssistantComponent', () => {
  let component: CdsActionGptAssistantComponent;
  let fixture: ComponentFixture<CdsActionGptAssistantComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionGptAssistantComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionGptAssistantComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
