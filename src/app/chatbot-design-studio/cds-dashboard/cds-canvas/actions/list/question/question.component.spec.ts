import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsQuestionComponent } from './question.component';

describe('QuestionComponent', () => {
  let component: CdsQuestionComponent;
  let fixture: ComponentFixture<CdsQuestionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsQuestionComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsQuestionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
