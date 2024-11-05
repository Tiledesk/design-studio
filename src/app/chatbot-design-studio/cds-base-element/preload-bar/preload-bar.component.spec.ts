import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PreloadBarComponent } from './preload-bar.component';

describe('PreloadBarComponent', () => {
  let component: PreloadBarComponent;
  let fixture: ComponentFixture<PreloadBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PreloadBarComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PreloadBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
