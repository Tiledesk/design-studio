import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdsSecretsComponent } from './cds-secrets.component';

describe('CdsSecretsComponent', () => {
  let component: CdsSecretsComponent;
  let fixture: ComponentFixture<CdsSecretsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CdsSecretsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdsSecretsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
