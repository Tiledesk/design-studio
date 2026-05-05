import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionConnectBlockComponent } from './cds-action-connect-block.component';

describe('CdsActionConnectBlockComponent', () => {
  let component: CdsActionConnectBlockComponent;
  let fixture: ComponentFixture<CdsActionConnectBlockComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionConnectBlockComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionConnectBlockComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
