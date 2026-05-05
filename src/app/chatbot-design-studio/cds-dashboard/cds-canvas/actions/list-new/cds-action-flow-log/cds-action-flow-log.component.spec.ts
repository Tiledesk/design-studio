import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionFlowLogComponent } from './cds-action-flow-log.component';

describe('CdsActionFlowLogComponent', () => {
  let component: CdsActionFlowLogComponent;
  let fixture: ComponentFixture<CdsActionFlowLogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionFlowLogComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionFlowLogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
