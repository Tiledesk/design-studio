import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MouseTipsComponent } from './mouse-tips.component';

describe('MouseTipsComponent', () => {
  let component: MouseTipsComponent;
  let fixture: ComponentFixture<MouseTipsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MouseTipsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MouseTipsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
