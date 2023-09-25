import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionGPTTaskComponent } from './cds-action-gpt-task.component';

describe('ActionAskgptComponent', () => {
  let component: CdsActionGPTTaskComponent;
  let fixture: ComponentFixture<CdsActionGPTTaskComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionGPTTaskComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionGPTTaskComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
