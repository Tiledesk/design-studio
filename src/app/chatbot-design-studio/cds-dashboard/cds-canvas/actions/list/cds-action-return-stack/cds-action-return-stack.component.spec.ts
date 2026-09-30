import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionReturnStackComponent } from './cds-action-return-stack.component';

describe('CdsActionReturnStackComponent', () => {
  let component: CdsActionReturnStackComponent;
  let fixture: ComponentFixture<CdsActionReturnStackComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionReturnStackComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionReturnStackComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
