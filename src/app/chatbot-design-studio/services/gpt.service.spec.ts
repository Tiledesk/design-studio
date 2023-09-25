import { TestBed } from '@angular/core/testing';

import { GptService } from './gpt.service';

describe('GptService', () => {
  let service: GptService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GptService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
