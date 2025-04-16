import { TestBed } from '@angular/core/testing';

import { WebhookServiceService } from './webhook-service.service';

describe('WebhookServiceService', () => {
  let service: WebhookServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WebhookServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
