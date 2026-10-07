import { CdsPanelElementsComponent } from './cds-panel-elements.component';
import { BehaviorSubject, Subject } from 'rxjs';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

describe('CdsPanelElementsComponent start points', () => {
  const webhook$ = new BehaviorSubject<any>(null);
  const build = (subtype?: string, manager?: any) => {
    webhook$.next(null);
    LoggerInstance.setInstance({ log() {}, warn() {}, error() {}, debug() {}, info() {} } as any);
    const dashboard: any = { selectedChatbot: { subtype } };
    const plan: any = { checkIfActionIsInChatbotType: () => {}, checkIfCanLoad: () => true };
    const c = new CdsPanelElementsComponent(plan, dashboard, { webhook$ } as any, manager);
    c.ngOnInit();
    return c;
  };
  const start = { intent_id: 's', intent_display_name: 'start' };
  const block = { intent_id: 'b1', intent_display_name: 'Webhook start', attributes: { start_point: 'webhook' } };

  it('offers the category for chatbot subtype (default too)', () => {
    expect(build('chatbot').actionsByCategory['START_POINTS']).toBeTruthy();
    expect(build(undefined).actionsByCategory['START_POINTS']).toBeTruthy();
  });

  it('offers Scheduled only once the webhook says scheduled_available, and drops it again when it does not', () => {
    const c = build('chatbot');
    const has = () => c.actionsByCategory['START_POINTS'].some(i => i.value.start_point === 'scheduled');
    expect(has()).toBeFalse();
    webhook$.next({ scheduled_available: true });
    expect(has()).toBeTrue();
    webhook$.next({ scheduled_available: false });
    expect(has()).toBeFalse();
    c.ngOnDestroy();
  });

  it('hides the category for webhook, copilot and voice subtypes', () => {
    ['webhook', 'copilot', 'voice', 'voice_twilio'].forEach(s => {
      expect(build(s).actionsByCategory['START_POINTS']).toBeUndefined();
    });
  });

  it('items: Web disabled while the start is on, Webhook enabled when absent', () => {
    const c = build('chatbot');
    c.intents = [start];
    const items = c.buildStartPointItems();
    expect(items[0].value.disabled).toBe(true);
    expect(items[1].value.disabled).toBe(false);
  });

  it('palette offers Web start only when it is disabled, and follows the manager', () => {
    const c = build('chatbot');
    const web = () => c.actionsByCategory['START_POINTS'][0].value;
    const disabledStart = { ...start, attributes: { web_start_disabled: true } };
    c.intents = [start];
    c.ngOnChanges();
    expect(web().disabled).toBe(true);
    c.intents = [disabledStart];
    c.ngOnChanges();
    expect(web().disabled).toBe(false);
    // the intent is mutated in place (no ngOnChanges): the manager's event rebuilds the items
    const changed$ = new Subject<any>();
    const c2 = build('chatbot', { webStartChanged$: changed$ });
    const live: any = { ...start, attributes: {} };
    c2.intents = [live];
    c2.ngOnChanges();
    expect(c2.actionsByCategory['START_POINTS'][0].value.disabled).toBe(true);
    live.attributes.web_start_disabled = true;
    changed$.next({ intent: live, disabled: true });
    expect(c2.actionsByCategory['START_POINTS'][0].value.disabled).toBe(false);
    c2.ngOnDestroy();
  });

  it('Webhook disabled with tooltip when a marker block is present', () => {
    const c = build('chatbot');
    c.intents = [start, block];
    const items = c.buildStartPointItems();
    expect(items[1].value.disabled).toBe(true);
    expect(items[1].value.tooltip).toBe('CDSCanvas.StartPointPresent');
  });

  it('Webhook enabled again once no block carries the marker', () => {
    const c = build('chatbot');
    c.intents = [start, { intent_id: 'b2', intent_display_name: 'Webhook start' }];
    expect(c.buildStartPointItems()[1].value.disabled).toBe(false);
  });

  it('Webhook disabled while a create is pending', () => {
    const c = build('chatbot');
    c.intents = [start];
    c.startPointPending = true;
    expect(c.buildStartPointItems()[1].value.disabled).toBe(true);
  });

  it('opening the start points menu computes the items from the current state', () => {
    jasmine.clock().install();
    try {
      const c = build('chatbot');
      c.intents = [start];
      c.onOpenMenu({ offsetTop: 0 }, 'action', 'START_POINTS');
      jasmine.clock().tick(1);
      expect(c.actionsList[1].value.disabled).toBe(false);
      c.startPointPending = true;
      c.ngOnChanges();
      expect(c.actionsList[1].value.disabled).toBe(true);
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('a click on a disabled start point item asks the canvas to focus its box', () => {
    const c = build('chatbot');
    const seen = [];
    c.focusStartPoint.subscribe(t => seen.push(t));
    c.onStartPointClick('webhook');
    expect(seen).toEqual(['webhook']);
  });
});
