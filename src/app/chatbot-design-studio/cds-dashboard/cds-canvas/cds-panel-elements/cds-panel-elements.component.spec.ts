import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsPanelElementsComponent } from './cds-panel-elements.component';

describe('CdsPanelElementsComponent', () => {
  let component: CdsPanelElementsComponent;
  let fixture: ComponentFixture<CdsPanelElementsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsPanelElementsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsPanelElementsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
