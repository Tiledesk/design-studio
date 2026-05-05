import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionBrevoComponent } from './cds-action-brevo.component';

describe('CdsActionBrevoComponent', () => {
  let component: CdsActionBrevoComponent;
  let fixture: ComponentFixture<CdsActionBrevoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionBrevoComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionBrevoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
