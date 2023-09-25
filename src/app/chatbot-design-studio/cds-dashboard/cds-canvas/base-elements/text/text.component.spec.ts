import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CDSTextComponent } from './text.component';

describe('TextComponent', () => {
  let component: CDSTextComponent;
  let fixture: ComponentFixture<CDSTextComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CDSTextComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CDSTextComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
