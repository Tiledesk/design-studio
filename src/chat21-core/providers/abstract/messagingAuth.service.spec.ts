import { TestBed } from '@angular/core/testing';

import { MessagingAuthService } from './messagingAuth.service';

describe('MessagingAuthServiceService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: MessagingAuthService = TestBed.get(MessagingAuthService);
    expect(service).toBeTruthy();
  });
});
