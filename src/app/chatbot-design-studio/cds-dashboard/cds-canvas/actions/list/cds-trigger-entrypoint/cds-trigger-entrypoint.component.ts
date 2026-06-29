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
    const group = this.orchestrator.groupForRef(sub.ref);
    if (group) {
      await this.orchestrator.updateTriggerFilters(this.intent, group, sub.ref, sub.filters);
    }
  }

  async onRemove(sub: ConnectorTriggerSub): Promise<void> {
    const group = this.orchestrator.groupForRef(sub.ref);
    if (group) {
      await this.orchestrator.removeTrigger(this.intent, group, sub.ref);
    }
  }
}
