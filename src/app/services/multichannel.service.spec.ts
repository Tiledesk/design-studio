import { TestBed } from '@angular/core/testing';

import { MultichannelService } from './multichannel.service';

describe('MultichannelService', () => {
  let service: MultichannelService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MultichannelService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
