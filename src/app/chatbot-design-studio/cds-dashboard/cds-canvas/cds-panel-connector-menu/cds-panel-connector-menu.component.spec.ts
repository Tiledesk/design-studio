import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsPanelConnectorMenuComponent } from './cds-panel-connector-menu.component';

describe('CdsPanelConnectorMenuComponent', () => {
  let component: CdsPanelConnectorMenuComponent;
  let fixture: ComponentFixture<CdsPanelConnectorMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsPanelConnectorMenuComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsPanelConnectorMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
