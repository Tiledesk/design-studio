import { TestBed } from '@angular/core/testing';

import { WsChatbotService } from './ws-chatbot.service';

describe('WsChatbotService', () => {
  let service: WsChatbotService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WsChatbotService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
