import { TestBed } from '@angular/core/testing';

import { ImageRepoService } from './image-repo.service';

describe('ImageRepoService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: ImageRepoService = TestBed.get(ImageRepoService);
    expect(service).toBeTruthy();
  });
});
