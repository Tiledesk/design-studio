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
        .and.callFake(() => anIntent('new-id', 'Untitled Block 1')),
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
    expect(intentService.addNewIntentToListOfIntents).toHaveBeenCalled();
    expect(intentService.saveNewIntent).toHaveBeenCalled();
    expect(report.results[0].intent_id).toBe('new-id');
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
    expect(intentService.deleteIntentNew).toHaveBeenCalled();
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
