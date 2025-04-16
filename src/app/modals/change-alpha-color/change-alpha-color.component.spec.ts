import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChangeAlphaColorComponent } from './change-alpha-color.component';

describe('ChangeAlphaColorComponent', () => {
  let component: ChangeAlphaColorComponent;
  let fixture: ComponentFixture<ChangeAlphaColorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ChangeAlphaColorComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChangeAlphaColorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
