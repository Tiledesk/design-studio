import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionWebRequestV2Component } from './cds-action-web-request-v2.component';

describe('CdsActionWebRequestV2Component', () => {
  let component: CdsActionWebRequestV2Component;
  let fixture: ComponentFixture<CdsActionWebRequestV2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionWebRequestV2Component ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionWebRequestV2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
