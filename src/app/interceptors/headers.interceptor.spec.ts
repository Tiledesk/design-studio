import { TestBed } from '@angular/core/testing';

import { HeadersInterceptor } from './headers.interceptor';

describe('HeadersInterceptor', () => {
  beforeEach(() => TestBed.configureTestingModule({
    providers: [
      HeadersInterceptor
      ]
  }));

  it('should be created', () => {
    const interceptor: HeadersInterceptor = TestBed.inject(HeadersInterceptor);
    expect(interceptor).toBeTruthy();
  });
});
