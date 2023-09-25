import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsConnectorComponent } from './cds-connector.component';

describe('CdsConnectorComponent', () => {
  let component: CdsConnectorComponent;
  let fixture: ComponentFixture<CdsConnectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsConnectorComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsConnectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
