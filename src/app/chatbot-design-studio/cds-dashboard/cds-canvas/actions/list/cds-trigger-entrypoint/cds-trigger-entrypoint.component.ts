import { Component, Input } from '@angular/core';
import { Intent } from 'src/app/models/intent-model';
import { ConnectorTriggerSub, readTriggerSubs } from '../../../../../connector/connector-trigger.model';
import { ConnectorTriggerOrchestrator } from '../../../../../connector/connector-trigger.orchestrator';

@Component({
  selector: 'cds-trigger-entrypoint',
  templateUrl: './cds-trigger-entrypoint.component.html',
  styleUrls: ['./cds-trigger-entrypoint.component.scss']
})
export class CdsTriggerEntrypointComponent {
  @Input() intent: Intent;

  constructor(private readonly orchestrator: ConnectorTriggerOrchestrator) {}

  get subs(): ConnectorTriggerSub[] {
    return readTriggerSubs(this.intent);
  }

  onFilterChange(sub: ConnectorTriggerSub, inputId: string, value: string): void {
    sub.filters[inputId] = value;
  }

  async onSaveFilters(sub: ConnectorTriggerSub): Promise<void> {
    try { await this.orchestrator.updateTriggerFilters(this.intent, sub.ref, sub.filters); }
    catch (e) { console.error('[triggers] save filters failed', e); }
  }

  async onRemove(sub: ConnectorTriggerSub): Promise<void> {
    try { await this.orchestrator.removeTrigger(this.intent, sub.ref); }
    catch (e) { console.error('[triggers] remove failed', e); }
  }
}
