import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsRuleComponent } from './cds-rule.component';

describe('CdsRuleComponent', () => {
  let component: CdsRuleComponent;
  let fixture: ComponentFixture<CdsRuleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsRuleComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsRuleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
