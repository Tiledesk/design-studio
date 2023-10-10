import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AttributesDialogComponent } from './attributes-dialog.component';

describe('AttributesDialogComponent', () => {
  let component: AttributesDialogComponent;
  let fixture: ComponentFixture<AttributesDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AttributesDialogComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AttributesDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
