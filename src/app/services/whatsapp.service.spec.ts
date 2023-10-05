import { TestBed } from '@angular/core/testing';

import { WhatsappService } from './whatsapp.service';

describe('WhatsappService', () => {
  let service: WhatsappService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WhatsappService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
