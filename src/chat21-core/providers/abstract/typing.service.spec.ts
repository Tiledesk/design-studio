import { TestBed } from '@angular/core/testing';

import { TypingService } from './typing.service';

describe('TypingService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: TypingService = TestBed.get(TypingService);
    expect(service).toBeTruthy();
  });
});
