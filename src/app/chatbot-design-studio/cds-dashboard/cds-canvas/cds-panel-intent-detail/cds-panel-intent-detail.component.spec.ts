import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsPanelIntentDetailComponent } from './cds-panel-intent-detail.component';

describe('CdsPanelIntentDetailComponent', () => {
  let component: CdsPanelIntentDetailComponent;
  let fixture: ComponentFixture<CdsPanelIntentDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsPanelIntentDetailComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsPanelIntentDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
