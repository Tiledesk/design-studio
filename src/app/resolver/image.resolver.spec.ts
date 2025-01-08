import { TestBed } from '@angular/core/testing';

import { ImagePreloaderResolver } from './image.resolver';

describe('ImageResolver', () => {
  let resolver: ImagePreloaderResolver;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    resolver = TestBed.inject(ImagePreloaderResolver);
  });

  it('should be created', () => {
    expect(resolver).toBeTruthy();
  });
});
