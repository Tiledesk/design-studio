import { TestBed } from '@angular/core/testing';
import { FlowOpsService } from './flow-ops.service';
import { IntentService } from '../services/intent.service';
import { ConnectorService } from '../services/connector.service';
import { DashboardService } from 'src/app/services/dashboard.service';
import { Intent } from 'src/app/models/intent-model';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

function anIntent(intentId: string, name: string): Intent {
  const intent = new Intent();
  intent.intent_id = intentId;
  intent.intent_display_name = name;
  intent.id_faq_kb = 'kb1';
  intent.actions = [];
  return intent;
}

/** A stand-in for ConnectorService that records what it was asked to draw. */
function aConnectorService(): any {
  return {
    createNewConnector: jasmine.createSpy('createNewConnector')
      .and.returnValue(Promise.resolve())
  };
}

/** The real IntentService pushes exactly one entry onto `arrayUNDO` per
 *  persistence call -- see updateIntent, saveNewIntent and deleteIntentNew. A
 *  fake that skips that bookkeeping cannot tell a per-batch undo from a
 *  per-operation one, so these spies keep it. */
function recordingUndo(name: string, stack: any[]): jasmine.Spy {
  return jasmine.createSpy(name).and.callFake(() => {
    stack.push({ undo: [], redo: [] });
    return Promise.resolve(true);
  });
}

describe('FlowOpsService — intent operations', () => {
  let service: FlowOpsService;
  let intentService: any;
  let dashboardService: any;
  let undoStack: any[];

  beforeEach(() => {
    undoStack = [];
    intentService = {
      listOfIntents: [
        anIntent('i1', 'start'), anIntent('i2', 'welcome'), anIntent('i3', 'checkout')
      ],
      arrayUNDO: undoStack,
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
      saveNewIntent: recordingUndo('saveNewIntent', undoStack),
      updateIntent: recordingUndo('updateIntent', undoStack),
      deleteIntentNew: recordingUndo('deleteIntentNew', undoStack),
      createNewAction: jasmine.createSpy('createNewAction'),
      setDragAndListnerEventToElement: jasmine.createSpy('setDragAndListnerEventToElement')
        .and.returnValue(Promise.resolve()),
      restoreLastUNDO: jasmine.createSpy('restoreLastUNDO')
        .and.callFake(() => { undoStack.pop(); })
    };
    dashboardService = { id_faq_kb: 'kb1' };

    TestBed.configureTestingModule({
      providers: [
        FlowOpsService,
        { provide: IntentService, useValue: intentService },
        { provide: ConnectorService, useValue: aConnectorService() },
        { provide: DashboardService, useValue: dashboardService }
      ]
    });
    service = TestBed.inject(FlowOpsService);
  });

  it('reads the flow as the list of intents', () => {
    const snapshot = service.readFlow();
    expect(snapshot.id_faq_kb).toBe('kb1');
    expect(snapshot.intents.length).toBe(3);
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

  it('registers drag on a newly created block, the way the studio\'s own creation paths do', async () => {
    // Without this, a block the agent creates renders and saves correctly but
    // cannot be dragged until the whole page is reloaded --
    // setDragAndListnerEventToElements() on load is what re-registers drag
    // for blocks that never got it. settingAndSaveNewIntent() in
    // cds-canvas.component.ts and pasteIntentOntoStage() in IntentService
    // both call setDragAndListnerEventToElement right after adding the
    // intent; add_intent has to do the same.
    await service.apply([{ op: 'add_intent', intent_display_name: 'greeting' }]);
    expect(intentService.setDragAndListnerEventToElement).toHaveBeenCalledWith('new-id');
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
      { op: 'update_intent', intent_id: 'i2', intent_display_name: 'ok' },
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

  it('undoes every operation of the applied batch, not just the last one', async () => {
    // The panel offers one Undo for the whole batch. Popping a single entry
    // would leave two of these three applied while the button disappears --
    // the studio's own restoreLastUNDO pops exactly one per call.
    const report = await service.apply([
      { op: 'update_intent', intent_id: 'i2', intent_display_name: 'a' },
      { op: 'update_intent', intent_id: 'i3', intent_display_name: 'b' },
      { op: 'move', intent_id: 'i1', position: { x: 1, y: 2 } }
    ]);
    expect(report.ok).toBe(true);
    expect(undoStack.length).toBe(3);

    service.undoLast();
    expect(intentService.restoreLastUNDO).toHaveBeenCalledTimes(3);
    expect(undoStack.length).toBe(0);
  });

  it('undoes only what the last batch applied, never a previous batch too', async () => {
    await service.apply([{ op: 'update_intent', intent_id: 'i2', intent_display_name: 'first' }]);
    await service.apply([
      { op: 'update_intent', intent_id: 'i2', intent_display_name: 'second' },
      { op: 'update_intent', intent_id: 'i3', intent_display_name: 'third' }
    ]);
    service.undoLast();
    expect(intentService.restoreLastUNDO).toHaveBeenCalledTimes(2);
    // The earlier batch's entry must survive: the user only asked to take
    // back the change they were just told about.
    expect(undoStack.length).toBe(1);
  });

  it('undoes nothing for a batch that was refused before it applied', async () => {
    await service.apply([{ op: 'update_intent', intent_id: 'i2', intent_display_name: 'ok' }]);
    await service.apply([{ op: 'move', intent_id: 'nope', position: { x: 0, y: 0 } }]);
    service.undoLast();
    expect(intentService.restoreLastUNDO).not.toHaveBeenCalled();
  });

  it('undoes only what actually applied when a batch failed midway', async () => {
    intentService.updateIntent.and.callFake((intent: Intent) => {
      if (intent.intent_id === 'i3') { return Promise.reject(new Error('network down')); }
      undoStack.push({ undo: [], redo: [] });
      return Promise.resolve(true);
    });
    await service.apply([
      { op: 'update_intent', intent_id: 'i2', intent_display_name: 'a' },
      { op: 'update_intent', intent_id: 'i3', intent_display_name: 'b' }
    ]);
    service.undoLast();
    expect(intentService.restoreLastUNDO).toHaveBeenCalledTimes(1);
  });

  it('reports honestly when application fails midway', async () => {
    intentService.updateIntent.and.callFake((intent: Intent) =>
      intent.intent_id === 'i3' ? Promise.reject(new Error('network down'))
                                : Promise.resolve(true));
    const report = await service.apply([
      { op: 'update_intent', intent_id: 'i2', intent_display_name: 'a' },
      { op: 'update_intent', intent_id: 'i3', intent_display_name: 'b' }
    ]);
    expect(report.ok).toBe(false);
    expect(report.rejected_before_applying).toBe(false);
    expect(report.results[0].ok).toBe(true);
    expect(report.results[1].ok).toBe(false);
    expect(report.results[1].error).toContain('network down');
  });
});

describe('FlowOpsService — display names obey the studio\'s own rules', () => {
  let service: FlowOpsService;
  let intentService: any;

  beforeEach(() => {
    intentService = {
      listOfIntents: [
        anIntent('i1', 'start'), anIntent('i2', 'welcome'), anIntent('i3', 'checkout')
      ],
      arrayUNDO: [],
      getIntentFromId(id: string) {
        return this.listOfIntents.find((i: Intent) => i.intent_id === id);
      },
      createNewIntent: jasmine.createSpy('createNewIntent')
        .and.callFake(() => anIntent('new-id', 'Untitled Block 1')),
      addNewIntentToListOfIntents: jasmine.createSpy('addNewIntentToListOfIntents'),
      saveNewIntent: jasmine.createSpy('saveNewIntent').and.returnValue(Promise.resolve(true)),
      updateIntent: jasmine.createSpy('updateIntent').and.returnValue(Promise.resolve(true)),
      deleteIntentNew: jasmine.createSpy('deleteIntentNew').and.returnValue(Promise.resolve(true)),
      createNewAction: jasmine.createSpy('createNewAction'),
      setDragAndListnerEventToElement: jasmine.createSpy('setDragAndListnerEventToElement')
        .and.returnValue(Promise.resolve()),
      restoreLastUNDO: jasmine.createSpy('restoreLastUNDO')
    };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        FlowOpsService,
        { provide: IntentService, useValue: intentService },
        { provide: ConnectorService, useValue: aConnectorService() },
        { provide: DashboardService, useValue: { id_faq_kb: 'kb1' } }
      ]
    });
    service = TestBed.inject(FlowOpsService);
  });

  /** Every one of these is refused by the UI's own rename validator in
   *  panel-intent-header.component.ts. */
  const badRenames: Array<{ why: string, name: string, expect: string }> = [
    { why: 'an empty name', name: '   ', expect: 'empty' },
    { why: 'punctuation the studio forbids', name: 'say-hello!', expect: 'valid block name' },
    { why: 'a name another block already has', name: 'checkout', expect: 'already called' },
    { why: 'a reserved name', name: 'defaultFallback', expect: 'reserved' }
  ];
  badRenames.forEach(({ why, name, expect: fragment }) => {
    it(`refuses a rename to ${why}, before anything is applied`, async () => {
      const report = await service.apply([
        { op: 'update_intent', intent_id: 'i2', intent_display_name: name }
      ]);
      expect(report.ok).toBe(false);
      expect(report.rejected_before_applying).toBe(true);
      expect(report.results[0].error).toContain(fragment);
      expect(intentService.updateIntent).not.toHaveBeenCalled();
      expect(intentService.getIntentFromId('i2').intent_display_name).toBe('welcome');
    });
  });

  it('refuses to rename the start block, which the studio finds by name', async () => {
    // setDefaultIntentSelected and cds-header's Test it out both locate the
    // start block with intent_display_name.trim() === 'start'. An agent
    // tidying up names could otherwise break flow selection outright.
    const report = await service.apply([
      { op: 'update_intent', intent_id: 'i1', intent_display_name: 'entry point' }
    ]);
    expect(report.ok).toBe(false);
    expect(report.results[0].error).toContain('reserved');
    expect(intentService.getIntentFromId('i1').intent_display_name).toBe('start');
  });

  it('applies a rename that meets every rule', async () => {
    const report = await service.apply([
      { op: 'update_intent', intent_id: 'i2', intent_display_name: 'say hello 2' }
    ]);
    expect(report.ok).toBe(true);
    expect(intentService.getIntentFromId('i2').intent_display_name).toBe('say hello 2');
  });

  it('lets a block keep its own name', async () => {
    // Uniqueness is checked against the other blocks, exactly as the UI does
    // -- a no-op rename is not a clash with itself.
    const report = await service.apply([
      { op: 'update_intent', intent_id: 'i2', intent_display_name: 'welcome', question: 'hi' }
    ]);
    expect(report.ok).toBe(true);
  });

  it('holds add_intent to the same rules as a rename', async () => {
    const report = await service.apply([
      { op: 'add_intent', intent_display_name: 'start' }
    ]);
    expect(report.ok).toBe(false);
    expect(report.rejected_before_applying).toBe(true);
    expect(report.results[0].error).toContain('reserved');
    expect(intentService.saveNewIntent).not.toHaveBeenCalled();
  });

  it('still lets add_intent leave the name to the studio', async () => {
    const report = await service.apply([{ op: 'add_intent' }]);
    expect(report.ok).toBe(true);
  });
});

describe('FlowOpsService — action operations', () => {
  let service: FlowOpsService;
  let intentService: any;
  let connectorService: any;

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
    connectorService = aConnectorService();

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        FlowOpsService,
        { provide: IntentService, useValue: intentService },
        { provide: ConnectorService, useValue: connectorService },
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

  it('connects two intents by pointing a connect_block action at the target id', async () => {
    const report = await service.apply([
      { op: 'connect', from_intent_id: 'i1', to_intent_id: 'i2' }
    ]);
    expect(report.ok).toBe(true);
    expect(intentService.createNewAction).toHaveBeenCalledWith('connect_block');
    const actions: any[] = intentService.getIntentFromId('i1').actions;
    const connector = actions[actions.length - 1];

    // The studio's contract, from IntentService.getListOfIntents(): the value
    // the UI assigns to intentName is '#' + intent_id. A display name here
    // draws nothing and is blanked on the next connector refresh.
    expect(connector.intentName).toBe('#i2');
    // And the id has to be readable to a human somewhere, or the action
    // renders unlabelled.
    expect(connector._tdActionTitle).toBe('welcome');
  });

  it('writes an intentName that resolves back to the target intent', async () => {
    // The point of this assertion is the round trip, not the write. A test
    // that only checked the string written is what let a display name -- which
    // resolves to nothing -- sit here reported as a success.
    await service.apply([{ op: 'connect', from_intent_id: 'i1', to_intent_id: 'i2' }]);
    const actions: any[] = intentService.getIntentFromId('i1').actions;
    const connector = actions[actions.length - 1];

    // Exactly what ConnectorService does on every refresh.
    const resolvedId = connector.intentName.replace('#', '');
    const resolved = intentService.getIntentFromId(resolvedId);
    expect(resolved).toBeTruthy();
    expect(resolved.intent_id).toBe('i2');
  });

  it('draws the connector immediately, through the studio\'s own path', async () => {
    // Operations apply immediately (design decision 4). A correct intentName
    // alone leaves the user staring at an unchanged canvas until something
    // rebuilds connectors -- so FlowOps makes the same call the UI makes from
    // cds-panel-action-detail's onConnectorChange.
    await service.apply([{ op: 'connect', from_intent_id: 'i1', to_intent_id: 'i2' }]);
    const actions: any[] = intentService.getIntentFromId('i1').actions;
    const connector = actions[actions.length - 1];

    expect(connectorService.createNewConnector)
      .toHaveBeenCalledWith(`i1/${connector._tdActionId}`, 'i2');
  });
});

describe('FlowOpsService — add_intent with inline actions', () => {
  let service: FlowOpsService;
  let intentService: any;
  let actionIdCounter: number;

  beforeEach(() => {
    actionIdCounter = 0;
    intentService = {
      listOfIntents: [anIntent('i1', 'start')],
      arrayUNDO: [],
      getIntentFromId(id: string) {
        return this.listOfIntents.find((i: Intent) => i.intent_id === id);
      },
      createNewIntent: jasmine.createSpy('createNewIntent')
        .and.callFake((id_faq_kb: string, action: any, pos: any) => {
          const intent = anIntent('new-id', 'Untitled Block 1');
          intent.attributes.position = pos;
          return intent;
        }),
      addNewIntentToListOfIntents: jasmine.createSpy('addNewIntentToListOfIntents'),
      saveNewIntent: jasmine.createSpy('saveNewIntent').and.returnValue(Promise.resolve(true)),
      updateIntent: jasmine.createSpy('updateIntent').and.returnValue(Promise.resolve(true)),
      deleteIntentNew: jasmine.createSpy('deleteIntentNew').and.returnValue(Promise.resolve(true)),
      // Mirrors the real createNewAction: pure, no side effects, undefined
      // for a type the studio cannot build.
      createNewAction: jasmine.createSpy('createNewAction').and.callFake((type: string) => {
        if (type === 'nonsense') { return undefined; }
        return { _tdActionId: `act-${type}-${actionIdCounter++}`, _tdActionType: type };
      }),
      setDragAndListnerEventToElement: jasmine.createSpy('setDragAndListnerEventToElement')
        .and.returnValue(Promise.resolve()),
      restoreLastUNDO: jasmine.createSpy('restoreLastUNDO')
    };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        FlowOpsService,
        { provide: IntentService, useValue: intentService },
        { provide: ConnectorService, useValue: aConnectorService() },
        { provide: DashboardService, useValue: { id_faq_kb: 'kb1' } }
      ]
    });
    service = TestBed.inject(FlowOpsService);
  });

  it('creates the block with both actions, in order, built via createNewAction, with fields applied', async () => {
    const report = await service.apply([{
      op: 'add_intent',
      intent_display_name: 'Chiedi Email',
      position: { x: 350, y: 200 },
      actions: [
        { type: 'reply', fields: { text: 'Qual è la tua email?' } },
        { type: 'capture_user_reply', fields: { assignResultTo: 'user_email' } }
      ]
    }]);

    expect(report.ok).toBe(true);
    expect(report.results[0].intent_id).toBe('new-id');

    // Both actions must be built through createNewAction -- never assembled
    // from the raw op JSON. validate() calls it once per action too, to prove
    // buildability before anything is created, so both types appear among the
    // calls rather than at a fixed index; the order actually applied is
    // asserted below, on the saved intent's own action array.
    expect(intentService.createNewAction).toHaveBeenCalledWith('reply');
    expect(intentService.createNewAction).toHaveBeenCalledWith('capture_user_reply');

    const savedIntent = intentService.saveNewIntent.calls.mostRecent().args[0];
    expect(savedIntent.actions.length).toBe(2);
    expect(savedIntent.actions[0]._tdActionType).toBe('reply');
    expect(savedIntent.actions[0].text).toBe('Qual è la tua email?');
    expect(savedIntent.actions[1]._tdActionType).toBe('capture_user_reply');
    expect(savedIntent.actions[1].assignResultTo).toBe('user_email');
  });

  it('behaves exactly as before when actions is omitted', async () => {
    const report = await service.apply([
      { op: 'add_intent', intent_display_name: 'greeting', position: { x: 1, y: 2 } }
    ]);
    expect(report.ok).toBe(true);
    expect(intentService.createNewAction).not.toHaveBeenCalled();
    const savedIntent = intentService.saveNewIntent.calls.mostRecent().args[0];
    expect(savedIntent.actions).toEqual([]);
  });

  it('refuses the whole batch when an action has an unbuildable type, before anything is created', async () => {
    const report = await service.apply([{
      op: 'add_intent',
      intent_display_name: 'Chiedi Email',
      actions: [
        { type: 'reply', fields: { text: 'hi' } },
        { type: 'nonsense' }
      ]
    }]);

    expect(report.ok).toBe(false);
    expect(report.rejected_before_applying).toBe(true);
    expect(report.results[0].error).toContain('nonsense');

    // Nothing was created: not the intent, not either action.
    expect(intentService.createNewIntent).not.toHaveBeenCalled();
    expect(intentService.addNewIntentToListOfIntents).not.toHaveBeenCalled();
    expect(intentService.saveNewIntent).not.toHaveBeenCalled();
    expect(intentService.listOfIntents.length).toBe(1);
    expect(intentService.listOfIntents.some((i: Intent) => i.intent_display_name === 'Chiedi Email'))
      .toBe(false);
  });

  it('refuses a batch whose action has no type, before anything is created', async () => {
    const report = await service.apply([{
      op: 'add_intent',
      actions: [{ fields: { text: 'hi' } } as any]
    }]);
    expect(report.ok).toBe(false);
    expect(report.rejected_before_applying).toBe(true);
    expect(intentService.createNewIntent).not.toHaveBeenCalled();
  });

  it('ignores a forged _tdActionId or _tdActionType in an action\'s fields', async () => {
    await service.apply([{
      op: 'add_intent',
      actions: [{
        type: 'reply',
        fields: { _tdActionId: 'forged', _tdActionType: 'agent', text: 'hi' }
      }]
    }]);
    const savedIntent = intentService.saveNewIntent.calls.mostRecent().args[0];
    // The id and type on the saved action must be the ones createNewAction
    // itself produced -- validate() calls it once to prove buildability and
    // addIntent calls it again to build for real, so the exact counter value
    // is an artifact of the double call, not something to pin down here.
    expect(savedIntent.actions[0]._tdActionId).not.toBe('forged');
    expect(savedIntent.actions[0]._tdActionId).toMatch(/^act-reply-\d+$/);
    expect(savedIntent.actions[0]._tdActionType).toBe('reply');
    expect(savedIntent.actions[0].text).toBe('hi');
  });
});

describe('FlowOpsService — what connect writes, read back by the studio itself', () => {
  let service: FlowOpsService;
  let intentService: any;

  beforeEach(() => {
    // The real ConnectorService logs through the app-wide logger singleton,
    // which nothing has set up in a spec run.
    LoggerInstance.setInstance({
      log() {}, error() {}, warn() {}, info() {}, debug() {}, setLoggerConfig() {}
    } as any);

    intentService = {
      listOfIntents: [anIntent('i1', 'start'), anIntent('i2', 'welcome')],
      arrayUNDO: [],
      getIntentFromId(id: string) {
        return this.listOfIntents.find((i: Intent) => i.intent_id === id);
      },
      createNewAction: jasmine.createSpy('createNewAction').and.callFake((type: string) =>
        ({ _tdActionId: 'act-1', _tdActionType: type })),
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
        { provide: ConnectorService, useValue: aConnectorService() },
        { provide: DashboardService, useValue: { id_faq_kb: 'kb1' } }
      ]
    });
    service = TestBed.inject(FlowOpsService);
  });

  async function connectAndTakeTheAction(): Promise<any> {
    await service.apply([{ op: 'connect', from_intent_id: 'i1', to_intent_id: 'i2' }]);
    const from = intentService.getIntentFromId('i1');
    return from.actions[from.actions.length - 1];
  }

  it('survives ConnectorService\'s real connector refresh, and draws an edge', async () => {
    // The whole feature has been asserted against hand-written fakes, and a
    // fake cannot notice that the studio reads intentName back differently
    // from how FlowOps wrote it. This runs the produced intent through the
    // real ConnectorService: its own id resolution, its own intentExists
    // check, and its own erasure of an intentName that resolves to nothing.
    const action = await connectAndTakeTheAction();
    const from = intentService.getIntentFromId('i1');

    const connectors = new ConnectorService();
    connectors.listOfIntents = intentService.listOfIntents;
    // Only the drawing is stubbed out -- it wants a rendered canvas and a
    // jsPlumb-style stage. Everything under test here (the '#' strip, the
    // intentExists lookup, the blanking) is the real code above it.
    const drawn: Array<{ fromId: string, toId: string }> = [];
    (connectors as any).createConnector = (_intent: any, fromId: string, toId: string) => {
      drawn.push({ fromId, toId });
    };

    await connectors.createConnectorsOfIntent(from);

    // A display name would not resolve, so the refresh would blank it here
    // and the user's connection would vanish with nothing said.
    expect(action.intentName).toBe('#i2');
    expect(drawn).toEqual([{ fromId: 'i1/act-1', toId: 'i2' }]);
  });

  it('writes one of the values IntentService itself offers for a connect_block', async () => {
    const action = await connectAndTakeTheAction();
    // getListOfIntents() is where the UI's dropdown gets the value it assigns
    // to intentName -- the definition of the contract, called for real.
    const offered = IntentService.prototype.getListOfIntents
      .call({ listOfIntents: intentService.listOfIntents });
    expect(offered.map((o: any) => o.value)).toContain(action.intentName);
    // And the label the agent set is the name offered beside that value.
    expect(offered.find((o: any) => o.value === action.intentName).name)
      .toBe(action._tdActionTitle);
  });
});

describe('FlowOpsService — refusing to destroy the scaffold\'s structure', () => {
  // assignFields does a shallow Object.assign-style overwrite: a caller's
  // nested object replaces the scaffolded one wholesale. createNewAction's
  // ActionAssignVariableV2 builds operation: { operands: [...], operators: [] }
  // -- structure cds-action-assign-variable-v2.component.html dereferences
  // with a hard `.operands.length`, past the optional chain on `operation?.`.
  // A fields.operation that drops `operands` produces an action the renderer
  // throws on forever. These tests are the regression for that live defect.
  let service: FlowOpsService;
  let intentService: any;

  function scaffoldFor(type: string): any {
    if (type === 'nonsense') { return undefined; }
    if (type === 'setattribute-v2') {
      return {
        _tdActionId: 'generated',
        _tdActionType: 'setattribute-v2',
        destination: '',
        operation: { operands: [{ value: '', isVariable: false }], operators: [] }
      };
    }
    if (type === 'webrequestv2') {
      // The real ActionWebRequestV2 scaffold (action-model.ts) -- headersString,
      // settings and assignments are objects, but every one of their own
      // values is a scalar (or, for assignments, there are none at all).
      // None of that is structure a renderer depends on; it's just starting
      // defaults a person can freely replace through the panel.
      return {
        _tdActionId: 'generated',
        _tdActionType: 'webrequestv2',
        method: 'GET',
        url: '',
        headersString: {
          'Content-Type': '*/*', 'Cache-Control': 'no-cache',
          'User-Agent': 'BotRuntime', 'Accept': '*/*'
        },
        settings: { timeout: 20000 },
        jsonBody: null,
        formData: [],
        bodyType: 'none',
        assignResultTo: 'result',
        assignStatusTo: 'status',
        assignErrorTo: 'error',
        assignments: {}
      };
    }
    if (type === 'reply') {
      // The real createNewAction(TYPE_ACTION.REPLY) scaffold: attributes is
      // an object, but unlike headersString/settings it holds a container of
      // its own (`commands`) -- the same shape cds-action-reply.component.ts
      // dereferences with a hard `this.action.attributes.commands`, no `?.`
      // at all. It must stay protected even though it happens to share the
      // field name "attributes" with ActionHideMessage's unprotected,
      // scalar-only { subtype: "info" }.
      return {
        _tdActionId: 'generated',
        _tdActionType: 'reply',
        text: undefined,
        attributes: {
          disableInputMessage: false,
          commands: [{ type: 'wait' }, { type: 'message' }]
        }
      };
    }
    return { _tdActionId: 'generated', _tdActionType: type };
  }

  beforeEach(() => {
    const withAction = anIntent('i1', 'start');
    // The existing action already carries a sub-key (`operation.type`) that a
    // freshly built setattribute-v2 would not have -- exactly what saving a
    // valid edit through the studio's own panel would leave behind.
    withAction.actions = [{
      _tdActionId: 'existing-1',
      _tdActionType: 'setattribute-v2',
      destination: 'incident_id',
      operation: {
        operands: [{ value: '', isVariable: false }],
        operators: [],
        type: 'now'
      }
    } as any];

    intentService = {
      listOfIntents: [withAction, anIntent('i2', 'welcome')],
      arrayUNDO: [],
      getIntentFromId(id: string) {
        return this.listOfIntents.find((i: Intent) => i.intent_id === id);
      },
      createNewIntent: jasmine.createSpy('createNewIntent')
        .and.callFake((id_faq_kb: string, action: any, pos: any) => {
          const intent = anIntent('new-id', 'Untitled Block 1');
          intent.attributes.position = pos;
          return intent;
        }),
      addNewIntentToListOfIntents: jasmine.createSpy('addNewIntentToListOfIntents'),
      saveNewIntent: jasmine.createSpy('saveNewIntent').and.returnValue(Promise.resolve(true)),
      updateIntent: jasmine.createSpy('updateIntent').and.returnValue(Promise.resolve(true)),
      deleteIntentNew: jasmine.createSpy('deleteIntentNew').and.returnValue(Promise.resolve(true)),
      createNewAction: jasmine.createSpy('createNewAction').and.callFake(scaffoldFor),
      setDragAndListnerEventToElement: jasmine.createSpy('setDragAndListnerEventToElement')
        .and.returnValue(Promise.resolve()),
      restoreLastUNDO: jasmine.createSpy('restoreLastUNDO')
    };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        FlowOpsService,
        { provide: IntentService, useValue: intentService },
        { provide: ConnectorService, useValue: aConnectorService() },
        { provide: DashboardService, useValue: { id_faq_kb: 'kb1' } }
      ]
    });
    service = TestBed.inject(FlowOpsService);
  });

  it('refuses add_action fields that delete the scaffold\'s nested keys -- the reported defect', async () => {
    const report = await service.apply([{
      op: 'add_action', intent_id: 'i2', type: 'setattribute-v2',
      fields: { operation: { type: 'now' }, destination: 'incident_timestamp' }
    }]);
    expect(report.ok).toBe(false);
    expect(report.rejected_before_applying).toBe(true);
    expect(report.results[0].error).toContain('setattribute-v2');
    expect(report.results[0].error).toContain('operands');
    expect(intentService.getIntentFromId('i2').actions.length).toBe(0);
  });

  it('refuses the same shape through add_intent\'s inline actions', async () => {
    const report = await service.apply([{
      op: 'add_intent',
      actions: [{ type: 'setattribute-v2', fields: { operation: { type: 'now' } } }]
    }]);
    expect(report.ok).toBe(false);
    expect(report.rejected_before_applying).toBe(true);
    expect(report.results[0].error).toContain('operands');
    expect(intentService.saveNewIntent).not.toHaveBeenCalled();
  });

  it('accepts an operation carrying every scaffold key plus an extra one', async () => {
    const report = await service.apply([{
      op: 'add_action', intent_id: 'i2', type: 'setattribute-v2',
      fields: {
        operation: {
          operands: [{ value: '', isVariable: false }],
          operators: [],
          type: 'now'
        }
      }
    }]);
    expect(report.ok).toBe(true);
    const added = intentService.getIntentFromId('i2').actions[0];
    expect(added.operation.type).toBe('now');
  });

  it('accepts an array wholesale replacing the scaffold\'s array', async () => {
    const report = await service.apply([{
      op: 'add_action', intent_id: 'i2', type: 'setattribute-v2',
      fields: {
        operation: {
          operands: [{ value: 'x', isVariable: true }, { value: 'y', isVariable: false }],
          operators: ['+']
        }
      }
    }]);
    expect(report.ok).toBe(true);
    const added = intentService.getIntentFromId('i2').actions[0];
    expect(added.operation.operands.length).toBe(2);
  });

  it('leaves a scalar field free to change on its own', async () => {
    const report = await service.apply([{
      op: 'add_action', intent_id: 'i2', type: 'setattribute-v2',
      fields: { destination: 'my_var' }
    }]);
    expect(report.ok).toBe(true);
    expect(intentService.getIntentFromId('i2').actions[0].destination).toBe('my_var');
  });

  it('accepts a full headersString replacement, since it holds only defaults and no structure', async () => {
    // The false positive: headersString scaffolds four default header
    // strings a person can freely delete or replace through the panel.
    // Refusing an agent that sends only Authorization -- dropping the
    // defaults entirely -- would block ordinary header configuration, which
    // is most of the point of a web request action. Pinned here so the
    // refined "protected only if it holds a container value" rule can't
    // regress back to treating every scaffolded object as structure.
    const report = await service.apply([{
      op: 'add_action', intent_id: 'i2', type: 'webrequestv2',
      fields: { headersString: { Authorization: 'Bearer x' } }
    }]);
    expect(report.ok).toBe(true);
    const added = intentService.getIntentFromId('i2').actions[0];
    expect(added.headersString).toEqual({ Authorization: 'Bearer x' });
  });

  it('still refuses an attributes object that drops the commands array a reply action renders from', async () => {
    // Confirms the refined rule does not overcorrect: a scaffolded object
    // that DOES hold a container (attributes.commands, an array) stays
    // protected, even though a differently-shaped, unrelated field
    // (ActionHideMessage.attributes) happens to share its name and is not.
    const report = await service.apply([{
      op: 'add_action', intent_id: 'i2', type: 'reply',
      fields: { attributes: { disableInputMessage: true } }
    }]);
    expect(report.ok).toBe(false);
    expect(report.rejected_before_applying).toBe(true);
    expect(report.results[0].error).toContain('commands');
    expect(intentService.getIntentFromId('i2').actions.length).toBe(0);
  });

  it('compares update_action against the existing action, so the user\'s own prior edit is not refused', async () => {
    // The fixture's existing action already has operation.type = 'now' -- not
    // something a fresh setattribute-v2 scaffold has. Changing only
    // destination must not be refused on the grounds that a *freshly built*
    // action wouldn't have that sub-key.
    const report = await service.apply([{
      op: 'update_action', intent_id: 'i1', action_id: 'existing-1',
      fields: { destination: 'new_dest' }
    }]);
    expect(report.ok).toBe(true);
    expect(intentService.getIntentFromId('i1').actions[0].destination).toBe('new_dest');
  });

  it('still refuses update_action fields that would delete keys the existing action already has', async () => {
    const report = await service.apply([{
      op: 'update_action', intent_id: 'i1', action_id: 'existing-1',
      fields: { operation: { type: 'now' } }
    }]);
    expect(report.ok).toBe(false);
    expect(report.rejected_before_applying).toBe(true);
    expect(report.results[0].error).toContain('operands');
    // Nothing applied: the existing action's operation is untouched.
    expect(intentService.getIntentFromId('i1').actions[0].operation.type).toBe('now');
  });

  // A live run found the loophole this closes: "replacing an array with
  // another array is fine" let a caller keep every key of a protected
  // object (ActionReply.attributes: disableInputMessage + commands) while
  // emptying the one array among them that actually matters. The
  // missing-keys check above only ever looked at *presence*, never at
  // whether a kept array had been hollowed out.
  it('refuses fields.attributes that keeps every key but empties the non-empty commands array -- the reported defect', async () => {
    const report = await service.apply([{
      op: 'add_action', intent_id: 'i2', type: 'reply',
      fields: { attributes: { disableInputMessage: false, commands: [] } }
    }]);
    expect(report.ok).toBe(false);
    expect(report.rejected_before_applying).toBe(true);
    expect(report.results[0].error).toContain('commands');
    expect(intentService.getIntentFromId('i2').actions.length).toBe(0);
  });

  it('refuses the same emptied array even with an accompanying text field -- the literal reported payload', async () => {
    // The exact combination that reached the canvas live: fields carried
    // both `text` and an `attributes` whose `commands` had been emptied.
    // With the guard fixed, this is refused before writeReplyText (the
    // text mapping) ever runs -- the two fixes are complementary, not
    // redundant: this stops the corruption from being written at all, and
    // the text mapping's own self-healing (see the "self-heals" tests in
    // the reply-text describe block) covers whatever this guard cannot see,
    // such as commands emptied by a route that never touches `fields.attributes`.
    const report = await service.apply([{
      op: 'add_action', intent_id: 'i2', type: 'reply',
      fields: { text: 'Qual è la tua email?', attributes: { disableInputMessage: false, commands: [] } }
    }]);
    expect(report.ok).toBe(false);
    expect(intentService.getIntentFromId('i2').actions.length).toBe(0);
  });

  it('still lets a scaffolded EMPTY array be freely replaced -- webrequestv2.formData starts empty', async () => {
    // The refined rule only protects a *non-empty* scaffolded array; an
    // empty one (a real case from action-model.ts: ActionWebRequestV2's
    // `formData = []`, never populated by createNewAction) stays exactly as
    // freely replaceable as before -- the caller filling it in is the
    // normal case, not damage.
    const report = await service.apply([{
      op: 'add_action', intent_id: 'i2', type: 'webrequestv2',
      fields: { formData: [{ key: 'file', type: 'file' }] }
    }]);
    expect(report.ok).toBe(true);
    const added = intentService.getIntentFromId('i2').actions[0];
    expect(added.formData).toEqual([{ key: 'file', type: 'file' }]);
  });
});

/** The real `createNewAction(REPLY | REPLYV2 | RANDOM_REPLY)` scaffold
 *  (intent.service.ts): a top-level `text` the studio never reads, and the
 *  actual visible text nested at `attributes.commands[1].message.text` --
 *  the same place `cds-action-reply`/`-v2` read it
 *  (`this.arrayResponses = this.action.attributes.commands`, and
 *  `cds-action-reply-text`'s `@Input() response: Message` bound to that
 *  command's `.message`). */
function replyScaffold(type: string): any {
  return {
    _tdActionId: 'generated',
    _tdActionType: type,
    text: undefined,
    attributes: {
      disableInputMessage: false,
      commands: [
        { type: 'wait', time: 500 },
        { type: 'message', message: { type: 'text', text: 'A chat message will be sent to the visitor' } }
      ]
    }
  };
}

describe('FlowOpsService — a reply\'s requested text lands where the studio reads it', () => {
  let service: FlowOpsService;
  let intentService: any;

  beforeEach(() => {
    const withReply = anIntent('i1', 'start');
    withReply.actions = [replyScaffold('reply')];
    withReply.actions[0]._tdActionId = 'reply-1';

    intentService = {
      listOfIntents: [withReply, anIntent('i2', 'welcome')],
      arrayUNDO: [],
      getIntentFromId(id: string) {
        return this.listOfIntents.find((i: Intent) => i.intent_id === id);
      },
      createNewIntent: jasmine.createSpy('createNewIntent')
        .and.callFake((id_faq_kb: string, action: any, pos: any) => {
          const intent = anIntent('new-id', 'Untitled Block 1');
          intent.attributes.position = pos;
          return intent;
        }),
      addNewIntentToListOfIntents: jasmine.createSpy('addNewIntentToListOfIntents'),
      saveNewIntent: jasmine.createSpy('saveNewIntent').and.returnValue(Promise.resolve(true)),
      updateIntent: jasmine.createSpy('updateIntent').and.returnValue(Promise.resolve(true)),
      deleteIntentNew: jasmine.createSpy('deleteIntentNew').and.returnValue(Promise.resolve(true)),
      // Mirrors the real createNewAction for the three reply-family types:
      // every one of them is scaffolded exactly this way in intent.service.ts.
      createNewAction: jasmine.createSpy('createNewAction').and.callFake((type: string) => {
        if (['reply', 'replyv2', 'randomreply'].indexOf(type) !== -1) {
          return replyScaffold(type);
        }
        return { _tdActionId: 'generated', _tdActionType: type };
      }),
      setDragAndListnerEventToElement: jasmine.createSpy('setDragAndListnerEventToElement')
        .and.returnValue(Promise.resolve()),
      restoreLastUNDO: jasmine.createSpy('restoreLastUNDO')
    };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        FlowOpsService,
        { provide: IntentService, useValue: intentService },
        { provide: ConnectorService, useValue: aConnectorService() },
        { provide: DashboardService, useValue: { id_faq_kb: 'kb1' } }
      ]
    });
    service = TestBed.inject(FlowOpsService);
  });

  it('add_action reply with fields.text writes the message command\'s text, not only the ignored top-level field', async () => {
    const report = await service.apply([{
      op: 'add_action', intent_id: 'i2', type: 'reply',
      fields: { text: 'Benvenuto nel nostro servizio di assistenza clienti!' }
    }]);
    expect(report.ok).toBe(true);
    const added = intentService.getIntentFromId('i2').actions[0];
    expect(added.attributes.commands[1].message.text)
      .toBe('Benvenuto nel nostro servizio di assistenza clienti!');
    // Harmless to also carry it top-level -- just not the only place it lands.
    expect(added.text).toBe('Benvenuto nel nostro servizio di assistenza clienti!');
  });

  it('add_intent\'s inline reply action writes the message command\'s text the same way', async () => {
    const report = await service.apply([{
      op: 'add_intent',
      actions: [{ type: 'reply', fields: { text: 'Ciao, come posso aiutarti?' } }]
    }]);
    expect(report.ok).toBe(true);
    const savedIntent = intentService.saveNewIntent.calls.mostRecent().args[0];
    expect(savedIntent.actions[0].attributes.commands[1].message.text).toBe('Ciao, come posso aiutarti?');
  });

  it('covers replyv2, the same scaffold shape as reply', async () => {
    await service.apply([{
      op: 'add_action', intent_id: 'i2', type: 'replyv2', fields: { text: 'v2 text' }
    }]);
    const added = intentService.getIntentFromId('i2').actions[0];
    expect(added.attributes.commands[1].message.text).toBe('v2 text');
  });

  it('covers randomreply, the same scaffold shape as reply', async () => {
    await service.apply([{
      op: 'add_action', intent_id: 'i2', type: 'randomreply', fields: { text: 'random text' }
    }]);
    const added = intentService.getIntentFromId('i2').actions[0];
    expect(added.attributes.commands[1].message.text).toBe('random text');
  });

  it('update_action on an existing reply updates the message command\'s text too', async () => {
    const report = await service.apply([{
      op: 'update_action', intent_id: 'i1', action_id: 'reply-1',
      fields: { text: 'Updated wording' }
    }]);
    expect(report.ok).toBe(true);
    const updated = intentService.getIntentFromId('i1').actions[0];
    expect(updated.attributes.commands[1].message.text).toBe('Updated wording');
    expect(updated.text).toBe('Updated wording');
  });

  it('leaves an action with no message command alone -- text-bearing fields on other types are untouched', async () => {
    await service.apply([{
      op: 'add_action', intent_id: 'i2', type: 'close', fields: { text: 'not a reply' }
    }]);
    const added = intentService.getIntentFromId('i2').actions[0];
    expect(added.attributes).toBeUndefined();
    expect(added.text).toBe('not a reply');
  });

  // A live run surfaced a second-order bug: the scaffold guard's array rule
  // ("replacing an array with another array is fine") let a caller keep both
  // of ActionReply.attributes's keys while emptying `commands` to `[]`. The
  // text mapping above then found no message command to write into and fell
  // back to the ignored top-level `text` -- the block asked nothing. Fixed
  // on two fronts: `flow-ops.service.spec.ts`'s "refusing to destroy the
  // scaffold's structure" block now refuses that exact input at validation
  // (see the two new tests there), but this text mapping is made
  // self-sufficient regardless -- it must not depend on the guard, a future
  // caller, or a future rule change leaving the command in place. These
  // three tests exercise that directly, each with `commands` already `[]`
  // by the time writeReplyText runs.
  it('self-heals a reply\'s message command via add_action when the scaffold\'s commands arrive already empty', async () => {
    // Simulates commands having been emptied by some means other than
    // fields.attributes (fields here never mentions attributes at all, so
    // the guard has nothing to refuse) -- the scenario the guard fix cannot
    // cover by construction, and exactly what this self-sufficiency is for.
    intentService.createNewAction.and.callFake((type: string) => ({
      _tdActionId: 'generated', _tdActionType: type, text: undefined,
      attributes: { disableInputMessage: false, commands: [] }
    }));
    const report = await service.apply([{
      op: 'add_action', intent_id: 'i2', type: 'reply',
      fields: { text: 'Qual è la tua email?' }
    }]);
    expect(report.ok).toBe(true);
    const added = intentService.getIntentFromId('i2').actions[0];
    const messageCommand = added.attributes.commands.find((c: any) => c && c.message);
    expect(messageCommand).toBeTruthy();
    expect(messageCommand.message.text).toBe('Qual è la tua email?');
  });

  it('self-heals the same way through add_intent\'s inline reply action', async () => {
    intentService.createNewAction.and.callFake((type: string) => ({
      _tdActionId: 'generated', _tdActionType: type, text: undefined,
      attributes: { disableInputMessage: false, commands: [] }
    }));
    const report = await service.apply([{
      op: 'add_intent',
      actions: [{ type: 'reply', fields: { text: 'Qual è la tua email?' } }]
    }]);
    expect(report.ok).toBe(true);
    const savedIntent = intentService.saveNewIntent.calls.mostRecent().args[0];
    const messageCommand = savedIntent.actions[0].attributes.commands.find((c: any) => c && c.message);
    expect(messageCommand).toBeTruthy();
    expect(messageCommand.message.text).toBe('Qual è la tua email?');
  });

  it('self-heals update_action on an existing reply whose commands were already emptied -- the exact shape observed live', async () => {
    // {"_tdActionType":"reply","attributes":{"disableInputMessage":false,
    //  "commands":[]},"text":"Qual è la tua email?"} -- the actual corrupted
    // document from the live run, reconstructed here as the action already
    // on the canvas before this update_action runs.
    const intent = intentService.getIntentFromId('i1');
    intent.actions = [{
      _tdActionId: 'reply-1', _tdActionType: 'reply',
      attributes: { disableInputMessage: false, commands: [] },
      text: 'Qual è la tua email?'
    }];
    const report = await service.apply([{
      op: 'update_action', intent_id: 'i1', action_id: 'reply-1',
      fields: { text: 'Qual è la tua email?' }
    }]);
    expect(report.ok).toBe(true);
    const updated = intentService.getIntentFromId('i1').actions[0];
    const messageCommand = updated.attributes.commands.find((c: any) => c && c.message);
    expect(messageCommand).toBeTruthy();
    expect(messageCommand.message.text).toBe('Qual è la tua email?');
  });
});

describe('FlowOpsService — add_intent lays new blocks out left to right', () => {
  let service: FlowOpsService;
  let intentService: any;

  function intentAt(id: string, name: string, x: number, y: number): Intent {
    const intent = anIntent(id, name);
    intent.attributes.position = { x, y };
    return intent;
  }

  beforeEach(() => {
    intentService = {
      listOfIntents: [
        intentAt('i1', 'start', 0, 0),
        intentAt('i2', 'welcome', 300, 40),
        intentAt('i3', 'checkout', 150, 500)
      ],
      arrayUNDO: [],
      getIntentFromId(id: string) {
        return this.listOfIntents.find((i: Intent) => i.intent_id === id);
      },
      createNewIntent: jasmine.createSpy('createNewIntent')
        .and.callFake((id_faq_kb: string, action: any, pos: any) => {
          const intent = anIntent('new-' + (intentService.listOfIntents.length + 1), 'Untitled Block');
          intent.attributes.position = pos;
          return intent;
        }),
      // The real addNewIntentToListOfIntents pushes onto listOfIntents --
      // reproduced here because a batch of add_intent operations must see
      // each other's blocks to lay out left to right rather than stacking.
      addNewIntentToListOfIntents: jasmine.createSpy('addNewIntentToListOfIntents')
        .and.callFake((intent: Intent) => { intentService.listOfIntents.push(intent); }),
      saveNewIntent: jasmine.createSpy('saveNewIntent').and.returnValue(Promise.resolve(true)),
      updateIntent: jasmine.createSpy('updateIntent').and.returnValue(Promise.resolve(true)),
      deleteIntentNew: jasmine.createSpy('deleteIntentNew').and.returnValue(Promise.resolve(true)),
      createNewAction: jasmine.createSpy('createNewAction'),
      setDragAndListnerEventToElement: jasmine.createSpy('setDragAndListnerEventToElement')
        .and.returnValue(Promise.resolve()),
      restoreLastUNDO: jasmine.createSpy('restoreLastUNDO')
    };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        FlowOpsService,
        { provide: IntentService, useValue: intentService },
        { provide: ConnectorService, useValue: aConnectorService() },
        { provide: DashboardService, useValue: { id_faq_kb: 'kb1' } }
      ]
    });
    service = TestBed.inject(FlowOpsService);
  });

  it('places a position-less block to the right of the rightmost existing block, not stacked at the origin', async () => {
    const report = await service.apply([{ op: 'add_intent', intent_display_name: 'next step' }]);
    expect(report.ok).toBe(true);
    const addedIntent = intentService.addNewIntentToListOfIntents.calls.mostRecent().args[0];
    // Rightmost existing block is i2 at x:300 -- the new one must land
    // further right than that, not at (0,0) where the old default put it.
    expect(addedIntent.attributes.position.x).toBeGreaterThan(300);
    // On that same block's baseline (y), not a downward march.
    expect(addedIntent.attributes.position.y).toBe(40);
  });

  it('gives three position-less blocks in one batch three distinct, non-overlapping x positions', async () => {
    const report = await service.apply([
      { op: 'add_intent', intent_display_name: 'step one' },
      { op: 'add_intent', intent_display_name: 'step two' },
      { op: 'add_intent', intent_display_name: 'step three' }
    ]);
    expect(report.ok).toBe(true);
    const placed = intentService.addNewIntentToListOfIntents.calls.allArgs().map((args: any[]) => args[0]);
    expect(placed.length).toBe(3);
    const xs = placed.map((i: Intent) => i.attributes.position.x);
    // Strictly increasing, and each gap at least a block-width wide so two
    // blocks can never overlap.
    expect(xs[1]).toBeGreaterThan(xs[0]);
    expect(xs[2]).toBeGreaterThan(xs[1]);
    expect(xs[1] - xs[0]).toBeGreaterThanOrEqual(264);
    expect(xs[2] - xs[1]).toBeGreaterThanOrEqual(264);
  });

  it('still honours an explicit position from the caller, unchanged', async () => {
    const report = await service.apply([
      { op: 'add_intent', intent_display_name: 'exact spot', position: { x: 42, y: 99 } }
    ]);
    expect(report.ok).toBe(true);
    const addedIntent = intentService.addNewIntentToListOfIntents.calls.mostRecent().args[0];
    expect(addedIntent.attributes.position).toEqual({ x: 42, y: 99 });
  });

  it('places the very first block at the origin when the canvas has no positioned blocks at all', async () => {
    intentService.listOfIntents = [];
    const report = await service.apply([{ op: 'add_intent', intent_display_name: 'first' }]);
    expect(report.ok).toBe(true);
    const addedIntent = intentService.addNewIntentToListOfIntents.calls.mostRecent().args[0];
    expect(addedIntent.attributes.position).toEqual({ x: 0, y: 0 });
  });
});
