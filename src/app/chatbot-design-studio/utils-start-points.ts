import { Observable, lastValueFrom } from 'rxjs';
import { Intent } from 'src/app/models/intent-model';
import { ActionIntentConnected } from 'src/app/models/action-model';
import { TYPE_OF_MENU } from './utils';

export const START_POINT_TYPES = ['web', 'webhook'];
export const START_POINT_MARKER = 'start_point';
const WEB_START_BLOCK_NAME = 'start';

/** The server returns start_points as an array: [{type, block_id, enabled, mapping}] */
export function findStartPoint(webhook: any, type: string): any {
  const list = webhook?.start_points;
  return Array.isArray(list) ? list.find(sp => sp?.type === type) : undefined;
}

/** `web` is the block named start; any other block is a start point only when it carries the marker */
export function startPointTypeOf(intent: any): 'web' | 'webhook' | null {
  if (!intent) {
    return null;
  }
  if (intent.intent_display_name === WEB_START_BLOCK_NAME) {
    return 'web';
  }
  const marker = intent.attributes?.[START_POINT_MARKER];
  return START_POINT_TYPES.includes(marker) && marker !== 'web' ? marker : null;
}

/** Web is always present; webhook only when its start point points to an existing block carrying the marker */
export function presentStartPointTypes(intents: any[], webhook: any): string[] {
  const present = ['web'];
  const blockId = findStartPoint(webhook, 'webhook')?.block_id;
  if (blockId) {
    const block = (intents || []).find(i => i.intent_id === blockId);
    if (block && startPointTypeOf(block) === 'webhook') {
      present.push('webhook');
    }
  }
  return present;
}

/** Test webhook start needs an enabled webhook start point */
export function isWebhookStartPointActive(webhook: any): boolean {
  const sp = findStartPoint(webhook, 'webhook');
  return !!(webhook?.webhook_id && sp && sp.enabled !== false);
}

/** i18n key of the label shown on a start box header (never the block name); null for any other block */
export function startPointLabelKey(intent: any): string | null {
  const type = startPointTypeOf(intent);
  if (type === 'web') {
    return 'CDSCanvas.WebStart';
  }
  return type === 'webhook' ? 'CDSCanvas.WebhookStart' : null;
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

const WEBHOOK_START_BLOCK_NAME = 'Webhook start';

/** The block dropped on the canvas for a start point: readonly, marked, ending with an empty connect action like `start` */
export function createStartPointBlock(type: 'webhook', pos: { x: number, y: number }): Intent {
  const intent = new Intent();
  intent.intent_display_name = WEBHOOK_START_BLOCK_NAME;
  intent.attributes.start_point = type;
  intent.attributes.position = pos;
  intent.attributes.readonly = true;
  const action = new ActionIntentConnected();
  action.intentName = '';
  intent.actions = [action];
  return intent;
}

/** Palette items of the Start points section. Web is always present (the start block); webhook is one per flow */
export function buildStartPointItems(present: string[], pending: boolean): any[] {
  const webhookPresent = present.includes('webhook');
  return [
    {
      type: TYPE_OF_MENU.ACTION,
      canLoad: true,
      value: {
        name: 'CDSActionList.NAME.StartPointWeb',
        type: 'web',
        start_point: 'web',
        src: 'assets/images/actions_category/start_points.svg',
        status: 'active',
        disabled: true,
        tooltip: 'CDSCanvas.StartPointPresent'
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
}

export interface StartPointBoxDeps {
  /** shared flag: true while a create is in flight (a second drop does nothing) */
  pending: { value: boolean };
  saveBlock: (block: Intent) => Promise<any>;
  removeBlock: (block: Intent) => Promise<any>;
  upsert: (block: Intent, confirm: boolean) => Observable<any>;
  confirmSwitch: () => Promise<boolean>;
  onError: (err?: any) => void;
  /** awaited while the flag is still pending (e.g. reloading the webhook) */
  onCreated: (block: Intent) => void | Promise<any>;
}

/**
 * Creates the start box, then registers it as the webhook start point.
 * A failure after the block was saved deletes the block again (no orphan box).
 */
export async function createStartPointBox(deps: StartPointBoxDeps, type: 'webhook', pos: { x: number, y: number }): Promise<'created' | 'cancelled' | 'failed' | 'busy'> {
  if (deps.pending.value) {
    return 'busy';
  }
  deps.pending.value = true;
  const block = createStartPointBlock(type, pos);
  try {
    try {
      await deps.saveBlock(block);
    } catch (err) {
      await safeRemove(deps, block);
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
          await safeRemove(deps, block);
          return 'cancelled';
        }
        await lastValueFrom(deps.upsert(block, true));
      }
    } catch (err) {
      await safeRemove(deps, block);
      deps.onError(err);
      return 'failed';
    }
    await deps.onCreated(block);
    return 'created';
  } finally {
    deps.pending.value = false;
  }
}

async function safeRemove(deps: StartPointBoxDeps, block: Intent) {
  try {
    await deps.removeBlock(block);
  } catch (e) {
    // the caller still reports the original failure
  }
}
