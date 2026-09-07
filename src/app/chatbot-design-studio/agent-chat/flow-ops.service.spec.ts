import { TestBed } from '@angular/core/testing';
import { FlowOpsService } from './flow-ops.service';
import { IntentService } from '../services/intent.service';
import { DashboardService } from 'src/app/services/dashboard.service';
import { Intent } from 'src/app/models/intent-model';

function anIntent(intentId: string, name: string): Intent {
  const intent = new Intent();
  intent.intent_id = intentId;
  intent.intent_display_name = name;
  intent.id_faq_kb = 'kb1';
  intent.actions = [];
  return intent;
}

describe('FlowOpsService — intent operations', () => {
  let service: FlowOpsService;
  let intentService: any;
  let dashboardService: any;

  beforeEach(() => {
    intentService = {
      listOfIntents: [anIntent('i1', 'start'), anIntent('i2', 'welcome')],
      getIntentFromId(id: string) {
        return this.listOfIntents.find((i: Intent) => i.intent_id === id);
      },
      createNewIntent: jasmine.createSpy('createNewIntent')
        .and.callFake((id_faq_kb: string, action: any, pos: any) => {
          // Mirrors the real IntentService.createNewIntent, which stores the
          // requested position on the new intent -- so tests can tell a
          // dropped position from one that was threaded through correctly.
          const intent = anIntent('new-id', 'Untitled Block 1');
          intent.attributes.position = pos;
          return intent;
        }),
      addNewIntentToListOfIntents: jasmine.createSpy('addNewIntentToListOfIntents'),
      saveNewIntent: jasmine.createSpy('saveNewIntent').and.returnValue(Promise.resolve(true)),
      updateIntent: jasmine.createSpy('updateIntent').and.returnValue(Promise.resolve(true)),
      deleteIntentNew: jasmine.createSpy('deleteIntentNew').and.returnValue(Promise.resolve(true)),
      createNewAction: jasmine.createSpy('createNewAction'),
      restoreLastUNDO: jasmine.createSpy('restoreLastUNDO')
    };
    dashboardService = { id_faq_kb: 'kb1' };

    TestBed.configureTestingModule({
      providers: [
        FlowOpsService,
        { provide: IntentService, useValue: intentService },
        { provide: DashboardService, useValue: dashboardService }
      ]
    });
    service = TestBed.inject(FlowOpsService);
  });

  it('reads the flow as the list of intents', () => {
    const snapshot = service.readFlow();
    expect(snapshot.id_faq_kb).toBe('kb1');
    expect(snapshot.intents.length).toBe(2);
  });

  it('adds an intent and reports its id', async () => {
    const report = await service.apply([
      { op: 'add_intent', intent_display_name: 'greeting', position: { x: 10, y: 20 } }
    ]);
    expect(report.ok).toBe(true);
    expect(report.results[0].intent_id).toBe('new-id');

    // Assert on what was actually handed to the persistence calls, not just
    // that they were called -- a dropped display name or position would
    // still pass a bare toHaveBeenCalled().
    const addedIntent = intentService.addNewIntentToListOfIntents.calls.mostRecent().args[0];
    expect(addedIntent.intent_display_name).toBe('greeting');
    expect(addedIntent.attributes.position).toEqual({ x: 10, y: 20 });

    const savedIntent = intentService.saveNewIntent.calls.mostRecent().args[0];
    expect(savedIntent.intent_display_name).toBe('greeting');
    expect(savedIntent.attributes.position).toEqual({ x: 10, y: 20 });
  });

  it('renames an intent through updateIntent', async () => {
    const report = await service.apply([
      { op: 'update_intent', intent_id: 'i2', intent_display_name: 'hello' }
    ]);
    expect(report.ok).toBe(true);
    expect(intentService.getIntentFromId('i2').intent_display_name).toBe('hello');
    expect(intentService.updateIntent).toHaveBeenCalled();
  });

  it('deletes an intent', async () => {
    const report = await service.apply([{ op: 'delete_intent', intent_id: 'i2' }]);
    expect(report.ok).toBe(true);
    // Assert the deletion targeted i2 specifically -- an implementation that
    // always deleted listOfIntents[0] would still pass a bare
    // toHaveBeenCalled().
    const deletedIntent = intentService.deleteIntentNew.calls.mostRecent().args[0];
    expect(deletedIntent.intent_id).toBe('i2');
  });

  it('moves an intent', async () => {
    await service.apply([{ op: 'move', intent_id: 'i1', position: { x: 5, y: 6 } }]);
    expect(intentService.getIntentFromId('i1').attributes.position).toEqual({ x: 5, y: 6 });
  });

  it('refuses an unknown intent_id and applies nothing', async () => {
    const report = await service.apply([
      { op: 'update_intent', intent_id: 'i1', intent_display_name: 'ok' },
      { op: 'update_intent', intent_id: 'nope', intent_display_name: 'bad' }
    ]);
    expect(report.ok).toBe(false);
    expect(report.rejected_before_applying).toBe(true);
    expect(report.results[1].error).toContain('nope');
    // The valid first operation must not have been applied either.
    expect(intentService.updateIntent).not.toHaveBeenCalled();
  });

  it('refuses a move with no position and applies nothing', async () => {
    const report = await service.apply([
      { op: 'move', intent_id: 'i1' } as any
    ]);
    expect(report.ok).toBe(false);
    expect(report.rejected_before_applying).toBe(true);
    expect(report.results[0].error).toContain('position');
    expect(intentService.updateIntent).not.toHaveBeenCalled();
  });

  it('refuses an unknown operation name', async () => {
    const report = await service.apply([{ op: 'explode' } as any]);
    expect(report.ok).toBe(false);
    expect(report.results[0].error).toContain('explode');
  });

  it('refuses an empty batch', async () => {
    const report = await service.apply([]);
    expect(report.ok).toBe(false);
  });

  it('reports honestly when application fails midway', async () => {
    intentService.updateIntent.and.callFake((intent: Intent) =>
      intent.intent_id === 'i2' ? Promise.reject(new Error('network down'))
                                : Promise.resolve(true));
    const report = await service.apply([
      { op: 'update_intent', intent_id: 'i1', intent_display_name: 'a' },
      { op: 'update_intent', intent_id: 'i2', intent_display_name: 'b' }
    ]);
    expect(report.ok).toBe(false);
    expect(report.rejected_before_applying).toBe(false);
    expect(report.results[0].ok).toBe(true);
    expect(report.results[1].ok).toBe(false);
    expect(report.results[1].error).toContain('network down');
  });
});

describe('FlowOpsService — action operations', () => {
  let service: FlowOpsService;
  let intentService: any;

  beforeEach(() => {
    const withAction = anIntent('i1', 'start');
    withAction.actions = [{ _tdActionId: 'a1', _tdActionType: 'reply', text: 'hi' } as any];

    intentService = {
      listOfIntents: [withAction, anIntent('i2', 'welcome')],
      getIntentFromId(id: string) {
        return this.listOfIntents.find((i: Intent) => i.intent_id === id);
      },
      createNewAction: jasmine.createSpy('createNewAction').and.callFake((type: string) => {
        if (type === 'nonsense') { return undefined; }
        return { _tdActionId: 'generated', _tdActionType: type };
      }),
      updateIntent: jasmine.createSpy('updateIntent').and.returnValue(Promise.resolve(true)),
      createNewIntent: jasmine.createSpy('createNewIntent'),
      addNewIntentToListOfIntents: jasmine.createSpy('addNewIntentToListOfIntents'),
      saveNewIntent: jasmine.createSpy('saveNewIntent').and.returnValue(Promise.resolve(true)),
      deleteIntentNew: jasmine.createSpy('deleteIntentNew').and.returnValue(Promise.resolve(true)),
      restoreLastUNDO: jasmine.createSpy('restoreLastUNDO')
    };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        FlowOpsService,
        { provide: IntentService, useValue: intentService },
        { provide: DashboardService, useValue: { id_faq_kb: 'kb1' } }
      ]
    });
    service = TestBed.inject(FlowOpsService);
  });

  it('builds an action with createNewAction rather than from raw json', async () => {
    const report = await service.apply([
      { op: 'add_action', intent_id: 'i2', type: 'reply', fields: { text: 'hello' } }
    ]);
    expect(intentService.createNewAction).toHaveBeenCalledWith('reply');
    expect(report.results[0].action_id).toBe('generated');
    const added: any = intentService.getIntentFromId('i2').actions[0];
    expect(added._tdActionType).toBe('reply');
    expect(added.text).toBe('hello');
  });

  it('inserts at an index when one is given', async () => {
    await service.apply([{ op: 'add_action', intent_id: 'i1', type: 'reply', index: 0 }]);
    expect(intentService.getIntentFromId('i1').actions[0]._tdActionId).toBe('generated');
  });

  it('refuses an action type the studio cannot build', async () => {
    const report = await service.apply([
      { op: 'add_action', intent_id: 'i1', type: 'nonsense' }
    ]);
    expect(report.ok).toBe(false);
    expect(report.results[0].error).toContain('nonsense');
  });

  it('never lets fields overwrite an action identity', async () => {
    await service.apply([{
      op: 'add_action', intent_id: 'i2', type: 'reply',
      fields: { _tdActionId: 'forged', _tdActionType: 'agent', text: 'x' }
    }]);
    const added: any = intentService.getIntentFromId('i2').actions[0];
    expect(added._tdActionId).toBe('generated');
    expect(added._tdActionType).toBe('reply');
  });

  it('updates an existing action', async () => {
    await service.apply([
      { op: 'update_action', intent_id: 'i1', action_id: 'a1', fields: { text: 'bye' } }
    ]);
    expect(intentService.getIntentFromId('i1').actions[0].text).toBe('bye');
    expect(intentService.updateIntent).toHaveBeenCalled();
  });

  it('refuses to update an action that is not there', async () => {
    const report = await service.apply([
      { op: 'update_action', intent_id: 'i1', action_id: 'ghost', fields: { text: 'x' } }
    ]);
    expect(report.ok).toBe(false);
    expect(report.rejected_before_applying).toBe(true);
    expect(report.results[0].error).toContain('ghost');
  });

  it('deletes an action', async () => {
    await service.apply([{ op: 'delete_action', intent_id: 'i1', action_id: 'a1' }]);
    expect(intentService.getIntentFromId('i1').actions.length).toBe(0);
  });

  it('connects two intents by naming the target on a connect_block action', async () => {
    const report = await service.apply([
      { op: 'connect', from_intent_id: 'i1', to_intent_id: 'i2' }
    ]);
    expect(report.ok).toBe(true);
    expect(intentService.createNewAction).toHaveBeenCalledWith('connect_block');
    const actions: any[] = intentService.getIntentFromId('i1').actions;
    const connector = actions[actions.length - 1];
    expect(connector.intentName).toBe('welcome');
  });
});
