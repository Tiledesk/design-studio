import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionDetailPanelComponent } from './cds-panel-action-detail.component';

describe('CdsActionDetailPanelComponent', () => {
  let component: CdsActionDetailPanelComponent;
  let fixture: ComponentFixture<CdsActionDetailPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionDetailPanelComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionDetailPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
