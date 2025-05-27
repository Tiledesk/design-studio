import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsPanelPublishComponent } from './cds-panel-publish.component';

describe('CdsPanelPublishComponent', () => {
  let component: CdsPanelPublishComponent;
  let fixture: ComponentFixture<CdsPanelPublishComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsPanelPublishComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsPanelPublishComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
