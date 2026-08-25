import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BaseFilter2Component } from './base-filter2.component';

describe('BaseFilter2Component', () => {
  let component: BaseFilter2Component;
  let fixture: ComponentFixture<BaseFilter2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BaseFilter2Component ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BaseFilter2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
