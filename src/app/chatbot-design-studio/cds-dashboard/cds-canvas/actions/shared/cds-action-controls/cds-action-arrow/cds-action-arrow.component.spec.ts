import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionArrowComponent } from './cds-action-arrow.component';

describe('CdsActionArrowComponent', () => {
  let component: CdsActionArrowComponent;
  let fixture: ComponentFixture<CdsActionArrowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionArrowComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionArrowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
