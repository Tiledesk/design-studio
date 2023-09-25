import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionEmailComponent } from './cds-action-email.component';

describe('CdsActionEmailComponent', () => {
  let component: CdsActionEmailComponent;
  let fixture: ComponentFixture<ActionEmailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionEmailComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionEmailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
