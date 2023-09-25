import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionOpenHoursComponent } from './cds-action-open-hours.component';

describe('ActionOpenHoursComponent', () => {
  let component: CdsActionOpenHoursComponent;
  let fixture: ComponentFixture<CdsActionOpenHoursComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionOpenHoursComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionOpenHoursComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
