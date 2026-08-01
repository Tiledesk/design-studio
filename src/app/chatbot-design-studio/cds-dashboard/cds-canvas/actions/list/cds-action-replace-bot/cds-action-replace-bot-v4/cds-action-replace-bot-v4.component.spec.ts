import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionReplaceBotV4Component } from './cds-action-replace-bot-v4.component';

describe('CdsActionReplaceBotV4Component', () => {
  let component: CdsActionReplaceBotV4Component;
  let fixture: ComponentFixture<CdsActionReplaceBotV4Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionReplaceBotV4Component ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionReplaceBotV4Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
