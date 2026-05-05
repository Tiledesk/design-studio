import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddkbDialogComponent } from './addkb-dialog.component';

describe('AddkbDialogComponent', () => {
  let component: AddkbDialogComponent;
  let fixture: ComponentFixture<AddkbDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AddkbDialogComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddkbDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
