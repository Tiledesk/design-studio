import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { FlowOpsService } from './flow-ops.service';
import { IntentService } from '../services/intent.service';
import { ConnectorService } from '../services/connector.service';
import { DashboardService } from 'src/app/services/dashboard.service';
import { AgentChatFamilyService } from './agent-chat-family.service';
import { FaqService } from 'src/app/services/faq.service';
import { Intent } from 'src/app/models/intent-model';
import { withDestinationHash, fixActionDestinationHashes } from '../utils-connectors';

// The engine resolves a destination to a block id only when it starts with '#'
// (MongodbBotsDataSource.getByIntentDisplayNameCache): a bare id is looked up as
// a block NAME, is not found, and the flow stops -- while the canvas still draws
// the connector. Seen live: an AI Prompt inside an iteration, its exits written
// by the AI chat without '#', so no element ever led back to the loop.

function anIntent(intentId: string, name: string, actions: any[] = []): Intent {
  const intent = new Intent();
  intent.intent_id = intentId;
  intent.intent_display_name = name;
  intent.id_faq_kb = 'kb1';
  intent.actions = actions;
  return intent;
}

describe('destination hash helpers', () => {
  const ids = new Set(['i2', 'i3']);
  const isIntentId = (id: string) => ids.has(id);

  it('puts the # back in front of a bare block id', () => {
    expect(withDestinationHash('i2', isIntentId)).toBe('#i2');
  });

  it('leaves alone a value that already has it, an empty one, and one that is not a block id', () => {
    expect(withDestinationHash('#i2', isIntentId)).toBe('#i2');
    expect(withDestinationHash('', isIntentId)).toBe('');
    expect(withDestinationHash('welcome', isIntentId)).toBe('welcome');
    expect(withDestinationHash(undefined, isIntentId)).toBeUndefined();
  });

  it('fixes every destination of an action: plain fields, AI condition branches, multi-condition cases', () => {
    const action: any = {
      trueIntent: 'i2', falseIntent: '#i3', goToIntent: 'i3',
      intents: [{ conditionIntentId: 'i2' }],
      cases: [{ intent: 'i3' }, { intent: '' }]
    };
    expect(fixActionDestinationHashes(action, isIntentId)).toBe(true);
    expect(action.trueIntent).toBe('#i2');
    expect(action.falseIntent).toBe('#i3');
    expect(action.goToIntent).toBe('#i3');
    expect(action.intents[0].conditionIntentId).toBe('#i2');
    expect(action.cases[0].intent).toBe('#i3');
    expect(action.cases[1].intent).toBe('');
    expect(fixActionDestinationHashes(action, isIntentId)).toBe(false);
  });
});

describe('IntentService.patchActionId — repairs destinations saved without #', () => {
  it('adds the # to a bare id of a block of the flow, and never to a block name', () => {
    const faqs: any[] = [
      { intent_id: 'p1', intent_display_name: 'Process Attachment', actions: [
        { _tdActionId: 'a1', _tdActionType: 'ai_prompt', trueIntent: 'r1', falseIntent: 'f1' }
      ] },
      { intent_id: 'r1', intent_display_name: 'Add Result', actions: [] },
      { intent_id: 'f1', intent_display_name: 'Add Failure', actions: [] },
      { intent_id: 'c1', intent_display_name: 'Legacy Condition', actions: [
        { _tdActionId: 'a2', _tdActionType: 'jsoncondition', trueIntent: 'Add Result', falseIntent: '#f1' }
      ] }
    ];
    IntentService.prototype.patchActionId.call({}, faqs);
    expect(faqs[0].actions[0].trueIntent).toBe('#r1');
    expect(faqs[0].actions[0].falseIntent).toBe('#f1');
    expect(faqs[3].actions[0].trueIntent).toBe('Add Result');
    expect(faqs[3].actions[0].falseIntent).toBe('#f1');
  });
});

describe('FlowOpsService — destinations sent without # are stored with it', () => {
  let service: FlowOpsService;
  let intentService: any;

  beforeEach(() => {
    intentService = {
      listOfIntents: [
        anIntent('i1', 'Process Attachment', [
          { _tdActionId: 'a-ai', _tdActionType: 'ai_prompt', trueIntent: '', falseIntent: '' }
        ]),
        anIntent('i2', 'Add Result'),
        anIntent('i3', 'Add Failure'),
        anIntent('i4', 'For Each Attachment', [
          { _tdActionId: 'a-iter', _tdActionType: 'iteration', iterable: 'attachments',
            assignOutputTo: 'attachment', goToIntent: '' }
        ])
      ],
      getIntentFromId(id: string) {
        return this.listOfIntents.find((i: Intent) => i.intent_id === id);
      },
      createNewAction: jasmine.createSpy('createNewAction'),
      updateIntent: jasmine.createSpy('updateIntent').and.returnValue(Promise.resolve(true)),
      restoreLastUNDO: jasmine.createSpy('restoreLastUNDO')
    };
    const connectorService = {
      createNewConnector: jasmine.createSpy('createNewConnector').and.returnValue(Promise.resolve()),
      createConnectorFromId: jasmine.createSpy('createConnectorFromId').and.returnValue(Promise.resolve(true)),
      deleteConnectorWithIDStartingWith: jasmine.createSpy('deleteConnectorWithIDStartingWith'),
      createConnectorsOfIntent: jasmine.createSpy('createConnectorsOfIntent').and.returnValue(Promise.resolve()),
      deleteConnectorsOutOfBlock: jasmine.createSpy('deleteConnectorsOutOfBlock')
    };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        FlowOpsService,
        { provide: IntentService, useValue: intentService },
        { provide: ConnectorService, useValue: connectorService },
        { provide: DashboardService, useValue: { id_faq_kb: 'kb1' } },
        { provide: AgentChatFamilyService, useValue: { read: () => Promise.resolve(
          { root_id: 'kb1', root_name: 'Root', is_subagent: false, subagents: [] }) } },
        { provide: FaqService, useValue: { getAllFaqByFaqKbId: () => of([]) } }
      ]
    });
    service = TestBed.inject(FlowOpsService);
  });

  it('stores an AI Prompt\'s exits as #id when the agent sends bare ids', async () => {
    const report = await service.apply([{
      op: 'update_action', intent_id: 'i1', action_id: 'a-ai',
      fields: { trueIntent: 'i2', falseIntent: 'i3' }
    }]);
    expect(report.ok).toBe(true);
    const action = intentService.getIntentFromId('i1').actions[0];
    expect(action.trueIntent).toBe('#i2');
    expect(action.falseIntent).toBe('#i3');
  });

  it('stores an iteration\'s goToIntent as #id when the agent sends a bare id', async () => {
    const report = await service.apply([{
      op: 'update_action', intent_id: 'i4', action_id: 'a-iter',
      fields: { goToIntent: 'i1' }
    }]);
    expect(report.ok).toBe(true);
    expect(intentService.getIntentFromId('i4').actions[0].goToIntent).toBe('#i1');
  });

  it('keeps a destination already written as #id unchanged', async () => {
    await service.apply([{
      op: 'update_action', intent_id: 'i1', action_id: 'a-ai',
      fields: { trueIntent: '#i2' }
    }]);
    expect(intentService.getIntentFromId('i1').actions[0].trueIntent).toBe('#i2');
  });
});
