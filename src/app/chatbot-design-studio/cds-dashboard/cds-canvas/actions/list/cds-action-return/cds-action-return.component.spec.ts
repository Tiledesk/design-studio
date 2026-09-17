import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionReturnComponent } from './cds-action-return.component';

describe('CdsActionReturnComponent', () => {
  let component: CdsActionReturnComponent;
  let fixture: ComponentFixture<CdsActionReturnComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionReturnComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionReturnComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
