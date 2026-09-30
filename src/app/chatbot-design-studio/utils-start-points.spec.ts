import { presentStartPointTypes, startPointTypeOf, isWebhookStartPointActive } from './utils-start-points';

describe('utils-start-points', () => {
  const start = { intent_id: 's', intent_display_name: 'start' };
  const marked = { intent_id: 'b1', intent_display_name: 'Webhook start', attributes: { start_point: 'webhook' } };
  const plain = { intent_id: 'b2', intent_display_name: 'Webhook start' };

  it('startPointTypeOf identifies by name for web and by marker otherwise', () => {
    expect(startPointTypeOf(start)).toBe('web');
    expect(startPointTypeOf(marked)).toBe('webhook');
    expect(startPointTypeOf(plain)).toBeNull();
    expect(startPointTypeOf({ intent_id: 'x', intent_display_name: 'x', attributes: { start_point: 'other' } })).toBeNull();
  });

  it('presentStartPointTypes without webhook is web only', () => {
    expect(presentStartPointTypes([start, marked], null)).toEqual(['web']);
    expect(presentStartPointTypes([start, marked], { webhook_id: 'w' })).toEqual(['web']);
  });

  it('presentStartPointTypes with start point and marker block has both', () => {
    const wh = { start_points: { webhook: { block_id: 'b1' } } };
    expect(presentStartPointTypes([start, marked], wh)).toEqual(['web', 'webhook']);
  });

  it('presentStartPointTypes ignores a start point whose block is missing or unmarked', () => {
    const wh = { start_points: { webhook: { block_id: 'b1' } } };
    expect(presentStartPointTypes([start], wh)).toEqual(['web']);
    expect(presentStartPointTypes([start, { intent_id: 'b1', intent_display_name: 'x' }], wh)).toEqual(['web']);
  });

  it('isWebhookStartPointActive requires an enabled webhook start point', () => {
    expect(isWebhookStartPointActive(null)).toBeFalse();
    expect(isWebhookStartPointActive({ webhook_id: 'w' })).toBeFalse();
    expect(isWebhookStartPointActive({ webhook_id: 'w', start_points: { webhook: { block_id: 'b' } } })).toBeTrue();
    expect(isWebhookStartPointActive({ webhook_id: 'w', start_points: { webhook: { block_id: 'b', enabled: false } } })).toBeFalse();
  });
});
