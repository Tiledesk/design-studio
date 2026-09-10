import { isDefaultFallbackWithoutActions, TYPE_INTENT_NAME } from './utils';

/** Helper di costruzione: un intent "minimo" come arriva dal server */
function intent(intent_display_name: any, actions?: any): any {
  return { intent_display_name, actions };
}

/**
 * isDefaultFallbackWithoutActions e' il contratto di retrocompatibilita' del
 * lock sul blocco defaultFallback:
 *   - vuoto  => bloccato (niente drop, niente pulsante, niente placeholder)
 *   - pieno  => intatto (comportamento legacy)
 *   - altri blocchi => sempre intatti
 */
describe('isDefaultFallbackWithoutActions', () => {

  describe('defaultFallback SENZA action -> bloccata', () => {
    it('actions array vuoto (chatbot nuovi)', () => {
      expect(isDefaultFallbackWithoutActions(intent(TYPE_INTENT_NAME.DEFAULT_FALLBACK, []))).toBe(true);
    });
    it('actions undefined', () => {
      expect(isDefaultFallbackWithoutActions(intent(TYPE_INTENT_NAME.DEFAULT_FALLBACK, undefined))).toBe(true);
    });
    it('actions null', () => {
      expect(isDefaultFallbackWithoutActions(intent(TYPE_INTENT_NAME.DEFAULT_FALLBACK, null))).toBe(true);
    });
    it('proprieta actions del tutto assente', () => {
      expect(isDefaultFallbackWithoutActions({ intent_display_name: TYPE_INTENT_NAME.DEFAULT_FALLBACK })).toBe(true);
    });
    it('nome con spazi attorno', () => {
      expect(isDefaultFallbackWithoutActions(intent('  defaultFallback  ', []))).toBe(true);
    });
  });

  describe('defaultFallback CON action -> NON bloccata (legacy)', () => {
    it('una action', () => {
      expect(isDefaultFallbackWithoutActions(intent(TYPE_INTENT_NAME.DEFAULT_FALLBACK, [{ _tdActionType: 'reply' }]))).toBe(false);
    });
    it('piu action', () => {
      const actions = [{ _tdActionType: 'reply' }, { _tdActionType: 'intent' }];
      expect(isDefaultFallbackWithoutActions(intent(TYPE_INTENT_NAME.DEFAULT_FALLBACK, actions))).toBe(false);
    });
  });

  describe('blocchi diversi da defaultFallback -> mai bloccati', () => {
    it('start vuoto', () => {
      expect(isDefaultFallbackWithoutActions(intent(TYPE_INTENT_NAME.START, []))).toBe(false);
    });
    it('webhook vuoto', () => {
      expect(isDefaultFallbackWithoutActions(intent(TYPE_INTENT_NAME.WEBHOOK, []))).toBe(false);
    });
    it('close vuoto', () => {
      expect(isDefaultFallbackWithoutActions(intent(TYPE_INTENT_NAME.CLOSE, []))).toBe(false);
    });
    it('blocco utente vuoto', () => {
      expect(isDefaultFallbackWithoutActions(intent('untitled_block_1', []))).toBe(false);
    });
    it('nome che contiene defaultFallback ma non lo e', () => {
      expect(isDefaultFallbackWithoutActions(intent('myDefaultFallback', []))).toBe(false);
      expect(isDefaultFallbackWithoutActions(intent('defaultFallback2', []))).toBe(false);
    });
    it('confronto case sensitive', () => {
      expect(isDefaultFallbackWithoutActions(intent('defaultfallback', []))).toBe(false);
    });
  });

  describe('input degeneri -> mai bloccati', () => {
    it('intent null / undefined', () => {
      expect(isDefaultFallbackWithoutActions(null)).toBe(false);
      expect(isDefaultFallbackWithoutActions(undefined)).toBe(false);
    });
    it('intent_display_name mancante o non stringa', () => {
      expect(isDefaultFallbackWithoutActions({ actions: [] })).toBe(false);
      expect(isDefaultFallbackWithoutActions(intent(null, []))).toBe(false);
      expect(isDefaultFallbackWithoutActions(intent(42, []))).toBe(false);
    });
  });

});
