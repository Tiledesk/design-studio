import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionSendWhatsappComponent } from './cds-action-send-whatsapp.component';

describe('CdsActionSendWhatsappComponent', () => {
  let component: CdsActionSendWhatsappComponent;
  let fixture: ComponentFixture<CdsActionSendWhatsappComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionSendWhatsappComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionSendWhatsappComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
