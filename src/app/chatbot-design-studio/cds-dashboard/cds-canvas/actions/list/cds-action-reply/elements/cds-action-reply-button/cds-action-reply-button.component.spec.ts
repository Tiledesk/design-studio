import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionReplyButtonComponent } from './cds-action-reply-button.component';

describe('CdsActionReplyButtonComponent', () => {
  let component: CdsActionReplyButtonComponent;
  let fixture: ComponentFixture<CdsActionReplyButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionReplyButtonComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionReplyButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
