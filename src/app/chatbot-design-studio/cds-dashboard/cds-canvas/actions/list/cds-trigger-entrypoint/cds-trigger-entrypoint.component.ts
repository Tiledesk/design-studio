import { Component, Input, OnInit } from '@angular/core';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Intent } from 'src/app/models/intent-model';
import { ConnectorTriggerSub, ConnectorTriggerGroup, ConnectorTriggerEntry, readTriggerSubs } from '../../../../../connector/connector-trigger.model';
import { ConnectorTriggerOrchestrator } from '../../../../../connector/connector-trigger.orchestrator';
import { ConnectorCatalogService } from '../../../../../connector/connector-catalog.service';
import { ProjectService } from 'src/app/services/projects.service';
import { DashboardService } from 'src/app/services/dashboard.service';
import { environment } from 'src/environments/environment';

@Component({ selector: 'cds-trigger-entrypoint', templateUrl: './cds-trigger-entrypoint.component.html', styleUrls: ['./cds-trigger-entrypoint.component.scss'] })
export class CdsTriggerEntrypointComponent implements OnInit {
  @Input() intent: Intent;
  @Input() webhookUrl: string = '';
  availableGroups: ConnectorTriggerGroup[] = [];

  constructor(
    private readonly orchestrator: ConnectorTriggerOrchestrator,
    private readonly connectorCatalogService: ConnectorCatalogService,
    private readonly projectService: ProjectService,
    private readonly dashboardService: DashboardService,
  ) {}

  ngOnInit(): void {
    // dynamic per-project install path
    const projectId = this.dashboardService.projectID;
    if (projectId && (this.projectService as any).getIntegrations) {
      (this.projectService as any).getIntegrations(projectId).pipe(catchError(() => of(null))).subscribe((integrations: any) => {
        if (Array.isArray(integrations)) {
          integrations.forEach((integration: any) => {
            const baseUrl = integration?.value?.baseUrl;
            if (!baseUrl || integration?.value?.installed !== true) { return; }
            this.connectorCatalogService.fetchManifest(baseUrl).pipe(catchError(() => of(null))).subscribe(m => {
              if (m) { this.addGroup(this.connectorCatalogService.toTriggerGroup(m, baseUrl, integration?.value?.apiKey)); }
            });
          });
        }
      });
    }
    // static dev path
    const urls: string[] = (environment as any).connectorBaseUrls || [];
    urls.forEach(baseUrl => {
      if (!baseUrl) { return; }
      this.connectorCatalogService.fetchManifest(baseUrl).pipe(catchError(() => of(null))).subscribe(m => {
        if (m) { this.addGroup(this.connectorCatalogService.toTriggerGroup(m, baseUrl, undefined)); }
      });
    });
  }

  private addGroup(g: ConnectorTriggerGroup) {
    if (g.entries && g.entries.length > 0) { this.availableGroups = [...this.availableGroups.filter(x => x.id !== g.id), g]; }
  }

  get subs(): ConnectorTriggerSub[] { return readTriggerSubs(this.intent); }

  get availableEntries(): Array<{ group: ConnectorTriggerGroup; entry: ConnectorTriggerEntry }> {
    const used = new Set(this.subs.map(s => s.ref));
    const out: Array<{ group: ConnectorTriggerGroup; entry: ConnectorTriggerEntry }> = [];
    this.availableGroups.forEach(g => (g.entries || []).forEach(e => { if (!used.has(e.id)) { out.push({ group: g, entry: e }); } }));
    return out;
  }

  private groupForRef(ref: string): ConnectorTriggerGroup | undefined {
    return this.availableGroups.find(g => (g.entries || []).some(e => e.id === ref));
  }

  /** Options for the cds-select add-dropdown: label "Connector — Trigger", value = ref. */
  get availableSelectItems(): Array<{ label: string; value: string }> {
    return this.availableEntries.map(x => ({ label: `${x.group.name} — ${x.entry.name}`, value: x.entry.id }));
  }

  async onAddTriggerSelect(event: any): Promise<void> {
    const ref = event && event.value;
    const match = this.availableEntries.find(x => x.entry.id === ref);
    if (!match) { return; }
    await this.orchestrator.addTrigger(this.intent, this.webhookUrl, match.group, match.entry);
  }

  onFilterChange(sub: ConnectorTriggerSub, inputId: string, value: string) { sub.filters[inputId] = value; }

  async onSaveFilters(sub: ConnectorTriggerSub): Promise<void> {
    try { await this.orchestrator.updateTriggerFilters(this.intent, this.webhookUrl, this.groupForRef(sub.ref), sub.ref, sub.filters); }
    catch (e) { console.error('[triggers] save filters failed', e); }
  }
  async onRemove(sub: ConnectorTriggerSub): Promise<void> {
    try { await this.orchestrator.removeTrigger(this.intent, this.webhookUrl, this.groupForRef(sub.ref), sub.ref); }
    catch (e) { console.error('[triggers] remove failed', e); }
  }
}
