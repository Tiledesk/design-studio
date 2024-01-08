import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsGlobalPanelDetailComponent } from './cds-global-panel-detail.component';

describe('CdsGlobalPanelDetailComponent', () => {
  let component: CdsGlobalPanelDetailComponent;
  let fixture: ComponentFixture<CdsGlobalPanelDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsGlobalPanelDetailComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsGlobalPanelDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
