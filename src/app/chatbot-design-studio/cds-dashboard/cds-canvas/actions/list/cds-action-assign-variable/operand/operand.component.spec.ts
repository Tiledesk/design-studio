import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperandComponent } from './operand.component';

describe('OperandComponent', () => {
  let component: OperandComponent;
  let fixture: ComponentFixture<OperandComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OperandComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OperandComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
