import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsPanelDetailComponent } from './cds-panel-detail.component';

describe('CdsPanelDetailComponent', () => {
  let component: CdsPanelDetailComponent;
  let fixture: ComponentFixture<CdsPanelDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsPanelDetailComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsPanelDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
