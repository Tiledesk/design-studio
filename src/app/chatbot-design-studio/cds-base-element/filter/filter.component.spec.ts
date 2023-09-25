import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CDSFilterComponent } from './filter.component';

describe('FilterComponent', () => {
  let component: CDSFilterComponent;
  let fixture: ComponentFixture<CDSFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CDSFilterComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CDSFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
