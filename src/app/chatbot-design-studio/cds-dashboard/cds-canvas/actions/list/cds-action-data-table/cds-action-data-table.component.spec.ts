import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { CdsActionDataTableComponent } from './cds-action-data-table.component';
import { ActionDataTable } from 'src/app/models/action-model';

describe('CdsActionDataTableComponent', () => {
  let component: CdsActionDataTableComponent;
  let fixture: ComponentFixture<CdsActionDataTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionDataTableComponent ],
      imports: [ HttpClientTestingModule ],
      schemas: [ NO_ERRORS_SCHEMA ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionDataTableComponent);
    component = fixture.componentInstance;
    component.action = new ActionDataTable();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
