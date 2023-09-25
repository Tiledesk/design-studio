import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CDSDetailDeveloperComponent } from './developer.component';

describe('DeveloperComponent', () => {
  let component: CDSDetailDeveloperComponent;
  let fixture: ComponentFixture<CDSDetailDeveloperComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CDSDetailDeveloperComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CDSDetailDeveloperComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
