import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionN8nComponent } from './cds-action-n8n.component';

describe('CdsActionN8nComponent', () => {
  let component: CdsActionN8nComponent;
  let fixture: ComponentFixture<CdsActionN8nComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionN8nComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionN8nComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
