import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionWebhookComponent } from './cds-action-webhook.component';

describe('CdsActionWebhookComponent', () => {
  let component: CdsActionWebhookComponent;
  let fixture: ComponentFixture<CdsActionWebhookComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionWebhookComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionWebhookComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
