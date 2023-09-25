import { TestBed, inject } from '@angular/core/testing';

import { ArchivedConversationsHandlerService } from './archivedconversations-handler.service';

describe('ArchivedconversationsHandlerService', () => {
  beforeEach(() => { TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    const service: ArchivedConversationsHandlerService = TestBed.get(ArchivedConversationsHandlerService);
    expect(service).toBeTruthy();
  });
});
