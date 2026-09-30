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

/**
 * Web is always present; any other type is present when a block carries its marker, whether or not the server
 * start point exists. A marker block without a start point (imported, forked, redone) is recovered from its panel
 * switch, and the palette never offers a second box that would clash on the block name.
 */
export function presentStartPointTypes(intents: any[]): string[] {
  const present = ['web'];
  (intents || []).forEach(i => {
    const type = startPointTypeOf(i);
    if (type && !present.includes(type)) {
      present.push(type);
    }
  });
  return present;
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
 * Creates the start box on the server, then registers it as the webhook start point, then hands it to the canvas.
 * The PUT runs only after the create response: the server looks the block up by intent_id.
 * A failure after the create deletes the block again (no orphan box); nothing reaches the canvas or the undo history.
 */
export async function createStartPointBox(deps: StartPointBoxDeps, type: 'webhook', pos: { x: number, y: number }): Promise<'created' | 'cancelled' | 'failed' | 'busy'> {
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
