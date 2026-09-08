import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { ConnectorTriggerService } from '../../../../../connector/connector-trigger.service';
import { DashboardService } from 'src/app/services/dashboard.service';

/**
 * Shared OAuth "auth row" for connectors — Connect / Connected+email / Change account.
 * Consumed by both the trigger entrypoint (per group) and the connector action panel.
 * Renders nothing when the connector does not declare OAuth (`requiresAuth` false).
 */
@Component({
  selector: 'cds-connector-auth-row',
  templateUrl: './cds-connector-auth-row.component.html',
  styleUrls: ['./cds-connector-auth-row.component.scss'],
})
export class CdsConnectorAuthRowComponent implements OnInit, OnChanges {
  @Input() baseUrl: string = '';
  @Input() connectorId: string = '';   // keying/labels
  @Input() requiresAuth: boolean = false;
  @Input() name: string = '';
  @Input() icon: string = '';

  connected: boolean = false;
  email: string = '';

  constructor(
    private readonly triggerService: ConnectorTriggerService,
    private readonly dashboardService: DashboardService,
  ) {}

  ngOnInit(): void {
    this.checkAuth();
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.checkAuth();
  }

  /** Refresh the connector's Google connection state for the auth row. */
  checkAuth(): void {
    if (!this.requiresAuth) { return; }
    const projectId = this.dashboardService.projectID;
    if (!projectId || !this.baseUrl) { return; }
    this.triggerService.authStatus(this.baseUrl, projectId).subscribe({
      next: r => { this.connected = !!(r && r.connected); this.email = (r && r.email) || ''; },
      error: () => { this.connected = false; },
    });
  }

  /** Open the connector's Google consent flow in a popup; re-check status on return.
   *  selectAccount forces Google's account chooser (Change account). */
  onConnect(selectAccount: boolean = false): void {
    const projectId = this.dashboardService.projectID;
    if (!projectId || !this.baseUrl) { return; }
    this.triggerService.install(this.baseUrl, projectId, selectAccount).subscribe({
      next: r => {
        if (r && r.authUrl) {
          window.open(r.authUrl, '_blank', 'width=520,height=680');
          const onFocus = () => { this.checkAuth(); window.removeEventListener('focus', onFocus); };
          window.addEventListener('focus', onFocus);
        }
      },
      error: e => console.error('[connector-auth] connect failed', e),
    });
  }
}
