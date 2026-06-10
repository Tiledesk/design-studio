import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionReplyUrlPreviewComponent } from './cds-action-reply-url-preview.component';

describe('CdsActionReplyUrlPreviewComponent', () => {
  let component: CdsActionReplyUrlPreviewComponent;
  let fixture: ComponentFixture<CdsActionReplyUrlPreviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionReplyUrlPreviewComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionReplyUrlPreviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

