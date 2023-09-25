import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsAnswerComponent } from './answer.component';

describe('PanelAnswerComponent', () => {
  let component: CdsAnswerComponent;
  let fixture: ComponentFixture<CdsAnswerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsAnswerComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsAnswerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
