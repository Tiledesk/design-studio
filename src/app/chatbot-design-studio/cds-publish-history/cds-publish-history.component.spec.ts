import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsPublishHistoryComponent } from './cds-publish-history.component';

describe('CdsPublishHistoryComponent', () => {
  let component: CdsPublishHistoryComponent;
  let fixture: ComponentFixture<CdsPublishHistoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsPublishHistoryComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsPublishHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
