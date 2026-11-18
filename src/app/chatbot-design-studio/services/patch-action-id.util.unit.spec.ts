import { patchActionIds } from './patch-action-id.util';

describe('patchActionIds', () => {
  it('does not throw on a null action and leaves it in place (filtered later)', () => {
    const faqs: any[] = [{ actions: [null, { _tdActionId: '' }] }];
    expect(() => patchActionIds(faqs)).not.toThrow();
    expect(faqs[0].actions[0]).toBeNull();
    expect(faqs[0].actions[1]._tdActionId).toBeTruthy();
  });

  it('assigns an id to an action that is missing _tdActionId', () => {
    const faqs: any[] = [{ actions: [{}] }];
    patchActionIds(faqs);
    expect(faqs[0].actions[0]._tdActionId).toBeTruthy();
  });

  it('preserves an existing valid _tdActionId', () => {
    const faqs: any[] = [{ actions: [{ _tdActionId: 'abc123' }] }];
    patchActionIds(faqs);
    expect(faqs[0].actions[0]._tdActionId).toBe('abc123');
  });

  it('tolerates intents with a missing or null actions array', () => {
    const faqs: any[] = [{}, { actions: null }];
    expect(() => patchActionIds(faqs)).not.toThrow();
  });

  it('da\' un id ai casi di una condizione a piu\' uscite che ne sono privi', () => {
    const faqs: any[] = [{ actions: [
      { _tdActionId: 'a1', _tdActionType: 'jsonconditionmulti', cases: [
        { when: 'x == "1"', intent: '#i2' },
        { _tdCaseId: 'gia-mio', when: 'x == "2"', intent: '#i3' }
      ] }
    ] }];
    patchActionIds(faqs);
    const casi = faqs[0].actions[0].cases;
    expect(casi[0]._tdCaseId).toBeTruthy();
    expect(casi[1]._tdCaseId).toBe('gia-mio');
    expect(casi[0]._tdCaseId).not.toBe(casi[1]._tdCaseId);
  });

  it('non si rompe su un\'azione senza casi o con casi nulli', () => {
    const faqs: any[] = [{ actions: [
      { _tdActionId: 'a1', _tdActionType: 'reply' },
      { _tdActionId: 'a2', _tdActionType: 'jsonconditionmulti', cases: [null] }
    ] }];
    expect(() => patchActionIds(faqs)).not.toThrow();
  });

});
