import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { CdsConnectorAuthRowComponent } from './cds-connector-auth-row.component';
import { ConnectorTriggerService } from '../../../../../connector/connector-trigger.service';
import { DashboardService } from 'src/app/services/dashboard.service';

describe('CdsConnectorAuthRowComponent', () => {
  let fixture: ComponentFixture<CdsConnectorAuthRowComponent>;
  let component: CdsConnectorAuthRowComponent;
  let triggerService: jasmine.SpyObj<ConnectorTriggerService>;

  const setup = (dashboard: Partial<DashboardService>) => {
    triggerService = jasmine.createSpyObj('ConnectorTriggerService', ['authStatus', 'install']);
    TestBed.configureTestingModule({
      declarations: [CdsConnectorAuthRowComponent],
      imports: [TranslateModule.forRoot()],
      providers: [
        { provide: ConnectorTriggerService, useValue: triggerService },
        { provide: DashboardService, useValue: dashboard },
      ],
    });
    fixture = TestBed.createComponent(CdsConnectorAuthRowComponent);
    component = fixture.componentInstance;
  };

  it('renders the Connect button when not connected', () => {
    setup({ projectID: 'p1' } as DashboardService);
    triggerService.authStatus.and.returnValue(of({ connected: false }));
    component.baseUrl = 'https://c';
    component.requiresAuth = true;
    component.name = 'Google';
    fixture.detectChanges();
    expect(triggerService.authStatus).toHaveBeenCalledWith('https://c', 'p1');
    const html: string = fixture.nativeElement.textContent;
    expect(component.connected).toBe(false);
    expect(html).toContain('CDSCanvas.Connect');
  });

  it('renders Connected + email when the status reports connected', () => {
    setup({ projectID: 'p1' } as DashboardService);
    triggerService.authStatus.and.returnValue(of({ connected: true, email: 'a@b.com' }));
    component.baseUrl = 'https://c';
    component.requiresAuth = true;
    component.name = 'Google';
    fixture.detectChanges();
    expect(component.connected).toBe(true);
    expect(component.email).toBe('a@b.com');
    const html: string = fixture.nativeElement.textContent;
    expect(html).toContain('a@b.com');
    expect(html).toContain('CDSCanvas.Connected');
  });

  it('renders nothing and skips authStatus when requiresAuth is false', () => {
    setup({ projectID: 'p1' } as DashboardService);
    component.baseUrl = 'https://c';
    component.requiresAuth = false;
    fixture.detectChanges();
    expect(triggerService.authStatus).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.te-auth')).toBeNull();
  });

  it('onConnect calls install and opens the returned authUrl in a popup', () => {
    setup({ projectID: 'p1' } as DashboardService);
    triggerService.authStatus.and.returnValue(of({ connected: false }));
    triggerService.install.and.returnValue(of({ authUrl: 'https://consent' }));
    component.baseUrl = 'https://c';
    component.requiresAuth = true;
    fixture.detectChanges();
    const openSpy = spyOn(window, 'open');
    component.onConnect(false);
    expect(triggerService.install).toHaveBeenCalledWith('https://c', 'p1', false);
    expect(openSpy).toHaveBeenCalledWith('https://consent', '_blank', 'width=520,height=680');
  });

  it('is a no-op when projectId is missing', () => {
    setup({ projectID: undefined } as DashboardService);
    triggerService.authStatus.and.returnValue(of({ connected: false }));
    component.baseUrl = 'https://c';
    component.requiresAuth = true;
    fixture.detectChanges();
    expect(triggerService.authStatus).not.toHaveBeenCalled();
  });
});
