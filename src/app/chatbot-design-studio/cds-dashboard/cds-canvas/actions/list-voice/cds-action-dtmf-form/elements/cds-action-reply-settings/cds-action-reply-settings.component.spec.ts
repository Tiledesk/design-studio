import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionReplySettingsComponent } from './cds-action-reply-settings.component';

describe('CdsActionReplyTextComponent', () => {
  let component: CdsActionReplySettingsComponent;
  let fixture: ComponentFixture<CdsActionReplySettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionReplySettingsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionReplySettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
