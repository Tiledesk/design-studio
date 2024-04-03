import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsActionPlayPromptComponent } from './cds-action-play-prompt.component';

describe('CdsActionPlayPromptComponent', () => {
  let component: CdsActionPlayPromptComponent;
  let fixture: ComponentFixture<CdsActionPlayPromptComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsActionPlayPromptComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsActionPlayPromptComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
