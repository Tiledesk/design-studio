import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AiConditionComponent } from './ai-condition.component';

describe('AiConditionComponent', () => {
  let component: AiConditionComponent;
  let fixture: ComponentFixture<AiConditionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AiConditionComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AiConditionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
