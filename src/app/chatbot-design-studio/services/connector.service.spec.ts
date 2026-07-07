import { TestBed } from '@angular/core/testing';

import { ConnectorService } from './connector.service';

describe('ConnectorService', () => {
  let service: ConnectorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConnectorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getConnectorsInByIntent returns empty array when not initialized', () => {
    const result = service.getConnectorsInByIntent('any-intent-id');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it('connectorsInChanged$ is defined and subscribable', () => {
    expect(service.connectorsInChanged$).toBeDefined();
    expect(typeof service.connectorsInChanged$.subscribe).toBe('function');
  });

  it('clearRetryQueue does not throw', () => {
    expect(() => service.clearRetryQueue()).not.toThrow();
  });
});
