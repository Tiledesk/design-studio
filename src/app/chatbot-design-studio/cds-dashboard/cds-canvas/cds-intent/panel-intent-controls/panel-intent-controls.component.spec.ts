import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PanelIntentControlsComponent } from './panel-intent-controls.component';

describe('PanelIntentControlsComponent', () => {
  let component: PanelIntentControlsComponent;
  let fixture: ComponentFixture<PanelIntentControlsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PanelIntentControlsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PanelIntentControlsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
