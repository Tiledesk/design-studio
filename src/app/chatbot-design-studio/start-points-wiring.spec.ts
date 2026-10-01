import { of, Subject } from 'rxjs';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { SavingStateService } from 'src/app/services/saving-state.service';
import { ReadOnlyService } from 'src/app/services/read-only.service';
import { IntentService } from './services/intent.service';
import { CdsIntentComponent } from './cds-dashboard/cds-canvas/cds-intent/cds-intent.component';
import { createStartPointBox, createStartPointBlock } from './utils-start-points';

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
});
