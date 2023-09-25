import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CDSDetailCommunityComponent } from './community.component';

describe('CommunityComponent', () => {
  let component: CDSDetailCommunityComponent;
  let fixture: ComponentFixture<CDSDetailCommunityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CDSDetailCommunityComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CDSDetailCommunityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
