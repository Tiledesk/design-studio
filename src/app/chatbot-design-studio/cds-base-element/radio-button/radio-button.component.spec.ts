import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CDSRadioButtonComponent } from './radio-button.component';

describe('CDSRadioButtonComponent', () => {
  let component: CDSRadioButtonComponent;
  let fixture: ComponentFixture<CDSRadioButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CDSRadioButtonComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CDSRadioButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
