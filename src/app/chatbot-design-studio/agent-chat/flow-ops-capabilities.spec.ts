import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { FlowOpsService } from './flow-ops.service';
import { IntentService } from '../services/intent.service';
import { ConnectorService } from '../services/connector.service';
import { DashboardService } from 'src/app/services/dashboard.service';
import { AgentChatFamilyService } from './agent-chat-family.service';
import { FaqService } from 'src/app/services/faq.service';
import { Intent } from 'src/app/models/intent-model';
import { CapabilitiesSnapshot } from './agent-chat-capabilities.model';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

function anIntent(intentId: string, name: string): Intent {
  const intent = new Intent();
  intent.intent_id = intentId;
  intent.intent_display_name = name;
  intent.id_faq_kb = 'kb1';
  intent.actions = [];
  return intent;
}

function aSnapshot(): CapabilitiesSnapshot {
  return {
    capabilities: {
      chatbot_subtype: 'chatbot', subagent: false,
      actions: [
        { type: 'reply', status: 'available' },
        { type: 'ai_prompt', status: 'available' },
        { type: 'code', status: 'needs_upgrade', plan: 'Custom' }
      ],
      mcp_servers: [
        { id: 'tiledesk-communicator', name: 'Tiledesk Communicator', native: true,
          transport: 'streamable_http', tools: [{ name: 'TRANSFER_TO_AGENT' }], configured: true },
        // Unconfigured: the project has not added this one to its own MCP
        // integration yet, which is exactly what configureNativeServers below
        // is for.
        { id: 'tiledesk-data-table', name: 'Tiledesk Data Table', native: true,
          transport: 'streamable_http', tools: [{ name: 'GET_ROW' }], configured: false },
        { name: 'Acme CRM', native: false, transport: 'streamable_http', tools: [{ name: 'lookup_customer' }] }
      ]
    },
    customServerConfigs: {}
  };
}

describe('FlowOpsService — project capabilities', () => {
  let service: FlowOpsService;
  let intentService: any;

  beforeEach(() => {
    LoggerInstance.setInstance({
      log() {}, error() {}, warn() {}, info() {}, debug() {}, setLoggerConfig() {}
    } as any);
    const withLegacy = anIntent('i1', 'start');
    withLegacy.actions = [
      { _tdActionId: 'old', _tdActionType: 'gpt_task', question: 'q' } as any,
      { _tdActionId: 'ai1', _tdActionType: 'ai_prompt', question: 'q' } as any
    ];
    intentService = {
      listOfIntents: [withLegacy, anIntent('i2', 'welcome')],
      getIntentFromId(id: string) { return this.listOfIntents.find((i: Intent) => i.intent_id === id); },
      createNewAction: jasmine.createSpy('createNewAction').and.callFake((type: string) =>
        ({ _tdActionId: 'generated', _tdActionType: type })),
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
        { provide: ConnectorService, useValue: {
            createNewConnector: () => Promise.resolve(), createConnectorFromId: () => Promise.resolve(true),
            deleteConnectorWithIDStartingWith: () => {}, createConnectorsOfIntent: () => Promise.resolve(),
            deleteConnectorsOutOfBlock: () => {} } },
        { provide: DashboardService, useValue: { id_faq_kb: 'kb1' } },
        { provide: AgentChatFamilyService, useValue: { read: () => Promise.resolve(
            { root_id: 'kb1', root_name: 'Root', is_subagent: false, subagents: [] }) } },
        { provide: FaqService, useValue: { getAllFaqByFaqKbId: () => of([]) } }
      ]
    });
    service = TestBed.inject(FlowOpsService);
    service.setCapabilitiesSource(() => Promise.resolve(aSnapshot()));
  });

  it('adds an available action as before', async () => {
    const report = await service.apply([{ op: 'add_action', intent_id: 'i2', type: 'reply' }]);
    expect(report.ok).toBe(true);
  });

  it('refuses an action the project does not have, applying nothing', async () => {
    const report = await service.apply([
      { op: 'add_action', intent_id: 'i2', type: 'reply' },
      { op: 'add_action', intent_id: 'i2', type: 'gpt_task' }
    ]);
    expect(report.rejected_before_applying).toBe(true);
    expect(report.results[1].error).toContain('get_project_capabilities');
    expect(intentService.updateIntent).not.toHaveBeenCalled();
  });

  it('refuses a plan-gated action, naming the plan', async () => {
    const report = await service.apply([{ op: 'add_action', intent_id: 'i2', type: 'code' }]);
    expect(report.results[0].error).toContain('Custom');
  });

  it('refuses an unavailable type inside add_intent actions', async () => {
    const report = await service.apply([
      { op: 'add_intent', intent_display_name: 'x', actions: [{ type: 'gpt_task' }] }
    ]);
    expect(report.rejected_before_applying).toBe(true);
    expect(report.results[0].error).toContain('gpt_task');
  });

  it('still lets an existing action of an unavailable type be edited and deleted', async () => {
    const update = await service.apply([
      { op: 'update_action', intent_id: 'i1', action_id: 'old', fields: { question: 'new' } }
    ]);
    expect(update.ok).toBe(true);
    const del = await service.apply([{ op: 'delete_action', intent_id: 'i1', action_id: 'old' }]);
    expect(del.ok).toBe(true);
  });

  it('stores an attached native server built from the capability, dropping an agent url', async () => {
    const report = await service.apply([{
      op: 'add_action', intent_id: 'i2', type: 'ai_prompt',
      fields: { question: 'q', servers: [
        { id: 'tiledesk-communicator', url: 'https://evil.example.com', tools: ['TRANSFER_TO_AGENT'] }] }
    }]);
    expect(report.ok).toBe(true);
    const stored = intentService.getIntentFromId('i2').actions[0].servers;
    expect(stored).toEqual([jasmine.objectContaining({
      id: 'tiledesk-communicator', name: 'Tiledesk Communicator', native: true,
      transport: 'streamable_http', tools: ['TRANSFER_TO_AGENT'] })]);
    expect(stored[0].url).toBeUndefined();
  });

  it('checks servers on update_action of an existing ai_prompt', async () => {
    const bad = await service.apply([{ op: 'update_action', intent_id: 'i1', action_id: 'ai1',
      fields: { servers: [{ id: 'tiledesk-communicator', tools: ['NOPE'] }] } }]);
    expect(bad.rejected_before_applying).toBe(true);
    expect(bad.results[0].error).toContain('NOPE');
    const good = await service.apply([{ op: 'update_action', intent_id: 'i1', action_id: 'ai1',
      fields: { servers: [{ id: 'tiledesk-communicator', tools: ['TRANSFER_TO_AGENT'] }] } }]);
    expect(good.ok).toBe(true);
    expect(intentService.getIntentFromId('i1').actions[1].servers[0].name).toBe('Tiledesk Communicator');
  });

  it('normalises servers inside add_intent actions too', async () => {
    intentService.createNewIntent = jasmine.createSpy('createNewIntent')
      .and.callFake(() => anIntent('new-id', 'ask'));
    intentService.addNewIntentToListOfIntents = jasmine.createSpy('addNewIntentToListOfIntents')
      .and.callFake((intent: Intent) => { intentService.listOfIntents.push(intent); });
    const report = await service.apply([{ op: 'add_intent', intent_display_name: 'ask',
      actions: [{ type: 'ai_prompt', fields: { question: 'q',
        servers: [{ id: 'tiledesk-communicator', tools: ['TRANSFER_TO_AGENT'] }] } }] }]);
    expect(report.ok).toBe(true);
    const created = intentService.getIntentFromId('new-id');
    expect(created.actions[0].servers[0].name).toBe('Tiledesk Communicator');
  });

  it('refuses the batch, applying nothing, when the capabilities cannot be read', async () => {
    service.setCapabilitiesSource(() => Promise.reject(new Error('boom')));
    const report = await service.apply([{ op: 'add_action', intent_id: 'i2', type: 'reply' }]);
    expect(report.rejected_before_applying).toBe(true);
    expect(report.results[0].error).toContain('boom');
    expect(intentService.updateIntent).not.toHaveBeenCalled();
  });

  it('does not read the capabilities for a batch that adds nothing', async () => {
    const source = jasmine.createSpy('source').and.returnValue(Promise.resolve(aSnapshot()));
    service.setCapabilitiesSource(source);
    await service.apply([{ op: 'delete_action', intent_id: 'i1', action_id: 'old' }]);
    expect(source).not.toHaveBeenCalled();
  });

  it('checks nothing when no source is set', async () => {
    service.setCapabilitiesSource(null);
    const report = await service.apply([{ op: 'add_action', intent_id: 'i2', type: 'gpt_task' }]);
    expect(report.ok).toBe(true);
  });

  it('adds an unconfigured native to the project before applying the patch, calling the configurer once with its id', async () => {
    const calls: string[] = [];
    const configurer = jasmine.createSpy('configurer').and.callFake(async (ids: string[]) => {
      calls.push(`configure:${ids.join(',')}`);
    });
    intentService.updateIntent = jasmine.createSpy('updateIntent').and.callFake(async () => {
      calls.push('updateIntent');
      return true;
    });
    service.setNativeConfigurer(configurer);
    const report = await service.apply([{
      op: 'add_action', intent_id: 'i2', type: 'ai_prompt',
      fields: { question: 'q', servers: [{ id: 'tiledesk-data-table', tools: ['GET_ROW'] }] }
    }]);
    expect(report.ok).toBe(true);
    expect(configurer).toHaveBeenCalledTimes(1);
    expect(configurer).toHaveBeenCalledWith(['tiledesk-data-table']);
    expect(calls).toEqual(['configure:tiledesk-data-table', 'updateIntent']);
  });

  it('adds the unconfigured native before applying an add_intent whose inline action attaches it, calling the configurer once', async () => {
    intentService.createNewIntent = jasmine.createSpy('createNewIntent')
      .and.callFake(() => anIntent('new-id', 'ask'));
    intentService.addNewIntentToListOfIntents = jasmine.createSpy('addNewIntentToListOfIntents')
      .and.callFake((intent: Intent) => { intentService.listOfIntents.push(intent); });
    const calls: string[] = [];
    const configurer = jasmine.createSpy('configurer').and.callFake(async (ids: string[]) => {
      calls.push(`configure:${ids.join(',')}`);
    });
    intentService.saveNewIntent = jasmine.createSpy('saveNewIntent').and.callFake(async () => {
      calls.push('saveNewIntent');
      return true;
    });
    service.setNativeConfigurer(configurer);
    const report = await service.apply([{ op: 'add_intent', intent_display_name: 'ask',
      actions: [{ type: 'ai_prompt', fields: { question: 'q',
        servers: [{ id: 'tiledesk-data-table', tools: ['GET_ROW'] }] } }] }]);
    expect(report.ok).toBe(true);
    expect(configurer).toHaveBeenCalledTimes(1);
    expect(configurer).toHaveBeenCalledWith(['tiledesk-data-table']);
    expect(calls).toEqual(['configure:tiledesk-data-table', 'saveNewIntent']);
  });

  it('adds the unconfigured native before applying an update_action on an existing ai_prompt, calling the configurer once', async () => {
    const calls: string[] = [];
    const configurer = jasmine.createSpy('configurer').and.callFake(async (ids: string[]) => {
      calls.push(`configure:${ids.join(',')}`);
    });
    intentService.updateIntent = jasmine.createSpy('updateIntent').and.callFake(async () => {
      calls.push('updateIntent');
      return true;
    });
    service.setNativeConfigurer(configurer);
    const report = await service.apply([{ op: 'update_action', intent_id: 'i1', action_id: 'ai1',
      fields: { servers: [{ id: 'tiledesk-data-table', tools: ['GET_ROW'] }] } }]);
    expect(report.ok).toBe(true);
    expect(configurer).toHaveBeenCalledTimes(1);
    expect(configurer).toHaveBeenCalledWith(['tiledesk-data-table']);
    expect(calls).toEqual(['configure:tiledesk-data-table', 'updateIntent']);
  });

  it('does not call the configurer when every attached server is already configured', async () => {
    const configurer = jasmine.createSpy('configurer').and.returnValue(Promise.resolve());
    service.setNativeConfigurer(configurer);
    const nativeReport = await service.apply([{
      op: 'add_action', intent_id: 'i2', type: 'ai_prompt',
      fields: { question: 'q', servers: [{ id: 'tiledesk-communicator', tools: ['TRANSFER_TO_AGENT'] }] }
    }]);
    expect(nativeReport.ok).toBe(true);
    const customReport = await service.apply([{
      op: 'add_action', intent_id: 'i2', type: 'ai_prompt',
      fields: { question: 'q2', servers: [{ name: 'Acme CRM', tools: ['lookup_customer'] }] }
    }]);
    expect(customReport.ok).toBe(true);
    expect(configurer).not.toHaveBeenCalled();
  });

  it('refuses the batch when the configurer rejects, applying nothing', async () => {
    const configurer = jasmine.createSpy('configurer').and.returnValue(Promise.reject(new Error('save failed')));
    service.setNativeConfigurer(configurer);
    const report = await service.apply([{
      op: 'add_action', intent_id: 'i2', type: 'ai_prompt',
      fields: { question: 'q', servers: [{ id: 'tiledesk-data-table', tools: ['GET_ROW'] }] }
    }]);
    expect(report.ok).toBe(false);
    expect(report.rejected_before_applying).toBe(true);
    expect(report.results[0].error).toContain('tiledesk-data-table');
    expect(report.results[0].error).toContain('save failed');
    expect(intentService.updateIntent).not.toHaveBeenCalled();
  });

  it('applies as before when no native configurer is set, even though the native is unconfigured', async () => {
    const report = await service.apply([{
      op: 'add_action', intent_id: 'i2', type: 'ai_prompt',
      fields: { question: 'q', servers: [{ id: 'tiledesk-data-table', tools: ['GET_ROW'] }] }
    }]);
    expect(report.ok).toBe(true);
  });
});
