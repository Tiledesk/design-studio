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
      .and.returnValue(Promise.resolve()),
    createConnectorFromId: jasmine.createSpy('createConnectorFromId')
      .and.returnValue(Promise.resolve(true)),
    deleteConnectorWithIDStartingWith: jasmine.createSpy('deleteConnectorWithIDStartingWith'),
    // The data-driven, whole-intent builder redrawBlockConnectors actually
    // uses -- not updateConnectorsOfBlock, which reads DOM attributes Angular
    // has not re-rendered yet by the time FlowOps calls it, and whose delete
    // path hits a pre-existing, unrelated master bug. See redrawBlockConnectors's
    // own doc comment in flow-ops.service.ts for the full story.
    createConnectorsOfIntent: jasmine.createSpy('createConnectorsOfIntent')
      .and.returnValue(Promise.resolve()),
    deleteConnectorsOutOfBlock: jasmine.createSpy('deleteConnectorsOutOfBlock')
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

  it('connects two intents by pointing the source block\'s connector dot at the target id', async () => {
    const report = await service.apply([
      { op: 'connect', from_intent_id: 'i1', to_intent_id: 'i2' }
    ]);
    expect(report.ok).toBe(true);
    const from = intentService.getIntentFromId('i1');
    const connector = from.attributes.nextBlockAction;

    // The studio's contract, from IntentService.getListOfIntents(): the value
    // the UI assigns to intentName is '#' + intent_id. A display name here
    // draws nothing and is blanked on the next connector refresh.
    expect(connector.intentName).toBe('#i2');
  });

  it('does not append a connect_block, or any intent-type action, to the source block\'s actions', async () => {
    // The dot and an action-list entry are mutually exclusive by design --
    // isActionIntent in cds-intent.component.ts suppresses the dot outright
    // when actions carries a TYPE_ACTION.INTENT entry. connect must never
    // write to actions at all.
    const before = intentService.getIntentFromId('i1').actions.length;
    await service.apply([{ op: 'connect', from_intent_id: 'i1', to_intent_id: 'i2' }]);
    const actions: any[] = intentService.getIntentFromId('i1').actions;
    expect(actions.length).toBe(before);
    expect(actions.some((a: any) => a._tdActionType === 'connect_block')).toBe(false);
    expect(actions.some((a: any) => a._tdActionType === 'intent')).toBe(false);
  });

  it('creates the dot\'s action when the block has none yet', async () => {
    const from = intentService.getIntentFromId('i1');
    from.attributes = {};
    await service.apply([{ op: 'connect', from_intent_id: 'i1', to_intent_id: 'i2' }]);
    expect(intentService.createNewAction).toHaveBeenCalledWith('intent');
    expect(from.attributes.nextBlockAction.intentName).toBe('#i2');
  });

  it('retargets an already-connected block instead of accumulating a second dot', async () => {
    const from = intentService.getIntentFromId('i1');
    // Points somewhere unresolvable to start with, so the assertion below
    // proves the value actually changed rather than merely surviving.
    from.attributes = { nextBlockAction: { _tdActionId: 'existing-dot', _tdActionType: 'intent', intentName: '#bogus' } };
    const report = await service.apply([{ op: 'connect', from_intent_id: 'i1', to_intent_id: 'i2' }]);
    expect(report.ok).toBe(true);
    // createNewAction must not be called again -- the existing dot is reused.
    expect(intentService.createNewAction).not.toHaveBeenCalled();
    // Still exactly one dot, retargeted rather than accumulated.
    expect(from.attributes.nextBlockAction._tdActionId).toBe('existing-dot');
    expect(from.attributes.nextBlockAction.intentName).toBe('#i2');
  });

  it('writes an intentName that resolves back to the target intent', async () => {
    // The point of this assertion is the round trip, not the write. A test
    // that only checked the string written is what let a display name -- which
    // resolves to nothing -- sit here reported as a success.
    await service.apply([{ op: 'connect', from_intent_id: 'i1', to_intent_id: 'i2' }]);
    const connector = intentService.getIntentFromId('i1').attributes.nextBlockAction;

    // Exactly what ConnectorService does on every refresh.
    const resolvedId = connector.intentName.replace('#', '');
    const resolved = intentService.getIntentFromId(resolvedId);
    expect(resolved).toBeTruthy();
    expect(resolved.intent_id).toBe('i2');
  });

  it('redraws the block immediately, through the same delete-then-rebuild every other write uses', async () => {
    // Operations apply immediately (design decision 4). A correct intentName
    // alone leaves the user staring at an unchanged canvas until something
    // rebuilds connectors -- so FlowOps asks ConnectorService to redraw the
    // block, same as update_action/add_action do for a routing field.
    // connect used to draw through its own create-only call
    // (createConnectorFromId); it now goes through redrawBlockConnectors
    // instead, so a retarget clears the old edge too -- see the "retargets"
    // describe block below for that half of the story.
    const report = await service.apply([{ op: 'connect', from_intent_id: 'i1', to_intent_id: 'i2' }]);
    expect(report.ok).toBe(true);

    expect(connectorService.deleteConnectorsOutOfBlock).toHaveBeenCalledWith('i1', false, false);
    expect(connectorService.createConnectorsOfIntent).toHaveBeenCalledTimes(1);
    const drawnFrom = connectorService.createConnectorsOfIntent.calls.mostRecent().args[0];
    expect(drawnFrom.intent_id).toBe('i1');
    expect(drawnFrom.attributes.nextBlockAction.intentName).toBe('#i2');

    // The old create-only path is gone, not merely unused by this test.
    expect(connectorService.createConnectorFromId).not.toHaveBeenCalled();
  });
});

describe('FlowOpsService — redrawing a block\'s connectors after a routing field is written', () => {
  // The reported defect: an agent-set trueIntent/falseIntent (or goToIntent,
  // or any other routing field) lands correctly in the model and is
  // persisted, but the canvas draws nothing until a full reload rebuilds
  // every connector from the saved data.
  //
  // These assert on createConnectorsOfIntent specifically -- the method that
  // actually reads the model and draws -- and, where it matters, on the
  // *intent object* it was handed, so a regression back to
  // updateConnectorsOfBlock (which reads stale DOM attributes instead of the
  // model, and was the first, wrong version of this fix) fails these for the
  // same reason it fails in the app: never called with anything, because it
  // never receives the data it would need to draw from. A bare
  // "was the connector service called" assertion would not have caught that
  // -- updateConnectorsOfBlock direction was "called" too, it just drew
  // nothing and, on the delete branch, threw. See the next describe block
  // for a real-DOM test that counts actual drawn elements, the way the
  // defect was actually confirmed.
  let service: FlowOpsService;
  let intentService: any;
  let connectorService: any;

  beforeEach(() => {
    // i1 routes conditionally through an askgptv2 action, born unconfigured
    // (trueIntent/falseIntent both blank) so an update_action in these tests
    // is the thing that actually configures it -- not something already
    // routed before the operation under test runs.
    const withCondition = anIntent('i1', 'Search KB');
    withCondition.actions = [
      { _tdActionId: 'a-cond', _tdActionType: 'askgptv2', trueIntent: '', falseIntent: '' } as any,
      { _tdActionId: 'a-text', _tdActionType: 'reply', text: 'hi' } as any
    ];
    // i3 carries a capture_user_reply action, whose destination field is
    // goToIntent rather than trueIntent/falseIntent -- a different entry in
    // CONDITIONAL_ROUTER_FIELDS, covered separately so the fix is proven
    // against more than one field name.
    const withCapture = anIntent('i3', 'Capture Email');
    withCapture.actions = [
      { _tdActionId: 'a-cap', _tdActionType: 'capture_user_reply', goToIntent: '' } as any
    ];
    const withOwnCondition = anIntent('i4', 'Transfer Or Not');
    withOwnCondition.actions = [
      { _tdActionId: 'a-cond2', _tdActionType: 'askgptv2', trueIntent: '', falseIntent: '' } as any
    ];

    intentService = {
      listOfIntents: [
        withCondition, anIntent('i2', 'Answer Found'), withCapture, withOwnCondition
      ],
      getIntentFromId(id: string) {
        return this.listOfIntents.find((i: Intent) => i.intent_id === id);
      },
      createNewAction: jasmine.createSpy('createNewAction'),
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

  it('redraws the block after update_action sets an askgptv2\'s trueIntent and falseIntent, handing the mutated intent to createConnectorsOfIntent', async () => {
    const report = await service.apply([{
      op: 'update_action', intent_id: 'i1', action_id: 'a-cond',
      fields: { trueIntent: '#i2', falseIntent: '#i2' }
    }]);
    expect(report.ok).toBe(true);
    expect(connectorService.createConnectorsOfIntent).toHaveBeenCalledTimes(1);

    // Not just "called" -- called with the actual intent object carrying the
    // destination this operation just wrote. This is the read-back that
    // catches a fix that redraws from stale data (or from nothing).
    const drawnFrom = connectorService.createConnectorsOfIntent.calls.mostRecent().args[0];
    expect(drawnFrom.intent_id).toBe('i1');
    const drawnAction = drawnFrom.actions.find((a: any) => a._tdActionId === 'a-cond');
    expect(drawnAction.trueIntent).toBe('#i2');
    expect(drawnAction.falseIntent).toBe('#i2');
  });

  it('redraws the block after update_action sets capture_user_reply\'s goToIntent, handing the mutated intent to createConnectorsOfIntent', async () => {
    const report = await service.apply([{
      op: 'update_action', intent_id: 'i3', action_id: 'a-cap',
      fields: { goToIntent: '#i2' }
    }]);
    expect(report.ok).toBe(true);
    expect(connectorService.createConnectorsOfIntent).toHaveBeenCalledTimes(1);
    const drawnFrom = connectorService.createConnectorsOfIntent.calls.mostRecent().args[0];
    expect(drawnFrom.intent_id).toBe('i3');
    expect(drawnFrom.actions.find((a: any) => a._tdActionId === 'a-cap').goToIntent).toBe('#i2');
  });

  it('does not redraw when update_action sets no destination field', async () => {
    const report = await service.apply([
      { op: 'update_action', intent_id: 'i1', action_id: 'a-text', fields: { text: 'bye' } }
    ]);
    expect(report.ok).toBe(true);
    expect(connectorService.createConnectorsOfIntent).not.toHaveBeenCalled();
    expect(connectorService.deleteConnectorsOutOfBlock).not.toHaveBeenCalled();
  });

  it('clears the block\'s previously-drawn outgoing connectors before rebuilding, so a retargeted destination does not leave the old edge on screen', async () => {
    // Jasmine's CallInfo carries no invocation-order timestamp, so ordering
    // is observed the direct way: each spy's default behaviour is kept, but
    // wrapped to also record its name into a shared, order-preserving array.
    const order: string[] = [];
    connectorService.deleteConnectorsOutOfBlock.and.callFake(() => { order.push('delete'); });
    connectorService.createConnectorsOfIntent.and.callFake(() => {
      order.push('create');
      return Promise.resolve();
    });

    const report = await service.apply([{
      op: 'update_action', intent_id: 'i1', action_id: 'a-cond', fields: { trueIntent: '#i2' }
    }]);
    expect(report.ok).toBe(true);
    expect(connectorService.deleteConnectorsOutOfBlock).toHaveBeenCalledWith('i1', false, false);
    // Cleared before the rebuild, not after -- rebuilding onto a still-dirty
    // block would either draw nothing (blocked by an id collision with the
    // stale edge) or leave the stale one standing next to the new one.
    expect(order).toEqual(['delete', 'create']);
  });

  it('redraws every affected block once each in a batch that touches three blocks, not once per operation', async () => {
    const report = await service.apply([
      { op: 'update_action', intent_id: 'i1', action_id: 'a-cond', fields: { trueIntent: '#i2' } },
      { op: 'update_action', intent_id: 'i3', action_id: 'a-cap', fields: { goToIntent: '#i2' } },
      { op: 'update_action', intent_id: 'i4', action_id: 'a-cond2', fields: { falseIntent: '#i2' } },
      // A second write to i1 in the same batch: still one redraw for i1, not
      // two -- the whole point of redrawing once per affected block after
      // the batch, rather than once per operation.
      { op: 'update_action', intent_id: 'i1', action_id: 'a-cond', fields: { falseIntent: '#i2' } }
    ]);

    expect(report.ok).toBe(true);
    expect(connectorService.createConnectorsOfIntent).toHaveBeenCalledTimes(3);
    const drawnIds = connectorService.createConnectorsOfIntent.calls.allArgs()
      .map((args: any[]) => args[0].intent_id).sort();
    expect(drawnIds).toEqual(['i1', 'i3', 'i4']);
    // i1's redraw happened after both of its operations applied, so it
    // carries the *second* write (falseIntent), not a stale mid-batch copy.
    const i1Drawn = connectorService.createConnectorsOfIntent.calls.allArgs()
      .find((args: any[]) => args[0].intent_id === 'i1')[0];
    const i1Action = i1Drawn.actions.find((a: any) => a._tdActionId === 'a-cond');
    expect(i1Action.trueIntent).toBe('#i2');
    expect(i1Action.falseIntent).toBe('#i2');
  });

  it('still reports ok:true when the redraw itself throws', async () => {
    connectorService.createConnectorsOfIntent.and.callFake(() => {
      throw new Error('canvas not ready');
    });
    const report = await service.apply([{
      op: 'update_action', intent_id: 'i1', action_id: 'a-cond',
      fields: { trueIntent: '#i2', falseIntent: '#i2' }
    }]);
    expect(report.ok).toBe(true);
    expect(report.results[0].ok).toBe(true);
    expect(connectorService.createConnectorsOfIntent).toHaveBeenCalledTimes(1);
  });

  it('still redraws when clearing the block\'s old connectors first throws', async () => {
    // deleteConnectorsOutOfBlock and createConnectorsOfIntent are each
    // independently best-effort -- one failing must not stop the other from
    // being tried.
    connectorService.deleteConnectorsOutOfBlock.and.callFake(() => {
      throw new Error('nothing to clear yet');
    });
    const report = await service.apply([{
      op: 'update_action', intent_id: 'i1', action_id: 'a-cond', fields: { trueIntent: '#i2' }
    }]);
    expect(report.ok).toBe(true);
    expect(connectorService.createConnectorsOfIntent).toHaveBeenCalledTimes(1);
  });

  it('still reports ok:true when the redraw\'s own promise rejects', async () => {
    connectorService.createConnectorsOfIntent.and.returnValue(Promise.reject(new Error('stage gone')));
    const report = await service.apply([{
      op: 'update_action', intent_id: 'i1', action_id: 'a-cond',
      fields: { trueIntent: '#i2' }
    }]);
    expect(report.ok).toBe(true);
    expect(report.results[0].ok).toBe(true);
  });
});

describe('FlowOpsService — connect retargets whichever mechanism is actually live', () => {
  // Every `start` block ships with a TYPE_ACTION.INTENT entry already in its
  // `actions` -- that's the live connector for it, and it suppresses the
  // block's own dot outright (isActionIntent in cds-intent.component.ts).
  // Writing attributes.nextBlockAction on such a block, as the dot-only
  // implementation did, changes a field nothing reads: the canvas keeps
  // showing the old edge from the actions-list action. These tests cover the
  // branch that retargets that action instead, mirroring
  // cds-action-intent.component.ts's own onChangeSelect.
  let service: FlowOpsService;
  let intentService: any;
  let connectorService: any;

  function intentWithActionIntent(id: string, name: string): Intent {
    const intent = anIntent(id, name);
    intent.actions = [{
      _tdActionId: 'existing-action-intent',
      _tdActionType: 'intent',
      intentName: ''
    } as any];
    return intent;
  }

  beforeEach(() => {
    intentService = {
      listOfIntents: [
        intentWithActionIntent('i1', 'start'), anIntent('i2', 'welcome'), anIntent('i3', 'checkout')
      ],
      getIntentFromId(id: string) {
        return this.listOfIntents.find((i: Intent) => i.intent_id === id);
      },
      createNewAction: jasmine.createSpy('createNewAction').and.callFake((type: string) =>
        ({ _tdActionId: 'generated', _tdActionType: type })),
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

  it('retargets the actions-list intent action and leaves the (suppressed) dot untouched', async () => {
    const from = intentService.getIntentFromId('i1');
    // A real Intent is born with attributes.nextBlockAction already
    // scaffolded -- capture it so the assertion below proves connect left it
    // exactly alone, not merely that it stayed present.
    const dotBefore = JSON.parse(JSON.stringify(from.attributes.nextBlockAction));

    const report = await service.apply([{ op: 'connect', from_intent_id: 'i1', to_intent_id: 'i2' }]);
    expect(report.ok).toBe(true);

    const actionIntent = from.actions.find((a: any) => a._tdActionType === 'intent');
    expect(actionIntent._tdActionId).toBe('existing-action-intent');
    expect(actionIntent.intentName).toBe('#i2');
    expect(from.attributes.nextBlockAction).toEqual(dotBefore);
    // No second action was created for this -- the existing one was reused.
    expect(intentService.createNewAction).not.toHaveBeenCalled();
  });

  it('still sets the dot for a block whose actions carry no intent-type entry', async () => {
    const report = await service.apply([{ op: 'connect', from_intent_id: 'i2', to_intent_id: 'i3' }]);
    expect(report.ok).toBe(true);
    const from = intentService.getIntentFromId('i2');
    expect(from.attributes.nextBlockAction.intentName).toBe('#i3');
    expect((from.actions || []).length).toBe(0);
  });

  it('keeps the "#" contract on the actions-list path, same as the dot', async () => {
    await service.apply([{ op: 'connect', from_intent_id: 'i1', to_intent_id: 'i2' }]);
    const actionIntent = intentService.getIntentFromId('i1').actions
      .find((a: any) => a._tdActionType === 'intent');
    // The exact same contract as the dot: ConnectorService strips '#' and
    // blanks intentName outright when the id doesn't resolve -- a bare id or
    // display name here would vanish on the next refresh.
    expect(actionIntent.intentName).toBe('#i2');
  });

  it('redraws the block from the mutated intent -- the actions-list action carries the new intentName', async () => {
    const report = await service.apply([{ op: 'connect', from_intent_id: 'i1', to_intent_id: 'i2' }]);
    expect(report.ok).toBe(true);
    expect(connectorService.createConnectorsOfIntent).toHaveBeenCalledTimes(1);
    const drawnFrom = connectorService.createConnectorsOfIntent.calls.mostRecent().args[0];
    expect(drawnFrom.intent_id).toBe('i1');
    const drawnAction = drawnFrom.actions.find((a: any) => a._tdActionId === 'existing-action-intent');
    expect(drawnAction.intentName).toBe('#i2');
    // The old create-only calls this mechanism used before are gone.
    expect(connectorService.createNewConnector).not.toHaveBeenCalled();
    expect(connectorService.createConnectorFromId).not.toHaveBeenCalled();
  });

  it('clears the block\'s previously-drawn edges before rebuilding, so a retarget does not leave the old one on screen', async () => {
    // The reported defect this closes: connect used to call a create-only
    // helper of its own that never cleared anything first -- fine for a
    // block's first connection, wrong for a retarget. start ships with
    // exactly this shape (an actions-list intent action), and it is the
    // common one: retargeting start from the template's welcome to a new
    // first block left the old start -> welcome line standing on screen,
    // correct nowhere but the model, until the next reload.
    const report = await service.apply([{ op: 'connect', from_intent_id: 'i1', to_intent_id: 'i2' }]);
    expect(report.ok).toBe(true);
    expect(connectorService.deleteConnectorsOutOfBlock).toHaveBeenCalledWith('i1', false, false);
    expect(connectorService.deleteConnectorWithIDStartingWith).not.toHaveBeenCalled();
  });

  it('labels a freshly untitled actions-list action, but never overwrites an existing title on retarget', async () => {
    const from = intentService.getIntentFromId('i1');
    delete from.actions[0]._tdActionTitle;
    await service.apply([{ op: 'connect', from_intent_id: 'i1', to_intent_id: 'i2' }]);
    expect(from.actions[0]._tdActionTitle).toBe('welcome');

    // A person may have edited the label by hand; retargeting the connector
    // must not clobber it -- cds-action-intent.component.ts's own guard is
    // `if (!this.action._tdActionTitle)`.
    from.actions[0]._tdActionTitle = 'Custom label';
    await service.apply([{ op: 'connect', from_intent_id: 'i1', to_intent_id: 'i3' }]);
    expect(from.actions[0]._tdActionTitle).toBe('Custom label');
  });

  it('retargets in place across repeated connects -- one action, not two', async () => {
    await service.apply([{ op: 'connect', from_intent_id: 'i1', to_intent_id: 'i2' }]);
    await service.apply([{ op: 'connect', from_intent_id: 'i1', to_intent_id: 'i3' }]);
    const from = intentService.getIntentFromId('i1');
    const intentActions = from.actions.filter((a: any) => a._tdActionType === 'intent');
    expect(intentActions.length).toBe(1);
    expect(intentActions[0].intentName).toBe('#i3');
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
      // Mirrors the real IntentService.addNewIntentToListOfIntents, which
      // pushes onto listOfIntents -- needed so a follow-up update_action in
      // the same test can find the block add_intent just created, the way it
      // would on the real canvas.
      addNewIntentToListOfIntents: jasmine.createSpy('addNewIntentToListOfIntents')
        .and.callFake((intent: Intent) => { intentService.listOfIntents.push(intent); }),
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

  it('returns the inline actions\' ids, in order, so a follow-up call can address them', async () => {
    // The gap this closes: an action created inline has no id the agent can
    // reach any other way until add_intent hands one back. Without this,
    // wiring routing fields via update_action means guessing an action_id --
    // exactly the "1" an agent guessed live, per the reported defect.
    const report = await service.apply([{
      op: 'add_intent',
      intent_display_name: 'Chiedi Email',
      actions: [
        { type: 'reply', fields: { text: 'Qual è la tua email?' } },
        { type: 'capture_user_reply', fields: { assignResultTo: 'user_email' } }
      ]
    }]);

    expect(report.ok).toBe(true);
    const savedIntent = intentService.saveNewIntent.calls.mostRecent().args[0];
    expect(report.results[0].action_ids).toEqual([
      savedIntent.actions[0]._tdActionId,
      savedIntent.actions[1]._tdActionId
    ]);
  });

  it('does not return a stray action_ids when add_intent created no inline actions', async () => {
    const report = await service.apply([
      { op: 'add_intent', intent_display_name: 'greeting' }
    ]);
    expect(report.ok).toBe(true);
    expect(report.results[0].action_ids).toBeUndefined();
  });

  it('hands back ids that genuinely work: a follow-up update_action succeeds with one', async () => {
    const addReport = await service.apply([{
      op: 'add_intent',
      intent_display_name: 'Chiedi Email',
      actions: [
        { type: 'reply', fields: { text: 'Qual è la tua email?' } },
        { type: 'capture_user_reply', fields: { assignResultTo: 'user_email' } }
      ]
    }]);
    const [firstActionId, secondActionId] = addReport.results[0].action_ids!;
    const newIntentId = addReport.results[0].intent_id!;

    const wireReport = await service.apply([{
      op: 'update_action', intent_id: newIntentId, action_id: secondActionId,
      fields: { goToIntent: '#i1' }
    }]);

    expect(wireReport.ok).toBe(true);
    const wired = intentService.getIntentFromId(newIntentId).actions
      .find((a: any) => a._tdActionId === secondActionId);
    expect(wired.goToIntent).toBe('#i1');
    // The other returned id is a distinct, still-present action -- proof the
    // two ids in action_ids actually address two different actions, not the
    // same one twice.
    expect(intentService.getIntentFromId(newIntentId).actions
      .some((a: any) => a._tdActionId === firstActionId)).toBe(true);
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

  it('redraws the new block when an inline action already carries a destination to an existing block', async () => {
    // A destination inline actions can set at creation time has to already
    // resolve -- validateDestinationField refuses anything else -- so the
    // only shape possible here is a fresh block routing out to a block that
    // already exists, never one being reached into. Still worth its own
    // redraw: the new block's canvas element is what a click would show an
    // unconnected branch on, same as the reported defect, just one operation
    // earlier than update_action's two-call build.
    intentService.listOfIntents.push(anIntent('i2', 'welcome'));
    const connectorService = TestBed.inject(ConnectorService) as any;

    const report = await service.apply([{
      op: 'add_intent',
      intent_display_name: 'Capture Email',
      actions: [{ type: 'capture_user_reply', fields: { goToIntent: '#i2' } }]
    }]);

    expect(report.ok).toBe(true);
    expect(connectorService.createConnectorsOfIntent).toHaveBeenCalledTimes(1);
    const drawnFrom = connectorService.createConnectorsOfIntent.calls.mostRecent().args[0];
    expect(drawnFrom.intent_id).toBe('new-id');
    expect(drawnFrom.actions[0].goToIntent).toBe('#i2');
  });

  it('does not redraw a new block whose inline actions set no destination', async () => {
    const connectorService = TestBed.inject(ConnectorService) as any;
    const report = await service.apply([{
      op: 'add_intent',
      intent_display_name: 'Chiedi Email',
      actions: [{ type: 'reply', fields: { text: 'hi' } }]
    }]);
    expect(report.ok).toBe(true);
    expect(connectorService.createConnectorsOfIntent).not.toHaveBeenCalled();
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
    // A real Intent (anIntent -> new Intent()) is born with its own
    // nextBlockAction already scaffolded -- clearing it here means connect()
    // has to build one through createNewAction, the same as it would for any
    // block that genuinely has no dot yet, so the fixed 'act-1' id below is
    // deterministic rather than whatever uuid IntentAttributes happened to mint.
    intentService.listOfIntents[0].attributes.nextBlockAction = undefined;

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

  async function connectAndTakeTheDot(): Promise<any> {
    await service.apply([{ op: 'connect', from_intent_id: 'i1', to_intent_id: 'i2' }]);
    const from = intentService.getIntentFromId('i1');
    return from.attributes.nextBlockAction;
  }

  it('survives ConnectorService\'s real connector refresh, and draws an edge', async () => {
    // The whole feature has been asserted against hand-written fakes, and a
    // fake cannot notice that the studio reads intentName back differently
    // from how FlowOps wrote it. This runs the produced intent through the
    // real ConnectorService: its own id resolution, its own intentExists
    // check, and its own erasure of an intentName that resolves to nothing.
    const dot = await connectAndTakeTheDot();
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
    expect(dot.intentName).toBe('#i2');
    expect(drawn).toEqual([{ fromId: 'i1/act-1', toId: 'i2' }]);
  });

  it('writes one of the values IntentService itself offers for the connector dropdown', async () => {
    const dot = await connectAndTakeTheDot();
    // getListOfIntents() is where the UI's dropdown gets the value it assigns
    // to intentName -- the definition of the contract, called for real.
    const offered = IntentService.prototype.getListOfIntents
      .call({ listOfIntents: intentService.listOfIntents });
    expect(offered.map((o: any) => o.value)).toContain(dot.intentName);
  });
});

describe('FlowOpsService — a routing destination is actually drawn, real DOM and all', () => {
  // Every other test in this file asserts through a fake ConnectorService --
  // useful for isolating FlowOps's own logic, but exactly the kind of test
  // that let the original ("updateConnectorsOfBlock") version of this fix
  // through: the fake recorded a call that, against the real service, drew
  // nothing. This runs the real ConnectorService, wired to a real
  // TiledeskConnectors instance, against real DOM elements standing in for
  // the block's rendered action anchor and its target block -- the same
  // instrument the defect was actually confirmed with: counting the real
  // `path` elements a connector draws, not just whether a method was called.
  let drawer: HTMLElement;
  let fromAnchor: HTMLElement;
  let toBlock: HTMLElement;
  let retargetBlock: HTMLElement;
  let connectors: ConnectorService;
  let service: FlowOpsService;
  let intentService: any;

  const fromId = 'i1/a-cond/true';
  const connectorToI2 = `${fromId}/i2`;
  const connectorToI5 = `${fromId}/i5`;

  beforeEach(() => {
    // The real ConnectorService logs through the app-wide logger singleton,
    // which nothing has set up in a spec run.
    LoggerInstance.setInstance({
      log() {}, error() {}, warn() {}, info() {}, debug() {}, setLoggerConfig() {}
    } as any);

    // #tds_drawer is the element TiledeskConnectors mounts its SVG stage
    // into (ConnectorService.initializeConnectors() hard-codes that id).
    // Without it on the page, the library still creates path elements but
    // never appends them to the document -- which would make every lookup
    // below silently see "nothing drawn" for a reason that has nothing to do
    // with FlowOps. fromAnchor/toBlock/retargetBlock stand in for the real
    // canvas nodes an action's connector anchor and a block card render with
    // -- their ids are exactly what the studio's own contract already uses
    // ('<intent_id>/<action_id>/<port>' and '<intent_id>'), and toBlock /
    // retargetBlock carry 'tds_input_block', the class
    // elementLogicTopLeft() searches for to find a block's own logical
    // position.
    drawer = document.createElement('div');
    drawer.id = 'tds_drawer';
    document.body.appendChild(drawer);

    fromAnchor = document.createElement('div');
    fromAnchor.id = fromId;
    document.body.appendChild(fromAnchor);

    toBlock = document.createElement('div');
    toBlock.id = 'i2';
    toBlock.classList.add('tds_input_block');
    document.body.appendChild(toBlock);

    retargetBlock = document.createElement('div');
    retargetBlock.id = 'i5';
    retargetBlock.classList.add('tds_input_block');
    document.body.appendChild(retargetBlock);

    const withCondition = anIntent('i1', 'Search KB');
    withCondition.actions = [
      { _tdActionId: 'a-cond', _tdActionType: 'askgptv2', trueIntent: '', falseIntent: '' } as any
    ];

    intentService = {
      listOfIntents: [withCondition, anIntent('i2', 'Answer Found'), anIntent('i5', 'Transfer')],
      getIntentFromId(id: string) {
        return this.listOfIntents.find((i: Intent) => i.intent_id === id);
      },
      updateIntent: jasmine.createSpy('updateIntent').and.returnValue(Promise.resolve(true)),
      createNewIntent: jasmine.createSpy('createNewIntent'),
      addNewIntentToListOfIntents: jasmine.createSpy('addNewIntentToListOfIntents'),
      saveNewIntent: jasmine.createSpy('saveNewIntent').and.returnValue(Promise.resolve(true)),
      deleteIntentNew: jasmine.createSpy('deleteIntentNew').and.returnValue(Promise.resolve(true)),
      restoreLastUNDO: jasmine.createSpy('restoreLastUNDO')
    };

    connectors = new ConnectorService();
    connectors.initializeConnectors();
    connectors.listOfIntents = intentService.listOfIntents;

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        FlowOpsService,
        { provide: IntentService, useValue: intentService },
        { provide: ConnectorService, useValue: connectors },
        { provide: DashboardService, useValue: { id_faq_kb: 'kb1' } }
      ]
    });
    service = TestBed.inject(FlowOpsService);
  });

  afterEach(() => {
    drawer.remove();
    fromAnchor.remove();
    toBlock.remove();
    retargetBlock.remove();
    document.querySelectorAll(`[id^="${fromId}"]`).forEach(el => el.remove());
    document.getElementById('tds_svgContainer')?.remove();
  });

  // redrawBlockConnectors is deliberately not awaited by apply(), and even
  // though every element it needs already exists (so createConnectorFromId
  // never falls into isElementOnTheStage's polling), the call chain is still
  // async end to end (createConnectorsOfIntent -> createConnector ->
  // createConnectorFromId, each declared async). A macrotask turn is enough
  // to drain every microtask those leave pending.
  const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0));

  it('draws a real <path> connector for a destination update_action just wrote -- not merely a call the service received', async () => {
    expect(document.getElementById(connectorToI2)).toBeNull();

    const report = await service.apply([{
      op: 'update_action', intent_id: 'i1', action_id: 'a-cond', fields: { trueIntent: '#i2' }
    }]);
    expect(report.ok).toBe(true);
    await flush();

    const drawn = document.getElementById(connectorToI2);
    expect(drawn).not.toBeNull();
    expect(drawn!.tagName.toLowerCase()).toBe('path');
  });

  it('does not stack a duplicate line when the same destination is redrawn a second time', async () => {
    await service.apply([{
      op: 'update_action', intent_id: 'i1', action_id: 'a-cond', fields: { trueIntent: '#i2' }
    }]);
    await flush();
    const countAfterFirst = document.querySelectorAll(`[id^="${fromId}"]`).length;
    expect(countAfterFirst).toBeGreaterThan(0);

    await service.apply([{
      op: 'update_action', intent_id: 'i1', action_id: 'a-cond', fields: { trueIntent: '#i2' }
    }]);
    await flush();

    expect(document.querySelectorAll(`[id^="${fromId}"]`).length).toBe(countAfterFirst);
  });

  it('leaves exactly one edge after a retarget -- no stale line left pointing at the old destination', async () => {
    await service.apply([{
      op: 'update_action', intent_id: 'i1', action_id: 'a-cond', fields: { trueIntent: '#i2' }
    }]);
    await flush();
    expect(document.getElementById(connectorToI2)).not.toBeNull();

    await service.apply([{
      op: 'update_action', intent_id: 'i1', action_id: 'a-cond', fields: { trueIntent: '#i5' }
    }]);
    await flush();

    expect(document.getElementById(connectorToI5)).not.toBeNull();
    expect(document.getElementById(connectorToI2)).toBeNull();
  });
});

describe('FlowOpsService — connect actually draws, and clears a retarget\'s stale edge, real DOM and all', () => {
  // The gap the coordinator measured live: connect drew a fresh edge fine
  // (10 path elements right after the wiring call, matching a reload), but
  // a *retarget* -- start moved from the template's welcome to a new first
  // block -- left the old start -> welcome line standing on screen; a
  // reload dropped back to 8. connect used to draw through its own
  // create-only helpers (drawConnector, drawActionListConnector, both now
  // removed) instead of the same delete-then-rebuild redrawBlockConnectors
  // already gives update_action. These cover both of connect's mechanisms
  // end to end -- a fresh edge actually appears, and a retarget leaves
  // exactly the new one, not the old one alongside it.
  let drawer: HTMLElement;
  let toI2: HTMLElement;
  let toI3: HTMLElement;
  let connectors: ConnectorService;
  let service: FlowOpsService;
  let intentService: any;

  beforeEach(() => {
    LoggerInstance.setInstance({
      log() {}, error() {}, warn() {}, info() {}, debug() {}, setLoggerConfig() {}
    } as any);

    drawer = document.createElement('div');
    drawer.id = 'tds_drawer';
    document.body.appendChild(drawer);

    toI2 = document.createElement('div');
    toI2.id = 'i2';
    toI2.classList.add('tds_input_block');
    document.body.appendChild(toI2);

    toI3 = document.createElement('div');
    toI3.id = 'i3';
    toI3.classList.add('tds_input_block');
    document.body.appendChild(toI3);
  });

  afterEach(() => {
    drawer.remove();
    toI2.remove();
    toI3.remove();
    document.querySelectorAll('[id^="i1/"]').forEach(el => el.remove());
    document.getElementById('tds_svgContainer')?.remove();
  });

  const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0));

  function wire(fromAnchorId: string): void {
    const fromAnchor = document.createElement('div');
    fromAnchor.id = fromAnchorId;
    document.body.appendChild(fromAnchor);

    connectors = new ConnectorService();
    connectors.initializeConnectors();
    connectors.listOfIntents = intentService.listOfIntents;

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        FlowOpsService,
        { provide: IntentService, useValue: intentService },
        { provide: ConnectorService, useValue: connectors },
        { provide: DashboardService, useValue: { id_faq_kb: 'kb1' } }
      ]
    });
    service = TestBed.inject(FlowOpsService);
  }

  describe('the dot mechanism (attributes.nextBlockAction)', () => {
    const fromId = 'i1/dot-1';
    const edgeToI2 = `${fromId}/i2`;
    const edgeToI3 = `${fromId}/i3`;

    beforeEach(() => {
      const from = anIntent('i1', 'Search KB');
      from.actions = []; // no TYPE_ACTION.INTENT entry -- the dot is live
      // A real Intent (anIntent -> new Intent()) is born with its own
      // nextBlockAction already scaffolded, under a uuid this test does not
      // control -- clearing it forces connectViaDot through createNewAction,
      // so the dot's _tdActionId is the deterministic 'dot-1' the DOM anchor
      // below and the fake's own createNewAction agree on.
      from.attributes.nextBlockAction = undefined;
      intentService = {
        listOfIntents: [from, anIntent('i2', 'Answer Found'), anIntent('i3', 'Transfer')],
        getIntentFromId(id: string) { return this.listOfIntents.find((i: Intent) => i.intent_id === id); },
        createNewAction: jasmine.createSpy('createNewAction').and.callFake((type: string) =>
          ({ _tdActionId: 'dot-1', _tdActionType: type, intentName: '' })),
        updateIntent: jasmine.createSpy('updateIntent').and.returnValue(Promise.resolve(true)),
        createNewIntent: jasmine.createSpy('createNewIntent'),
        addNewIntentToListOfIntents: jasmine.createSpy('addNewIntentToListOfIntents'),
        saveNewIntent: jasmine.createSpy('saveNewIntent').and.returnValue(Promise.resolve(true)),
        deleteIntentNew: jasmine.createSpy('deleteIntentNew').and.returnValue(Promise.resolve(true)),
        restoreLastUNDO: jasmine.createSpy('restoreLastUNDO')
      };
      wire(fromId);
    });

    it('draws a real edge for a fresh connect -- the coverage the create-only call used to give', async () => {
      const report = await service.apply([{ op: 'connect', from_intent_id: 'i1', to_intent_id: 'i2' }]);
      expect(report.ok).toBe(true);
      await flush();
      expect(document.getElementById(edgeToI2)).not.toBeNull();
    });

    it('leaves exactly one edge after a retarget -- the old target does not appear among the block\'s connectors', async () => {
      await service.apply([{ op: 'connect', from_intent_id: 'i1', to_intent_id: 'i2' }]);
      await flush();
      expect(document.getElementById(edgeToI2)).not.toBeNull();

      await service.apply([{ op: 'connect', from_intent_id: 'i1', to_intent_id: 'i3' }]);
      await flush();

      expect(document.getElementById(edgeToI3)).not.toBeNull();
      expect(document.getElementById(edgeToI2)).toBeNull();
    });
  });

  describe('the actions-list mechanism (a start-shaped block\'s TYPE_ACTION.INTENT entry)', () => {
    const fromId = 'i1/act-intent-1';
    const edgeToI2 = `${fromId}/i2`;
    const edgeToI3 = `${fromId}/i3`;

    beforeEach(() => {
      const from = anIntent('i1', 'start');
      from.actions = [{ _tdActionId: 'act-intent-1', _tdActionType: 'intent', intentName: '' } as any];
      intentService = {
        listOfIntents: [from, anIntent('i2', 'Answer Found'), anIntent('i3', 'Transfer')],
        getIntentFromId(id: string) { return this.listOfIntents.find((i: Intent) => i.intent_id === id); },
        createNewAction: jasmine.createSpy('createNewAction'),
        updateIntent: jasmine.createSpy('updateIntent').and.returnValue(Promise.resolve(true)),
        createNewIntent: jasmine.createSpy('createNewIntent'),
        addNewIntentToListOfIntents: jasmine.createSpy('addNewIntentToListOfIntents'),
        saveNewIntent: jasmine.createSpy('saveNewIntent').and.returnValue(Promise.resolve(true)),
        deleteIntentNew: jasmine.createSpy('deleteIntentNew').and.returnValue(Promise.resolve(true)),
        restoreLastUNDO: jasmine.createSpy('restoreLastUNDO')
      };
      wire(fromId);
    });

    it('draws a real edge for a fresh connect -- the coverage the create-only call used to give', async () => {
      const report = await service.apply([{ op: 'connect', from_intent_id: 'i1', to_intent_id: 'i2' }]);
      expect(report.ok).toBe(true);
      await flush();
      expect(document.getElementById(edgeToI2)).not.toBeNull();
    });

    it('leaves exactly one edge after a retarget -- the reported defect: start moved from welcome to a new block, and the old line stayed', async () => {
      await service.apply([{ op: 'connect', from_intent_id: 'i1', to_intent_id: 'i2' }]);
      await flush();
      expect(document.getElementById(edgeToI2)).not.toBeNull();

      await service.apply([{ op: 'connect', from_intent_id: 'i1', to_intent_id: 'i3' }]);
      await flush();

      expect(document.getElementById(edgeToI3)).not.toBeNull();
      expect(document.getElementById(edgeToI2)).toBeNull();
    });
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

describe('FlowOpsService — connect refuses a block that already routes conditionally', () => {
  // The live defect: a block whose routing is already fully decided by a
  // condition-like action (jsoncondition2's trueIntent/falseIntent, for one)
  // still let connect add an unconditional dot on top -- three outgoing
  // connection points on one block, two of them contradictory. connect must
  // refuse instead, the same way the rest of this service refuses rather
  // than silently doing something the agent didn't ask for.
  let service: FlowOpsService;
  let intentService: any;
  let connectorService: any;

  function intentWithActions(id: string, name: string, actions: any[]): Intent {
    const intent = anIntent(id, name);
    intent.actions = actions;
    return intent;
  }

  beforeEach(() => {
    intentService = {
      listOfIntents: [
        intentWithActions('i1', 'Verifica Servizio', [
          { _tdActionId: 'cond1', _tdActionType: 'jsoncondition2', trueIntent: '#i2', falseIntent: '#i3' }
        ]),
        intentWithActions('i2', 'Chiedi Data', []),
        intentWithActions('i3', 'Chiedi Argomento', []),
        intentWithActions('i4', 'unconfigured condition', [
          { _tdActionId: 'cond2', _tdActionType: 'jsoncondition2', trueIntent: '', falseIntent: '' }
        ]),
        intentWithActions('i5', 'ordinary block', []),
        intentWithActions('i6', 'configured askgpt', [
          { _tdActionId: 'gpt1', _tdActionType: 'askgpt', trueIntent: '#i2', falseIntent: '' }
        ]),
        intentWithActions('i7', 'unconfigured askgpt', [
          { _tdActionId: 'gpt2', _tdActionType: 'askgpt', trueIntent: '', falseIntent: '' }
        ]),
        intentWithActions('i8', 'configured capture_user_reply', [
          { _tdActionId: 'cap1', _tdActionType: 'capture_user_reply', goToIntent: '#i2' }
        ])
      ],
      getIntentFromId(id: string) {
        return this.listOfIntents.find((i: Intent) => i.intent_id === id);
      },
      createNewAction: jasmine.createSpy('createNewAction').and.callFake((type: string) =>
        ({ _tdActionId: 'generated', _tdActionType: type })),
      updateIntent: jasmine.createSpy('updateIntent').and.returnValue(Promise.resolve(true)),
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

  it('refuses connect from a block whose jsoncondition2 already has a trueIntent set', async () => {
    const report = await service.apply([
      { op: 'connect', from_intent_id: 'i1', to_intent_id: 'i3' }
    ]);
    expect(report.ok).toBe(false);
    expect(report.rejected_before_applying).toBe(true);
    const error = report.results[0].error;
    expect(error).toContain('Verifica Servizio');
    expect(error).toContain('jsoncondition2');
  });

  it('changes nothing when connect is refused for an already-conditionally-routed block', async () => {
    const from = intentService.getIntentFromId('i1');
    const actionsBefore = JSON.parse(JSON.stringify(from.actions));
    const dotBefore = JSON.parse(JSON.stringify(from.attributes.nextBlockAction));

    await service.apply([{ op: 'connect', from_intent_id: 'i1', to_intent_id: 'i3' }]);

    expect(from.actions).toEqual(actionsBefore);
    expect(from.attributes.nextBlockAction).toEqual(dotBefore);
    expect(intentService.updateIntent).not.toHaveBeenCalled();
    expect(connectorService.createConnectorsOfIntent).not.toHaveBeenCalled();
    expect(connectorService.deleteConnectorsOutOfBlock).not.toHaveBeenCalled();
  });

  it('still allows connect when the condition action carries no destinations at all', async () => {
    const report = await service.apply([
      { op: 'connect', from_intent_id: 'i4', to_intent_id: 'i2' }
    ]);
    expect(report.ok).toBe(true);
    const from = intentService.getIntentFromId('i4');
    expect(from.attributes.nextBlockAction.intentName).toBe('#i2');
  });

  it('leaves an ordinary block\'s connect unaffected', async () => {
    const report = await service.apply([
      { op: 'connect', from_intent_id: 'i5', to_intent_id: 'i2' }
    ]);
    expect(report.ok).toBe(true);
    const from = intentService.getIntentFromId('i5');
    expect(from.attributes.nextBlockAction.intentName).toBe('#i2');
  });

  it('refuses connect from a block whose askgpt action already has a trueIntent set, naming the trueIntent / falseIntent fields', async () => {
    const report = await service.apply([
      { op: 'connect', from_intent_id: 'i6', to_intent_id: 'i3' }
    ]);
    expect(report.ok).toBe(false);
    expect(report.rejected_before_applying).toBe(true);
    const error = report.results[0].error;
    expect(error).toContain('configured askgpt');
    expect(error).toContain('askgpt');
    expect(error).toContain('trueIntent');
    expect(error).toContain('falseIntent');
  });

  it('still allows connect when the askgpt action carries no destinations at all', async () => {
    const report = await service.apply([
      { op: 'connect', from_intent_id: 'i7', to_intent_id: 'i2' }
    ]);
    expect(report.ok).toBe(true);
  });

  it('refuses connect from a block whose capture_user_reply already has a goToIntent set, naming that field', async () => {
    const report = await service.apply([
      { op: 'connect', from_intent_id: 'i8', to_intent_id: 'i3' }
    ]);
    expect(report.ok).toBe(false);
    expect(report.rejected_before_applying).toBe(true);
    const error = report.results[0].error;
    expect(error).toContain('configured capture_user_reply');
    expect(error).toContain('capture_user_reply');
    expect(error).toContain('goToIntent');
  });
});

describe('FlowOpsService — an action\'s own destination fields must resolve on the canvas', () => {
  // The gap this closes: connect's endpoints (from_intent_id/to_intent_id)
  // were validated, but the destinations an action carries inside its own
  // `fields` (trueIntent, goToIntent, ai_condition's conditionIntentId, ...)
  // were not -- so an agent could fill every branch of a twelve-block flow
  // with invented slugs and have the whole batch accepted, only for
  // ConnectorService to blank each one silently on the next refresh.
  let service: FlowOpsService;
  let intentService: any;
  let actionIdCounter: number;

  beforeEach(() => {
    actionIdCounter = 0;
    intentService = {
      listOfIntents: [
        anIntent('i1', 'start'), anIntent('i2', 'kb_trovata'), anIntent('i3', 'valuta_urgenza')
      ],
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

  it('refuses add_action of type askgpt whose trueIntent is an invented slug, naming the field and value, and writes nothing', async () => {
    const report = await service.apply([
      { op: 'add_action', intent_id: 'i1', type: 'askgpt', fields: { trueIntent: '#kb_trovata' } }
    ]);
    expect(report.ok).toBe(false);
    expect(report.rejected_before_applying).toBe(true);
    const error = report.results[0].error;
    expect(error).toContain('askgpt');
    expect(error).toContain('trueIntent');
    expect(error).toContain('#kb_trovata');
    expect(intentService.updateIntent).not.toHaveBeenCalled();
    expect(intentService.getIntentFromId('i1').actions.length).toBe(0);
  });

  it('accepts the same destination given as a real \'#\' + intent_id', async () => {
    const report = await service.apply([
      { op: 'add_action', intent_id: 'i1', type: 'askgpt', fields: { trueIntent: '#i2' } }
    ]);
    expect(report.ok).toBe(true);
    const added = intentService.getIntentFromId('i1').actions[0];
    expect(added.trueIntent).toBe('#i2');
  });

  it('accepts a bare intent_id without the leading #', async () => {
    const report = await service.apply([
      { op: 'add_action', intent_id: 'i1', type: 'askgpt', fields: { trueIntent: 'i2' } }
    ]);
    expect(report.ok).toBe(true);
  });

  it('accepts an empty destination as a normal intermediate state', async () => {
    const report = await service.apply([
      { op: 'add_action', intent_id: 'i1', type: 'askgpt', fields: { trueIntent: '' } }
    ]);
    expect(report.ok).toBe(true);
  });

  it('refuses update_action the same way, for a real, already-applied action', async () => {
    const before = await service.apply([
      { op: 'add_action', intent_id: 'i1', type: 'askgpt', fields: { trueIntent: '#i2' } }
    ]);
    expect(before.ok).toBe(true);
    const actionId = before.results[0].action_id;

    const report = await service.apply([
      { op: 'update_action', intent_id: 'i1', action_id: actionId, fields: { falseIntent: '#not_real' } }
    ]);
    expect(report.ok).toBe(false);
    expect(report.rejected_before_applying).toBe(true);
    const error = report.results[0].error;
    expect(error).toContain('falseIntent');
    expect(error).toContain('#not_real');
    // The earlier, valid trueIntent must be untouched by the refused call.
    expect(intentService.getIntentFromId('i1').actions[0].trueIntent).toBe('#i2');
  });

  it('refuses add_intent whose inline actions carry a bad destination, and creates no block at all', async () => {
    const report = await service.apply([{
      op: 'add_intent',
      intent_display_name: 'Raccogli Domanda',
      actions: [{ type: 'capture_user_reply', fields: { goToIntent: '#kb_consulta' } }]
    }]);
    expect(report.ok).toBe(false);
    expect(report.rejected_before_applying).toBe(true);
    const error = report.results[0].error;
    expect(error).toContain('capture_user_reply');
    expect(error).toContain('goToIntent');
    expect(error).toContain('#kb_consulta');
    expect(intentService.createNewIntent).not.toHaveBeenCalled();
    expect(intentService.addNewIntentToListOfIntents).not.toHaveBeenCalled();
    expect(intentService.saveNewIntent).not.toHaveBeenCalled();
    expect(intentService.listOfIntents.length).toBe(3);
  });

  it('refuses capture_user_reply\'s bad goToIntent -- a different field name than the condition types', async () => {
    const report = await service.apply([
      { op: 'add_action', intent_id: 'i1', type: 'capture_user_reply', fields: { goToIntent: '#nope' } }
    ]);
    expect(report.ok).toBe(false);
    const error = report.results[0].error;
    expect(error).toContain('capture_user_reply');
    expect(error).toContain('goToIntent');
    expect(error).toContain('#nope');
  });

  it('refuses ai_condition\'s dynamic intents[].conditionIntentId when it does not resolve', async () => {
    const report = await service.apply([{
      op: 'add_action', intent_id: 'i1', type: 'ai_condition',
      fields: { intents: [{ label: 'billing', conditionIntentId: '#agente_disponibile' }] }
    }]);
    expect(report.ok).toBe(false);
    expect(report.rejected_before_applying).toBe(true);
    const error = report.results[0].error;
    expect(error).toContain('ai_condition');
    expect(error).toContain('conditionIntentId');
    expect(error).toContain('#agente_disponibile');
  });

  it('accepts ai_condition\'s dynamic conditionIntentId once it resolves to a real block', async () => {
    const report = await service.apply([{
      op: 'add_action', intent_id: 'i1', type: 'ai_condition',
      fields: { intents: [{ label: 'billing', conditionIntentId: '#i3' }] }
    }]);
    expect(report.ok).toBe(true);
  });

  it('says a batch-created block has no id yet, and to route to it in a second call', async () => {
    const report = await service.apply([
      { op: 'add_action', intent_id: 'i1', type: 'askgpt', fields: { trueIntent: '#kb_trovata' } }
    ]);
    const error = report.results[0].error;
    expect(error.toLowerCase()).toContain('second call');
    expect(error).toContain('add_intent');
    expect(error.toLowerCase()).toContain('intent_id');
  });
});

describe('FlowOpsService — a bare \'#\' destination is an empty one, not an invented slug', () => {
  // Live defect: the agent writes trueIntent: '#' as its own way of saying
  // "not set yet" -- the '#' prefix every real destination uses, with
  // nothing after it. `isAcceptableDestination` stripped a leading '#' and
  // checked what was left resolved, but never checked whether anything was
  // left at all, so '#' alone (and '#' padded with whitespace) fell through
  // to "does not resolve" and refused the whole batch. Empty is empty,
  // whatever prefix it arrived wearing.
  let service: FlowOpsService;
  let intentService: any;
  let actionIdCounter: number;

  beforeEach(() => {
    actionIdCounter = 0;
    intentService = {
      listOfIntents: [
        anIntent('i1', 'start'), anIntent('i2', 'kb_trovata'), anIntent('i3', 'valuta_urgenza')
      ],
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

  it('accepts add_action of type askgpt with trueIntent: "#"', async () => {
    const report = await service.apply([
      { op: 'add_action', intent_id: 'i1', type: 'askgpt', fields: { trueIntent: '#' } }
    ]);
    expect(report.ok).toBe(true);
  });

  it('accepts "#" padded with surrounding whitespace', async () => {
    const report = await service.apply([
      { op: 'add_action', intent_id: 'i1', type: 'askgpt', fields: { trueIntent: '  #  ' } }
    ]);
    expect(report.ok).toBe(true);
  });

  it('accepts a destination that is only whitespace, no \'#\' at all', async () => {
    const report = await service.apply([
      { op: 'add_action', intent_id: 'i1', type: 'askgpt', fields: { trueIntent: ' ' } }
    ]);
    expect(report.ok).toBe(true);
  });

  it('still refuses a genuinely invented slug -- "#" is not a wildcard for "anything goes"', async () => {
    const report = await service.apply([
      { op: 'add_action', intent_id: 'i1', type: 'askgpt', fields: { trueIntent: '#kb_trovata' } }
    ]);
    expect(report.ok).toBe(false);
    const error = report.results[0].error;
    expect(error).toContain('#kb_trovata');
  });

  it('accepts the same "#" form through update_action', async () => {
    const before = await service.apply([
      { op: 'add_action', intent_id: 'i1', type: 'askgpt', fields: { trueIntent: '#i2' } }
    ]);
    const actionId = before.results[0].action_id;

    const report = await service.apply([
      { op: 'update_action', intent_id: 'i1', action_id: actionId, fields: { falseIntent: '#' } }
    ]);
    expect(report.ok).toBe(true);
  });

  it('accepts the same "#" form through add_intent\'s inline actions', async () => {
    const report = await service.apply([{
      op: 'add_intent',
      intent_display_name: 'Raccogli Domanda',
      actions: [{ type: 'askgpt', fields: { trueIntent: '#' } }]
    }]);
    expect(report.ok).toBe(true);
  });

  it('still refuses an invented slug through add_intent\'s inline actions', async () => {
    const report = await service.apply([{
      op: 'add_intent',
      intent_display_name: 'Raccogli Domanda',
      actions: [{ type: 'askgpt', fields: { trueIntent: '#kb_trovata' } }]
    }]);
    expect(report.ok).toBe(false);
  });

  it('stores a "#"-only destination as "", not the raw "#" the agent sent', async () => {
    const report = await service.apply([
      { op: 'add_action', intent_id: 'i1', type: 'askgpt', fields: { trueIntent: '#' } }
    ]);
    expect(report.ok).toBe(true);
    const added = intentService.getIntentFromId('i1').actions[0];
    expect(added.trueIntent).toBe('');
  });

  it('stores a whitespace-padded "#" destination as "" too', async () => {
    const report = await service.apply([
      { op: 'add_action', intent_id: 'i1', type: 'askgpt', fields: { trueIntent: '  #  ' } }
    ]);
    expect(report.ok).toBe(true);
    const added = intentService.getIntentFromId('i1').actions[0];
    expect(added.trueIntent).toBe('');
  });

  it('stores a "#"-only destination set through update_action as "" too', async () => {
    const before = await service.apply([
      { op: 'add_action', intent_id: 'i1', type: 'askgpt', fields: { trueIntent: '#i2' } }
    ]);
    const actionId = before.results[0].action_id;

    const report = await service.apply([
      { op: 'update_action', intent_id: 'i1', action_id: actionId, fields: { falseIntent: '#' } }
    ]);
    expect(report.ok).toBe(true);
    expect(intentService.getIntentFromId('i1').actions[0].falseIntent).toBe('');
  });

  it('stores a "#"-only destination set through add_intent\'s inline actions as "" too', async () => {
    const report = await service.apply([{
      op: 'add_intent',
      intent_display_name: 'Raccogli Domanda',
      actions: [{ type: 'askgpt', fields: { trueIntent: '#' } }]
    }]);
    expect(report.ok).toBe(true);
    const addedIntent = intentService.addNewIntentToListOfIntents.calls.mostRecent().args[0];
    expect(addedIntent.actions[0].trueIntent).toBe('');
  });

  it('still resolves a real destination through ai_condition\'s dynamic conditionIntentId when the others on the block are "#"', async () => {
    const report = await service.apply([{
      op: 'add_action', intent_id: 'i1', type: 'ai_condition',
      fields: {
        fallbackIntent: '#', errorIntent: '#',
        intents: [{ label: 'billing', conditionIntentId: '#i3' }]
      }
    }]);
    expect(report.ok).toBe(true);
    const added = intentService.getIntentFromId('i1').actions[0];
    expect(added.fallbackIntent).toBe('');
    expect(added.errorIntent).toBe('');
    expect(added.intents[0].conditionIntentId).toBe('#i3');
  });
});
