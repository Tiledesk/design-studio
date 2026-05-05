import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionLeadUpdateComponent } from './cds-action-lead-update.component';

describe('CdsActionLeadUpdateComponent', () => {
  let component: CdsActionLeadUpdateComponent;
  let fixture: ComponentFixture<CdsActionLeadUpdateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionLeadUpdateComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionLeadUpdateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
