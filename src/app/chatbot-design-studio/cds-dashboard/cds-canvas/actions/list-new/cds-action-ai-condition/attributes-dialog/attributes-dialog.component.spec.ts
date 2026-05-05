import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AttributesDialogAiConditionComponent } from './attributes-dialog.component';

describe('AttributesDialogAiConditionComponent', () => {
  let component: AttributesDialogAiConditionComponent;
  let fixture: ComponentFixture<AttributesDialogAiConditionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AttributesDialogAiConditionComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AttributesDialogAiConditionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
