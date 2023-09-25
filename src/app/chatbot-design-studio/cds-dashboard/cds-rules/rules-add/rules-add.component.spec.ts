import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RulesAddComponent } from './rules-add.component';

describe('RulesAddComponent', () => {
  let component: RulesAddComponent;
  let fixture: ComponentFixture<RulesAddComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RulesAddComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RulesAddComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
