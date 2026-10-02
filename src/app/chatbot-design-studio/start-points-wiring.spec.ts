import { of, Subject, throwError } from 'rxjs';
import { fakeAsync, tick as ngTick } from '@angular/core/testing';
import { ScheduledPanelModel, scheduledLoadOutcome, scheduledLoadedOutcome, scheduledTestError, scheduledStatusLine, scheduledBoxView, startPointDeleteOutcome, formatNextRun, timezoneList, SCHEDULED_SAVE_DEBOUNCE_MS, SCHEDULED_UNAVAILABLE_MESSAGE } from './utils-scheduled-panel';
import { CdsPanelPublishComponent } from './cds-dashboard/cds-canvas/cds-panel-publish/cds-panel-publish.component';
import { CdsPublishHistoryComponent } from './cds-publish-history/cds-publish-history.component';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { SavingStateService } from 'src/app/services/saving-state.service';
import { ReadOnlyService } from 'src/app/services/read-only.service';
import { IntentService } from './services/intent.service';
import { CdsIntentComponent } from './cds-dashboard/cds-canvas/cds-intent/cds-intent.component';
import { CdsPanelIntentDetailComponent } from './cds-dashboard/cds-canvas/cds-panel-intent-detail/cds-panel-intent-detail.component';
import { FlowOpsService } from './agent-chat/flow-ops.service';
import { createStartPointBox, createStartPointBlock, buildStartPointItems, buildStartPointUpsertBody, startPointErrorKey, isLiveStartBox, shouldDeleteWebhookPreload } from './utils-start-points';

const tick = () => new Promise(r => setTimeout(r, 0));

describe('start points wiring', () => {
  beforeAll(() => {
    LoggerInstance.setInstance({ log() {}, warn() {}, error() {}, debug() {}, info() {} } as any);
  });

  describe('IntentService start box save', () => {
    let faq: any;
    let service: IntentService;
    let createResponse: Subject<any>;
    let readOnly: ReadOnlyService;

    beforeEach(() => {
      createResponse = new Subject<any>();
      faq = {
        addIntent: jasmine.createSpy('addIntent').and.callFake(() => createResponse),
        deleteFaq: jasmine.createSpy('deleteFaq').and.callFake(() => of({})),
        opsUpdate: jasmine.createSpy('opsUpdate').and.callFake(() => of({ success: true })),
      };
      const dashboard: any = { selectedChatbot: { subtype: 'chatbot' } };
      readOnly = new ReadOnlyService();
      service = new IntentService(faq, null, null, null, null, dashboard, null, null, new SavingStateService(), readOnly);
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

    it('read-only mode: no start box POST, the create rejects so no PUT follows; the rollback DELETE is skipped too', async () => {
      readOnly.enable();
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
      expect(await run).toBe('failed');
      expect(faq.addIntent).not.toHaveBeenCalled();
      expect(upsert).not.toHaveBeenCalled();
      expect(await service.deleteSavedIntentWithoutHistory(createStartPointBlock('webhook', { x: 0, y: 0 }))).toBeNull();
      expect(faq.deleteFaq).not.toHaveBeenCalled();
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
    const ctx = (over: any = {}) => ({ isDefaultFallbackLocked: false, isV3: false, intent: { intent_id: 'i1', actions: [] }, ...over });
    // master-pre: the enter predicate is the arrow property dropListEnterPredicate, bound to the instance
    const predicate = (c: any) => {
      spyOn(CdsIntentComponent.prototype, 'initSubscriptions').and.stub();
      const component: any = new (CdsIntentComponent as any)(null, null, null, null, null, null, null, null, null, null, null);
      const { isDefaultFallbackLocked, ...rest } = c;
      Object.assign(component, rest);
      // a getter on the component: shadow it on the instance
      Object.defineProperty(component, 'isDefaultFallbackLocked', { get: () => isDefaultFallbackLocked });
      return component.dropListEnterPredicate;
    };

    it('dropListEnterPredicate rejects Start points palette items', () => {
      const accept = predicate(ctx());
      expect(accept({ data: { type: 'action', value: { type: 'webhook', start_point: 'webhook' } } } as any)).toBeFalse();
      expect(accept({ data: { type: 'action', value: { type: 'web', start_point: 'web' } } } as any)).toBeFalse();
    });

    it('dropListEnterPredicate still accepts ordinary palette items and actions', () => {
      const accept = predicate(ctx());
      expect(accept({ data: { type: 'action', value: { type: 'reply' } } } as any)).toBeTrue();
      expect(accept({ data: undefined } as any)).toBeTrue();
    });

    it('dropListEnterPredicate keeps refusing a locked defaultFallback', () => {
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
      expect(l.params.next).toBe('Tue, Oct 6, 08:30');
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
    it('off: switched off in the published version', () => {
      const off = sp({ enabled: false });
      const l = scheduledStatusLine(wh(off, sp({ enabled: false })));
      expect(l.status).toBe('off');
      expect(l.key).toBe('off');
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
    it('GET 200 with scheduled_available false -> unavailable (no form); true or absent -> the form', () => {
      expect(scheduledLoadedOutcome({ start_points: [], scheduled_available: false })).toEqual({ state: 'unavailable', message: SCHEDULED_UNAVAILABLE_MESSAGE });
      expect(scheduledLoadedOutcome({ start_points: [], scheduled_available: true })).toEqual({ state: 'ready' });
      expect(scheduledLoadedOutcome({ start_points: [] })).toEqual({ state: 'ready' });
    });

    it('GET 404: no webhook yet, unless it says the scheduler is not configured; other errors -> error', () => {
      expect(scheduledLoadOutcome({ status: 404, error: { scheduled_available: true } })).toEqual({ state: 'no_webhook' });
      expect(scheduledLoadOutcome({ status: 404 })).toEqual({ state: 'no_webhook' });
      expect(scheduledLoadOutcome({ status: 404, error: { scheduled_available: false } })).toEqual({ state: 'unavailable', message: SCHEDULED_UNAVAILABLE_MESSAGE });
      expect(scheduledLoadOutcome({ status: 500 })).toEqual({ state: 'error' });
      // the server never answers 503 on GET: a 503 (e.g. a proxy) is a load error, not "not configured"
      expect(scheduledLoadOutcome({ status: 503 })).toEqual({ state: 'error' });
    });

    it('DELETE: 404 deletes the box; 503 deletes a scheduled box (nothing can be live without a scheduler) but keeps a webhook box', () => {
      expect(startPointDeleteOutcome('scheduled', { status: 503 })).toBe('delete_box');
      expect(startPointDeleteOutcome('scheduled', { status: 404 })).toBe('delete_box');
      expect(startPointDeleteOutcome('scheduled', { status: 500 })).toBe('keep_box');
      expect(startPointDeleteOutcome('webhook', { status: 404 })).toBe('delete_box');
      expect(startPointDeleteOutcome('webhook', { status: 503 })).toBe('keep_box');
      expect(startPointDeleteOutcome('webhook', { status: 500 })).toBe('keep_box');
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

describe('scheduled final review fixes', () => {
  beforeAll(() => {
    LoggerInstance.setInstance({ log() {}, warn() {}, error() {}, debug() {}, info() {} } as any);
  });

  const sp = (over: any = {}) => ({
    type: 'scheduled', block_id: 'b1', enabled: true,
    mapping: { source_name: 'Bot', payload: {} },
    schedule: { frequency: 'daily', time: '09:00', timezone: 'Europe/Rome' }, ...over
  });

  function make() {
    const upsert = jasmine.createSpy('upsert').and.callFake(() => of({}));
    const sync = jasmine.createSpy('sync').and.callFake(() => of({}));
    const refresh = jasmine.createSpy('refresh');
    const onError = jasmine.createSpy('onError');
    const model = new ScheduledPanelModel({ upsert, sync, refresh, onError }, 'b1', 'Europe/Rome');
    model.load({ start_points: [sp()] }, 'Europe/Rome');
    return { model, upsert, refresh, onError };
  }

  describe('I1 publish / restore refresh the shared webhook', () => {
    // master-pre: the panel publishes the chatbot family with publishMulti (CAN_PUBLISH / targetsToPublish are prototype getters)
    const publishCtx = (publishMulti: () => any) => {
      const webhookService = jasmine.createSpyObj('webhookService', ['refreshAfterPublish']);
      const ctx: any = Object.assign(Object.create(CdsPanelPublishComponent.prototype), {
        isSaving: false, PUBLISH_PENDING: false, IS_LOADING_FAMILY: false, selectedChatbot: { _id: 'bot1' },
        familyParentId: 'bot1', publishTargets: [{ _id: 'bot1', name: 'Bot', modified: true, isParent: true, selected: true }],
        dashboardService: { selectedChatbot: { _id: 'bot1', modified: true } },
        faqKbService: { publishMulti }, webhookService, logger: { log() {}, error() {} }
      });
      return { ctx, webhookService };
    };

    it('a successful publish refreshes the webhook (now and after the async sync)', () => {
      const { ctx, webhookService } = publishCtx(() => of({ results: [{ id: 'bot1', success: true }] }));
      ctx.onClickPublish();
      expect(webhookService.refreshAfterPublish).toHaveBeenCalledOnceWith('bot1');
    });

    it('a failed publish does not refresh', () => {
      const { ctx, webhookService } = publishCtx(() => throwError(() => ({ status: 500 })));
      ctx.onClickPublish();
      expect(webhookService.refreshAfterPublish).not.toHaveBeenCalled();
    });

    it('a partial publish (500 carrying per-chatbot results) refreshes the webhook', () => {
      const { ctx, webhookService } = publishCtx(() => throwError(() => ({ status: 500, error: { results: [{ id: 'bot1', success: true }] } })));
      ctx.onClickPublish();
      expect(webhookService.refreshAfterPublish).toHaveBeenCalledOnceWith('bot1');
    });

    it('a successful restore refreshes the webhook', () => {
      const webhookService = jasmine.createSpyObj('webhookService', ['refreshAfterPublish']);
      const answer = new Subject<any>();
      const ctx: any = { selectedChatbot: { _id: 'bot1' }, faqKbService: { publish: () => answer }, webhookService, logger: { log() {}, error() {} } };
      CdsPublishHistoryComponent.prototype.publishRestore.call(ctx, { _id: 'rel1' });
      expect(webhookService.refreshAfterPublish).not.toHaveBeenCalled();
      answer.next({});
      expect(webhookService.refreshAfterPublish).toHaveBeenCalledOnceWith('bot1');
    });
  });

  describe('I3 start test kind', () => {
    const box = (type: string) => ({ intent_id: 'x', intent_display_name: 'x', attributes: { start_point: type } } as any);

    it('highlights only the box of the running test kind', () => {
      expect(isLiveStartBox(box('webhook'), 'webhook')).toBeTrue();
      expect(isLiveStartBox(box('scheduled'), 'webhook')).toBeFalse();
      expect(isLiveStartBox(box('scheduled'), 'scheduled')).toBeTrue();
      expect(isLiveStartBox(box('webhook'), 'scheduled')).toBeFalse();
      expect(isLiveStartBox(box('webhook'), null)).toBeFalse();
      expect(isLiveStartBox({ intent_id: 'y', intent_display_name: 'start' } as any, 'webhook')).toBeFalse();
    });

    it('the webhook preload is deleted for a webhook chatbot or a webhook start test, never for a scheduled test', () => {
      expect(shouldDeleteWebhookPreload(true, false, null)).toBeTrue();
      expect(shouldDeleteWebhookPreload(false, true, 'webhook')).toBeTrue();
      expect(shouldDeleteWebhookPreload(false, true, 'scheduled')).toBeFalse();
      expect(shouldDeleteWebhookPreload(false, false, null)).toBeFalse();
    });
  });

  describe('minors', () => {
    it('the scheduled drop failure has its own toast key; the webhook one is unchanged', () => {
      expect(startPointErrorKey('webhook')).toBe('CDSCanvas.StartPointError');
      expect(startPointErrorKey('scheduled')).toBe('CDSCanvas.ScheduledPointError');
    });

    it('box summary and badge only for the box the scheduled start point points at', () => {
      const webhook = { start_points: [sp()], scheduled_live: sp() };
      expect(scheduledBoxView(webhook, 'b1')).toEqual({ summary: 'Daily at 09:00 (Europe/Rome)', status: 'live' });
      expect(scheduledBoxView(webhook, 'other')).toBeNull();
      expect(scheduledBoxView({ start_points: [] }, 'b1')).toBeNull();
      expect(scheduledBoxView(null, 'b1')).toBeNull();
    });

    it('cancelPending releases a waiting flush (false) and whenIdle waits for the in-flight PUT', fakeAsync(() => {
      const inFlight = new Subject<any>();
      const { model, upsert } = make();
      upsert.and.returnValue(inFlight);
      model.setEnabled(false);
      let tested: boolean;
      model.flushAndWait().then(r => tested = r);
      ngTick(0);
      expect(upsert).toHaveBeenCalledTimes(1);
      model.setEnabled(true);
      model.cancelPending();
      ngTick(0);
      expect(tested).toBeFalse();
      let idle = false;
      model.whenIdle().then(() => idle = true);
      ngTick(0);
      expect(idle).toBeFalse();
      inFlight.next({}); inFlight.complete();
      ngTick(0);
      expect(idle).toBeTrue();
      ngTick(2000);
      // the edit dropped by cancelPending is never sent
      expect(upsert).toHaveBeenCalledTimes(1);
    }));

    it('whenIdle resolves at once when nothing is in flight', fakeAsync(() => {
      const { model } = make();
      let idle = false;
      model.whenIdle().then(() => idle = true);
      ngTick(0);
      expect(idle).toBeTrue();
    }));

    it('a failed PUT leaves a persistent "not saved" state; Retry re-sends the current form until it saves', fakeAsync(() => {
      const { model, upsert } = make();
      upsert.and.returnValue(throwError(() => ({ status: 500 })));
      model.setEnabled(false);
      ngTick(700);
      expect(model.saveFailed).toBeTrue();
      ngTick(10000);
      expect(model.saveFailed).toBeTrue();
      model.setSourceName('Nightly');
      model.retrySave();
      expect(upsert).toHaveBeenCalledTimes(2);
      expect(upsert.calls.argsFor(1)[0].mapping.source_name).toBe('Nightly');
      expect(model.saveFailed).toBeTrue();
      upsert.and.returnValue(of({}));
      model.retrySave();
      expect(model.saveFailed).toBeFalse();
      ngTick(2000);
      // the debounce of the edit was replaced by the retry
      expect(upsert).toHaveBeenCalledTimes(3);
    }));
  });
});

describe('scheduled start point in read-only mode (master-pre)', () => {
  beforeAll(() => {
    LoggerInstance.setInstance({ log() {}, warn() {}, error() {}, debug() {}, info() {} } as any);
  });

  it('palette: the Scheduled item is disabled in read-only (pending flag), enabled otherwise', () => {
    const scheduledItem = (pending: boolean) => buildStartPointItems(['web'], pending, true).find(i => i.value.start_point === 'scheduled');
    expect(scheduledItem(false).value.disabled).toBeFalse();
    expect(scheduledItem(true).value.disabled).toBeTrue();
  });

  it('dropping a Scheduled box: no POST, the create rejects so no PUT follows', async () => {
    const readOnly = new ReadOnlyService();
    readOnly.enable();
    const faq: any = { addIntent: jasmine.createSpy('addIntent'), deleteFaq: jasmine.createSpy('deleteFaq') };
    const service = new IntentService(faq, null, null, null, null, { selectedChatbot: { subtype: 'chatbot' } } as any, null, null, new SavingStateService(), readOnly);
    const upsert = jasmine.createSpy('upsert');
    const run = createStartPointBox({
      pending: { value: false },
      createBlock: (b) => service.createIntentWithoutHistory(b),
      deleteBlock: (b) => service.deleteSavedIntentWithoutHistory(b),
      upsert,
      confirmSwitch: async () => true,
      onError: () => {},
      onCreated: () => {},
    }, 'scheduled', { x: 0, y: 0 });
    expect(await run).toBe('failed');
    expect(faq.addIntent).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
    expect(await service.deleteSavedIntentWithoutHistory(createStartPointBlock('scheduled', { x: 0, y: 0 }))).toBeNull();
    expect(faq.deleteFaq).not.toHaveBeenCalled();
  });

  describe('Scheduled panel handlers', () => {
    const MODEL_METHODS = ['setEnabled', 'setRepeat', 'setEvery', 'setTime', 'toggleWeekday', 'setDayOfMonth', 'setTimezone',
      'setSourceName', 'addRow', 'removeRow', 'rowsEdited', 'setRowType', 'retrySync', 'retrySave', 'flushAndWait'];

    const panel = (readOnly: boolean) => {
      const readOnlyService = new ReadOnlyService();
      if (readOnly) { readOnlyService.enable(); }
      const scheduled = jasmine.createSpyObj('scheduled', MODEL_METHODS);
      scheduled.enabled = false;
      scheduled.hasError = false;
      scheduled.flushAndWait.and.returnValue(Promise.resolve(true));
      const controllerService = jasmine.createSpyObj('controllerService', ['requestWebhookStartTest']);
      const ctx: any = Object.assign(Object.create(CdsPanelIntentDetailComponent.prototype), { readOnlyService, scheduled, controllerService });
      return { ctx, scheduled, controllerService };
    };

    const editEverything = async (ctx: any) => {
      const row: any = { name: 'a', type: 'text', value: 'x' };
      const input = { checked: true };
      ctx.onScheduledEnabledChange(input);
      ctx.onScheduledRepeatChange('weekly');
      ctx.onScheduledEveryChange(5);
      ctx.onScheduledTimeChange('10:00');
      ctx.onScheduledWeekdayToggle('mon');
      ctx.onScheduledDayOfMonthChange(3);
      ctx.onScheduledTimezoneChange('Europe/London');
      ctx.onScheduledSourceNameChange('Name');
      ctx.onScheduledAddRow();
      ctx.onScheduledRemoveRow(0);
      ctx.onScheduledRowNameChange(row, 'b');
      ctx.onScheduledRowValueChange(row, 'y');
      ctx.onScheduledRowTypeChange(0, 'number');
      ctx.onRetryScheduledSync();
      ctx.onRetryScheduledSave();
      await ctx.onTestScheduledStart();
      return { row, input };
    };

    it('read-only: switch, schedule, source name, payload rows, retry and test are no-ops', async () => {
      const { ctx, scheduled, controllerService } = panel(true);
      const { row, input } = await editEverything(ctx);
      MODEL_METHODS.forEach(m => expect(scheduled[m]).withContext(m).not.toHaveBeenCalled());
      expect(controllerService.requestWebhookStartTest).not.toHaveBeenCalled();
      // the checkbox goes back to the model state, the row keeps its values
      expect(input.checked).toBeFalse();
      expect(row).toEqual({ name: 'a', type: 'text', value: 'x' });
    });

    it('read-only: Delete does not open the confirmation', () => {
      const { ctx } = panel(true);
      ctx.confirmAndDeleteStartPoint = jasmine.createSpy('confirmAndDeleteStartPoint');
      ctx.onDeleteScheduledStart();
      expect(ctx.confirmAndDeleteStartPoint).not.toHaveBeenCalled();
    });

    it('editor: the same handlers reach the model, the test and the delete', async () => {
      const { ctx, scheduled, controllerService } = panel(false);
      const { row } = await editEverything(ctx);
      MODEL_METHODS.forEach(m => expect(scheduled[m]).withContext(m).toHaveBeenCalled());
      expect(row.name).toBe('b');
      expect(row.value).toBe('y');
      expect(controllerService.requestWebhookStartTest).toHaveBeenCalledOnceWith('scheduled');
      ctx.confirmAndDeleteStartPoint = jasmine.createSpy('confirmAndDeleteStartPoint');
      ctx.onDeleteScheduledStart();
      expect(ctx.confirmAndDeleteStartPoint).toHaveBeenCalledWith('scheduled', 'CDSCanvas.ScheduledPanel.DeleteTitle', 'CDSCanvas.ScheduledPanel.DeleteText');
    });
  });

  describe('agent chat delete_intent', () => {
    const validate = (target: any) => {
      const ctx: any = {
        intentService: { getIntentFromId: (id: string) => (target && target.intent_id === id ? target : null) },
        validateShape: (op: any) => ({ op: op.op, ok: true }),
      };
      return (FlowOpsService.prototype as any).validate.call(ctx, { op: 'delete_intent', intent_id: 'b1' });
    };

    it('refuses the Scheduled start box, like the webhook one', () => {
      const scheduled = validate({ intent_id: 'b1', intent_display_name: 'Scheduled start', attributes: { start_point: 'scheduled' } });
      expect(scheduled.ok).toBeFalse();
      expect(scheduled.error).toContain('scheduled start box');
      const webhook = validate({ intent_id: 'b1', intent_display_name: 'Webhook start', attributes: { start_point: 'webhook' } });
      expect(webhook.ok).toBeFalse();
      expect(webhook.error).toContain('webhook start box');
    });

    it('still accepts an ordinary block', () => {
      expect(validate({ intent_id: 'b1', intent_display_name: 'block', attributes: {} }).ok).toBeTrue();
    });
  });
});
