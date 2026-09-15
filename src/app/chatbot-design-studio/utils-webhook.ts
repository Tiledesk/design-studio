export const WEBHOOK_MODE_CONVERSATION = 'conversation';

export type StartWebhookToggleRequest =
  | { type: 'none' }
  | { type: 'create' }
  | { type: 'update', patch: { enabled: boolean, mode?: string, block_id?: string } };

/** The start block webhook is "on" only for enabled webhooks in conversation mode */
export function isStartWebhookActive(webhook: any): boolean {
  return !!(webhook && webhook.webhook_id && webhook.mode === WEBHOOK_MODE_CONVERSATION && webhook.enabled !== false);
}

/** An existing webhook without mode runs a block headless: switching it changes its behaviour */
export function needsSwitchConfirmation(webhook: any): boolean {
  return !!(webhook && webhook.webhook_id && webhook.mode !== WEBHOOK_MODE_CONVERSATION);
}

export function startWebhookToggleRequest(webhook: any, enable: boolean, startIntentId: string): StartWebhookToggleRequest {
  const exists = !!(webhook && webhook.webhook_id);
  if (enable) {
    if (!exists) {
      return { type: 'create' };
    }
    return { type: 'update', patch: { enabled: true, mode: WEBHOOK_MODE_CONVERSATION, block_id: startIntentId } };
  }
  return exists ? { type: 'update', patch: { enabled: false } } : { type: 'none' };
}
