import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsWhatsappReceiverComponent } from './whatsapp-receiver.component';

describe('WhatsappReceiverComponent', () => {
  let component: CdsWhatsappReceiverComponent;
  let fixture: ComponentFixture<CdsWhatsappReceiverComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsWhatsappReceiverComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsWhatsappReceiverComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
