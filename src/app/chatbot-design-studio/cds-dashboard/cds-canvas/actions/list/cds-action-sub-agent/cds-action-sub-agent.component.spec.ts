import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionSubAgentComponent } from './cds-action-sub-agent.component';

describe('CdsActionSubAgentComponent', () => {
  let component: CdsActionSubAgentComponent;
  let fixture: ComponentFixture<CdsActionSubAgentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionSubAgentComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionSubAgentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
