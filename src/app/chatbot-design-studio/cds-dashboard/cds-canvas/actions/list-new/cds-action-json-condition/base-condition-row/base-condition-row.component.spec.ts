import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BaseConditionRowComponent } from './base-condition-row.component';

describe('BaseConditionRowComponent', () => {
  let component: BaseConditionRowComponent;
  let fixture: ComponentFixture<BaseConditionRowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BaseConditionRowComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BaseConditionRowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
