import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsConnectorInComponent } from './cds-connector-in.component';

describe('CdsConnectorInComponent', () => {
  let component: CdsConnectorInComponent;
  let fixture: ComponentFixture<CdsConnectorInComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsConnectorInComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsConnectorInComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
