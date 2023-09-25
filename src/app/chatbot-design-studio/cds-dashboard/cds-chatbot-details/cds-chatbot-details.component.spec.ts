import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsChatbotDetailsComponent } from './cds-chatbot-details.component';

describe('CdsChatbotDetailsComponent', () => {
  let component: CdsChatbotDetailsComponent;
  let fixture: ComponentFixture<CdsChatbotDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsChatbotDetailsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsChatbotDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
