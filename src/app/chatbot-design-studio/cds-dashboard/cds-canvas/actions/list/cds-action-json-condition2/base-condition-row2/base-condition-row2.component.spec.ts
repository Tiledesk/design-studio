import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BaseConditionRow2Component } from './base-condition-row2.component';

describe('BaseConditionRow2Component', () => {
  let component: BaseConditionRow2Component;
  let fixture: ComponentFixture<BaseConditionRow2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BaseConditionRow2Component ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BaseConditionRow2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
