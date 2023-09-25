import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CdsIntentComponent } from './cds-intent.component';

describe('CdsDrawerOfIntentsComponent', () => {
  let component: CdsIntentComponent;
  let fixture: ComponentFixture<CdsIntentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsIntentComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsIntentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
