// src/app/chatbot-design-studio/connector/connector-trigger.orchestrator.ts
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Intent } from 'src/app/models/intent-model';
import { IntentService } from '../services/intent.service';
import { WebhookService } from '../services/webhook-service.service';
import { DashboardService } from '../../services/dashboard.service';
import { AppConfigService } from 'src/app/services/app-config';
import { ConnectorTriggerService } from './connector-trigger.service';
import { ConnectorTriggerGroup, ConnectorTriggerEntry, ConnectorTriggerSub,
         buildTriggerSub, readTriggerSubs, writeTriggerSubs } from './connector-trigger.model';

@Injectable({ providedIn: 'root' })
export class ConnectorTriggerOrchestrator {
  /** In-memory registry: entry.id (trigger ref) → ConnectorTriggerGroup.
   *  Populated whenever addTrigger is called in the current session.
   *  NOTE: this map is session-only and is cleared on a full page reload.
   *  After reload, groupForRef() returns undefined.  The local flow change
   *  (writeTriggerSubs + updateIntent) is ALWAYS persisted unconditionally.
   *  The connector subscribe/unsubscribe network call is BEST-EFFORT: it is
   *  skipped when the group is not present in the cache (e.g. after reload)
   *  and does not prevent the local change from being saved. */
  private readonly groupsByRef = new Map<string, ConnectorTriggerGroup>();

  constructor(
    private readonly intentService: IntentService,
    private readonly webhookService: WebhookService,
    private readonly dashboardService: DashboardService,
    private readonly appConfigService: AppConfigService,
    private readonly triggerService: ConnectorTriggerService,
  ) {}

  /** Returns the ConnectorTriggerGroup associated with the given trigger ref, or
   *  undefined if addTrigger has not been called for this ref in the current session. */
  groupForRef(ref: string): ConnectorTriggerGroup | undefined {
    return this.groupsByRef.get(ref);
  }

  findEntrypoint(): Intent | undefined {
    return (this.intentService.listOfIntents || []).find(
      (i: any) => i?.attributes?._tdConnectorTriggerEntrypoint === true);
  }

  /** Ensure the single entrypoint intent exists and return it (created + persisted if absent). */
  private async ensureEntrypoint(): Promise<Intent> {
    let entry = this.findEntrypoint();
    if (entry) { return entry; }
    const chatbotId = this.dashboardService.id_faq_kb;
    entry = this.intentService.createNewIntent(chatbotId, null, { x: 80, y: 80 });
    (entry as any).webhook_enabled = true;
    entry.attributes = entry.attributes || ({} as any);
    (entry.attributes as any)._tdConnectorTriggerEntrypoint = true;
    writeTriggerSubs(entry, []);
    this.intentService.addNewIntentToListOfIntents(entry);
    await this.intentService.updateIntent(entry);
    return entry;
  }

  /** Resolve the chatbot's native webhook_id, creating the webhook bound to the entrypoint block if needed. */
  private async ensureWebhookId(entry: Intent): Promise<string | null> {
    const chatbotId = this.dashboardService.id_faq_kb;
    let resp: any = await firstValueFrom(this.webhookService.getWebhook(chatbotId));
    if (!resp?.webhook_id) {
      resp = await firstValueFrom(this.webhookService.createWebhook(chatbotId, entry.intent_id, true, false));
    }
    return resp?.webhook_id || null;
  }

  private prodWebhookUrl(webhookId: string): string {
    const base = this.appConfigService.getConfig().apiUrl;   // e.g. https://server/
    return `${base}webhook/${webhookId}`;
  }

  async addTrigger(group: ConnectorTriggerGroup, entry: ConnectorTriggerEntry): Promise<Intent> {
    // Cache the group so the entrypoint editor can resolve it via groupForRef().
    this.groupsByRef.set(entry.id, group);
    const intent = await this.ensureEntrypoint();
    const subs = readTriggerSubs(intent);
    if (!subs.find(s => s.ref === entry.id)) {
      subs.push(buildTriggerSub(entry));
      writeTriggerSubs(intent, subs);
      await this.intentService.updateIntent(intent);
    }
    const webhookId = await this.ensureWebhookId(intent);
    if (webhookId) {
      const sub = readTriggerSubs(intent).find(s => s.ref === entry.id);
      await firstValueFrom(this.triggerService.subscribe(group.baseUrl, group.apiKey, {
        id: entry.id, external_id: this.dashboardService.projectID,
        webhook: this.prodWebhookUrl(webhookId), inputs: sub ? sub.filters : {},
      })).catch(err => console.error('[triggers] subscribe failed', err));
    }
    return intent;
  }

  /** ALWAYS persists the filter update to the local flow (writeTriggerSubs + updateIntent).
   *  THEN best-effort: re-subscribes via the connector if the group is in the session cache.
   *  If the group is absent (e.g. after a page reload) the local change is still saved. */
  async updateTriggerFilters(intent: Intent, ref: string, filters: { [id: string]: string }): Promise<void> {
    const subs = readTriggerSubs(intent);
    const sub = subs.find(s => s.ref === ref);
    if (!sub) { return; }
    sub.filters = filters;
    writeTriggerSubs(intent, subs);
    await this.intentService.updateIntent(intent);
    const group = this.groupForRef(ref);
    if (group) {
      const webhookId = await this.ensureWebhookId(intent);
      if (webhookId) {
        firstValueFrom(this.triggerService.subscribe(group.baseUrl, group.apiKey, {
          id: ref, external_id: this.dashboardService.projectID,
          webhook: this.prodWebhookUrl(webhookId), inputs: filters,
        })).catch(err => console.error('[triggers] re-subscribe failed', err));
      }
    }
  }

  /** ALWAYS persists the removal to the local flow (writeTriggerSubs + updateIntent).
   *  THEN best-effort: unsubscribes via the connector if the group is in the session cache.
   *  If the group is absent (e.g. after a page reload) the local change is still saved. */
  async removeTrigger(intent: Intent, ref: string): Promise<void> {
    writeTriggerSubs(intent, readTriggerSubs(intent).filter(s => s.ref !== ref));
    await this.intentService.updateIntent(intent);
    const group = this.groupForRef(ref);
    if (group) {
      const webhookId = await this.ensureWebhookId(intent);
      if (webhookId) {
        firstValueFrom(this.triggerService.unsubscribe(group.baseUrl, group.apiKey, {
          id: ref, external_id: this.dashboardService.projectID,
          webhook: this.prodWebhookUrl(webhookId),
        })).catch(err => console.error('[triggers] unsubscribe failed', err));
      }
    }
  }
}
