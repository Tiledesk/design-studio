import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsAddActionMenuComponent } from './cds-add-action-menu.component';

describe('CdsAddActionMenuComponent', () => {
  let component: CdsAddActionMenuComponent;
  let fixture: ComponentFixture<CdsAddActionMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsAddActionMenuComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsAddActionMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
