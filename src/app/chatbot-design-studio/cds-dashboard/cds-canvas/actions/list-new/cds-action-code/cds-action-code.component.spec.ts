import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionCodeComponent } from './cds-action-code.component';

describe('CdsActionCodeComponent', () => {
  let component: CdsActionCodeComponent;
  let fixture: ComponentFixture<CdsActionCodeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionCodeComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionCodeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
