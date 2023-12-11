import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsFulfillmentComponent } from './cds-fulfillment.component';

describe('CdsFulfillmentComponent', () => {
  let component: CdsFulfillmentComponent;
  let fixture: ComponentFixture<CdsFulfillmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsFulfillmentComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsFulfillmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
