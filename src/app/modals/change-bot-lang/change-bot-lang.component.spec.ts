import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChangeBotLangModalComponent } from './change-bot-lang.component';

describe('ChangeBotLangComponent', () => {
  let component: ChangeBotLangModalComponent;
  let fixture: ComponentFixture<ChangeBotLangModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ChangeBotLangModalComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChangeBotLangModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
