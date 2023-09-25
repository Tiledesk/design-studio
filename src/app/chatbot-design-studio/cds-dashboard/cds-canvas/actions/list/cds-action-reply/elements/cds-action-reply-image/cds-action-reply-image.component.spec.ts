import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImageResponseComponent } from './image-response.component';

describe('ImageResponseComponent', () => {
  let component: ImageResponseComponent;
  let fixture: ComponentFixture<ImageResponseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ImageResponseComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImageResponseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
