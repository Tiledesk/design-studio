import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionAddTagComponent } from './cds-action-add-tag.component';

describe('CdsActionAddTagComponent', () => {
  let component: CdsActionAddTagComponent;
  let fixture: ComponentFixture<CdsActionAddTagComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionAddTagComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionAddTagComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
