import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsGlobalsComponent } from './cds-globals.component';

describe('CdsGlobalsComponent', () => {
  let component: CdsGlobalsComponent;
  let fixture: ComponentFixture<CdsGlobalsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsGlobalsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsGlobalsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
