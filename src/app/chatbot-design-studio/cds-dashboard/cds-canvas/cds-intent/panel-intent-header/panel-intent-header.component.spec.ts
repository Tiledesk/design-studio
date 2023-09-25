import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PanelIntentHeaderComponent } from './panel-intent-header.component';

describe('PanelIntentHeaderComponent', () => {
  let component: PanelIntentHeaderComponent;
  let fixture: ComponentFixture<PanelIntentHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PanelIntentHeaderComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PanelIntentHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
