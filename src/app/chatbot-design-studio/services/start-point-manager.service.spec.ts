import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { ReadOnlyService } from 'src/app/services/read-only.service';
import { IntentService } from './intent.service';
import { StartPointManagerService } from './start-point-manager.service';

const START = { intent_id: 'start-id', intent_display_name: 'start', attributes: { position: { x: 100, y: 200 } } };
const WEBHOOK_BOX = { intent_id: 'wh-box', intent_display_name: 'Webhook start', attributes: { start_point: 'webhook', position: { x: -400, y: 200 } } };
const SCHEDULED_BOX = { intent_id: 'sc-box', intent_display_name: 'Scheduled start', attributes: { start_point: 'scheduled', position: { x: -400, y: 450 } } };

const flush = async (n = 6) => { for (let i = 0; i < n; i++) { await new Promise(r => setTimeout(r, 0)); } };

describe('StartPointManagerService', () => {
  let webhook: any;
  let webhookService: any;
  let intentService: any;
  let dashboardService: any;
  let readOnly: ReadOnlyService;
  let translate: any;
  let connectorService: any;
  let service: StartPointManagerService;

  beforeAll(() => {
    LoggerInstance.setInstance({ log() {}, warn() {}, error() {}, debug() {}, info() {} } as any);
  });

  beforeEach(() => {
    webhook = { webhook_id: 'w1', scheduled_available: true, start_points: [] };
    const webhook$ = new BehaviorSubject<any>(webhook);
    webhookService = {
      webhook$,
      fetchWebhook: jasmine.createSpy('fetchWebhook').and.callFake(() => { webhook$.next(webhook); return of(webhook); }),
      loadWebhook: jasmine.createSpy('loadWebhook'),
      upsertStartPoint: jasmine.createSpy('upsertStartPoint').and.callFake(() => of({})),
      deleteStartPoint: jasmine.createSpy('deleteStartPoint').and.callFake(() => of({})),
    };
    intentService = {
      listOfIntents: [START],
      createIntentWithoutHistory: jasmine.createSpy('createIntentWithoutHistory').and.callFake(async () => ({ _id: 'faq1' })),
      deleteSavedIntentWithoutHistory: jasmine.createSpy('deleteSavedIntentWithoutHistory').and.callFake(async () => ({})),
      deleteIntentWithoutHistory: jasmine.createSpy('deleteIntentWithoutHistory').and.callFake(async () => undefined),
      saveIntentWithoutHistory: jasmine.createSpy('saveIntentWithoutHistory').and.callFake(async () => true),
      refreshIntent: jasmine.createSpy('refreshIntent'),
    };
    connectorService = { deleteConnectorsOutOfBlock: jasmine.createSpy('deleteConnectorsOutOfBlock') };
    dashboardService = { id_faq_kb: 'bot1', selectedChatbot: { name: 'My bot', subtype: 'chatbot' } };
    readOnly = new ReadOnlyService();
    translate = { instant: (k: string) => k };
    service = new StartPointManagerService(webhookService, intentService, dashboardService, readOnly, translate, undefined, connectorService);
  });

  const putBody = (i = 0) => webhookService.upsertStartPoint.calls.argsFor(i)[2];

  describe('describe', () => {
    it('describes webhook and scheduled as available on an empty flow', async () => {
      const list = await service.describe();
      const byType = (t: string) => list.find(d => d.type === t);
      expect(byType('webhook')).toEqual(jasmine.objectContaining({ status: 'available', removable: true }));
      expect(byType('scheduled')).toEqual(jasmine.objectContaining({ status: 'available', removable: true }));
      expect(Object.keys(byType('webhook').settings).sort()).toEqual(['enabled', 'source_name']);
      expect(Object.keys(byType('scheduled').settings).sort()).toEqual(['enabled', 'payload', 'schedule', 'source_name']);
      expect(byType('webhook').intent_id).toBeUndefined();
    });

    it('describes a present box with its intent_id', async () => {
      intentService.listOfIntents = [START, WEBHOOK_BOX];
      const list = await service.describe();
      expect(list.find(d => d.type === 'webhook')).toEqual(jasmine.objectContaining({ status: 'present', intent_id: 'wh-box' }));
    });

    it('gives a present box its saved settings as current, in the shape of settings', async () => {
      intentService.listOfIntents = [START, WEBHOOK_BOX, SCHEDULED_BOX];
      const schedule = { frequency: 'interval', every: 15, unit: 'minutes', timezone: 'Europe/Rome' };
      webhook.start_points = [
        { type: 'webhook', block_id: 'wh-box', enabled: false, mapping: { source_name: 'crm' } },
        { type: 'scheduled', block_id: 'sc-box', enabled: true, mapping: { source_name: 'cron', payload: { a: 1 } }, schedule }
      ];
      const list = await service.describe();
      expect(list.find(d => d.type === 'webhook').current).toEqual({ enabled: false, source_name: 'crm' });
      expect(list.find(d => d.type === 'scheduled').current)
        .toEqual({ enabled: true, source_name: 'cron', schedule, payload: { a: 1 } });
    });

    it('gives web an empty current when present and no current when not present', async () => {
      const list = await service.describe();
      expect(list.find(d => d.type === 'web').current).toEqual({});
      expect(list.find(d => d.type === 'webhook').current).toBeUndefined();
    });

    it('describes scheduled as unavailable when scheduled_available is false', async () => {
      webhook.scheduled_available = false;
      const list = await service.describe();
      const scheduled = list.find(d => d.type === 'scheduled');
      expect(scheduled.status).toBe('unavailable');
      expect(scheduled.reason).toBeTruthy();
      expect(list.find(d => d.type === 'webhook').status).toBe('available');
    });

    it('describes both as unavailable when the chatbot subtype is not chatbot', async () => {
      dashboardService.selectedChatbot.subtype = 'voice';
      const list = await service.describe();
      expect(list.find(d => d.type === 'webhook').status).toBe('unavailable');
      expect(list.find(d => d.type === 'scheduled').status).toBe('unavailable');
    });
  });

  describe('add', () => {
    it('adds a scheduled box with the given schedule in one upsert', async () => {
      const calls: string[] = [];
      intentService.createIntentWithoutHistory.and.callFake(async () => { calls.push('create'); return {}; });
      webhookService.upsertStartPoint.and.callFake(() => { calls.push('put'); return of({}); });
      const created: any[] = [];
      service.boxCreated$.subscribe(b => created.push(b));
      const schedule = { frequency: 'interval', every: 15, unit: 'minutes', timezone: 'Europe/Rome' };
      const res: any = await service.add('scheduled', { schedule, payload: { check: 'disk', limit: 90 } });
      expect(res.ok).toBeTrue();
      expect(calls).toEqual(['create', 'put']);
      expect(webhookService.upsertStartPoint).toHaveBeenCalledTimes(1);
      const [chatbotId, type, body] = webhookService.upsertStartPoint.calls.argsFor(0);
      expect(chatbotId).toBe('bot1');
      expect(type).toBe('scheduled');
      expect(body.block_id).toBe(res.intent_id);
      expect(body.schedule).toEqual(schedule);
      expect(body.enabled).toBeTrue();
      expect(body.mapping).toEqual({ source_name: 'My bot', payload: { check: 'disk', limit: 90 } });
      expect(body.confirm).toBeUndefined();
      expect(res.type).toBe('scheduled');
      expect(res.settings).toEqual({ enabled: true, source_name: 'My bot', schedule, payload: { check: 'disk', limit: 90 } });
      expect(created.length).toBe(1);
      expect(created[0].intent_id).toBe(res.intent_id);
      expect(created[0].attributes.start_point).toBe('scheduled');
      expect(webhookService.loadWebhook).toHaveBeenCalledWith('bot1', true);
    });

    it('fills the browser timezone and the defaults when not given', async () => {
      const res: any = await service.add('scheduled', { schedule: { frequency: 'daily', time: '07:30' } });
      expect(res.ok).toBeTrue();
      const body = putBody();
      expect(body.schedule.frequency).toBe('daily');
      expect(body.schedule.time).toBe('07:30');
      expect(typeof body.schedule.timezone).toBe('string');
      expect(body.schedule.timezone.length).toBeGreaterThan(0);
    });

    it('adds a webhook box at the given position with the given source name', async () => {
      const created: any[] = [];
      service.boxCreated$.subscribe(b => created.push(b));
      const res: any = await service.add('webhook', { source_name: 'Alerts', enabled: true }, { x: 10, y: 20 });
      expect(res.ok).toBeTrue();
      expect(putBody()).toEqual({ block_id: res.intent_id, enabled: true, mapping: { source_name: 'Alerts' } });
      expect(created[0].attributes.position).toEqual({ x: 10, y: 20 });
      expect(res.settings).toEqual({ enabled: true, source_name: 'Alerts' });
    });

    it('places the box left of the flow when no position is given', async () => {
      const created: any[] = [];
      service.boxCreated$.subscribe(b => created.push(b));
      await service.add('webhook');
      expect(created[0].attributes.position.x).toBeLessThan(START.attributes.position.x);
    });

    it('rolls the block back and returns the error when registration fails', async () => {
      webhookService.upsertStartPoint.and.callFake(() => throwError(() => ({ status: 400, error: { error: 'schedule.time must be in the format HH:MM' } })));
      const created: any[] = [];
      service.boxCreated$.subscribe(b => created.push(b));
      const res: any = await service.add('scheduled');
      expect(res.ok).toBeFalse();
      expect(res.code).toBe('invalid');
      expect(res.error).toContain('schedule.time');
      expect(intentService.deleteSavedIntentWithoutHistory).toHaveBeenCalledTimes(1);
      expect(created.length).toBe(0);
    });

    it('a 503 on registration is unavailable', async () => {
      webhookService.upsertStartPoint.and.callFake(() => throwError(() => ({ status: 503, error: { error: 'Scheduled starts are not available' } })));
      const res: any = await service.add('scheduled');
      expect(res.code).toBe('unavailable');
    });

    it('returns exists when a box of the type is present', async () => {
      intentService.listOfIntents = [START, SCHEDULED_BOX];
      const res: any = await service.add('scheduled');
      expect(res).toEqual(jasmine.objectContaining({ ok: false, code: 'exists' }));
      expect(intentService.createIntentWithoutHistory).not.toHaveBeenCalled();
    });

    it('add while pending returns busy-as-exists', async () => {
      const gate = new Subject<any>();
      webhookService.upsertStartPoint.and.callFake(() => gate);
      const first = service.add('webhook');
      await flush();
      const second: any = await service.add('scheduled');
      expect(second).toEqual(jasmine.objectContaining({ ok: false, code: 'exists' }));
      gate.next({}); gate.complete();
      expect((await first as any).ok).toBeTrue();
      expect(webhookService.upsertStartPoint).toHaveBeenCalledTimes(1);
    });

    it('exposes pending$ while an add is in flight', async () => {
      const seen: boolean[] = [];
      service.pending$.subscribe(v => seen.push(v));
      await service.add('webhook');
      expect(seen).toEqual([false, true, false]);
    });

    it('maps a 409 to conflict without retrying with confirm', async () => {
      webhookService.upsertStartPoint.and.callFake(() => throwError(() => ({ status: 409, error: { error: 'The webhook is used by an automation' } })));
      const res: any = await service.add('webhook');
      expect(res).toEqual({ ok: false, code: 'conflict', error: 'The webhook is used by an automation' });
      expect(webhookService.upsertStartPoint).toHaveBeenCalledTimes(1);
      expect(putBody().confirm).toBeUndefined();
      expect(intentService.deleteSavedIntentWithoutHistory).toHaveBeenCalledTimes(1);
    });

    it('the palette path asks its own 409 confirmation and retries with confirm', async () => {
      let n = 0;
      webhookService.upsertStartPoint.and.callFake(() => n++ === 0 ? throwError(() => ({ status: 409 })) : of({}));
      const confirmConflict = jasmine.createSpy('confirmConflict').and.resolveTo(true);
      const res: any = await service.add('webhook', undefined, { x: 0, y: 0 }, { confirmConflict });
      expect(res.ok).toBeTrue();
      expect(confirmConflict).toHaveBeenCalledTimes(1);
      expect(putBody(1).confirm).toBeTrue();
    });

    it('the palette path: cancelling the 409 confirmation is declined', async () => {
      webhookService.upsertStartPoint.and.callFake(() => throwError(() => ({ status: 409 })));
      const res: any = await service.add('webhook', undefined, { x: 0, y: 0 }, { confirmConflict: async () => false });
      expect(res.code).toBe('declined');
      expect(intentService.deleteSavedIntentWithoutHistory).toHaveBeenCalledTimes(1);
    });

    it('rejects an invalid schedule with the panel message', async () => {
      const res: any = await service.add('scheduled', { schedule: { frequency: 'interval', every: 7, unit: 'minutes', timezone: 'UTC' } });
      expect(res).toEqual({ ok: false, code: 'invalid', error: 'schedule.every must be one of 5, 10, 15, 20, 30 when unit is minutes' });
      expect(intentService.createIntentWithoutHistory).not.toHaveBeenCalled();
    });

    it('rejects an invalid payload with the panel message', async () => {
      const bad: any = await service.add('scheduled', { payload: { '1abc': 'x' } });
      expect(bad.code).toBe('invalid');
      expect(bad.error).toContain('Field name 1abc is invalid');
      const nested: any = await service.add('scheduled', { payload: { a: { b: 1 } } });
      expect(nested.code).toBe('invalid');
      expect(intentService.createIntentWithoutHistory).not.toHaveBeenCalled();
    });

    it('rejects unknown or mistyped settings', async () => {
      expect(((await service.add('webhook', { schedule: { frequency: 'daily' } })) as any).code).toBe('invalid');
      expect(((await service.add('webhook', { enabled: 'yes' })) as any).code).toBe('invalid');
      expect(((await service.add('webhook', { colour: 'red' })) as any).code).toBe('invalid');
      expect(intentService.createIntentWithoutHistory).not.toHaveBeenCalled();
    });

    it('refuses an unavailable scheduled type', async () => {
      webhook.scheduled_available = false;
      const res: any = await service.add('scheduled');
      expect(res.code).toBe('unavailable');
      expect(intentService.createIntentWithoutHistory).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    beforeEach(() => {
      intentService.listOfIntents = [START, WEBHOOK_BOX, SCHEDULED_BOX];
      webhook.start_points = [
        { type: 'webhook', block_id: 'wh-box', enabled: true, mapping: { source_name: 'Alerts' } },
        { type: 'scheduled', block_id: 'sc-box', enabled: true, mapping: { source_name: 'Nightly', payload: { check: 'disk' } },
          schedule: { frequency: 'daily', time: '09:00', timezone: 'Europe/Rome' } },
      ];
    });

    it('update merges settings into the current start point', async () => {
      const res: any = await service.update('scheduled', { schedule: { frequency: 'interval', every: 15, unit: 'minutes' } });
      expect(res.ok).toBeTrue();
      const body = putBody();
      expect(webhookService.upsertStartPoint.calls.argsFor(0)[1]).toBe('scheduled');
      expect(body).toEqual({
        block_id: 'sc-box', enabled: true,
        mapping: { source_name: 'Nightly', payload: { check: 'disk' } },
        schedule: { frequency: 'interval', every: 15, unit: 'minutes', timezone: 'Europe/Rome' }
      });
      expect(res.settings).toEqual({
        enabled: true, source_name: 'Nightly', payload: { check: 'disk' },
        schedule: { frequency: 'interval', every: 15, unit: 'minutes', timezone: 'Europe/Rome' }
      });
      expect(webhookService.loadWebhook).toHaveBeenCalledWith('bot1', true);
    });

    it('update of the webhook keeps the source name when only enabled is given', async () => {
      const res: any = await service.update('webhook', { enabled: false });
      expect(res.ok).toBeTrue();
      expect(putBody()).toEqual({ block_id: 'wh-box', enabled: false, mapping: { source_name: 'Alerts' } });
    });

    it('update rejects an invalid merged schedule without saving', async () => {
      const res: any = await service.update('scheduled', { schedule: { frequency: 'weekly', weekdays: [] } });
      expect(res.code).toBe('invalid');
      expect(res.error).toContain('schedule.weekdays');
      expect(webhookService.upsertStartPoint).not.toHaveBeenCalled();
    });

    it('update requires a present box', async () => {
      intentService.listOfIntents = [START];
      const res: any = await service.update('webhook', { enabled: true });
      expect(res.code).toBe('missing');
    });

    it('update maps a 409 to conflict without confirm', async () => {
      webhookService.upsertStartPoint.and.callFake(() => throwError(() => ({ status: 409, error: { error: 'automation' } })));
      const res: any = await service.update('webhook', { enabled: true });
      expect(res).toEqual({ ok: false, code: 'conflict', error: 'automation' });
      expect(webhookService.upsertStartPoint).toHaveBeenCalledTimes(1);
    });

    it('update with open panel emits settingsChanged$ and cancels the panel pending save', async () => {
      const order: string[] = [];
      const panel = {
        cancelPending: jasmine.createSpy('cancelPending').and.callFake(() => order.push('cancel')),
        whenIdle: jasmine.createSpy('whenIdle').and.callFake(async () => { order.push('idle'); }),
      };
      webhookService.upsertStartPoint.and.callFake(() => { order.push('put'); return of({}); });
      const unregister = service.registerPanel('scheduled', panel);
      const changes: any[] = [];
      service.settingsChanged$.subscribe(c => { order.push('changed'); changes.push(c); });
      const res: any = await service.update('scheduled', { enabled: false });
      expect(res.ok).toBeTrue();
      expect(order).toEqual(['cancel', 'idle', 'put', 'changed']);
      expect(changes).toEqual([{ type: 'scheduled' }]);
      unregister();
      await service.update('scheduled', { enabled: true });
      expect(panel.cancelPending).toHaveBeenCalledTimes(1);
    });
    it('update waits for the open panel PUT in flight before reading the start point, and keeps its change', async () => {
      const order: string[] = [];
      const panel = {
        cancelPending: jasmine.createSpy('cancelPending'),
        suspend: jasmine.createSpy('suspend').and.callFake(() => order.push('suspend')),
        resume: jasmine.createSpy('resume'),
        whenIdle: jasmine.createSpy('whenIdle').and.callFake(async () => {
          await flush(2);
          // the user's PUT lands on the server only now
          webhook.start_points[1] = { ...webhook.start_points[1], mapping: { source_name: 'Typed by user', payload: { check: 'disk' } } };
          order.push('idle');
        }),
      };
      webhookService.fetchWebhook.and.callFake(() => { order.push('get'); return of(webhook); });
      service.registerPanel('scheduled', panel);
      const res: any = await service.update('scheduled', { schedule: { frequency: 'interval', every: 30, unit: 'minutes' } });
      expect(res.ok).toBeTrue();
      expect(order).toEqual(['suspend', 'idle', 'get']);
      expect(putBody().mapping.source_name).toBe('Typed by user');
      expect(res.settings.source_name).toBe('Typed by user');
      // a panel with suspend is suspended, not emptied; on success it resumes itself after its reload
      expect(panel.cancelPending).not.toHaveBeenCalled();
      expect(panel.resume).not.toHaveBeenCalled();
    });

    it('a failed update resumes the suspended panel with its held-back edit', async () => {
      const panel = { cancelPending() {}, whenIdle: async () => {}, suspend: jasmine.createSpy('suspend'), resume: jasmine.createSpy('resume') };
      service.registerPanel('scheduled', panel);
      webhookService.upsertStartPoint.and.callFake(() => throwError(() => ({ status: 500 })));
      const changes: any[] = [];
      service.settingsChanged$.subscribe(c => changes.push(c));
      expect(((await service.update('scheduled', { enabled: false })) as any).ok).toBeFalse();
      expect(panel.resume).toHaveBeenCalledOnceWith(true);
      expect(changes).toEqual([]);
      // an invalid merge after the suspend resumes it too
      panel.resume.calls.reset();
      expect(((await service.update('scheduled', { schedule: { frequency: 'weekly', weekdays: [] } })) as any).code).toBe('invalid');
      expect(panel.resume).toHaveBeenCalledOnceWith(true);
    });
  });

  describe('remove', () => {
    beforeEach(() => {
      intentService.listOfIntents = [START, WEBHOOK_BOX, SCHEDULED_BOX];
    });

    it('remove shows the confirmation and returns declined on cancel', async () => {
      const ask = spyOn<any>(service, 'confirmDialog').and.resolveTo(false);
      const res: any = await service.remove('scheduled');
      expect(ask).toHaveBeenCalledTimes(1);
      expect(ask.calls.argsFor(0)[0]).toEqual(jasmine.objectContaining({
        title: 'CDSCanvas.ScheduledPanel.DeleteTitle', text: 'CDSCanvas.ScheduledPanel.DeleteText'
      }));
      expect(res.code).toBe('declined');
      expect(webhookService.deleteStartPoint).not.toHaveBeenCalled();
      expect(intentService.deleteIntentWithoutHistory).not.toHaveBeenCalled();
    });

    it('remove deletes server first then the block', async () => {
      spyOn<any>(service, 'confirmDialog').and.resolveTo(true);
      const order: string[] = [];
      webhookService.deleteStartPoint.and.callFake(() => { order.push('server'); return of({}); });
      service.boxRemoved$.subscribe(() => order.push('removed$'));
      intentService.deleteIntentWithoutHistory.and.callFake(async () => { order.push('block'); });
      const res: any = await service.remove('webhook');
      expect(res).toEqual({ ok: true });
      expect(webhookService.deleteStartPoint).toHaveBeenCalledWith('bot1', 'webhook');
      expect(order).toEqual(['server', 'removed$', 'block']);
      expect(intentService.deleteIntentWithoutHistory.calls.argsFor(0)[0].intent_id).toBe('wh-box');
    });

    it('remove of a scheduled box drops the open panel pending save before the DELETE', async () => {
      spyOn<any>(service, 'confirmDialog').and.resolveTo(true);
      const order: string[] = [];
      service.registerPanel('scheduled', {
        cancelPending: () => order.push('cancel'),
        whenIdle: async () => { order.push('idle'); },
      });
      webhookService.deleteStartPoint.and.callFake(() => { order.push('server'); return of({}); });
      await service.remove('scheduled');
      expect(order.slice(0, 3)).toEqual(['cancel', 'idle', 'server']);
      expect(webhookService.loadWebhook).toHaveBeenCalledWith('bot1', true);
    });

    it('a server failure keeps the box and returns the error; 404 still deletes it', async () => {
      spyOn<any>(service, 'confirmDialog').and.resolveTo(true);
      webhookService.deleteStartPoint.and.callFake(() => throwError(() => ({ status: 500, error: { error: 'boom' } })));
      const failed: any = await service.remove('scheduled');
      expect(failed.ok).toBeFalse();
      expect(failed.error).toBe('boom');
      expect(intentService.deleteIntentWithoutHistory).not.toHaveBeenCalled();
      webhookService.deleteStartPoint.and.callFake(() => throwError(() => ({ status: 404 })));
      expect(((await service.remove('scheduled')) as any).ok).toBeTrue();
      expect(intentService.deleteIntentWithoutHistory).toHaveBeenCalledTimes(1);
    });

    it('a second Delete while the box is being removed is in_progress (nothing to tell the user)', async () => {
      spyOn<any>(service, 'confirmDialog').and.resolveTo(true);
      const gate = new Subject<any>();
      webhookService.deleteStartPoint.and.callFake(() => gate);
      const first = service.remove('webhook');
      await flush();
      const second: any = await service.remove('webhook');
      expect(second).toEqual(jasmine.objectContaining({ ok: false, in_progress: true }));
      gate.next({}); gate.complete();
      expect(((await first) as any).ok).toBeTrue();
    });

    it('a 403 on DELETE is a failure (readonly) with the server sentence, not in_progress', async () => {
      spyOn<any>(service, 'confirmDialog').and.resolveTo(true);
      webhookService.deleteStartPoint.and.callFake(() => throwError(() => ({ status: 403, error: { error: 'Forbidden' } })));
      const res: any = await service.remove('scheduled');
      expect(res).toEqual({ ok: false, code: 'readonly', error: 'Forbidden' });
      expect(intentService.deleteIntentWithoutHistory).not.toHaveBeenCalled();
    });

    it('a user remove waits for an agent update of the same box: the DELETE never lands before the PUT', async () => {
      spyOn<any>(service, 'confirmDialog').and.resolveTo(true);
      webhook.start_points = [{ type: 'webhook', block_id: 'wh-box', enabled: true, mapping: { source_name: 'Alerts' } }];
      const order: string[] = [];
      const put = new Subject<any>();
      webhookService.upsertStartPoint.and.callFake(() => { order.push('put:start'); return put; });
      webhookService.deleteStartPoint.and.callFake(() => { order.push('delete'); return of({}); });
      const updating = service.update('webhook', { enabled: false });
      await flush();
      const removing = service.remove('webhook');
      await flush();
      expect(order).toEqual(['put:start']);
      order.push('put:end');
      put.next({}); put.complete();
      expect(((await updating) as any).ok).toBeTrue();
      expect(((await removing) as any).ok).toBeTrue();
      expect(order).toEqual(['put:start', 'put:end', 'delete']);
    });

    it('an update queued behind a remove of the same box finds it gone (missing), with no PUT', async () => {
      spyOn<any>(service, 'confirmDialog').and.resolveTo(true);
      const del = new Subject<any>();
      webhookService.deleteStartPoint.and.callFake(() => del);
      intentService.deleteIntentWithoutHistory.and.callFake(async (box: any) => {
        intentService.listOfIntents = intentService.listOfIntents.filter((i: any) => i !== box);
      });
      const removing = service.remove('webhook');
      await flush();
      const updating = service.update('webhook', { enabled: false });
      await flush();
      del.next({}); del.complete();
      expect(((await removing) as any).ok).toBeTrue();
      expect(((await updating) as any).code).toBe('missing');
      expect(webhookService.upsertStartPoint).not.toHaveBeenCalled();
    });

    it('operations on different types are not queued behind each other', async () => {
      spyOn<any>(service, 'confirmDialog').and.resolveTo(true);
      const put = new Subject<any>();
      webhookService.upsertStartPoint.and.callFake(() => put);
      const updating = service.update('webhook', { enabled: false });
      await flush();
      expect(((await service.remove('scheduled')) as any).ok).toBeTrue();
      put.next({}); put.complete();
      expect(((await updating) as any).ok).toBeTrue();
    });

    it('remove requires a present box', async () => {
      intentService.listOfIntents = [START];
      const ask = spyOn<any>(service, 'confirmDialog');
      expect(((await service.remove('webhook')) as any).code).toBe('missing');
      expect(ask).not.toHaveBeenCalled();
    });
  });

  it('returns readonly when the flow is read-only', async () => {
    readOnly.enable();
    intentService.listOfIntents = [START, WEBHOOK_BOX];
    const ask = spyOn<any>(service, 'confirmDialog');
    expect(((await service.add('scheduled')) as any).code).toBe('readonly');
    expect(((await service.update('webhook', { enabled: false })) as any).code).toBe('readonly');
    expect(((await service.remove('webhook')) as any).code).toBe('readonly');
    expect(ask).not.toHaveBeenCalled();
    expect(intentService.createIntentWithoutHistory).not.toHaveBeenCalled();
    expect(webhookService.upsertStartPoint).not.toHaveBeenCalled();
    expect(webhookService.deleteStartPoint).not.toHaveBeenCalled();
  });

  describe('web start', () => {
    const webStart = (extra: any = {}) => ({
      intent_id: 'start-id', id_faq_kb: 'bot1', intent_display_name: 'start',
      actions: [{ _tdActionId: 'a1', _tdActionType: 'intent', intentName: '#target' }],
      attributes: { position: { x: 100, y: 200 }, connectors: { 'start-id/a1/target': { color: 'c' }, 'start-id/other': { color: 'x' } }, nextBlockAction: { _tdActionId: 'n1', _tdActionType: 'intent', intentName: '#target' }, ...extra }
    });
    let start: any;
    beforeEach(() => {
      start = webStart();
      intentService.listOfIntents = [start];
    });

    it('disables web start: attribute set, outgoing connection cleared, intent kept', async () => {
      spyOn<any>(service, 'confirmDialog').and.resolveTo(true);
      const changes: any[] = [];
      service.webStartChanged$.subscribe(c => changes.push(c));
      const res: any = await service.remove('web');
      expect(res.ok).toBeTrue();
      expect(start.attributes.web_start_disabled).toBeTrue();
      expect(start.attributes.connectors).toEqual({ 'start-id/other': { color: 'x' } });
      expect(intentService.saveIntentWithoutHistory.calls.argsFor(0)[0].attributes.connectors).toEqual({ 'start-id/other': { color: 'x' } });
      expect(start.actions[0].intentName).toBe('');
      expect(start.attributes.nextBlockAction.intentName).toBe('');
      expect(connectorService.deleteConnectorsOutOfBlock).toHaveBeenCalledWith('start-id', false, true);
      expect(intentService.saveIntentWithoutHistory).toHaveBeenCalledTimes(1);
      const saved = intentService.saveIntentWithoutHistory.calls.argsFor(0)[0];
      expect(saved.attributes.web_start_disabled).toBeTrue();
      expect(saved.actions[0].intentName).toBe('');
      expect(intentService.deleteIntentWithoutHistory).not.toHaveBeenCalled();
      expect(intentService.deleteSavedIntentWithoutHistory).not.toHaveBeenCalled();
      expect(webhookService.deleteStartPoint).not.toHaveBeenCalled();
      expect(changes).toEqual([{ intent: start, disabled: true }]);
    });

    it('a failed save keeps web start enabled and connected', async () => {
      spyOn<any>(service, 'confirmDialog').and.resolveTo(true);
      intentService.saveIntentWithoutHistory.and.callFake(async () => { throw new Error('boom'); });
      const res: any = await service.remove('web');
      expect(res.ok).toBeFalse();
      expect(start.attributes.web_start_disabled).toBeUndefined();
      expect(start.actions[0].intentName).toBe('#target');
      expect(start.attributes.nextBlockAction.intentName).toBe('#target');
      expect(connectorService.deleteConnectorsOutOfBlock).not.toHaveBeenCalled();
    });

    it('re-enable clears a connection made while disabled, with its drawn connector', async () => {
      start = webStart({ web_start_disabled: true });
      intentService.listOfIntents = [start];
      const res: any = await service.add('web');
      expect(res.ok).toBeTrue();
      expect(start.actions[0].intentName).toBe('');
      expect(start.attributes.nextBlockAction.intentName).toBe('');
      expect(start.attributes.connectors).toEqual({ 'start-id/other': { color: 'x' } });
      expect(connectorService.deleteConnectorsOutOfBlock).toHaveBeenCalledWith('start-id', false, true);
    });

    it('two concurrent removes show one dialog', async () => {
      const gate = new Subject<boolean>();
      const ask = spyOn<any>(service, 'confirmDialog').and.callFake(() => new Promise(r => gate.subscribe(r)));
      const first = service.remove('web');
      await flush();
      const second: any = await service.remove('web');
      expect(second).toEqual(jasmine.objectContaining({ ok: false, in_progress: true }));
      expect(ask).toHaveBeenCalledTimes(1);
      gate.next(true);
      expect(((await first) as any).ok).toBeTrue();
    });

    it('re-enables web start: attribute cleared, box shown, unconnected', async () => {
      start = webStart({ web_start_disabled: true });
      start.actions[0].intentName = '';
      start.attributes.nextBlockAction.intentName = '';
      intentService.listOfIntents = [start];
      const changes: any[] = [];
      service.webStartChanged$.subscribe(c => changes.push(c));
      const res: any = await service.add('web');
      expect(res).toEqual(jasmine.objectContaining({ ok: true, type: 'web', intent_id: 'start-id' }));
      expect(start.attributes.web_start_disabled).toBeUndefined();
      expect(start.actions[0].intentName).toBe('');
      expect(intentService.saveIntentWithoutHistory).toHaveBeenCalledTimes(1);
      expect(changes).toEqual([{ intent: start, disabled: false }]);
    });

    it('add web while present is exists; remove web while disabled is missing', async () => {
      expect(((await service.add('web')) as any).code).toBe('exists');
      start.attributes.web_start_disabled = true;
      const ask = spyOn<any>(service, 'confirmDialog');
      expect(((await service.remove('web')) as any).code).toBe('missing');
      expect(ask).not.toHaveBeenCalled();
    });

    it('add web without a start block is missing; web takes no settings', async () => {
      start.attributes.web_start_disabled = true;
      expect(((await service.add('web', { enabled: true })) as any).code).toBe('invalid');
      intentService.listOfIntents = [];
      expect(((await service.add('web')) as any).code).toBe('missing');
      expect(((await service.update('web', {})) as any).code).toBe('invalid');
    });

    it('describes web as available when disabled and present otherwise', async () => {
      let web = (await service.describe()).find(d => d.type === 'web');
      expect(web).toEqual(jasmine.objectContaining({ status: 'present', removable: true, intent_id: 'start-id' }));
      start.attributes.web_start_disabled = true;
      web = (await service.describe()).find(d => d.type === 'web');
      expect(web.status).toBe('available');
      expect(web.removable).toBeTrue();
      expect(web.intent_id).toBeUndefined();
    });

    it('remove web asks for confirmation; cancel keeps it', async () => {
      const ask = spyOn<any>(service, 'confirmDialog').and.resolveTo(false);
      const res: any = await service.remove('web');
      expect(ask.calls.argsFor(0)[0]).toEqual(jasmine.objectContaining({ title: 'CDSCanvas.WebStartDeleteTitle', text: 'CDSCanvas.WebStartDeleteText' }));
      expect(res.code).toBe('declined');
      expect(start.attributes.web_start_disabled).toBeUndefined();
      expect(start.actions[0].intentName).toBe('#target');
      expect(intentService.saveIntentWithoutHistory).not.toHaveBeenCalled();
    });

    for (const subtype of ['voice', 'subagent']) {
      it(`describes every type as unavailable and not removable on subtype ${subtype}, naming it`, async () => {
        dashboardService.selectedChatbot.subtype = subtype;
        intentService.listOfIntents = [start, WEBHOOK_BOX];
        const list = await service.describe();
        expect(list.map(d => d.type)).toEqual(['web', 'webhook', 'scheduled']);
        list.forEach(d => {
          expect(d.status).toBe('unavailable');
          expect(d.removable).toBeFalse();
          expect(d.reason).toContain(subtype);
          expect(d.intent_id).toBeUndefined();
        });
      });

      it(`refuses disabling or re-enabling Web start on subtype ${subtype}`, async () => {
        dashboardService.selectedChatbot.subtype = subtype;
        const ask = spyOn<any>(service, 'confirmDialog').and.resolveTo(true);
        const off: any = await service.remove('web');
        expect(off.code).toBe('unavailable');
        expect(off.error).toContain(subtype);
        expect(ask).not.toHaveBeenCalled();
        start.attributes.web_start_disabled = true;
        const on: any = await service.add('web');
        expect(on.code).toBe('unavailable');
        expect(start.attributes.web_start_disabled).toBeTrue();
        expect(intentService.saveIntentWithoutHistory).not.toHaveBeenCalled();
      });
    }

    it('is readonly on a read-only flow', async () => {
      readOnly.enable();
      const ask = spyOn<any>(service, 'confirmDialog');
      expect(((await service.remove('web')) as any).code).toBe('readonly');
      start.attributes.web_start_disabled = true;
      expect(((await service.add('web')) as any).code).toBe('readonly');
      expect(ask).not.toHaveBeenCalled();
      expect(intentService.saveIntentWithoutHistory).not.toHaveBeenCalled();
    });
  });

  it('saving a block without history prunes the undo/redo entries that hold it (undo cannot restore the old start)', async () => {
    const snap = (id: string) => ({ type: 'put', intent: { intent_id: id } });
    const fake: any = {
      arrayUNDO: [{ undo: [snap('start-id')], redo: [snap('start-id')] }, { undo: [snap('other')], redo: [snap('other')] }],
      arrayREDO: [{ undo: [snap('start-id')], redo: [snap('start-id')] }],
      opsUpdate: jasmine.createSpy('opsUpdate').and.resolveTo(true),
      setBehaviorUndoRedo: jasmine.createSpy('setBehaviorUndoRedo'),
      refreshIntent: jasmine.createSpy('refreshIntent'),
    };
    await IntentService.prototype.saveIntentWithoutHistory.call(fake, { intent_id: 'start-id', id_faq_kb: 'bot1' } as any);
    expect(fake.arrayUNDO.length).toBe(1);
    expect(fake.arrayUNDO[0].undo[0].intent.intent_id).toBe('other');
    expect(fake.arrayREDO).toEqual([]);
    expect(fake.setBehaviorUndoRedo).toHaveBeenCalled();
  });

  it('a save or delete without history that prunes undo entries announces it (the chat Undo forgets its batch)', async () => {
    const snap = (id: string) => ({ type: 'put', intent: { intent_id: id } });
    const pruned = new Subject<void>();
    const seen: number[] = [];
    pruned.subscribe(() => seen.push(1));
    const fake: any = {
      arrayUNDO: [{ undo: [snap('other')], redo: [snap('other')] }],
      arrayREDO: [],
      undoHistoryPruned$: pruned,
      opsUpdate: jasmine.createSpy('opsUpdate').and.resolveTo(true),
      deleteIntentNew: jasmine.createSpy('deleteIntentNew').and.resolveTo(true),
      setBehaviorUndoRedo: jasmine.createSpy('setBehaviorUndoRedo'),
      refreshIntent: jasmine.createSpy('refreshIntent'),
    };
    // nothing of this block on the stack: nothing pruned, nothing announced
    await IntentService.prototype.saveIntentWithoutHistory.call(fake, { intent_id: 'start-id', id_faq_kb: 'bot1' } as any);
    expect(seen.length).toBe(0);
    fake.arrayUNDO.push({ undo: [snap('start-id')], redo: [snap('start-id')] });
    await IntentService.prototype.saveIntentWithoutHistory.call(fake, { intent_id: 'start-id', id_faq_kb: 'bot1' } as any);
    expect(seen.length).toBe(1);
    fake.arrayUNDO.push({ undo: [], redo: [snap('wh-box')] });
    await IntentService.prototype.deleteIntentWithoutHistory.call(fake, { intent_id: 'wh-box' } as any);
    expect(seen.length).toBe(2);
    expect(fake.arrayUNDO.length).toBe(1);
  });

  describe('IntentService default selection with Web start disabled', () => {
    const intentServiceWith = (intents: any[]) => {
      const svc: any = new IntentService(null, null, null, null, null, { selectedChatbot: { subtype: 'chatbot' } } as any, null, null, null, new ReadOnlyService());
      svc.listOfIntents = intents;
      return svc;
    };
    const hidden = () => ({ intent_id: 'start-id', intent_display_name: 'start', attributes: { web_start_disabled: true } });
    const block = { intent_id: 'b1', intent_display_name: 'welcome', attributes: {} };

    it('selects the start block while Web start is on', () => {
      const svc = intentServiceWith([block, START]);
      svc.setDefaultIntentSelected();
      expect(svc.intentSelected.intent_id).toBe('start-id');
    });

    it('selects the first visible start box when Web start is off, never the hidden start', () => {
      const svc = intentServiceWith([block, hidden(), SCHEDULED_BOX]);
      svc.setDefaultIntentSelected();
      expect(svc.intentSelected.intent_id).toBe('sc-box');
    });

    it('centres the stage on the visible start box when Web start is off, not on the hidden start', async () => {
      const stage = { centerStageOnHorizontalPosition: jasmine.createSpy('centerStageOnHorizontalPosition') };
      const svc: any = new IntentService(null, null, null, null, stage as any, { id_faq_kb: 'bot1', selectedChatbot: { subtype: 'chatbot' } } as any, null, null, null, new ReadOnlyService());
      svc.listOfIntents = [hidden(), SCHEDULED_BOX, block];
      const el = document.createElement('div');
      el.id = 'sc-box';
      document.body.appendChild(el);
      try {
        await svc.setStartIntent();
      } finally {
        el.remove();
      }
      expect(svc.intentSelected.intent_id).toBe('sc-box');
      expect(stage.centerStageOnHorizontalPosition).toHaveBeenCalledOnceWith('bot1', el);
    });

    it('selects the first block when Web start is off and there is no other start box', () => {
      const svc = intentServiceWith([hidden(), block]);
      svc.setDefaultIntentSelected();
      expect(svc.intentSelected.intent_id).toBe('b1');
    });
  });
});
