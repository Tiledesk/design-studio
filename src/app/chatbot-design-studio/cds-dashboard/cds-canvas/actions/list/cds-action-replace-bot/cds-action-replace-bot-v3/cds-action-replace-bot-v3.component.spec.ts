import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionReplaceBotV3Component } from './cds-action-replace-bot-v3.component';

describe('CdsActionReplaceBotV3Component', () => {
  let component: CdsActionReplaceBotV3Component;
  let fixture: ComponentFixture<CdsActionReplaceBotV3Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionReplaceBotV3Component ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionReplaceBotV3Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
