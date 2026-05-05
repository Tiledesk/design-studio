import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionReplyTextComponent } from './cds-action-reply-text.component';

describe('CdsActionReplyTextComponent', () => {
  let component: CdsActionReplyTextComponent;
  let fixture: ComponentFixture<CdsActionReplyTextComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionReplyTextComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionReplyTextComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
