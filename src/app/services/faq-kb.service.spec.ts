import { TestBed, inject } from '@angular/core/testing';

import { FaqKbService } from './faq-kb.service';

describe('FaqKbService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FaqKbService]
    });
  });

  it('should be created', inject([FaqKbService], (service: FaqKbService) => {
    expect(service).toBeTruthy();
  }));
});
