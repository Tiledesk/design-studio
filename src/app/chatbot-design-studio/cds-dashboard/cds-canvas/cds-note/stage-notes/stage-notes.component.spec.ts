import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StageNotesComponent } from './stage-notes.component';

describe('StageNotesComponent', () => {
  let component: StageNotesComponent;
  let fixture: ComponentFixture<StageNotesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StageNotesComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StageNotesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

