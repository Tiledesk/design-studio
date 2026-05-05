import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionReplyComponent } from './cds-action-reply.component';

describe('CdsActionReplyComponent', () => {
  let component: CdsActionReplyComponent;
  let fixture: ComponentFixture<CdsActionReplyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionReplyComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionReplyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
