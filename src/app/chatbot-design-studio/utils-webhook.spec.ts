import { isStartWebhookActive, needsSwitchConfirmation, startWebhookToggleRequest, WEBHOOK_MODE_CONVERSATION } from './utils-webhook';

describe('utils-webhook', () => {

  it('isStartWebhookActive is true only for enabled conversation webhooks', () => {
    expect(isStartWebhookActive(null)).toBe(false);
    expect(isStartWebhookActive({ webhook_id: 'w1', enabled: true })).toBe(false);
    expect(isStartWebhookActive({ webhook_id: 'w1', mode: 'conversation', enabled: false })).toBe(false);
    expect(isStartWebhookActive({ webhook_id: 'w1', mode: 'conversation', enabled: true })).toBe(true);
  });

  it('needsSwitchConfirmation is true only for an existing automation webhook', () => {
    expect(needsSwitchConfirmation(null)).toBe(false);
    expect(needsSwitchConfirmation({ webhook_id: 'w1', mode: 'conversation' })).toBe(false);
    expect(needsSwitchConfirmation({ webhook_id: 'w1' })).toBe(true);
  });

  it('startWebhookToggleRequest creates, switches, disables or does nothing', () => {
    expect(startWebhookToggleRequest(null, true, 'start-id')).toEqual({ type: 'create' });
    expect(startWebhookToggleRequest({ webhook_id: 'w1' }, true, 'start-id'))
      .toEqual({ type: 'update', patch: { enabled: true, mode: WEBHOOK_MODE_CONVERSATION, block_id: 'start-id' } });
    expect(startWebhookToggleRequest({ webhook_id: 'w1', mode: 'conversation' }, false, 'start-id'))
      .toEqual({ type: 'update', patch: { enabled: false } });
    expect(startWebhookToggleRequest(null, false, 'start-id')).toEqual({ type: 'none' });
  });
});
