import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionDeleteVariableComponent } from './cds-action-delete-variable.component';

describe('ActionDeleteVariableComponent', () => {
  let component: CdsActionDeleteVariableComponent;
  let fixture: ComponentFixture<CdsActionDeleteVariableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionDeleteVariableComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionDeleteVariableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
