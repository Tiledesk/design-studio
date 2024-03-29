import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionBlindTransferComponent } from './cds-action-blind-transfer.component';

describe('CdsActionBlindTransferComponent', () => {
  let component: CdsActionBlindTransferComponent;
  let fixture: ComponentFixture<CdsActionBlindTransferComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionBlindTransferComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionBlindTransferComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
