import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsPanelActionsComponent } from './cds-panel-actions.component';

describe('CdsPanelActionsComponent', () => {
  let component: CdsPanelActionsComponent;
  let fixture: ComponentFixture<CdsPanelActionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsPanelActionsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsPanelActionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
