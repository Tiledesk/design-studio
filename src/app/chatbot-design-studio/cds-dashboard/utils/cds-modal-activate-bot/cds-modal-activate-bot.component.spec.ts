import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsModalActivateBotComponent } from './cds-modal-activate-bot.component';

describe('CdsModalActivateBotComponent', () => {
  let component: CdsModalActivateBotComponent;
  let fixture: ComponentFixture<CdsModalActivateBotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsModalActivateBotComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsModalActivateBotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
