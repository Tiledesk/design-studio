import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsPublishOnCommunityModalComponent } from './cds-publish-on-community-modal.component';

describe('CdsPublishOnCommunityModalComponent', () => {
  let component: CdsPublishOnCommunityModalComponent;
  let fixture: ComponentFixture<CdsPublishOnCommunityModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsPublishOnCommunityModalComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsPublishOnCommunityModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
