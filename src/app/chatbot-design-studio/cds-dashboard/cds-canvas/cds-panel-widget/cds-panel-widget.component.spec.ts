import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsPanelWidgetComponent } from './cds-panel-widget.component';

describe('CdsPanelWidgetComponent', () => {
  let component: CdsPanelWidgetComponent;
  let fixture: ComponentFixture<CdsPanelWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsPanelWidgetComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsPanelWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
