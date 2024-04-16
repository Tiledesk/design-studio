import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionDtmfMenuComponent } from './cds-action-dtmf-menu.component';

describe('CdsActionDtmfMenuComponent', () => {
  let component: CdsActionDtmfMenuComponent;
  let fixture: ComponentFixture<CdsActionDtmfMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionDtmfMenuComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionDtmfMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
