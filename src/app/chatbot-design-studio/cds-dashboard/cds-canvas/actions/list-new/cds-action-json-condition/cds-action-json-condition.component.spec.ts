import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionJsonConditionComponent } from './cds-action-json-condition.component';

describe('ActionFilterComponent', () => {
  let component: CdsActionJsonConditionComponent;
  let fixture: ComponentFixture<CdsActionJsonConditionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionJsonConditionComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionJsonConditionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
