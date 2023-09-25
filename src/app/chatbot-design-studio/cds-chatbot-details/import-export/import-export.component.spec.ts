import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CDSDetailImportExportComponent } from './import-export.component';

describe('ImportExportComponent', () => {
  let component: CDSDetailImportExportComponent;
  let fixture: ComponentFixture<CDSDetailImportExportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CDSDetailImportExportComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CDSDetailImportExportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
