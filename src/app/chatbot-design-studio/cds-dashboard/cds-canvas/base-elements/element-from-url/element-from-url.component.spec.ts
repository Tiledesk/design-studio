import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ElementFromUrlComponent } from './element-from-url.component';

describe('ElementFromUrlComponent', () => {
  let component: ElementFromUrlComponent;
  let fixture: ComponentFixture<ElementFromUrlComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ElementFromUrlComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ElementFromUrlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
