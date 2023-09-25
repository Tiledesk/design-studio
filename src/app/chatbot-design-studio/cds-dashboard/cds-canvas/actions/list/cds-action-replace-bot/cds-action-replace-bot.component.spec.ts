import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionReplaceBotComponent } from './cds-action-replace-bot.component';

describe('CdsActionReplaceBotComponent', () => {
  let component: CdsActionReplaceBotComponent;
  let fixture: ComponentFixture<CdsActionReplaceBotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionReplaceBotComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionReplaceBotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
