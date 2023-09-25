import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsPopupComponent } from './cds-popup.component';

describe('CdsPopupComponent', () => {
  let component: CdsPopupComponent;
  let fixture: ComponentFixture<CdsPopupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsPopupComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsPopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
