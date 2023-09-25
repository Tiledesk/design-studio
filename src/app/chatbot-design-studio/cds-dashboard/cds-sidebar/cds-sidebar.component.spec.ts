import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsSidebarComponent } from './cds-sidebar.component';

describe('CdsSidebarComponent', () => {
  let component: CdsSidebarComponent;
  let fixture: ComponentFixture<CdsSidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsSidebarComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsSidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
