import { TestBed } from '@angular/core/testing';

import { ConversationsHandlerService } from './conversations-handler.service';

describe('ConversationsHandlerService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: ConversationsHandlerService = TestBed.get(ConversationsHandlerService);
    expect(service).toBeTruthy();
  });
});
