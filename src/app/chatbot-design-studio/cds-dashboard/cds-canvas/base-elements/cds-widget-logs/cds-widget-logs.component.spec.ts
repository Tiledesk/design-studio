import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsWidgetLogsComponent } from './cds-widget-logs.component';

describe('CdsWidgetLogsComponent', () => {
  let component: CdsWidgetLogsComponent;
  let fixture: ComponentFixture<CdsWidgetLogsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsWidgetLogsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsWidgetLogsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
