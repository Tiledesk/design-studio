import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionWebResponseComponent } from './cds-action-web-response.component';

describe('CdsActionWebResponseComponent', () => {
  let component: CdsActionWebResponseComponent;
  let fixture: ComponentFixture<CdsActionWebResponseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionWebResponseComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionWebResponseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
