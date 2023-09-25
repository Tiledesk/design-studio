import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsEventComponent } from './cds-event.component';

describe('CdsEventComponent', () => {
  let component: CdsEventComponent;
  let fixture: ComponentFixture<CdsEventComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsEventComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsEventComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
