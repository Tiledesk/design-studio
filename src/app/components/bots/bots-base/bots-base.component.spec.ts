import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BotsBaseComponent } from './bots-base.component';

describe('BotsBaseComponent', () => {
  let component: BotsBaseComponent;
  let fixture: ComponentFixture<BotsBaseComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BotsBaseComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BotsBaseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
