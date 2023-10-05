import { TestBed } from '@angular/core/testing';

import { KnowledgeBaseService } from './knowledge-base.service';

describe('KnowledgeBaseService', () => {
  let service: KnowledgeBaseService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(KnowledgeBaseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
