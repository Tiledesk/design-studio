import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionAiConditionComponent } from './cds-action-ai-condition.component';

describe('CdsActionAiConditionComponent', () => {
  let component: CdsActionAiConditionComponent;
  let fixture: ComponentFixture<CdsActionAiConditionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionAiConditionComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionAiConditionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
