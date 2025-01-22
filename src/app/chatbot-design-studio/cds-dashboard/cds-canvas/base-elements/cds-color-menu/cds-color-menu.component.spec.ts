import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsColorMenuComponent } from './cds-color-menu.component';

describe('CdsColorMenuComponent', () => {
  let component: CdsColorMenuComponent;
  let fixture: ComponentFixture<CdsColorMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsColorMenuComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsColorMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
