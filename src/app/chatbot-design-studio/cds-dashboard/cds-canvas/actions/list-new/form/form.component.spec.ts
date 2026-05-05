import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsFormComponent } from './form.component';

describe('FormComponent', () => {
  let component: CdsFormComponent;
  let fixture: ComponentFixture<CdsFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsFormComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
