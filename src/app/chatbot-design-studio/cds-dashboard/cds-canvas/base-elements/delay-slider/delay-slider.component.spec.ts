import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CDSDelaySliderComponent } from './delay-slider.component';

describe('CDSDelaySliderComponent', () => {
  let component: CDSDelaySliderComponent;
  let fixture: ComponentFixture<CDSDelaySliderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CDSDelaySliderComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CDSDelaySliderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
