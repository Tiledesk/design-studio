import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionDescriptionComponent } from './cds-action-description.component';

describe('CdsActionDescriptionComponent', () => {
  let component: CdsActionDescriptionComponent;
  let fixture: ComponentFixture<CdsActionDescriptionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionDescriptionComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionDescriptionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
