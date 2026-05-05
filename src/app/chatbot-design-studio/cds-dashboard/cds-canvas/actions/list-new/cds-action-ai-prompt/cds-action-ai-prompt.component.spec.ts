import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionAiPromptComponent } from './cds-action-ai-prompt.component';

describe('CdsActionAiPromptComponent', () => {
  let component: CdsActionAiPromptComponent;
  let fixture: ComponentFixture<CdsActionAiPromptComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionAiPromptComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionAiPromptComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
