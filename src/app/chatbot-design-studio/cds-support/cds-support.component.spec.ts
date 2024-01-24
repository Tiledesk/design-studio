import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsSupportComponent } from './cds-support.component';

describe('CdsSupportComponent', () => {
  let component: CdsSupportComponent;
  let fixture: ComponentFixture<CdsSupportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsSupportComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsSupportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
