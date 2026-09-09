import { getDeleteSubagentErrorMessage } from './cds-panel-subagents.component';

/**
 * Quando un subagent e' ancora referenziato da un agent (o da un altro subagent) il backend
 * rifiuta la DELETE con un 4xx e spiega il motivo nel campo `msg`. Prima di questi test quel
 * messaggio finiva solo in console e l'utente vedeva un'eliminazione che non faceva nulla.
 */
describe('getDeleteSubagentErrorMessage', () => {

  it('returns the backend msg when the subagent is still referenced', () => {
    const error = {
      status: 409,
      error: {
        success: false,
        msg: 'Cannot delete subagent because it is still referenced by another chatbot',
        error_code: 12002,
        referenced_by: { id_faq_kb: '6a9044d0b578000013db9b9d', intent_display_name: 'untitled_block_2' },
      },
    };

    expect(getDeleteSubagentErrorMessage(error))
      .toBe('Cannot delete subagent because it is still referenced by another chatbot');
  });

  it('falls back to null when the body carries no msg', () => {
    expect(getDeleteSubagentErrorMessage({ status: 500, error: { success: false, error_code: 12002 } })).toBeNull();
  });

  it('falls back to null when msg is empty or blank', () => {
    expect(getDeleteSubagentErrorMessage({ error: { msg: '' } })).toBeNull();
    expect(getDeleteSubagentErrorMessage({ error: { msg: '   ' } })).toBeNull();
  });

  it('falls back to null when msg is not a string', () => {
    expect(getDeleteSubagentErrorMessage({ error: { msg: { text: 'nope' } } })).toBeNull();
    expect(getDeleteSubagentErrorMessage({ error: { msg: 12002 } })).toBeNull();
  });

  it('never throws on a malformed or missing error', () => {
    expect(getDeleteSubagentErrorMessage(null)).toBeNull();
    expect(getDeleteSubagentErrorMessage(undefined)).toBeNull();
    expect(getDeleteSubagentErrorMessage({})).toBeNull();
    expect(getDeleteSubagentErrorMessage({ error: null })).toBeNull();
    expect(getDeleteSubagentErrorMessage('boom')).toBeNull();
  });
});
