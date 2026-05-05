import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionAddKbContentComponent } from './cds-action-add-kb-content.component';

describe('CdsActionAddKbContentComponent', () => {
  let component: CdsActionAddKbContentComponent;
  let fixture: ComponentFixture<CdsActionAddKbContentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionAddKbContentComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionAddKbContentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
