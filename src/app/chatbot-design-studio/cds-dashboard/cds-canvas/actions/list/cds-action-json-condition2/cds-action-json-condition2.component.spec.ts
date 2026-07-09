import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionJsonCondition2Component } from './cds-action-json-condition2.component';

describe('CdsActionJsonCondition2Component', () => {
  let component: CdsActionJsonCondition2Component;
  let fixture: ComponentFixture<CdsActionJsonCondition2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionJsonCondition2Component ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionJsonCondition2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
