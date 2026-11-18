import { Observable, lastValueFrom } from 'rxjs';
import { Intent } from 'src/app/models/intent-model';
import { ActionIntentConnected } from 'src/app/models/action-model';
import { TYPE_OF_MENU } from './utils';
import { cleanSchedule, defaultSchedule } from './utils-schedule';

export const START_POINT_TYPES = ['web', 'webhook', 'scheduled'];
export const START_POINT_MARKER = 'start_point';
const WEB_START_BLOCK_NAME = 'start';

/** The server returns start_points as an array: [{type, block_id, enabled, mapping}] */
export function findStartPoint(webhook: any, type: string): any {
  const list = webhook?.start_points;
  return Array.isArray(list) ? list.find(sp => sp?.type === type) : undefined;
}

/** `web` is the block named start; any other block is a start point only when it carries the marker */
export function startPointTypeOf(intent: any): 'web' | 'webhook' | 'scheduled' | null {
  if (!intent) {
    return null;
  }
  if (intent.intent_display_name === WEB_START_BLOCK_NAME) {
    return 'web';
  }
  const marker = intent.attributes?.[START_POINT_MARKER];
  return START_POINT_TYPES.includes(marker) && marker !== 'web' ? marker : null;
}

/** The kind of start test running in the header: a webhook start test or a scheduled one (null: none) */
export type StartTestKind = 'webhook' | 'scheduled' | null;

/** The start box highlighted during a start test: only the box of the running test's kind */
export function isLiveStartBox(intent: any, kind: StartTestKind): boolean {
  const type = startPointTypeOf(intent);
  return !!kind && (type === 'webhook' || type === 'scheduled') && type === kind;
}

/** Closing a test deletes the webhook preload for a webhook chatbot or a webhook start test; a scheduled test has no preload */
export function shouldDeleteWebhookPreload(isWebhookChatbot: boolean, isStartTest: boolean, kind: StartTestKind): boolean {
  return isWebhookChatbot || (isStartTest && kind !== 'scheduled');
}

/** Toast key of a failed start box drop */
export function startPointErrorKey(type: 'webhook' | 'scheduled'): string {
  return type === 'scheduled' ? 'CDSCanvas.ScheduledPointError' : 'CDSCanvas.StartPointError';
}

/**
 * A start box (the `start` block or a marker block, whatever its name): no delete, copy, color or
 * "Start test from here" on the canvas, only its panel. The webhook box is deleted from its panel only,
 * which removes the server start point first.
 */
export function isStartBox(intent: any): boolean {
  return startPointTypeOf(intent) !== null;
}

/**
 * Web is present unless the `start` block carries `web_start_disabled` (Web start removed by the user or the
 * agent: the block stays, hidden). Any other type is present when a block carries its marker, whether or not the
 * server start point exists. A marker block without a start point (imported, forked, redone) is recovered from its
 * panel switch, and the palette never offers a second box that would clash on the block name.
 */
export function presentStartPointTypes(intents: any[]): string[] {
  const present = (intents || []).some(i => isWebStartDisabled(i)) ? [] : ['web'];
  (intents || []).forEach(i => {
    const type = startPointTypeOf(i);
    if (type && type !== 'web' && !present.includes(type)) {
      present.push(type);
    }
  });
  return present;
}

/** The `start` block with Web start turned off (kept in the flow, hidden, unconnected) */
export function isWebStartDisabled(intent: any): boolean {
  return startPointTypeOf(intent) === 'web' && intent?.attributes?.web_start_disabled === true;
}

/**
 * Start points (Web start disable/enable included) exist only for conversational chatbots: subtype `chatbot`, or
 * no subtype at all. A voice bot, a subagent or any other subtype keeps its entry block as it is.
 */
export function supportsStartPoints(subtype: string | null | undefined): boolean {
  return (subtype || 'chatbot') === 'chatbot';
}

/**
 * The block the studio opens on (selection, centring): the Web start; when it is disabled the first visible start
 * box (webhook/scheduled), else the first other block. Never the hidden start. A flow without a `start` block
 * (another subtype's entry) gives undefined: the caller keeps its own choice.
 */
export function defaultEntryIntent(intents: any[], startName: string = WEB_START_BLOCK_NAME): any | undefined {
  const list = (intents || []).filter(i => !!i);
  const start = list.find(i => (i.intent_display_name || '').trim() === startName);
  if (!start) {
    return undefined;
  }
  if (!isWebStartDisabled(start)) {
    return start;
  }
  const box = list.find(i => { const t = startPointTypeOf(i); return t === 'webhook' || t === 'scheduled'; });
  return box || list.find(i => !isWebStartDisabled(i));
}

/** Blocks the left block list shows: a disabled Web start is hidden on the canvas, so it is not listed either */
export function listedIntents(intents: any[]): any[] {
  return (intents || []).filter(i => !isWebStartDisabled(i));
}

/** Palette items of the Start points section are dropped on the canvas only, never into a block */
export function isStartPointPaletteItem(item: any): boolean {
  return !!item?.value?.start_point;
}

/** Test webhook start needs an enabled webhook start point */
export function isWebhookStartPointActive(webhook: any): boolean {
  const sp = findStartPoint(webhook, 'webhook');
  return !!(webhook?.webhook_id && sp && sp.enabled !== false);
}

/**
 * i18n key of the label shown on a start box header (never the block name); null for any other block.
 * "Web start" only for chatbot subtype `chatbot` (default): other subtypes (voice…) keep the block name.
 */
export function startPointLabelKey(intent: any, subtype: string = 'chatbot'): string | null {
  const type = startPointTypeOf(intent);
  if (type === 'web') {
    return (subtype || 'chatbot') === 'chatbot' ? 'CDSCanvas.WebStart' : null;
  }
  if (type === 'webhook') {
    return 'CDSCanvas.WebhookStart';
  }
  return type === 'scheduled' ? 'CDSCanvas.ScheduledStart' : null;
}

export interface StartPointPanelState {
  enabled: boolean;
  sourceName: string;
  url: string;
  devUrl: string;
}

/** What the webhook start box panel shows: enabled only when the start point points to this block */
export function startPointPanelState(webhook: any, intent: any, apiUrl: string = ''): StartPointPanelState {
  const sp = findStartPoint(webhook, 'webhook');
  const url = webhook?.webhook_id ? `${apiUrl}webhook/${webhook.webhook_id}` : '';
  return {
    enabled: !!(sp && sp.block_id === intent?.intent_id && sp.enabled !== false),
    sourceName: sp?.mapping?.source_name || '',
    url,
    devUrl: url ? url + '/dev' : ''
  };
}

const START_BLOCK_NAMES = { webhook: 'Webhook start', scheduled: 'Scheduled start' };

/** The block dropped on the canvas for a start point: readonly, marked, ending with an empty connect action like `start` */
export function createStartPointBlock(type: 'webhook' | 'scheduled', pos: { x: number, y: number }): Intent {
  const intent = new Intent();
  intent.intent_display_name = START_BLOCK_NAMES[type];
  intent.attributes.start_point = type;
  intent.attributes.position = pos;
  intent.attributes.readonly = true;
  const action = new ActionIntentConnected();
  action.intentName = '';
  intent.actions = [action];
  return intent;
}

/** Palette items of the Start points section. Web is offered only when Web start is disabled (not in `present`); webhook and scheduled are one per flow, scheduled only when the server has it configured */
export function buildStartPointItems(present: string[], pending: boolean, scheduledAvailable: boolean = false): any[] {
  const webPresent = present.includes('web');
  const webhookPresent = present.includes('webhook');
  const scheduledPresent = present.includes('scheduled');
  const items = [
    {
      type: TYPE_OF_MENU.ACTION,
      canLoad: true,
      value: {
        name: 'CDSActionList.NAME.StartPointWeb',
        type: 'web',
        start_point: 'web',
        src: 'assets/images/actions_category/start_points.svg',
        status: 'active',
        disabled: webPresent || pending,
        tooltip: webPresent ? 'CDSCanvas.StartPointPresent' : ''
      }
    },
    {
      type: TYPE_OF_MENU.ACTION,
      canLoad: true,
      value: {
        name: 'CDSActionList.NAME.StartPointWebhook',
        type: 'webhook',
        start_point: 'webhook',
        src: 'assets/images/actions_category/start_points.svg',
        status: 'active',
        disabled: webhookPresent || pending,
        tooltip: webhookPresent ? 'CDSCanvas.StartPointPresent' : ''
      }
    }
  ];
  if (scheduledAvailable) {
    items.push({
      type: TYPE_OF_MENU.ACTION,
      canLoad: true,
      value: {
        name: 'CDSActionList.NAME.StartPointScheduled',
        type: 'scheduled',
        start_point: 'scheduled',
        src: 'assets/images/actions_category/start_point_scheduled.svg',
        status: 'active',
        disabled: scheduledPresent || pending,
        tooltip: scheduledPresent ? 'CDSCanvas.StartPointPresent' : ''
      }
    });
  }
  return items;
}

/** Settings of a start box as the agent tool gives them (validated by the caller): every field optional */
export interface StartPointSettingsInput {
  enabled?: boolean;
  source_name?: string;
  schedule?: any;
  payload?: { [key: string]: string | number | boolean };
}

/**
 * Body of the PUT that registers a freshly dropped start box. Webhook: the source name only.
 * Scheduled: enabled, daily 09:00 in the browser timezone, source name = chatbot name, empty payload.
 * With `settings` (the agent tool), the given fields replace those defaults in the same PUT; a webhook then also
 * sends `enabled` (default true) and a schedule without timezone gets the browser one.
 */
export function buildStartPointUpsertBody(type: 'webhook' | 'scheduled', blockId: string, chatbotName: string | undefined, timezone: string, confirm: boolean, settings?: StartPointSettingsInput): any {
  const body: any = { block_id: blockId };
  const given = settings || {};
  const sourceName = given.source_name !== undefined ? given.source_name : chatbotName;
  if (type === 'scheduled') {
    body.enabled = given.enabled !== undefined ? given.enabled : true;
    body.mapping = { source_name: sourceName, payload: given.payload || {} };
    body.schedule = given.schedule ? cleanSchedule({ timezone, ...given.schedule }) : defaultSchedule(timezone);
  } else {
    if (settings) {
      body.enabled = given.enabled !== undefined ? given.enabled : true;
    }
    if (given.source_name !== undefined || chatbotName) {
      body.mapping = { source_name: sourceName };
    }
  }
  if (confirm) {
    body.confirm = true;
  }
  return body;
}

export interface StartPointBoxDeps {
  /** shared flag: true while a create is in flight (a second drop does nothing) */
  pending: { value: boolean };
  /** direct, awaited create (POST /faq, no undo entry): resolves only once the server has saved the block */
  createBlock: (block: Intent) => Promise<any>;
  /** direct, awaited delete of the saved block (no undo entry): the rollback of any later failure */
  deleteBlock: (block: Intent) => Promise<any>;
  upsert: (block: Intent, confirm: boolean) => Observable<any>;
  confirmSwitch: () => Promise<boolean>;
  onError: (err?: any) => void;
  /** the box is saved and registered: add it to the canvas. Awaited while the flag is still pending (e.g. reloading the webhook) */
  onCreated: (block: Intent) => void | Promise<any>;
}

/**
 * Creates the start box on the server, then registers it as the start point of its type (webhook or scheduled), then hands it to the canvas.
 * The PUT runs only after the create response: the server looks the block up by intent_id.
 * A failure after the create deletes the block again (no orphan box); nothing reaches the canvas or the undo history.
 */
export async function createStartPointBox(deps: StartPointBoxDeps, type: 'webhook' | 'scheduled', pos: { x: number, y: number }): Promise<'created' | 'cancelled' | 'failed' | 'busy'> {
  if (deps.pending.value) {
    return 'busy';
  }
  deps.pending.value = true;
  const block = createStartPointBlock(type, pos);
  try {
    try {
      await deps.createBlock(block);
    } catch (err) {
      // nothing was saved
      deps.onError(err);
      return 'failed';
    }
    try {
      try {
        await lastValueFrom(deps.upsert(block, false));
      } catch (err) {
        if (err?.status !== 409) {
          throw err;
        }
        if (!(await deps.confirmSwitch())) {
          await safeDelete(deps, block);
          return 'cancelled';
        }
        await lastValueFrom(deps.upsert(block, true));
      }
    } catch (err) {
      await safeDelete(deps, block);
      deps.onError(err);
      return 'failed';
    }
    await deps.onCreated(block);
    return 'created';
  } finally {
    deps.pending.value = false;
  }
}

async function safeDelete(deps: StartPointBoxDeps, block: Intent) {
  try {
    await deps.deleteBlock(block);
  } catch (e) {
    // the caller still reports the original failure
  }
}
