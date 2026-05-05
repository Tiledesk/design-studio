import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionAgentHandoffComponent } from './cds-action-agent-handoff.component';

describe('CdsActionAgentHandoffComponent', () => {
  let component: CdsActionAgentHandoffComponent;
  let fixture: ComponentFixture<CdsActionAgentHandoffComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionAgentHandoffComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionAgentHandoffComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
