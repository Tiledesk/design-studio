import { of, throwError, Subject, lastValueFrom } from 'rxjs';
import { START_POINT_TYPES, isStartBox, findStartPoint, presentStartPointTypes, isStartPointPaletteItem, startPointTypeOf, isWebhookStartPointActive, createStartPointBlock, buildStartPointItems, createStartPointBox, startPointPanelState, startPointLabelKey, supportsStartPoints, defaultEntryIntent, listedIntents } from './utils-start-points';

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

  it('presentStartPointTypes: web always; webhook when a block carries the marker, with or without the server start point', () => {
    expect(presentStartPointTypes([start])).toEqual(['web']);
    expect(presentStartPointTypes(null)).toEqual(['web']);
    // marker block ⇒ present (imported, forked or redone box without a start point: recovered from its panel)
    expect(presentStartPointTypes([start, marked])).toEqual(['web', 'webhook']);
    expect(presentStartPointTypes([marked, { ...marked, intent_id: 'b3' }])).toEqual(['web', 'webhook']);
  });

  it('presentStartPointTypes drops web while the start block has web_start_disabled', () => {
    const disabled = { intent_id: 's', intent_display_name: 'start', attributes: { web_start_disabled: true } };
    expect(presentStartPointTypes([disabled])).toEqual([]);
    expect(presentStartPointTypes([disabled, marked])).toEqual(['webhook']);
    expect(presentStartPointTypes([start])).toEqual(['web']);
  });

  it('buildStartPointItems offers Web start only when it is not present', () => {
    const web = (present: string[]) => buildStartPointItems(present, false).find(i => i.value.start_point === 'web');
    expect(web(['web']).value.disabled).toBe(true);
    expect(web([]).value.disabled).toBe(false);
    expect(web([]).value.tooltip).toBe('');
    expect(buildStartPointItems([], true).find(i => i.value.start_point === 'web').value.disabled).toBe(true);
  });

  it('presentStartPointTypes ignores unmarked blocks, even named Webhook start', () => {
    expect(presentStartPointTypes([start, plain])).toEqual(['web']);
    expect(presentStartPointTypes([start, { intent_id: 'b1', intent_display_name: 'x', attributes: { start_point: 'other' } }])).toEqual(['web']);
  });

  it('isStartPointPaletteItem recognises Start points palette items only', () => {
    expect(isStartPointPaletteItem({ value: { type: 'webhook', start_point: 'webhook' } })).toBeTrue();
    expect(isStartPointPaletteItem({ value: { type: 'reply' } })).toBeFalse();
    expect(isStartPointPaletteItem({ _tdActionType: 'reply' })).toBeFalse();
    expect(isStartPointPaletteItem(undefined)).toBeFalse();
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

  describe('scheduled start point', () => {
    const sched = { intent_id: 's1', intent_display_name: 'Scheduled start', attributes: { start_point: 'scheduled' } };
    it('marker detection and presence', () => {
      expect(startPointTypeOf(sched)).toBe('scheduled');
      expect(isStartBox(sched)).toBeTrue();
      expect(presentStartPointTypes([start, sched])).toEqual(['web', 'scheduled']);
      expect(START_POINT_TYPES).toEqual(['web', 'webhook', 'scheduled']);
    });
    it('block factory', () => {
      const b = createStartPointBlock('scheduled', { x: 1, y: 2 });
      expect(b.intent_display_name).toBe('Scheduled start');
      expect(b.attributes.start_point).toBe('scheduled');
      expect(b.attributes.readonly).toBe(true);
      expect(startPointTypeOf(b)).toBe('scheduled');
      expect(createStartPointBlock('webhook', { x: 0, y: 0 }).intent_display_name).toBe('Webhook start');
    });
    it('palette item hidden unless available, disabled when present', () => {
      expect(buildStartPointItems(['web'], false).map(i => i.value.start_point)).toEqual(['web', 'webhook']);
      expect(buildStartPointItems(['web'], false, false).length).toBe(2);
      const items = buildStartPointItems(['web'], false, true);
      expect(items.map(i => i.value.start_point)).toEqual(['web', 'webhook', 'scheduled']);
      expect(items[2].value.name).toBe('CDSActionList.NAME.StartPointScheduled');
      expect(items[2].value.disabled).toBe(false);
      const present = buildStartPointItems(['web', 'scheduled'], false, true);
      expect(present[2].value.disabled).toBe(true);
      expect(present[2].value.tooltip).toBe('CDSCanvas.StartPointPresent');
      expect(buildStartPointItems(['web'], true, true)[2].value.disabled).toBe(true);
    });
    it('createStartPointBox accepts the scheduled type', async () => {
      const calls: any[] = [];
      const r = await createStartPointBox({
        pending: { value: false },
        createBlock: async b => { calls.push(b.intent_display_name); },
        deleteBlock: async () => {},
        upsert: () => of({}),
        confirmSwitch: async () => true,
        onError: () => {},
        onCreated: () => {},
      }, 'scheduled', { x: 1, y: 2 });
      expect(r).toBe('created');
      expect(calls).toEqual(['Scheduled start']);
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
        createBlock: async (b) => { calls.push('create'); },
        deleteBlock: async (b) => { calls.push('delete'); },
        upsert: (b, confirm) => { calls.push('upsert' + (confirm ? ':confirm' : '')); return of({}); },
        confirmSwitch: async () => { calls.push('ask'); return true; },
        onError: () => { calls.push('error'); },
        onCreated: () => { calls.push('created'); },
      };
    });

    it('creates the block, then upserts, then hands it to the canvas', async () => {
      expect(await createStartPointBox(deps, 'webhook', { x: 1, y: 2 })).toBe('created');
      expect(calls).toEqual(['create', 'upsert', 'created']);
      expect(deps.pending.value).toBe(false);
    });

    it('issues the PUT only after the create response resolves', async () => {
      const createResponse = new Subject<any>();
      deps.createBlock = (b) => { calls.push('create'); return lastValueFrom(createResponse); };
      const run = createStartPointBox(deps, 'webhook', { x: 1, y: 2 });
      await new Promise(r => setTimeout(r, 0));
      await new Promise(r => setTimeout(r, 0));
      expect(calls).toEqual(['create']);
      createResponse.next({ _id: 'f1' });
      await new Promise(r => setTimeout(r, 0));
      expect(calls).toEqual(['create']);
      createResponse.complete();
      expect(await run).toBe('created');
      expect(calls).toEqual(['create', 'upsert', 'created']);
    });

    it('a second call while pending creates nothing', async () => {
      let release;
      deps.createBlock = (b) => { calls.push('create'); return new Promise<void>(r => release = r); };
      const first = createStartPointBox(deps, 'webhook', { x: 1, y: 2 });
      expect(await createStartPointBox(deps, 'webhook', { x: 3, y: 4 })).toBe('busy');
      release();
      await first;
      expect(calls.filter(c => c === 'create').length).toBe(1);
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

    it('a failed PUT deletes the saved block (awaited) before reporting, and never reaches the canvas', async () => {
      let releaseDelete;
      deps.upsert = () => { calls.push('upsert'); return throwError({ status: 404 }); };
      deps.deleteBlock = () => { calls.push('delete'); return new Promise<void>(r => releaseDelete = r); };
      const run = createStartPointBox(deps, 'webhook', { x: 1, y: 2 });
      await new Promise(r => setTimeout(r, 0));
      expect(calls).toEqual(['create', 'upsert', 'delete']);
      releaseDelete();
      expect(await run).toBe('failed');
      expect(calls).toEqual(['create', 'upsert', 'delete', 'error']);
      expect(deps.pending.value).toBe(false);
    });

    it('a failed create reports the error without a PUT, a delete or the canvas', async () => {
      deps.createBlock = async () => { calls.push('create'); throw { status: 500 }; };
      expect(await createStartPointBox(deps, 'webhook', { x: 1, y: 2 })).toBe('failed');
      expect(calls).toEqual(['create', 'error']);
    });

    it('a failed rollback delete still reports the original failure', async () => {
      deps.upsert = () => { calls.push('upsert'); return throwError({ status: 500 }); };
      deps.deleteBlock = async () => { calls.push('delete'); throw { status: 500 }; };
      expect(await createStartPointBox(deps, 'webhook', { x: 1, y: 2 })).toBe('failed');
      expect(calls).toEqual(['create', 'upsert', 'delete', 'error']);
    });

    it('409 asks for confirmation and retries with confirm', async () => {
      let n = 0;
      deps.upsert = (b, confirm) => { calls.push('upsert' + (confirm ? ':confirm' : '')); return n++ === 0 ? throwError({ status: 409 }) : of({}); };
      expect(await createStartPointBox(deps, 'webhook', { x: 1, y: 2 })).toBe('created');
      expect(calls).toEqual(['create', 'upsert', 'ask', 'upsert:confirm', 'created']);
    });

    it('409 declined deletes the block silently', async () => {
      deps.upsert = () => { calls.push('upsert'); return throwError({ status: 409 }); };
      deps.confirmSwitch = async () => { calls.push('ask'); return false; };
      expect(await createStartPointBox(deps, 'webhook', { x: 1, y: 2 })).toBe('cancelled');
      expect(calls).toEqual(['create', 'upsert', 'ask', 'delete']);
    });

    it('a failure of the confirmed retry deletes the block and reports the error', async () => {
      deps.upsert = (b, confirm) => { calls.push('upsert' + (confirm ? ':confirm' : '')); return throwError({ status: confirm ? 500 : 409 }); };
      expect(await createStartPointBox(deps, 'webhook', { x: 1, y: 2 })).toBe('failed');
      expect(calls).toEqual(['create', 'upsert', 'ask', 'upsert:confirm', 'delete', 'error']);
    });
  });
  describe('start boxes', () => {
    it('a renamed marker block is still a start box; an unmarked block named Webhook start is not', () => {
      expect(startPointTypeOf({ intent_id: 'b1', intent_display_name: 'My entry', attributes: { start_point: 'webhook' } })).toBe('webhook');
      expect(startPointTypeOf(plain)).toBeNull();
    });

    it('startPointLabelKey gives Web start for start and Webhook start for the marker block', () => {
      expect(startPointLabelKey(start)).toBe('CDSCanvas.WebStart');
      expect(startPointLabelKey(start, 'chatbot')).toBe('CDSCanvas.WebStart');
      expect(startPointLabelKey(start, undefined)).toBe('CDSCanvas.WebStart');
      expect(startPointLabelKey(marked)).toBe('CDSCanvas.WebhookStart');
      expect(startPointLabelKey(plain)).toBeNull();
      expect(startPointLabelKey(null)).toBeNull();
    });

    it('startPointLabelKey keeps the block name (null) for the start block of other subtypes', () => {
      ['voice', 'voice_twilio', 'webhook', 'copilot'].forEach(st => expect(startPointLabelKey(start, st)).toBeNull());
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
    expect(presentStartPointTypes([start, marked])).toEqual(['web', 'webhook']);
    expect(isWebhookStartPointActive(serverResponse)).toBeTrue();
    expect(startPointPanelState(serverResponse, { intent_id: 'b1' }, 'u/')).toEqual({ enabled: true, sourceName: 'crm', url: 'u/webhook/w9', devUrl: 'u/webhook/w9/dev' });
  });

  describe('start points only on subtype chatbot', () => {
    it('supportsStartPoints is true for chatbot and a missing subtype, false for any other subtype', () => {
      expect(supportsStartPoints('chatbot')).toBeTrue();
      expect(supportsStartPoints(undefined)).toBeTrue();
      expect(supportsStartPoints(null)).toBeTrue();
      expect(supportsStartPoints('')).toBeTrue();
      expect(supportsStartPoints('voice')).toBeFalse();
      expect(supportsStartPoints('subagent')).toBeFalse();
      expect(supportsStartPoints('webhook')).toBeFalse();
      expect(supportsStartPoints('copilot')).toBeFalse();
    });
  });

  describe('a disabled Web start drives no selection or list', () => {
    const hidden = { intent_id: 's', intent_display_name: 'start', attributes: { web_start_disabled: true } };
    const scheduled = { intent_id: 'sc', intent_display_name: 'Scheduled start', attributes: { start_point: 'scheduled' } };
    const block = { intent_id: 'b', intent_display_name: 'welcome', attributes: {} };

    it('defaultEntryIntent is the start block while Web start is on', () => {
      expect(defaultEntryIntent([block, scheduled, start])).toBe(start);
    });

    it('defaultEntryIntent is the first visible start box when Web start is off', () => {
      expect(defaultEntryIntent([block, hidden, scheduled, marked])).toBe(scheduled);
    });

    it('defaultEntryIntent falls back to the first block, never the hidden start', () => {
      expect(defaultEntryIntent([hidden, block])).toBe(block);
      expect(defaultEntryIntent([hidden])).toBeUndefined();
      expect(defaultEntryIntent([])).toBeUndefined();
      // no start block at all (a webhook/copilot flow's entry is its own): the caller keeps its choice
      expect(defaultEntryIntent([block, scheduled])).toBeUndefined();
      expect(defaultEntryIntent(null)).toBeUndefined();
    });

    it('listedIntents drops only the disabled start', () => {
      expect(listedIntents([hidden, block, scheduled])).toEqual([block, scheduled]);
      expect(listedIntents([start, block])).toEqual([start, block]);
    });
  });
});
