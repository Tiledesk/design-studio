import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionHideMessageComponent } from './cds-action-hide-message.component';

describe('CdsActionHideMessageComponent', () => {
  let component: CdsActionHideMessageComponent;
  let fixture: ComponentFixture<CdsActionHideMessageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionHideMessageComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionHideMessageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
