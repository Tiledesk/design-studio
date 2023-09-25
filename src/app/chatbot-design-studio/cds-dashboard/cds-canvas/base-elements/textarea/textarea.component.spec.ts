import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CDSTextareaComponent } from './textarea.component';

describe('ElementTextareaComponent', () => {
  let component: CDSTextareaComponent;
  let fixture: ComponentFixture<CDSTextareaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CDSTextareaComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CDSTextareaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
