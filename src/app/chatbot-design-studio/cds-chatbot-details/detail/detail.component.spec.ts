import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CDSDetailBotDetailComponent } from './detail.component';

describe('DetailComponent', () => {
  let component: CDSDetailBotDetailComponent;
  let fixture: ComponentFixture<CDSDetailBotDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CDSDetailBotDetailComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CDSDetailBotDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
