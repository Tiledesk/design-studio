import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeightSliderComponent } from './height-slider.component';

describe('HeightSliderComponent', () => {
  let component: HeightSliderComponent;
  let fixture: ComponentFixture<HeightSliderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ HeightSliderComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HeightSliderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
