import { of, throwError } from 'rxjs';
import { findStartPoint, presentStartPointTypes, startPointTypeOf, isWebhookStartPointActive, createStartPointBlock, buildStartPointItems, createStartPointBox, startPointPanelState, startPointLabelKey } from './utils-start-points';

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
    const wh = { start_points: [{ type: 'webhook', block_id: 'b1' }] };
    expect(presentStartPointTypes([start, marked], wh)).toEqual(['web', 'webhook']);
  });

  it('presentStartPointTypes ignores a start point whose block is missing or unmarked', () => {
    const wh = { start_points: [{ type: 'webhook', block_id: 'b1' }] };
    expect(presentStartPointTypes([start], wh)).toEqual(['web']);
    expect(presentStartPointTypes([start, { intent_id: 'b1', intent_display_name: 'x' }], wh)).toEqual(['web']);
  });

  it('isWebhookStartPointActive requires an enabled webhook start point', () => {
    expect(isWebhookStartPointActive(null)).toBeFalse();
    expect(isWebhookStartPointActive({ webhook_id: 'w' })).toBeFalse();
    expect(isWebhookStartPointActive({ webhook_id: 'w', start_points: [{ type: 'webhook', block_id: 'b' }] })).toBeTrue();
    expect(isWebhookStartPointActive({ webhook_id: 'w', start_points: [{ type: 'webhook', block_id: 'b', enabled: false }] })).toBeFalse();
  });

  it('createStartPointBlock builds the readonly marker block', () => {
    const b = createStartPointBlock('webhook', { x: 10, y: 20 });
    expect(b.intent_display_name).toBe('Webhook start');
    expect(b.attributes.start_point).toBe('webhook');
    expect(b.attributes.position).toEqual({ x: 10, y: 20 });
    expect(b.attributes.readonly).toBe(true);
    expect(b.actions.length).toBe(1);
    expect((b.actions[0] as any)._tdActionType).toBe('intent');
    expect((b.actions[0] as any).intentName).toBe('');
    expect((b.actions[0] as any)._tdActionId).toBeTruthy();
    expect(startPointTypeOf(b)).toBe('webhook');
  });

  describe('buildStartPointItems', () => {
    it('web is always disabled; webhook enabled when absent', () => {
      const items = buildStartPointItems(['web'], false);
      expect(items.map(i => i.value.start_point)).toEqual(['web', 'webhook']);
      expect(items[0].value.disabled).toBe(true);
      expect(items[1].value.disabled).toBe(false);
      expect(items[1].value.tooltip).toBeFalsy();
    });
    it('webhook disabled with tooltip when present', () => {
      const items = buildStartPointItems(['web', 'webhook'], false);
      expect(items[1].value.disabled).toBe(true);
      expect(items[1].value.tooltip).toBe('CDSCanvas.StartPointPresent');
    });
    it('webhook disabled while a create is pending, without the present tooltip', () => {
      const items = buildStartPointItems(['web'], true);
      expect(items[1].value.disabled).toBe(true);
      expect(items[1].value.tooltip).toBeFalsy();
    });
  });

  describe('createStartPointBox', () => {
    let calls: string[];
    let deps: any;
    const flag = () => ({ value: false });
    beforeEach(() => {
      calls = [];
      deps = {
        pending: flag(),
        saveBlock: async (b) => { calls.push('save'); },
        removeBlock: async (b) => { calls.push('remove'); },
        upsert: (b, confirm) => { calls.push('upsert' + (confirm ? ':confirm' : '')); return of({}); },
        confirmSwitch: async () => { calls.push('ask'); return true; },
        onError: () => { calls.push('error'); },
        onCreated: () => { calls.push('created'); },
      };
    });

    it('saves the block then upserts', async () => {
      expect(await createStartPointBox(deps, 'webhook', { x: 1, y: 2 })).toBe('created');
      expect(calls).toEqual(['save', 'upsert', 'created']);
      expect(deps.pending.value).toBe(false);
    });

    it('a second call while pending creates nothing', async () => {
      let release;
      deps.saveBlock = (b) => { calls.push('save'); return new Promise<void>(r => release = r); };
      const first = createStartPointBox(deps, 'webhook', { x: 1, y: 2 });
      expect(await createStartPointBox(deps, 'webhook', { x: 3, y: 4 })).toBe('busy');
      release();
      await first;
      expect(calls.filter(c => c === 'save').length).toBe(1);
      expect(calls.filter(c => c === 'upsert').length).toBe(1);
    });

    it('stays pending until onCreated finishes, so a drop meanwhile does nothing', async () => {
      let release;
      deps.onCreated = () => new Promise<void>(r => release = r);
      const first = createStartPointBox(deps, 'webhook', { x: 1, y: 2 });
      await new Promise(r => setTimeout(r, 0));
      expect(deps.pending.value).toBe(true);
      expect(await createStartPointBox(deps, 'webhook', { x: 3, y: 4 })).toBe('busy');
      release();
      expect(await first).toBe('created');
      expect(deps.pending.value).toBe(false);
    });

    it('a failed PUT removes the block again and reports the error', async () => {
      deps.upsert = () => { calls.push('upsert'); return throwError({ status: 500 }); };
      expect(await createStartPointBox(deps, 'webhook', { x: 1, y: 2 })).toBe('failed');
      expect(calls).toEqual(['save', 'upsert', 'remove', 'error']);
      expect(deps.pending.value).toBe(false);
    });

    it('a failed save removes the block and reports the error without a PUT', async () => {
      deps.saveBlock = async () => { calls.push('save'); throw false; };
      expect(await createStartPointBox(deps, 'webhook', { x: 1, y: 2 })).toBe('failed');
      expect(calls).toEqual(['save', 'remove', 'error']);
    });

    it('409 asks for confirmation and retries with confirm', async () => {
      let n = 0;
      deps.upsert = (b, confirm) => { calls.push('upsert' + (confirm ? ':confirm' : '')); return n++ === 0 ? throwError({ status: 409 }) : of({}); };
      expect(await createStartPointBox(deps, 'webhook', { x: 1, y: 2 })).toBe('created');
      expect(calls).toEqual(['save', 'upsert', 'ask', 'upsert:confirm', 'created']);
    });

    it('409 declined removes the block silently', async () => {
      deps.upsert = () => { calls.push('upsert'); return throwError({ status: 409 }); };
      deps.confirmSwitch = async () => { calls.push('ask'); return false; };
      expect(await createStartPointBox(deps, 'webhook', { x: 1, y: 2 })).toBe('cancelled');
      expect(calls).toEqual(['save', 'upsert', 'ask', 'remove']);
    });

    it('a failure of the confirmed retry removes the block and reports the error', async () => {
      deps.upsert = (b, confirm) => { calls.push('upsert' + (confirm ? ':confirm' : '')); return throwError({ status: confirm ? 500 : 409 }); };
      expect(await createStartPointBox(deps, 'webhook', { x: 1, y: 2 })).toBe('failed');
      expect(calls).toEqual(['save', 'upsert', 'ask', 'upsert:confirm', 'remove', 'error']);
    });
  });
  describe('start boxes', () => {
    it('a renamed marker block is still a start box; an unmarked block named Webhook start is not', () => {
      expect(startPointTypeOf({ intent_id: 'b1', intent_display_name: 'My entry', attributes: { start_point: 'webhook' } })).toBe('webhook');
      expect(startPointTypeOf(plain)).toBeNull();
    });

    it('startPointLabelKey gives Web start for start and Webhook start for the marker block', () => {
      expect(startPointLabelKey(start)).toBe('CDSCanvas.WebStart');
      expect(startPointLabelKey(marked)).toBe('CDSCanvas.WebhookStart');
      expect(startPointLabelKey(plain)).toBeNull();
      expect(startPointLabelKey(null)).toBeNull();
    });
  });

  describe('startPointPanelState', () => {
    const block = { intent_id: 'b1' };
    it('enabled with source name and urls', () => {
      const wh = { webhook_id: 'w1', start_points: [{ type: 'webhook', block_id: 'b1', enabled: true, mapping: { source_name: 'crm' } }] };
      expect(startPointPanelState(wh, block, 'https://api/')).toEqual({ enabled: true, sourceName: 'crm', url: 'https://api/webhook/w1', devUrl: 'https://api/webhook/w1/dev' });
    });
    it('enabled defaults to true when the flag is missing, false when disabled', () => {
      expect(startPointPanelState({ webhook_id: 'w1', start_points: [{ type: 'webhook', block_id: 'b1' }] }, block, 'u/').enabled).toBeTrue();
      expect(startPointPanelState({ webhook_id: 'w1', start_points: [{ type: 'webhook', block_id: 'b1', enabled: false }] }, block, 'u/').enabled).toBeFalse();
    });
    it('absent start point, another block or no webhook is disabled with empty source name', () => {
      expect(startPointPanelState({ webhook_id: 'w1' }, block, 'u/')).toEqual({ enabled: false, sourceName: '', url: 'u/webhook/w1', devUrl: 'u/webhook/w1/dev' });
      expect(startPointPanelState({ webhook_id: 'w1', start_points: [{ type: 'webhook', block_id: 'other' }] }, block, 'u/').enabled).toBeFalse();
      expect(startPointPanelState(null, block, 'u/')).toEqual({ enabled: false, sourceName: '', url: '', devUrl: '' });
    });
  });

  it('reads the literal server response shape (start_points array)', () => {
    const serverResponse = {
      webhook_id: 'w9', id_project: 'p', chatbot_id: 'c',
      start_points: [{ type: 'webhook', block_id: 'b1', enabled: true, mapping: { source_name: 'crm' } }]
    };
    expect(findStartPoint(serverResponse, 'webhook').block_id).toBe('b1');
    expect(findStartPoint(serverResponse, 'other')).toBeUndefined();
    expect(findStartPoint({ start_points: { webhook: { block_id: 'x' } } }, 'webhook')).toBeUndefined();
    expect(presentStartPointTypes([start, marked], serverResponse)).toEqual(['web', 'webhook']);
    expect(isWebhookStartPointActive(serverResponse)).toBeTrue();
    expect(startPointPanelState(serverResponse, { intent_id: 'b1' }, 'u/')).toEqual({ enabled: true, sourceName: 'crm', url: 'u/webhook/w9', devUrl: 'u/webhook/w9/dev' });
  });
});
