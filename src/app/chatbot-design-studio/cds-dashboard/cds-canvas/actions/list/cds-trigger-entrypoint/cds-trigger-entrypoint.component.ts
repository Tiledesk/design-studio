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
        this.connectorCatalogService.getInstalledConnectorEntries(integrations).forEach(({ baseUrl, apiKey }) => {
          this.connectorCatalogService.fetchManifest(baseUrl).pipe(catchError(() => of(null))).subscribe(m => {
            if (m) { this.addGroup(this.connectorCatalogService.toTriggerGroup(m, baseUrl, apiKey)); }
          });
        });
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
    if (g.entries && g.entries.length > 0) {
      this.availableGroups = [...this.availableGroups.filter(x => x.id !== g.id), g];
      this.recomputeSelectItems();
    }
  }

  /** Whether a connector group declares OAuth — gates the shared auth row. */
  requiresAuth(g: ConnectorTriggerGroup): boolean {
    return !!(g.auth && g.auth.type) && g.auth.type !== 'none';
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

  /** Stable options array for the cds-select add-dropdown. ng-select (inside cds-select)
   *  resets if the [items] reference changes on every change-detection pass, so this is
   *  cached and recomputed only when the loaded groups or the added subs actually change. */
  availableSelectItems: Array<{ label: string; value: string }> = [];
  /** Trigger chosen in the dropdown but not yet added — the Add button commits it. */
  selectedRef: string = '';

  private recomputeSelectItems(): void {
    this.availableSelectItems = this.availableEntries.map(x => ({
      label: x.entry.name,
      value: x.entry.id,
      group: this.groupLabel(x.group, x.entry.group),
    }));
  }

  private groupLabel(g: ConnectorTriggerGroup, id: string): string {
    const def = (g.groups || []).find(x => x.id === id);
    if (def && def.name) { return def.name; }
    return id ? id.charAt(0).toUpperCase() + id.slice(1) : id;
  }

  onSelectTrigger(event: any): void {
    this.selectedRef = (event && event.value) || '';
  }

  async onAddSelected(): Promise<void> {
    const match = this.availableEntries.find(x => x.entry.id === this.selectedRef);
    if (!match) { return; }
    await this.orchestrator.addTrigger(this.intent, this.webhookUrl, match.group, match.entry);
    this.selectedRef = '';
    this.recomputeSelectItems();
  }

  onFilterChange(sub: ConnectorTriggerSub, inputId: string, value: string) { sub.filters[inputId] = value; }

  async onSaveFilters(sub: ConnectorTriggerSub): Promise<void> {
    try { await this.orchestrator.updateTriggerFilters(this.intent, this.webhookUrl, this.groupForRef(sub.ref), sub.ref, sub.filters); }
    catch (e) { console.error('[triggers] save filters failed', e); }
  }
  async onRemove(sub: ConnectorTriggerSub): Promise<void> {
    try { await this.orchestrator.removeTrigger(this.intent, this.webhookUrl, this.groupForRef(sub.ref), sub.ref); this.recomputeSelectItems(); }
    catch (e) { console.error('[triggers] remove failed', e); }
  }
}
