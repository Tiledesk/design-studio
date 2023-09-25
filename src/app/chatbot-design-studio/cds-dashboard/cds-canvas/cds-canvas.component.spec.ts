import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsCanvasComponent } from './cds-canvas.component';

describe('CdsCanvasComponent', () => {
  let component: CdsCanvasComponent;
  let fixture: ComponentFixture<CdsCanvasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsCanvasComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsCanvasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
