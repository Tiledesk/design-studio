import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionOnlineAgentsComponent } from './cds-action-online-agents.component';

describe('ActionOnlineAgentsComponent', () => {
  let component: CdsActionOnlineAgentsComponent;
  let fixture: ComponentFixture<CdsActionOnlineAgentsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionOnlineAgentsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionOnlineAgentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
