import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionReplaceBotV2Component } from './cds-action-replace-bot-v2.component';

describe('CdsActionReplaceBotV2Component', () => {
  let component: CdsActionReplaceBotV2Component;
  let fixture: ComponentFixture<CdsActionReplaceBotV2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionReplaceBotV2Component ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionReplaceBotV2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
