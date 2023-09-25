import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionControlsComponent } from './cds-action-controls.component';

describe('CdsActionControlsComponent', () => {
  let component: CdsActionControlsComponent;
  let fixture: ComponentFixture<CdsActionControlsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionControlsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionControlsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
