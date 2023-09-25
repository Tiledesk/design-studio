import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionReplyRedirectComponent } from './cds-action-reply-redirect.component';

describe('CdsActionReplyRedirectComponent', () => {
  let component: CdsActionReplyRedirectComponent;
  let fixture: ComponentFixture<CdsActionReplyRedirectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionReplyRedirectComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionReplyRedirectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
