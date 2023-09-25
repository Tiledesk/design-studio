import { TestBed } from '@angular/core/testing';

import { TiledeskAuthService } from './tiledesk-auth.service';

describe('TiledeskAuthService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: TiledeskAuthService = TestBed.get(TiledeskAuthService);
    expect(service).toBeTruthy();
  });
});
