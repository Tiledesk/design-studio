import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionCustomerioComponent } from './cds-action-customerio.component';

describe('CdsActionCustomerioComponent', () => {
  let component: CdsActionCustomerioComponent;
  let fixture: ComponentFixture<CdsActionCustomerioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionCustomerioComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionCustomerioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
