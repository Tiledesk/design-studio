import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionReplyJsonbuttonsComponent } from './cds-action-reply-jsonbuttons.component';

describe('CdsActionReplyJsonbuttonsComponent', () => {
  let component: CdsActionReplyJsonbuttonsComponent;
  let fixture: ComponentFixture<CdsActionReplyJsonbuttonsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionReplyJsonbuttonsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionReplyJsonbuttonsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
