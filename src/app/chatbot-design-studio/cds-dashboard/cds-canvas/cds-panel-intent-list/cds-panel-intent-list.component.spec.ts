import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsPanelIntentListComponent } from './cds-panel-intent-list.component';

describe('CdsPanelIntentListComponent', () => {
  let component: CdsPanelIntentListComponent;
  let fixture: ComponentFixture<CdsPanelIntentListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsPanelIntentListComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsPanelIntentListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
