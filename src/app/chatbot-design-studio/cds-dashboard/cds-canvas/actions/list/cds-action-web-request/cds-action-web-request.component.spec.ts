import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionWebRequestComponent } from './cds-action-web-request.component';

describe('CdsActionWebRequestComponent', () => {
  let component: CdsActionWebRequestComponent;
  let fixture: ComponentFixture<CdsActionWebRequestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionWebRequestComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionWebRequestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
