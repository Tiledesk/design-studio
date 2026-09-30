import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { SavingStateService } from 'src/app/services/saving-state.service';
import { IntentService } from './services/intent.service';
import { CdsIntentComponent } from './cds-dashboard/cds-canvas/cds-intent/cds-intent.component';
import { CdsCanvasComponent } from './cds-dashboard/cds-canvas/cds-canvas.component';
import { PanelIntentControlsComponent } from './cds-dashboard/cds-canvas/cds-intent/panel-intent-controls/panel-intent-controls.component';
import { createStartPointBlock, isStartBox } from './utils-start-points';

const flags = (c: any) => ({ more: c.showMore, color: c.showColor, del: c.showDelete, copy: c.showCopy, play: c.showPlay });
const FULL = { more: true, color: true, del: true, copy: true, play: true };

function controls(inputs: any): any {
  const c: any = new PanelIntentControlsComponent();
  Object.assign(c, inputs);
  c.ngOnInit();
  return c;
}

function markerBox(name = 'Webhook start'): any {
  const block: any = createStartPointBlock('webhook', { x: 0, y: 0 });
  block.intent_display_name = name;
  block.id_faq_kb = 'bot1';
  return block;
}

function plainBlock(name = 'Webhook start'): any {
  return { intent_id: 'plain1', intent_display_name: name, id_faq_kb: 'bot1', attributes: { position: { x: 0, y: 0 } }, actions: [] };
}

describe('start box controls', () => {
  beforeAll(() => {
    LoggerInstance.setInstance({ log() {}, warn() {}, error() {}, debug() {}, info() {} } as any);
  });

  describe('isStartBox', () => {
    it('is true for the start block and for a marker block with any name', () => {
      expect(isStartBox({ intent_display_name: 'start', attributes: {} })).toBeTrue();
      expect(isStartBox(markerBox())).toBeTrue();
      expect(isStartBox(markerBox('Renamed box'))).toBeTrue();
    });

    it('is false for a normal block named "Webhook start" and for nothing', () => {
      expect(isStartBox(plainBlock())).toBeFalse();
      expect(isStartBox({ intent_display_name: 'x', attributes: { start_point: 'bogus' } })).toBeFalse();
      expect(isStartBox(null)).toBeFalse();
    });
  });

  describe('PanelIntentControlsComponent', () => {
    const startFlags = () => flags(controls({ display_name: 'start' }));

    it('the start block keeps only "more"', () => {
      expect(startFlags()).toEqual({ more: true, color: false, del: false, copy: false, play: false });
    });

    it('a marker box with any name shows the same controls as start', () => {
      expect(flags(controls({ display_name: 'Webhook start', isStartPoint: true }))).toEqual(startFlags());
      expect(flags(controls({ display_name: 'Anything', isStartPoint: true }))).toEqual(startFlags());
    });

    it('a marker flag arriving after init (async parent init) still hides the controls', () => {
      const c = controls({ display_name: 'Webhook start', isStartPoint: false });
      expect(flags(c)).toEqual(FULL);
      c.isStartPoint = true;
      c.ngOnChanges({ isStartPoint: { previousValue: false, currentValue: true, firstChange: false, isFirstChange: () => false } });
      expect(flags(c)).toEqual(startFlags());
    });

    it('a normal block named "Webhook start" without the marker keeps the full toolbar', () => {
      expect(flags(controls({ display_name: 'Webhook start', isStartPoint: false }))).toEqual(FULL);
    });
  });

  describe('CdsIntentComponent toolbar paths', () => {
    const ctx = (intent: any) => ({
      intent,
      deleteIntent: { emit: jasmine.createSpy('emit') },
      intentService: jasmine.createSpyObj('intentService', ['copyElement', 'openTestItOut']),
      appStorageService: jasmine.createSpyObj('appStorageService', ['setItem']),
      logger: { log() {} },
    });

    it('delete and copy of a marker box are refused', () => {
      const c: any = ctx(markerBox('Any name'));
      (CdsIntentComponent.prototype as any).onDeleteIntent.call(c, c.intent);
      (CdsIntentComponent.prototype as any).copyIntent.call(c);
      expect(c.deleteIntent.emit).not.toHaveBeenCalled();
      expect(c.intentService.copyElement).not.toHaveBeenCalled();
      expect(c.appStorageService.setItem).not.toHaveBeenCalled();
    });

    it('a normal block named "Webhook start" can still be deleted and copied', () => {
      const c: any = ctx(plainBlock());
      c.intentService.copyElement.and.returnValue({ key: 'copied_items', data: '{}' });
      (CdsIntentComponent.prototype as any).onDeleteIntent.call(c, c.intent);
      (CdsIntentComponent.prototype as any).copyIntent.call(c);
      expect(c.deleteIntent.emit).toHaveBeenCalledWith(c.intent);
      expect(c.appStorageService.setItem).toHaveBeenCalled();
    });
  });

  describe('CdsCanvasComponent delete guard', () => {
    const ctx = () => ({
      hasClickedAddAction: false,
      logger: { log() {} },
      removeConnectorDraftAndCloseFloatMenu: jasmine.createSpy('removeDraft'),
      closeAllPanels: jasmine.createSpy('closeAllPanels'),
      closeActionDetailPanel: jasmine.createSpy('closeActionDetailPanel'),
      deleteIntent: jasmine.createSpy('deleteIntent'),
    });

    it('onDeleteIntent refuses a marker box and the start block', () => {
      const c: any = ctx();
      CdsCanvasComponent.prototype.onDeleteIntent.call(c, markerBox('Renamed'));
      CdsCanvasComponent.prototype.onDeleteIntent.call(c, { intent_id: 's', intent_display_name: 'start', attributes: {} });
      expect(c.deleteIntent).not.toHaveBeenCalled();
    });

    it('onDeleteIntent still deletes a normal block named "Webhook start"', () => {
      const c: any = ctx();
      const block = plainBlock();
      CdsCanvasComponent.prototype.onDeleteIntent.call(c, block);
      expect(c.deleteIntent).toHaveBeenCalledWith(block);
    });
  });

  describe('IntentService copy, paste and keyboard delete', () => {
    let service: IntentService;

    beforeEach(() => {
      const faq: any = {};
      const dashboard: any = { selectedChatbot: { subtype: 'chatbot' } };
      service = new IntentService(faq, null, null, null, null, dashboard, null, new SavingStateService());
    });

    it('copyElement refuses a marker box', () => {
      const box = markerBox('Any');
      expect(service.copyElement({ element: box, type: 'INTENT', chatbot: 'bot1', intentId: box.intent_id })).toBeNull();
      expect(service.arrayCOPYPAST.length).toBe(0);
    });

    it('copyElement still copies a normal block named "Webhook start"', () => {
      const block = plainBlock();
      expect(service.copyElement({ element: block, type: 'INTENT', chatbot: 'bot1', intentId: block.intent_id })).toBeTruthy();
      expect(service.arrayCOPYPAST.length).toBe(1);
    });

    it('pasteElementToStage never adds a marker box (e.g. copied before the fix, from storage)', async () => {
      const box = markerBox();
      service.arrayCOPYPAST = [{ element: box, type: 'INTENT', chatbot: 'bot1', intentId: box.intent_id }];
      const add = spyOn<any>(service, 'addNewIntentToListOfIntents');
      const save = spyOn<any>(service, 'saveNewIntent');
      await service.pasteElementToStage({ x: 0, y: 0 });
      expect(add).not.toHaveBeenCalled();
      expect(save).not.toHaveBeenCalled();
      expect(service.listOfIntents.length).toBe(0);
    });

    it('deleteSelectedAction (Backspace) never strips the action of a start box', () => {
      const box = markerBox();
      box.actions[0]._tdActionId = 'a1';
      service.listOfIntents = [box];
      service.intentSelected = box;
      service.actionSelectedID = 'a1';
      const update = spyOn<any>(service, 'updateIntent');
      service.deleteSelectedAction();
      expect(box.actions.length).toBe(1);
      expect(update).not.toHaveBeenCalled();
    });
  });
});
