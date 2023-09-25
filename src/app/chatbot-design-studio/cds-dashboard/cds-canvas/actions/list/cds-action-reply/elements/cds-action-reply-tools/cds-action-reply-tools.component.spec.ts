import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionReplyToolsComponent } from './cds-action-reply-tools.component';

describe('CdsActionReplyToolsComponent', () => {
  let component: CdsActionReplyToolsComponent;
  let fixture: ComponentFixture<CdsActionReplyToolsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionReplyToolsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionReplyToolsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
