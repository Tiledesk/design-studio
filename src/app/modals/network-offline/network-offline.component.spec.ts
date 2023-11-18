import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NetworkOfflineComponent } from './network-offline.component';

describe('NetworkOfflineComponent', () => {
  let component: NetworkOfflineComponent;
  let fixture: ComponentFixture<NetworkOfflineComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NetworkOfflineComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NetworkOfflineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
