import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionAskgptV2Component } from './cds-action-askgpt-v2.component';

describe('CdsActionAskgptV2Component', () => {
  let component: CdsActionAskgptV2Component;
  let fixture: ComponentFixture<CdsActionAskgptV2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionAskgptV2Component ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionAskgptV2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
