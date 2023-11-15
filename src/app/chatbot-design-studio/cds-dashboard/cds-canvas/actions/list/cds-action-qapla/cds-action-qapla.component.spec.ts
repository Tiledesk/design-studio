import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionQaplaComponent } from './cds-action-qapla.component';

describe('CdsActionQaplaComponent', () => {
  let component: CdsActionQaplaComponent;
  let fixture: ComponentFixture<CdsActionQaplaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionQaplaComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionQaplaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
