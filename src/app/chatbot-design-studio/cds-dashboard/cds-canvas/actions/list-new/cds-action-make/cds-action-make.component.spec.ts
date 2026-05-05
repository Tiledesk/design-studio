import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionMakeComponent } from './cds-action-make.component';

describe('CdsActionMakeComponent', () => {
  let component: CdsActionMakeComponent;
  let fixture: ComponentFixture<CdsActionMakeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionMakeComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionMakeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
