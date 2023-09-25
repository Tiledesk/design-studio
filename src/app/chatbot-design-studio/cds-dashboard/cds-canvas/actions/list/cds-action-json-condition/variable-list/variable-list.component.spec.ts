import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VariableListComponent } from './variable-list.component';

describe('VariableListComponent', () => {
  let component: VariableListComponent;
  let fixture: ComponentFixture<VariableListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ VariableListComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VariableListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
