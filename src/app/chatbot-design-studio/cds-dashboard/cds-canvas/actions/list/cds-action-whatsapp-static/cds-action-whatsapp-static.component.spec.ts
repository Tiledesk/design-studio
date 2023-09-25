import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionWhatsappStaticComponent } from './cds-action-whatsapp-static.component';

describe('ActionWhatsappStaticComponent', () => {
  let component: CdsActionWhatsappStaticComponent;
  let fixture: ComponentFixture<CdsActionWhatsappStaticComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionWhatsappStaticComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionWhatsappStaticComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
