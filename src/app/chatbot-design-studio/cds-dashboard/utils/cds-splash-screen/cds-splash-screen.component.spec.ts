import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsSplashScreenComponent } from './cds-splash-screen.component';

describe('CdsSplashScreenComponent', () => {
  let component: CdsSplashScreenComponent;
  let fixture: ComponentFixture<CdsSplashScreenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsSplashScreenComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsSplashScreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
