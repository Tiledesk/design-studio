import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsContextMenuComponent } from './cds-context-menu.component';

describe('CdsContextMenuComponent', () => {
  let component: CdsContextMenuComponent;
  let fixture: ComponentFixture<CdsContextMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsContextMenuComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsContextMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
