import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsHeaderComponent } from './cds-header.component';

describe('CdsHeaderComponent', () => {
  let component: CdsHeaderComponent;
  let fixture: ComponentFixture<CdsHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsHeaderComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
