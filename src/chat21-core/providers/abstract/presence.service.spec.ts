import { TestBed } from '@angular/core/testing';

import { PresenceService } from './presence.service';

describe('PresenceService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: PresenceService = TestBed.get(PresenceService);
    expect(service).toBeTruthy();
  });
});
