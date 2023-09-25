import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionWhatsappAttributeComponent } from './cds-action-whatsapp-attribute.component';

describe('ActionWhatsappAttributeComponent', () => {
  let component: CdsActionWhatsappAttributeComponent;
  let fixture: ComponentFixture<CdsActionWhatsappAttributeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionWhatsappAttributeComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionWhatsappAttributeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
