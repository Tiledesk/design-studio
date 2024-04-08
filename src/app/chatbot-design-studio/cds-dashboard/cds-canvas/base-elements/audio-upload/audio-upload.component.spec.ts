import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CDSImageUploadComponent } from './audio-upload.component';

describe('ImageUploadComponent', () => {
  let component: CDSImageUploadComponent;
  let fixture: ComponentFixture<CDSImageUploadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CDSImageUploadComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CDSImageUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
