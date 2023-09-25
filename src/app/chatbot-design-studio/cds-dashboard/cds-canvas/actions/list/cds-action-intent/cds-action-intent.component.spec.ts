import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionIntentComponent } from './cds-action-intent.component';

describe('CdsActionIntentComponent', () => {
  let component: CdsActionIntentComponent;
  let fixture: ComponentFixture<CdsActionIntentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionIntentComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionIntentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
