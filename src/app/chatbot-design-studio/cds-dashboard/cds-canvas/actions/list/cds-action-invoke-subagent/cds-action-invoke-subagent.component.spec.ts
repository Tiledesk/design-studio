import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionInvokeSubagentComponent } from './cds-action-invoke-subagent.component';

describe('CdsActionInvokeSubagentComponent', () => {
  let component: CdsActionInvokeSubagentComponent;
  let fixture: ComponentFixture<CdsActionInvokeSubagentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionInvokeSubagentComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionInvokeSubagentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
