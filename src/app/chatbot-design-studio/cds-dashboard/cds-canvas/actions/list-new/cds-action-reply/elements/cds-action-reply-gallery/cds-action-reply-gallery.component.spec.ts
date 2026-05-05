import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionReplyGalleryComponent } from './cds-action-reply-gallery.component';

describe('GalleryResponseComponent', () => {
  let component: CdsActionReplyGalleryComponent;
  let fixture: ComponentFixture<CdsActionReplyGalleryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionReplyGalleryComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionReplyGalleryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
