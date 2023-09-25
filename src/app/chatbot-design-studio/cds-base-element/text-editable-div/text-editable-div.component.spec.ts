import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TextEditableDivComponent } from './text-editable-div.component';

describe('TextEditableDivComponent', () => {
  let component: TextEditableDivComponent;
  let fixture: ComponentFixture<TextEditableDivComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TextEditableDivComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TextEditableDivComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
