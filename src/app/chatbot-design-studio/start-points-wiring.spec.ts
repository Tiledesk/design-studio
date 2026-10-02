import { of, Subject, throwError } from 'rxjs';
import { fakeAsync, tick as ngTick } from '@angular/core/testing';
import { ScheduledPanelModel, scheduledLoadOutcome, scheduledTestError, scheduledStatusLine, formatNextRun, timezoneList, SCHEDULED_SAVE_DEBOUNCE_MS } from './utils-scheduled-panel';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { SavingStateService } from 'src/app/services/saving-state.service';
import { IntentService } from './services/intent.service';
import { CdsIntentComponent } from './cds-dashboard/cds-canvas/cds-intent/cds-intent.component';
import { createStartPointBox, createStartPointBlock, buildStartPointItems, buildStartPointUpsertBody } from './utils-start-points';

const tick = () => new Promise(r => setTimeout(r, 0));

describe('start points wiring', () => {
  beforeAll(() => {
    LoggerInstance.setInstance({ log() {}, warn() {}, error() {}, debug() {}, info() {} } as any);
  });

  describe('IntentService start box save', () => {
    let faq: any;
    let service: IntentService;
    let createResponse: Subject<any>;

    beforeEach(() => {
      createResponse = new Subject<any>();
      faq = {
        addIntent: jasmine.createSpy('addIntent').and.callFake(() => createResponse),
        deleteFaq: jasmine.createSpy('deleteFaq').and.callFake(() => of({})),
        opsUpdate: jasmine.createSpy('opsUpdate').and.callFake(() => of({ success: true })),
      };
      const dashboard: any = { selectedChatbot: { subtype: 'chatbot' } };
      service = new IntentService(faq, null, null, null, null, dashboard, null, new SavingStateService());
    });

    it('the start point PUT is issued only after the POST /faq response resolves', async () => {
      const calls: string[] = [];
      const upsert = jasmine.createSpy('upsert').and.callFake(() => { calls.push('upsert'); return of({}); });
      const run = createStartPointBox({
        pending: { value: false },
        createBlock: (b) => { b.id_faq_kb = 'bot1'; calls.push('create'); return service.createIntentWithoutHistory(b); },
        deleteBlock: (b) => service.deleteSavedIntentWithoutHistory(b),
        upsert,
        confirmSwitch: async () => true,
        onError: () => calls.push('error'),
        onCreated: (b) => { calls.push('created'); service.addSavedIntentToListOfIntents(b); },
      }, 'webhook', { x: 0, y: 0 });

      await tick();
      await tick();
      expect(faq.addIntent).toHaveBeenCalledTimes(1);
      expect(upsert).not.toHaveBeenCalled();

      createResponse.next({ _id: 'f1', intent_id: faq.addIntent.calls.argsFor(0)[0].intent_id });
      createResponse.complete();
      expect(await run).toBe('created');
      expect(calls).toEqual(['create', 'upsert', 'created']);
      // a direct create, not ops_update, and nothing to undo
      expect(faq.opsUpdate).not.toHaveBeenCalled();
      expect(service.arrayUNDO.length).toBe(0);
      expect(service.listOfIntents.length).toBe(1);
      expect(service.prevListOfIntent.length).toBe(1);
    });

    it('createIntentWithoutHistory posts the marked block and leaves no undo entry', async () => {
      const block = createStartPointBlock('webhook', { x: 1, y: 2 });
      block.id_faq_kb = 'bot1';
      const done = service.createIntentWithoutHistory(block);
      createResponse.next({ _id: 'f1' });
      expect(await done).toEqual({ _id: 'f1' });
      const body = faq.addIntent.calls.argsFor(0)[0];
      expect(body.intent_id).toBe(block.intent_id);
      expect(body.attributes.start_point).toBe('webhook');
      expect(body.id_faq_kb).toBe('bot1');
      expect(service.arrayUNDO.length).toBe(0);
      expect(service.arrayREDO.length).toBe(0);
    });

    it('a failed create rejects, so no PUT follows', async () => {
      const upsert = jasmine.createSpy('upsert');
      const run = createStartPointBox({
        pending: { value: false },
        createBlock: (b) => service.createIntentWithoutHistory(b),
        deleteBlock: (b) => service.deleteSavedIntentWithoutHistory(b),
        upsert,
        confirmSwitch: async () => true,
        onError: () => {},
        onCreated: () => {},
      }, 'webhook', { x: 0, y: 0 });
      createResponse.error({ status: 500 });
      expect(await run).toBe('failed');
      expect(upsert).not.toHaveBeenCalled();
      expect(faq.deleteFaq).not.toHaveBeenCalled();
    });

    it('rollback is a direct DELETE by intent_id with no undo entry', async () => {
      const block = createStartPointBlock('webhook', { x: 1, y: 2 });
      block.id_faq_kb = 'bot1';
      await service.deleteSavedIntentWithoutHistory(block);
      expect(faq.deleteFaq).toHaveBeenCalledWith(undefined, block.intent_id, 'bot1');
      expect(faq.opsUpdate).not.toHaveBeenCalled();
      expect(service.arrayUNDO.length).toBe(0);
    });

    it('moveNewActionIntoIntent ignores a start point palette item', () => {
      const intent: any = { intent_id: 'i1', actions: [] };
      service.listOfIntents = [intent];
      expect(service.moveNewActionIntoIntent(0, { value: { type: 'webhook', start_point: 'webhook' } }, 'i1')).toBeNull();
      expect(intent.actions).toEqual([]);
      expect(faq.opsUpdate).not.toHaveBeenCalled();
    });
  });

  describe('CdsIntentComponent drop into a block', () => {
    const ctx = (over: any = {}) => ({ isDefaultFallbackLocked: false, isNewChatbot: false, intent: { intent_id: 'i1', actions: [] }, ...over });
    const predicate = (c: any) => CdsIntentComponent.prototype.canEnterDropList.call(c, c.intent);

    it('canEnterDropList rejects Start points palette items', () => {
      expect(predicate(ctx())({ data: { type: 'action', value: { type: 'webhook', start_point: 'webhook' } } } as any)).toBeFalse();
      expect(predicate(ctx())({ data: { type: 'action', value: { type: 'web', start_point: 'web' } } } as any)).toBeFalse();
    });

    it('canEnterDropList still accepts ordinary palette items and actions', () => {
      expect(predicate(ctx())({ data: { type: 'action', value: { type: 'reply' } } } as any)).toBeTrue();
      expect(predicate(ctx())({ data: undefined } as any)).toBeTrue();
      expect(predicate(ctx({ isDefaultFallbackLocked: true }))({ data: { value: { type: 'reply' } } } as any)).toBeFalse();
    });

    it('onDropAction never creates an action from a start point item', async () => {
      const intentService = jasmine.createSpyObj('intentService', ['setIntentSelected', 'moveNewActionIntoIntent', 'moveActionBetweenDifferentIntents', 'updateIntent']);
      const c: any = ctx({ intentService, controllerService: { closeAllPanels() {} }, connectorService: {}, logger: { log() {} } });
      const item = { type: 'action', value: { type: 'webhook', start_point: 'webhook' } };
      await CdsIntentComponent.prototype.onDropAction.call(c, { previousContainer: { data: [item] }, container: {}, previousIndex: 0, currentIndex: 0 } as any);
      expect(intentService.moveNewActionIntoIntent).not.toHaveBeenCalled();
      expect(intentService.updateIntent).not.toHaveBeenCalled();
    });
  });

  describe('scheduled start point', () => {
    it('the palette has no Scheduled item unless scheduled_available', () => {
      expect(buildStartPointItems(['web'], false).some(i => i.value.start_point === 'scheduled')).toBeFalse();
      expect(buildStartPointItems(['web'], false, false).some(i => i.value.start_point === 'scheduled')).toBeFalse();
      expect(buildStartPointItems(['web'], false, true).some(i => i.value.start_point === 'scheduled')).toBeTrue();
    });

    it('the scheduled drop PUT body carries the drop defaults', () => {
      const body = buildStartPointUpsertBody('scheduled', 'blk1', 'My bot', 'Europe/Rome', false);
      expect(body).toEqual({
        block_id: 'blk1', enabled: true,
        mapping: { source_name: 'My bot', payload: {} },
        schedule: { frequency: 'daily', time: '09:00', timezone: 'Europe/Rome' }
      });
      expect(buildStartPointUpsertBody('scheduled', 'blk1', 'My bot', 'Europe/Rome', true).confirm).toBeTrue();
    });

    it('the webhook drop body is unchanged', () => {
      expect(buildStartPointUpsertBody('webhook', 'b', 'Bot', 'x', false)).toEqual({ block_id: 'b', mapping: { source_name: 'Bot' } });
      expect(buildStartPointUpsertBody('webhook', 'b', undefined, 'x', true)).toEqual({ block_id: 'b', confirm: true });
    });
  });
});


describe('scheduled panel', () => {
  const sp = (over: any = {}) => ({
    type: 'scheduled', block_id: 'b1', enabled: true,
    mapping: { source_name: 'Bot', payload: { check: 'x' } },
    schedule: { frequency: 'daily', time: '09:00', timezone: 'Europe/Rome' }, ...over
  });
  const wh = (start: any, live?: any, extra: any = {}) => ({ start_points: start ? [start] : [], scheduled_live: live, ...extra });

  function make() {
    const upsert = jasmine.createSpy('upsert').and.callFake(() => of({}));
    const sync = jasmine.createSpy('sync').and.callFake(() => of({}));
    const refresh = jasmine.createSpy('refresh');
    const onError = jasmine.createSpy('onError');
    const model = new ScheduledPanelModel({ upsert, sync, refresh, onError }, 'b1', 'Europe/Rome');
    model.load(wh(sp()), 'Europe/Rome');
    return { model, upsert, sync, refresh, onError };
  }

  describe('status line', () => {
    it('live: summary and next run in the schedule timezone', () => {
      const live = sp();
      const l = scheduledStatusLine(wh(sp(), live, { next_runs: ['2026-10-06T06:30:00.000Z'] }), 'en-US');
      expect(l.status).toBe('live');
      expect(l.key).toBe('live');
      expect(l.params.summary).toBe('Daily at 09:00 (Europe/Rome)');
      expect(l.params.next).toContain('08:30'.replace('08', '08'));
    });
    it('formatNextRun converts an instant to the timezone; a wall-clock string is kept', () => {
      expect(formatNextRun('2026-10-06T06:30:00.000Z', 'Europe/Rome', 'en-US')).toContain('08:30');
      expect(formatNextRun('2026-10-06T06:30:00.000Z', 'America/New_York', 'en-US')).toContain('02:30');
      expect(formatNextRun('2026-10-06 08:30:00', 'Europe/Rome', 'en-US')).toContain('08:30');
    });
    it('live without next_runs (error preview): no next-run part', () => {
      const l = scheduledStatusLine(wh(sp(), sp()));
      expect(l.key).toBe('live_no_next');
      expect(l.params.next).toBeUndefined();
    });
    it('not_live, changes and error', () => {
      expect(scheduledStatusLine(wh(sp(), undefined)).key).toBe('not_live');
      expect(scheduledStatusLine(wh(sp(), sp({ schedule: { frequency: 'daily', time: '10:00', timezone: 'Europe/Rome' } }))).key).toBe('changes');
      expect(scheduledStatusLine(wh(sp(), { error: 'x' })).key).toBe('error');
    });
    it('draft equal to live except payload key order is live', () => {
      const a = sp({ mapping: { source_name: 'Bot', payload: { a: 1, b: 2 } } });
      const b = sp({ mapping: { source_name: 'Bot', payload: { b: 2, a: 1 } } });
      expect(scheduledStatusLine(wh(a, b, { next_runs: [] })).status).toBe('live');
    });
  });

  describe('timezoneList', () => {
    it('always has UTC, the browser and the current zone', () => {
      const names = timezoneList('Mars/Base', 'Europe/Rome').map(z => z.value);
      expect(names).toContain('UTC');
      expect(names).toContain('Europe/Rome');
      expect(names).toContain('Mars/Base');
    });
  });

  describe('saving', () => {
    it('several quick edits send one PUT after 600 ms', fakeAsync(() => {
      const { model, upsert, refresh } = make();
      ['1', '10', '10:', '10:3', '10:30'].forEach(t => { model.setTime(t.length === 5 ? t : '09:00'); ngTick(100); });
      expect(upsert).not.toHaveBeenCalled();
      ngTick(SCHEDULED_SAVE_DEBOUNCE_MS);
      expect(upsert).toHaveBeenCalledTimes(1);
      expect(upsert.calls.argsFor(0)[0].schedule.time).toBe('10:30');
      expect(refresh).toHaveBeenCalledTimes(1);
    }));

    it('an invalid schedule is flagged and never sent', fakeAsync(() => {
      const { model, upsert } = make();
      model.setTime('1');
      ngTick(2000);
      expect(upsert).not.toHaveBeenCalled();
      expect(model.scheduleErrorText).toBe('schedule.time must be in the format HH:MM');
    }));

    it('an invalid payload is flagged and never sent', fakeAsync(() => {
      const { model, upsert } = make();
      model.addRow();
      ngTick(2000);
      expect(upsert).not.toHaveBeenCalled();
      expect(model.payloadErrorText).toContain('invalid');
    }));

    it('Weekly -> Daily -> Weekly: no weekdays sent while Daily; Weekly with none is never sent', fakeAsync(() => {
      const { model, upsert } = make();
      model.setRepeat('weekly');
      ngTick(700);
      expect(upsert.calls.argsFor(0)[0].schedule.weekdays).toEqual(['mon', 'tue', 'wed', 'thu', 'fri']);
      model.setRepeat('daily');
      ngTick(700);
      expect(upsert.calls.argsFor(1)[0].schedule.weekdays).toBeUndefined();
      model.setRepeat('weekly');
      ['mon', 'tue', 'wed', 'thu', 'fri'].forEach(d => model.toggleWeekday(d as any));
      ngTick(700);
      expect(upsert).toHaveBeenCalledTimes(2);
      expect(model.scheduleErrorText).toContain('weekdays');
    }));

    it('number "08" and a boolean are sent typed, in row order', fakeAsync(() => {
      const { model, upsert } = make();
      model.rows = [{ name: 'n', type: 'number', value: '08' }, { name: 'ok', type: 'boolean', value: true }, { name: 't', type: 'text', value: 'x' }];
      model.rowsEdited();
      ngTick(700);
      const payload = upsert.calls.argsFor(0)[0].mapping.payload;
      expect(payload).toEqual({ n: 8, ok: true, t: 'x' });
      expect(Object.keys(payload)).toEqual(['n', 'ok', 't']);
    }));

    it('reloading shows the same rows in the same order', () => {
      const { model } = make();
      model.load(wh(sp({ mapping: { source_name: 'Bot', payload: { n: 8, ok: true, t: 'x' } } })), 'UTC');
      expect(model.rows.map(r => [r.name, r.type, r.value])).toEqual([['n', 'number', '8'], ['ok', 'boolean', true], ['t', 'text', 'x']]);
    });

    it('an edit during an in-flight PUT is sent after it', fakeAsync(() => {
      const first = new Subject<any>();
      const { model, upsert } = make();
      upsert.and.returnValues(first, of({}));
      model.setEnabled(false);
      ngTick(700);
      model.setEnabled(true);
      ngTick(700);
      expect(upsert).toHaveBeenCalledTimes(1);
      first.next({}); first.complete();
      expect(upsert).toHaveBeenCalledTimes(2);
      expect(upsert.calls.argsFor(1)[0].enabled).toBeTrue();
    }));

    it('a failed PUT reports the error', fakeAsync(() => {
      const { model, upsert, onError, refresh } = make();
      upsert.and.returnValue(throwError(() => ({ status: 400 })));
      model.setEnabled(false);
      ngTick(700);
      expect(onError).toHaveBeenCalled();
      expect(refresh).not.toHaveBeenCalled();
    }));
  });

  it('Retry syncs then reloads', () => {
    const { model, sync, refresh } = make();
    model.retrySync();
    expect(sync).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  describe('load, errors and test', () => {
    it('GET 503 -> unavailable with the server message, or the default one', () => {
      expect(scheduledLoadOutcome({ status: 503, error: { error: 'Scheduled starts are not available on this installation' } }))
        .toEqual({ state: 'unavailable', message: 'Scheduled starts are not available on this installation' });
      expect(scheduledLoadOutcome({ status: 503 })).toEqual({ state: 'unavailable', message: 'Scheduled starts are not available on this installation' });
      expect(scheduledLoadOutcome({ status: 404 })).toEqual({ state: 'no_webhook' });
      expect(scheduledLoadOutcome({ status: 500 })).toEqual({ state: 'error' });
    });

    it('invalid fields show the scheduleError / payload message on the model', fakeAsync(() => {
      const { model } = make();
      model.setRepeat('monthly');
      model.setDayOfMonth(31);
      expect(model.scheduleErrorText).toBe("schedule.day_of_month must be an integer between 1 and 28 or 'last'");
      model.setDayOfMonth(5);
      expect(model.scheduleErrorText).toBeNull();
      model.addRow();
      expect(model.payloadErrorText).toContain('invalid');
      ngTick(2000);
    }));

    it('test error toast: 404 key, 503 message, server message, generic key', () => {
      expect(scheduledTestError({ status: 404 })).toEqual({ key: 'CDSCanvas.ScheduledPanel.TestNoDraft' });
      expect(scheduledTestError({ status: 503, error: { error: 'nope' } })).toEqual({ message: 'nope' });
      expect(scheduledTestError({ status: 503 }).message).toBe('Scheduled starts are not available on this installation');
      expect(scheduledTestError({ status: 400, error: { error: 'bad' } })).toEqual({ message: 'bad' });
      expect(scheduledTestError(null)).toEqual({ key: 'CDSCanvas.ScheduledPanel.TestFailed' });
    });

    it('flushAndWait resolves true after a successful save and false after a failed one', fakeAsync(() => {
      const { model, upsert } = make();
      let result: boolean;
      model.setEnabled(false);
      model.flushAndWait().then(r => result = r);
      ngTick(0);
      expect(result).toBeTrue();
      upsert.and.returnValue(throwError(() => ({ status: 500 })));
      model.setEnabled(true);
      model.flushAndWait().then(r => result = r);
      ngTick(0);
      expect(result).toBeFalse();
      // nothing pending but the last save failed: still stale
      model.flushAndWait().then(r => result = r);
      ngTick(0);
      expect(result).toBeFalse();
    }));

    it('retrySync ignores clicks while a sync is running', () => {
      const pending = new Subject<any>();
      const { model, sync, refresh } = make();
      sync.and.returnValue(pending);
      model.retrySync();
      model.retrySync();
      expect(sync).toHaveBeenCalledTimes(1);
      pending.next({}); pending.complete();
      expect(refresh).toHaveBeenCalledTimes(1);
      model.retrySync();
      expect(sync).toHaveBeenCalledTimes(2);
    });
  });
});
