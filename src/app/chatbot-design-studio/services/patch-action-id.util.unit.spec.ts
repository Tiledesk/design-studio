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
});
