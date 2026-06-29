// src/app/chatbot-design-studio/connector/connector-trigger.orchestrator.ts
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Intent } from 'src/app/models/intent-model';
import { IntentService } from '../services/intent.service';
import { DashboardService } from '../../services/dashboard.service';
import { ConnectorTriggerService } from './connector-trigger.service';
import { ConnectorTriggerGroup, ConnectorTriggerEntry, readTriggerSubs, writeTriggerSubs, buildTriggerSub } from './connector-trigger.model';

@Injectable({ providedIn: 'root' })
export class ConnectorTriggerOrchestrator {
  constructor(
    private readonly intentService: IntentService,
    private readonly dashboardService: DashboardService,
    private readonly triggerService: ConnectorTriggerService,
  ) {}

  /** Add a trigger to the webhook intent (idempotent on ref); persist locally always, subscribe best-effort. */
  async addTrigger(intent: Intent, webhookUrl: string, group: ConnectorTriggerGroup, entry: ConnectorTriggerEntry): Promise<void> {
    const subs = readTriggerSubs(intent);
    if (!subs.find(s => s.ref === entry.id)) {
      subs.push(buildTriggerSub(entry));
      writeTriggerSubs(intent, subs);
      await this.intentService.updateIntent(intent);
    }
    const sub = readTriggerSubs(intent).find(s => s.ref === entry.id);
    if (webhookUrl && group) {
      await firstValueFrom(this.triggerService.subscribe(group.baseUrl, group.apiKey, {
        id: entry.id, external_id: this.dashboardService.projectID, webhook: webhookUrl, inputs: sub ? sub.filters : {},
      })).catch(err => console.error('[triggers] subscribe failed', err));
    }
  }

  async updateTriggerFilters(intent: Intent, webhookUrl: string, group: ConnectorTriggerGroup | undefined, ref: string, filters: { [id: string]: string }): Promise<void> {
    const subs = readTriggerSubs(intent);
    const sub = subs.find(s => s.ref === ref);
    if (sub) { sub.filters = filters; writeTriggerSubs(intent, subs); await this.intentService.updateIntent(intent); }
    if (webhookUrl && group) {
      await firstValueFrom(this.triggerService.subscribe(group.baseUrl, group.apiKey, {
        id: ref, external_id: this.dashboardService.projectID, webhook: webhookUrl, inputs: filters,
      })).catch(err => console.error('[triggers] re-subscribe failed', err));
    }
  }

  async removeTrigger(intent: Intent, webhookUrl: string, group: ConnectorTriggerGroup | undefined, ref: string): Promise<void> {
    writeTriggerSubs(intent, readTriggerSubs(intent).filter(s => s.ref !== ref));
    await this.intentService.updateIntent(intent);
    if (webhookUrl && group) {
      await firstValueFrom(this.triggerService.unsubscribe(group.baseUrl, group.apiKey, {
        id: ref, external_id: this.dashboardService.projectID, webhook: webhookUrl,
      })).catch(err => console.error('[triggers] unsubscribe failed', err));
    }
  }
}
