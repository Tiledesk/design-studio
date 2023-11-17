import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CDSMenuComponent } from './menu.component';

describe('CDSMenuComponent', () => {
  let component: CDSMenuComponent;
  let fixture: ComponentFixture<CDSMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CDSMenuComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CDSMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
