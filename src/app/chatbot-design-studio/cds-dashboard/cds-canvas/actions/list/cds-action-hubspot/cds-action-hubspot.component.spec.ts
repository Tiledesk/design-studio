import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionHubspotComponent } from './cds-action-hubspot.component';

describe('CdsActionHubsppotComponent', () => {
  let component: CdsActionHubspotComponent;
  let fixture: ComponentFixture<CdsActionHubspotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionHubspotComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionHubspotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
