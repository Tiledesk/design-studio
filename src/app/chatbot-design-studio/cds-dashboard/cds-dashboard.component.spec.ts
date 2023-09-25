import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsDashboardComponent } from './cds-dashboard.component';

describe('CdsDashboardComponent', () => {
  let component: CdsDashboardComponent;
  let fixture: ComponentFixture<CdsDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsDashboardComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
