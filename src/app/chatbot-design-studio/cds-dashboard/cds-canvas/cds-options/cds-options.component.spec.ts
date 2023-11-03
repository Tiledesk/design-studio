import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsOptionsComponent } from './cds-options.component';

describe('CdsOptionsComponent', () => {
  let component: CdsOptionsComponent;
  let fixture: ComponentFixture<CdsOptionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsOptionsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsOptionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
