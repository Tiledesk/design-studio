import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsNotesComponent } from './cds-notes.component';

describe('CdsNotesComponent', () => {
  let component: CdsNotesComponent;
  let fixture: ComponentFixture<CdsNotesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsNotesComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsNotesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

