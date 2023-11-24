import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RulesListComponent } from './rules-list.component';

describe('RulesListComponent', () => {
  let component: RulesListComponent;
  let fixture: ComponentFixture<RulesListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RulesListComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RulesListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
