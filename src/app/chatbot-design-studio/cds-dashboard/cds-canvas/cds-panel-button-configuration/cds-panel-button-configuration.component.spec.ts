import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsPanelButtonConfigurationComponent } from './cds-panel-button-configuration.component';

describe('PanelButtonConfigurationComponent', () => {
  let component: CdsPanelButtonConfigurationComponent;
  let fixture: ComponentFixture<CdsPanelButtonConfigurationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsPanelButtonConfigurationComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsPanelButtonConfigurationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
