export const START_POINT_TYPES = ['web', 'webhook'];
export const START_POINT_MARKER = 'start_point';
const WEB_START_BLOCK_NAME = 'start';

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
  const blockId = webhook?.start_points?.webhook?.block_id;
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
  const sp = webhook?.start_points?.webhook;
  return !!(webhook?.webhook_id && sp && sp.enabled !== false);
}
