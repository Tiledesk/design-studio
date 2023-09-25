import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionAskgptComponent } from './cds-action-askgpt.component';

describe('ActionAskgptComponent', () => {
  let component: CdsActionAskgptComponent;
  let fixture: ComponentFixture<CdsActionAskgptComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionAskgptComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionAskgptComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
