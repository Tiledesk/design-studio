import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionCloseComponent } from './cds-action-close.component';

describe('ActionCloseComponent', () => {
  let component: CdsActionCloseComponent;
  let fixture: ComponentFixture<CdsActionCloseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionCloseComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionCloseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
