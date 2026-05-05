import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionIterationComponent } from './cds-action-iteration.component';

describe('CdsActionIterationComponent', () => {
  let component: CdsActionIterationComponent;
  let fixture: ComponentFixture<CdsActionIterationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionIterationComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionIterationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

