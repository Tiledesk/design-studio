import { Injectable, Optional } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, Observable, Subject, lastValueFrom, tap } from 'rxjs';
import { Intent } from 'src/app/models/intent-model';
import { DashboardService } from 'src/app/services/dashboard.service';
import { ReadOnlyService } from 'src/app/services/read-only.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { cleanSchedule, defaultSchedule, payloadToRows, rowsToPayload, scheduleError } from '../utils-schedule';
import { browserTimezone, startPointDeleteOutcome } from '../utils-scheduled-panel';
import { StartPointSettingsInput, buildStartPointUpsertBody, createStartPointBox, findStartPoint, startPointTypeOf, supportsStartPoints } from '../utils-start-points';
import { ConnectorService } from './connector.service';
import { ControllerService } from './controller.service';
import { IntentService } from './intent.service';
import { WebhookService } from './webhook-service.service';

const swal = require('sweetalert');

export type StartPointType = 'web' | 'webhook' | 'scheduled';

export interface StartPointDescriptor {
  type: StartPointType;
  status: 'present' | 'available' | 'unavailable';
  removable: boolean;
  settings: Record<string, unknown>;
  /** Only when present: the saved settings, in the same shape as `settings` (so an update needs no guessing) */
  current?: Record<string, unknown>;
  intent_id?: string;
  reason?: string;
}

export type StartPointErrorCode = 'conflict' | 'unavailable' | 'invalid' | 'exists' | 'missing' | 'declined' | 'readonly';

/** `in_progress`: the same box is already being removed (a second Delete): nothing to tell the user */
export type StartPointFailure = { ok: false; error: string; code: StartPointErrorCode; in_progress?: true };

export type StartPointResult =
  | { ok: true; intent_id?: string; type?: StartPointType; settings?: Record<string, unknown> }
  | StartPointFailure;

/** The failure of a result, or null (narrowing helper: the project compiles without strictNullChecks) */
export function startPointFailure(result: StartPointResult): StartPointFailure | null {
  return result && result.ok === false ? result as StartPointFailure : null;
}

/** An open start box panel with a debounced draft (Scheduled): dropped and waited for before the service writes */
export interface StartPointPanelHandle {
  cancelPending: () => void;
  whenIdle: () => Promise<void>;
  /** hold the panel's saves back while an update from outside is applied */
  suspend?: () => void;
  /**
   * saves start again. Called by the service only when the update failed (resave true: the form is still the
   * user's); after a successful update the panel resumes itself once its settingsChanged$ reload is done.
   */
  resume?: (resave: boolean) => void;
}

export interface StartPointAddOptions {
  /**
   * Palette drop only: asks the user to confirm the 409 conversion of an automation webhook (true → retry with
   * confirm). Without it (the agent tool) a 409 is returned as `conflict`, never confirmed.
   */
  confirmConflict?: () => Promise<boolean>;
}

type ServerType = 'webhook' | 'scheduled';

/** Per-type descriptor: what add/update accept. A new server start type is added here. */
const SETTINGS_SCHEMA: Record<ServerType, Record<string, unknown>> = {
  webhook: {
    enabled: 'boolean',
    source_name: 'string'
  },
  scheduled: {
    enabled: 'boolean',
    source_name: 'string',
    schedule: {
      frequency: 'interval | daily | weekly | monthly',
      every: 'interval only: with unit minutes one of 5, 10, 15, 20, 30; with unit hours an integer 1-12',
      unit: 'interval only: minutes | hours',
      time: 'daily/weekly/monthly: HH:mm',
      weekdays: 'weekly only: at least one of mon, tue, wed, thu, fri, sat, sun',
      day_of_month: "monthly only: integer 1-28 or 'last'",
      timezone: 'IANA time zone (default: the browser one)'
    },
    payload: 'object of string|number|boolean values'
  }
};
const ALLOWED_KEYS: Record<ServerType, string[]> = {
  webhook: ['enabled', 'source_name'],
  scheduled: ['enabled', 'source_name', 'schedule', 'payload']
};
const DELETE_DIALOG: Record<StartPointType, { title: string, text: string }> = {
  web: { title: 'CDSCanvas.WebStartDeleteTitle', text: 'CDSCanvas.WebStartDeleteText' },
  webhook: { title: 'CDSCanvas.StartWebhookDeleteTitle', text: 'CDSCanvas.StartWebhookDeleteText' },
  scheduled: { title: 'CDSCanvas.ScheduledPanel.DeleteTitle', text: 'CDSCanvas.ScheduledPanel.DeleteText' }
};
/** attribute of the `start` block that hides the Web start box; the block itself is never deleted */
export const WEB_START_DISABLED = 'web_start_disabled';
const NO_WEB_START_BLOCK = 'this flow has no start block';
const SCHEDULER_NOT_CONFIGURED = 'Scheduled starts are not available on this installation (no scheduler configured)';
const NOT_CONVERSATIONAL = 'Start points exist only for conversational chatbots (subtype chatbot)';
/** the sentence of a flow whose subtype has no start points: names the subtype */
const notConversational = (subtype: string) => NOT_CONVERSATIONAL + '; this flow is subtype ' + subtype;
const READ_ONLY = 'This flow is read-only (a published copy, or no rights to edit it)';
/** horizontal room left free between the leftmost block and a start box placed by the service */
const START_BOX_GAP_X = 500;
const START_BOX_GAP_Y = 250;

function isPlainObject(v: any): boolean {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function fail(code: StartPointErrorCode, error: string): StartPointResult {
  return { ok: false, code, error };
}

/** The message of a failed HTTP call: the server's own sentence when it has one */
export function startPointServerMessage(err: any): string {
  const body = err?.error;
  if (typeof body === 'string' && body) {
    return body;
  }
  return body?.error || body?.message || (typeof err?.message === 'string' ? err.message : '') || '';
}

/** Result code of a failed HTTP call */
export function startPointErrorCode(err: any): StartPointErrorCode {
  switch (err?.status) {
    case 409: return 'conflict';
    case 400: case 422: return 'invalid';
    case 404: return 'missing';
    case 401: case 403: return 'readonly';
    default: return 'unavailable';
  }
}

/**
 * The given settings checked against the type: known keys, types, payload (the panel's rowsToPayload rules).
 * Returns the error sentence, or the normalized settings. The schedule is checked after defaults/merge (scheduleError).
 */
export function checkStartPointSettings(type: ServerType, settings: any): { error: string } | { settings: StartPointSettingsInput } {
  if (settings === undefined || settings === null) {
    return { settings: {} };
  }
  if (!isPlainObject(settings)) {
    return { error: 'settings must be an object' };
  }
  const unknown = Object.keys(settings).filter(k => !ALLOWED_KEYS[type].includes(k));
  if (unknown.length) {
    return { error: 'unknown setting ' + unknown.join(', ') + ' for a ' + type + ' start; accepted: ' + ALLOWED_KEYS[type].join(', ') };
  }
  const out: StartPointSettingsInput = {};
  if (settings.enabled !== undefined) {
    if (typeof settings.enabled !== 'boolean') {
      return { error: 'enabled must be true or false' };
    }
    out.enabled = settings.enabled;
  }
  if (settings.source_name !== undefined) {
    if (typeof settings.source_name !== 'string') {
      return { error: 'source_name must be a string' };
    }
    out.source_name = settings.source_name.trim();
  }
  if (settings.schedule !== undefined) {
    if (!isPlainObject(settings.schedule)) {
      return { error: 'schedule must be an object' };
    }
    out.schedule = { ...settings.schedule };
  }
  if (settings.payload !== undefined) {
    if (!isPlainObject(settings.payload)) {
      return { error: 'payload must be an object of string, number or boolean values' };
    }
    for (const key of Object.keys(settings.payload)) {
      const v = settings.payload[key];
      if (!['string', 'number', 'boolean'].includes(typeof v)) {
        return { error: 'Field ' + key + ' must be a string, number or boolean' };
      }
    }
    const { payload, error } = rowsToPayload(payloadToRows(settings.payload));
    if (error) {
      return { error };
    }
    out.payload = payload;
  }
  return { settings: out };
}

/** Settings as the agent reads them back, from the PUT body that was saved */
function settingsOfBody(type: ServerType, body: any, chatbotName: string): Record<string, unknown> {
  const settings: Record<string, unknown> = {
    enabled: body.enabled !== false,
    source_name: body.mapping?.source_name ?? chatbotName ?? ''
  };
  if (type === 'scheduled') {
    settings.schedule = body.schedule;
    settings.payload = body.mapping?.payload || {};
  }
  return settings;
}

/**
 * The one place that adds, configures and removes the start boxes (Webhook, Scheduled): the palette drop, the
 * start box panels and the agent chat `start_point` tool all go through it.
 * The canvas does its DOM work on `boxCreated$` / `boxRemoved$`; an open panel reloads on `settingsChanged$`.
 * Nothing here publishes: a scheduled change stays a draft until publish.
 */
@Injectable({
  providedIn: 'root'
})
export class StartPointManagerService {

  /** a start box was saved and registered: the canvas adds it as after a palette drop */
  readonly boxCreated$ = new Subject<Intent>();
  /** a start box's server start point is gone: the canvas closes its panels; the service then deletes the block */
  readonly boxRemoved$ = new Subject<Intent>();
  /**
   * Web start was disabled or enabled. Unlike a webhook/scheduled box nothing is created or deleted: the `start`
   * block stays in the flow and only carries `attributes.web_start_disabled`, so the canvas hides or shows its
   * existing pill (and the palette rebuilds its items) instead of adding or removing a block.
   */
  readonly webStartChanged$ = new Subject<{ intent: Intent; disabled: boolean }>();
  /** the settings of a start point were changed outside its panel: an open panel reloads */
  readonly settingsChanged$ = new Subject<{ type: StartPointType }>();
  /** true while an add is in flight (the palette disables its items) */
  readonly pending$ = new BehaviorSubject<boolean>(false);

  private readonly pendingRef = { value: false };
  private adding = false;
  private readonly removing = new Set<StartPointType>();
  /** per type, the tail of the operations writing it: an update PUT never lands after a remove DELETE of the box */
  private readonly queues = new Map<StartPointType, Promise<unknown>>();
  private readonly panels = new Map<StartPointType, StartPointPanelHandle>();
  private readonly logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private readonly webhookService: WebhookService,
    private readonly intentService: IntentService,
    private readonly dashboardService: DashboardService,
    private readonly readOnlyService: ReadOnlyService,
    private readonly translate: TranslateService,
    @Optional() private readonly controllerService?: ControllerService,
    @Optional() private readonly connectorService?: ConnectorService
  ) { }

  // ---------------------------------------------------------------- public API

  async describe(): Promise<StartPointDescriptor[]> {
    const notChatbot = this.subtypeReason();
    if (notChatbot) {
      // no start point can be added, changed or removed: the entry block stays as it is
      return [
        { type: 'web', status: 'unavailable', removable: false, settings: {}, reason: notChatbot },
        ...(['webhook', 'scheduled'] as ServerType[]).map(type => ({
          type, status: 'unavailable' as const, removable: false, settings: SETTINGS_SCHEMA[type], reason: notChatbot
        }))
      ];
    }
    const webhook = await this.knownWebhook();
    const web = this.webStartBlock();
    const webDescriptor: StartPointDescriptor = { type: 'web', status: 'available', removable: true, settings: {} };
    if (!web) {
      webDescriptor.status = 'unavailable';
      webDescriptor.reason = NO_WEB_START_BLOCK;
    } else if (!this.isWebStartDisabled(web)) {
      webDescriptor.status = 'present';
      webDescriptor.intent_id = web.intent_id;
      webDescriptor.current = {};
    }
    const servers = (['webhook', 'scheduled'] as ServerType[]).map(type => {
      const box = this.boxOf(type);
      const descriptor: StartPointDescriptor = {
        type,
        status: 'available',
        removable: true,
        settings: SETTINGS_SCHEMA[type]
      };
      if (box) {
        descriptor.status = 'present';
        descriptor.intent_id = box.intent_id;
        // a start point registered on another block is not this box's state: the defaults (as in applyUpdate)
        const found = findStartPoint(webhook, type);
        descriptor.current = settingsOfBody(type, found && found.block_id === box.intent_id ? found : {}, this.chatbotName);
        return descriptor;
      }
      const reason = this.unavailableReason(type, webhook, true);
      if (reason) {
        descriptor.status = 'unavailable';
        descriptor.reason = reason;
      }
      return descriptor;
    });
    return [webDescriptor, ...servers];
  }

  async add(type: StartPointType, settings?: Record<string, unknown>, position?: { x: number; y: number }, options: StartPointAddOptions = {}): Promise<StartPointResult> {
    if (this.readOnlyService.readOnly) {
      return fail('readonly', READ_ONLY);
    }
    if (type === 'web') {
      return this.enableWebStart(settings);
    }
    if (!this.isServerType(type)) {
      return fail('invalid', 'unknown start point type ' + type + '; accepted: web, webhook, scheduled');
    }
    if (this.boxOf(type)) {
      return fail('exists', 'a ' + type + ' start box is already in the flow');
    }
    if (this.adding || this.pendingRef.value) {
      return fail('exists', 'a start box is being added: wait for it and retry');
    }
    const checked = checkStartPointSettings(type, settings);
    if ('error' in checked) {
      return fail('invalid', checked.error);
    }
    const timezone = browserTimezone();
    const given = checked.settings;
    if (type === 'scheduled' && given.schedule) {
      const error = scheduleError(cleanSchedule({ timezone, ...given.schedule }));
      if (error) {
        return fail('invalid', error);
      }
    }
    if (type === 'webhook' && (given.schedule || given.payload)) {
      return fail('invalid', 'a webhook start has no schedule or payload');
    }

    this.adding = true;
    this.pending$.next(true);
    try {
      const reason = this.unavailableReason(type, await this.knownWebhook(), true);
      if (reason) {
        return fail('unavailable', reason);
      }
      const chatbotId = this.chatbotId;
      const chatbotName = this.chatbotName;
      const pos = position || this.freePosition();
      // the tool path passes its settings; the palette none (the drop defaults, body unchanged)
      const toolSettings = settings === undefined ? undefined : given;
      let lastError: any = null;
      let sentBody: any = null;
      let createdBlock: Intent = null;
      const outcome = await createStartPointBox({
        pending: this.pendingRef,
        createBlock: (block) => {
          block.id_faq_kb = chatbotId;
          return this.intentService.createIntentWithoutHistory(block);
        },
        deleteBlock: (block) => this.intentService.deleteSavedIntentWithoutHistory(block),
        upsert: (block, confirm) => {
          // the source name starts as the chatbot name, so the requester is never a generic "Webhook"
          sentBody = buildStartPointUpsertBody(type, block.intent_id, chatbotName, timezone, confirm, toolSettings);
          return this.webhookService.upsertStartPoint(chatbotId, type, sentBody).pipe(tap({ error: (err) => { lastError = err; } }));
        },
        confirmSwitch: () => options.confirmConflict ? options.confirmConflict() : Promise.resolve(false),
        onError: (err) => { lastError = err; },
        onCreated: (block) => {
          createdBlock = block;
          this.boxCreated$.next(block);
          // the box renders its summary/badge from the shared webhook
          this.webhookService.loadWebhook(chatbotId, true);
        }
      }, type, pos);

      if (outcome === 'created') {
        return { ok: true, intent_id: createdBlock.intent_id, type, settings: settingsOfBody(type, sentBody, chatbotName) };
      }
      if (outcome === 'busy') {
        return fail('exists', 'a start box is being added: wait for it and retry');
      }
      if (outcome === 'cancelled') {
        if (options.confirmConflict) {
          return fail('declined', 'declined by the user');
        }
        return fail('conflict', startPointServerMessage(lastError) || 'the chatbot webhook is used by an automation: add the box from the palette to confirm the switch');
      }
      this.logger.error('[START-POINT-MANAGER] add failed', type, lastError);
      return fail(startPointErrorCode(lastError), startPointServerMessage(lastError) || 'the ' + type + ' start box could not be added');
    } finally {
      this.adding = false;
      this.pending$.next(false);
    }
  }

  async update(type: StartPointType, settings: Record<string, unknown>): Promise<StartPointResult> {
    if (this.readOnlyService.readOnly) {
      return fail('readonly', READ_ONLY);
    }
    if (type === 'web') {
      return fail('invalid', 'the web start has no settings: add or remove it only');
    }
    if (!this.isServerType(type)) {
      return fail('invalid', 'unknown start point type ' + type + '; accepted: web, webhook, scheduled');
    }
    if (!this.boxOf(type)) {
      return fail('missing', 'there is no ' + type + ' start box in the flow: add it first');
    }
    const checked = checkStartPointSettings(type, settings);
    if ('error' in checked) {
      return fail('invalid', checked.error);
    }
    const given = checked.settings;
    if (type === 'webhook' && (given.schedule || given.payload)) {
      return fail('invalid', 'a webhook start has no schedule or payload');
    }
    return this.serial(type, () => this.updateNow(type, given));
  }

  /** The update itself, queued after any other operation on the same type (the box may be gone by now) */
  private async updateNow(type: ServerType, given: StartPointSettingsInput): Promise<StartPointResult> {
    const box = this.boxOf(type);
    if (!box) {
      return fail('missing', 'there is no ' + type + ' start box in the flow: add it first');
    }
    // the open panel first: its PUT in flight must land before the GET the merge is based on, and no save of
    // its own may start until the reload after this update (it would revert the change)
    const panel = this.panels.get(type);
    if (panel) {
      if (panel.suspend) {
        panel.suspend();
      } else {
        panel.cancelPending();
      }
      await panel.whenIdle();
    }
    const result = await this.applyUpdate(type, box, given);
    if (result.ok) {
      this.webhookService.loadWebhook(this.chatbotId, true);
      // the panel reloads the saved draft, then resumes its saves
      this.settingsChanged$.next({ type });
    } else {
      panel?.resume?.(true);
    }
    return result;
  }

  /** GET, merge, PUT of an update (the panel is already quiet) */
  private async applyUpdate(type: ServerType, box: Intent, given: StartPointSettingsInput): Promise<StartPointResult> {
    let webhook: any;
    try {
      webhook = await this.freshWebhook();
    } catch (err) {
      return fail(startPointErrorCode(err), startPointServerMessage(err) || 'the start points could not be loaded');
    }
    const reason = this.unavailableReason(type, webhook, false);
    if (reason) {
      return fail('unavailable', reason);
    }
    const found = findStartPoint(webhook, type);
    // a start point registered on another block is not this box's state: the defaults
    const current = found && found.block_id === box.intent_id ? found : null;
    const body = this.mergedBody(type, box.intent_id, current, given);
    if ('error' in body) {
      return fail('invalid', body.error);
    }
    try {
      await lastValueFrom(this.webhookService.upsertStartPoint(this.chatbotId, type, body.body), { defaultValue: null });
    } catch (err) {
      this.logger.error('[START-POINT-MANAGER] update failed', type, err);
      return fail(startPointErrorCode(err), startPointServerMessage(err) || 'the ' + type + ' start could not be saved');
    }
    if (type === 'webhook') {
      this.stopWebhookStartTest();
    }
    return { ok: true, settings: settingsOfBody(type, body.body, this.chatbotName) };
  }

  async remove(type: StartPointType): Promise<StartPointResult> {
    if (this.readOnlyService.readOnly) {
      return fail('readonly', READ_ONLY);
    }
    if (type === 'web') {
      return this.disableWebStart();
    }
    if (!this.isServerType(type)) {
      return fail('invalid', 'unknown start point type ' + type + '; accepted: web, webhook, scheduled');
    }
    const box = this.boxOf(type);
    if (!box) {
      return fail('missing', 'there is no ' + type + ' start box in the flow');
    }
    const ok = await this.confirmDialog({
      title: this.translate.instant(DELETE_DIALOG[type].title),
      text: this.translate.instant(DELETE_DIALOG[type].text),
      icon: 'warning',
      buttons: [this.translate.instant('CDSCanvas.StartWebhookSwitchCancel'), this.translate.instant('Delete')],
      dangerMode: true,
    });
    if (!ok) {
      return fail('declined', 'declined by the user');
    }
    if (this.removing.has(type)) {
      return { ok: false, code: 'missing', error: 'the ' + type + ' start box is already being removed', in_progress: true };
    }
    this.removing.add(type);
    try {
      return await this.serial(type, () => this.removeNow(type));
    } finally {
      this.removing.delete(type);
    }
  }

  /** The removal itself, queued after any other operation on the same type (an update PUT in flight lands first) */
  private async removeNow(type: ServerType): Promise<StartPointResult> {
    const box = this.boxOf(type);
    if (!box) {
      return fail('missing', 'there is no ' + type + ' start box in the flow');
    }
    const panel = this.panels.get(type);
    if (panel) {
      // no PUT after the DELETE: drop the pending edit and wait for one already sent (it would re-create the start point)
      panel.cancelPending();
      await panel.whenIdle();
    }
    // the server first: a failure keeps the box, so the flow never has a start point without its block
    try {
      await lastValueFrom(this.webhookService.deleteStartPoint(this.chatbotId, type), { defaultValue: null });
    } catch (err) {
      if (startPointDeleteOutcome(type, err) === 'keep_box') {
        this.logger.error('[START-POINT-MANAGER] remove failed', type, err);
        const fallback = this.translate.instant(type === 'scheduled' ? 'CDSCanvas.ScheduledPanel.SaveError' : 'CDSCanvas.StartWebhookError');
        // the panel's toast: the server sentence, else its own "not saved" text
        return fail(startPointErrorCode(err), err?.error?.error || fallback);
      }
      // already gone (404), or a scheduled start with no scheduler configured (503): the box can still be deleted
    }
    this.stopWebhookStartTest();
    if (type === 'scheduled') {
      this.panels.get(type)?.cancelPending();
      this.webhookService.loadWebhook(this.chatbotId, true);
    }
    this.boxRemoved$.next(box);
    // no undo entry: undoing would bring back a box whose start point no longer exists
    await this.intentService.deleteIntentWithoutHistory(box);
    return { ok: true };
  }

  /**
   * The panel's own debounced save (Scheduled form) and switch/name edits (Webhook): same body and PUT as before,
   * through the one service. Read-only answers null (WebhookService guard).
   */
  put(type: ServerType, body: any): Observable<any> {
    return this.webhookService.upsertStartPoint(this.chatbotId, type, body);
  }

  /** An open panel with a draft registers itself; the returned function unregisters it (panel destroy) */
  registerPanel(type: StartPointType, handle: StartPointPanelHandle): () => void {
    this.panels.set(type, handle);
    return () => {
      if (this.panels.get(type) === handle) {
        this.panels.delete(type);
      }
    };
  }

  // ---------------------------------------------------------------- web start

  /** Re-enable: the attribute goes, the box shows again, unconnected (it was cleared when disabled) */
  private async enableWebStart(settings?: Record<string, unknown>): Promise<StartPointResult> {
    const notChatbot = this.subtypeReason();
    if (notChatbot) {
      return fail('unavailable', notChatbot);
    }
    return this.serial('web', () => this.enableWebStartNow(settings));
  }

  private async enableWebStartNow(settings?: Record<string, unknown>): Promise<StartPointResult> {
    const web = this.webStartBlock();
    if (!web) {
      return fail('missing', NO_WEB_START_BLOCK);
    }
    if (!this.isWebStartDisabled(web)) {
      return fail('exists', 'the web start is already in the flow');
    }
    if (settings !== undefined && settings !== null && !(isPlainObject(settings) && !Object.keys(settings).length)) {
      return fail('invalid', 'the web start has no settings');
    }
    // unconnected: a connection made while it was disabled (agent flow ops) is cleared as on disable
    const cleared = this.clearWebStartConnection(web);
    const outcome = await this.saveWebStart(web, () => { delete web.attributes[WEB_START_DISABLED]; cleared.apply(); }, () => { web.attributes[WEB_START_DISABLED] = true; cleared.revert(); });
    if (outcome) {
      return outcome;
    }
    cleared.removeDrawn();
    this.webStartChanged$.next({ intent: web, disabled: false });
    return { ok: true, intent_id: web.intent_id, type: 'web', settings: {} };
  }

  /**
   * Disable: the user confirms first. The `start` block is never deleted: it gets `web_start_disabled` and its
   * outgoing connection cleared the way the canvas does when a connector is deleted (the connected action's and
   * the block dot's intentName emptied, the drawn connector removed), saved without an undo entry.
   */
  private async disableWebStart(): Promise<StartPointResult> {
    const notChatbot = this.subtypeReason();
    if (notChatbot) {
      return fail('unavailable', notChatbot);
    }
    const web = this.webStartBlock();
    if (!web) {
      return fail('missing', NO_WEB_START_BLOCK);
    }
    if (this.isWebStartDisabled(web)) {
      return fail('missing', 'the web start is already disabled');
    }
    if (this.removing.has('web')) {
      return { ok: false, code: 'missing', error: 'the web start is already being disabled', in_progress: true };
    }
    this.removing.add('web');
    try {
      const ok = await this.confirmDialog({
        title: this.translate.instant(DELETE_DIALOG.web.title),
        text: this.translate.instant(DELETE_DIALOG.web.text),
        icon: 'warning',
        buttons: [this.translate.instant('CDSCanvas.StartWebhookSwitchCancel'), this.translate.instant('Delete')],
        dangerMode: true,
      });
      if (!ok) {
        return fail('declined', 'declined by the user');
      }
      return await this.serial('web', async () => {
        if (this.isWebStartDisabled(web)) {
          return fail('missing', 'the web start is already disabled');
        }
        const cleared = this.clearWebStartConnection(web);
        const outcome = await this.saveWebStart(web, () => { web.attributes[WEB_START_DISABLED] = true; cleared.apply(); }, () => { delete web.attributes[WEB_START_DISABLED]; cleared.revert(); });
        if (outcome) {
          return outcome;
        }
        cleared.removeDrawn();
        this.webStartChanged$.next({ intent: web, disabled: true });
        return { ok: true } as StartPointResult;
      });
    } finally {
      this.removing.delete('web');
    }
  }

  /**
   * The start's outgoing connection as one reversible change: connected actions and the block dot emptied, their
   * attributes.connectors entries dropped, and (after the save) the drawn connector removed.
   */
  private clearWebStartConnection(web: Intent): { apply: () => void; revert: () => void; removeDrawn: () => void } {
    const targets = this.webStartTargets(web);
    const actionIds = targets.map(t => t.action._tdActionId).filter(id => !!id);
    const previousNames = targets.map(t => t.action.intentName);
    const previousConnectors = web.attributes?.connectors;
    return {
      apply: () => {
        targets.forEach(t => { t.action.intentName = ''; });
        if (previousConnectors && actionIds.length) {
          web.attributes.connectors = Object.keys(previousConnectors)
            .filter(key => !actionIds.some(id => key.includes(id)))
            .reduce((acc, key) => { acc[key] = previousConnectors[key]; return acc; }, {});
        }
      },
      revert: () => {
        targets.forEach((t, i) => { t.action.intentName = previousNames[i]; });
        if (previousConnectors) {
          web.attributes.connectors = previousConnectors;
        }
      },
      removeDrawn: () => {
        if (!targets.length) {
          return;
        }
        try {
          this.connectorService?.deleteConnectorsOutOfBlock(web.intent_id, false, true);
        } catch (err) {
          this.logger.error('[START-POINT-MANAGER] web start connector cleanup failed', err);
        }
      }
    };
  }

  /** Applies the change to the live block, saves it, and reverts it when the save fails (null: saved) */
  private async saveWebStart(web: Intent, apply: () => void, revert: () => void): Promise<StartPointFailure | null> {
    if (!web.attributes) {
      web.attributes = {} as any;
    }
    apply();
    try {
      await this.intentService.saveIntentWithoutHistory(web);
      return null;
    } catch (err) {
      revert();
      this.logger.error('[START-POINT-MANAGER] web start save failed', err);
      return fail('unavailable', startPointServerMessage(err) || 'the web start could not be saved') as StartPointFailure;
    }
  }

  /** The actions that carry the start's outgoing connection: the connected action in `actions` and the block dot */
  private webStartTargets(web: Intent): Array<{ action: any }> {
    const out: Array<{ action: any }> = [];
    (web.actions || []).forEach((a: any) => {
      if (a?._tdActionType === 'intent' && a.intentName) {
        out.push({ action: a });
      }
    });
    const dot: any = web.attributes?.nextBlockAction;
    if (dot?.intentName) {
      out.push({ action: dot });
    }
    return out;
  }

  private webStartBlock(): Intent | undefined {
    return (this.intentService.listOfIntents || []).find(i => startPointTypeOf(i) === 'web');
  }

  private isWebStartDisabled(web: Intent): boolean {
    return web?.attributes?.[WEB_START_DISABLED] === true;
  }

  // ---------------------------------------------------------------- internals

  /**
   * Runs `run` after every operation already queued on the same type (a per-type promise chain): an agent update
   * and a user remove of the same box never interleave their GET/PUT and DELETE. Other types are not held back.
   */
  private serial<T>(type: StartPointType, run: () => Promise<T>): Promise<T> {
    const previous = this.queues.get(type) || Promise.resolve();
    const result = previous.then(() => run());
    const tail = result.then(() => undefined, () => undefined);
    this.queues.set(type, tail);
    tail.then(() => {
      if (this.queues.get(type) === tail) {
        this.queues.delete(type);
      }
    });
    return result;
  }

  /** Why this flow has no start points at all (its subtype is not chatbot), or null */
  private subtypeReason(): string | null {
    const subtype = this.dashboardService.selectedChatbot?.subtype;
    return supportsStartPoints(subtype) ? null : notConversational(subtype);
  }

  /** The confirmation dialog of a removal (sweetalert); resolves true on Delete */
  protected async confirmDialog(options: any): Promise<boolean> {
    return !!(await swal(options));
  }

  private get chatbotId(): string {
    return this.dashboardService.id_faq_kb;
  }

  private get chatbotName(): string | undefined {
    return this.dashboardService.selectedChatbot?.name;
  }

  private isServerType(type: any): type is ServerType {
    return type === 'webhook' || type === 'scheduled';
  }

  private boxOf(type: ServerType): Intent | undefined {
    return (this.intentService.listOfIntents || []).find(i => startPointTypeOf(i) === type);
  }

  /** Why the type cannot be added/changed, or null. `strict`: scheduled needs scheduled_available true (the palette rule) */
  private unavailableReason(type: ServerType, webhook: any, strict: boolean): string | null {
    const notChatbot = this.subtypeReason();
    if (notChatbot) {
      return notChatbot;
    }
    if (type === 'scheduled') {
      const available = webhook?.scheduled_available;
      if (strict ? available !== true : available === false) {
        return SCHEDULER_NOT_CONFIGURED;
      }
    }
    return null;
  }

  /** The shared webhook (palette state); loaded once when nothing is known yet */
  private async knownWebhook(): Promise<any> {
    const known = this.webhookService.webhook$.value;
    if (known) {
      return known;
    }
    try {
      return await this.freshWebhook();
    } catch (e) {
      return null;
    }
  }

  /** A fresh GET (also published on webhook$); 404 (no webhook record yet) is an empty webhook */
  private async freshWebhook(): Promise<any> {
    try {
      return await lastValueFrom(this.webhookService.fetchWebhook(this.chatbotId), { defaultValue: null });
    } catch (err) {
      if (err?.status === 404) {
        const available = err?.error?.scheduled_available;
        return { scheduled_available: available, start_points: [] };
      }
      throw err;
    }
  }

  /** The full PUT body of an update: the given settings over the current start point (defaults where it has none) */
  private mergedBody(type: ServerType, blockId: string, current: any, given: StartPointSettingsInput): { body: any } | { error: string } {
    const enabled = given.enabled !== undefined ? given.enabled : (current ? current.enabled !== false : true);
    const sourceName = given.source_name !== undefined ? given.source_name : (current?.mapping?.source_name ?? this.chatbotName ?? '');
    if (type === 'webhook') {
      return { body: { block_id: blockId, enabled, mapping: { source_name: sourceName } } };
    }
    const timezone = browserTimezone();
    const base = current?.schedule || defaultSchedule(timezone);
    const schedule = cleanSchedule({ timezone, ...base, ...(given.schedule || {}) });
    const error = scheduleError(schedule);
    if (error) {
      return { error };
    }
    // the payload is replaced as a whole (keys can be removed)
    const payload = given.payload !== undefined ? given.payload : (current?.mapping?.payload || {});
    return { body: { block_id: blockId, enabled, mapping: { source_name: sourceName, payload }, schedule } };
  }

  /** A free spot left of the flow, below any other start box already there */
  private freePosition(): { x: number, y: number } {
    const intents = this.intentService.listOfIntents || [];
    const positions = intents.map(i => i?.attributes?.position).filter(p => p && typeof p.x === 'number' && typeof p.y === 'number');
    if (!positions.length) {
      return { x: 0, y: 0 };
    }
    const minX = Math.min(...positions.map(p => p.x));
    const start = intents.find(i => startPointTypeOf(i) === 'web')?.attributes?.position;
    const baseY = start && typeof start.y === 'number' ? start.y : Math.min(...positions.map(p => p.y));
    const otherBoxes = intents.filter(i => { const t = startPointTypeOf(i); return t === 'webhook' || t === 'scheduled'; }).length;
    return { x: minX - START_BOX_GAP_X, y: baseY + START_BOX_GAP_Y * otherBoxes };
  }

  /** A running "Test webhook start" is bound to the current start point: end it when that changes */
  private stopWebhookStartTest() {
    if (this.intentService.webhookStartTest) {
      this.controllerService?.stopTestItOut();
    }
  }
}
