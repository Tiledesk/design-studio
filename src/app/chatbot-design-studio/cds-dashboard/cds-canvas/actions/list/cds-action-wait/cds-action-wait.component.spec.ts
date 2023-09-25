import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionWaitComponent } from './cds-action-wait.component';

describe('CdsActionWaitComponent', () => {
  let component: CdsActionWaitComponent;
  let fixture: ComponentFixture<CdsActionWaitComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionWaitComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionWaitComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
