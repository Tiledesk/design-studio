import { CdsPanelElementsComponent } from './cds-panel-elements.component';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

describe('CdsPanelElementsComponent start points', () => {
  const build = (subtype?: string) => {
    LoggerInstance.setInstance({ log() {}, warn() {}, error() {}, debug() {}, info() {} } as any);
    const dashboard: any = { selectedChatbot: { subtype } };
    const plan: any = { checkIfActionIsInChatbotType: () => {}, checkIfCanLoad: () => true };
    const c = new CdsPanelElementsComponent(plan, dashboard);
    c.ngOnInit();
    return c;
  };
  const start = { intent_id: 's', intent_display_name: 'start' };
  const block = { intent_id: 'b1', intent_display_name: 'Webhook start', attributes: { start_point: 'webhook' } };

  it('offers the category for chatbot subtype (default too)', () => {
    expect(build('chatbot').actionsByCategory['START_POINTS']).toBeTruthy();
    expect(build(undefined).actionsByCategory['START_POINTS']).toBeTruthy();
  });

  it('hides the category for webhook, copilot and voice subtypes', () => {
    ['webhook', 'copilot', 'voice', 'voice_twilio'].forEach(s => {
      expect(build(s).actionsByCategory['START_POINTS']).toBeUndefined();
    });
  });

  it('items: Web always disabled, Webhook enabled when absent', () => {
    const c = build('chatbot');
    c.intents = [start];
    const items = c.buildStartPointItems();
    expect(items[0].value.disabled).toBe(true);
    expect(items[1].value.disabled).toBe(false);
  });

  it('Webhook disabled with tooltip when its block is present', () => {
    const c = build('chatbot');
    c.intents = [start, block];
    c.webhook = { webhook_id: 'w', start_points: { webhook: { block_id: 'b1' } } };
    const items = c.buildStartPointItems();
    expect(items[1].value.disabled).toBe(true);
    expect(items[1].value.tooltip).toBe('CDSCanvas.StartPointPresent');
  });

  it('Webhook enabled again when the start point block is missing', () => {
    const c = build('chatbot');
    c.intents = [start];
    c.webhook = { webhook_id: 'w', start_points: { webhook: { block_id: 'gone' } } };
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
