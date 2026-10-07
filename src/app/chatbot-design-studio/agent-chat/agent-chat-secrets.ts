import { TYPE_ACTION } from '../utils-actions';

/** API keys written into a web request by the chat.
 *
 *  A key typed into `headersString`, `url` or `jsonBody` is stored in the
 *  agent, exported with it, shown to whoever opens the block, and sent back to
 *  the chat's model by every `get_flow`. The key belongs in a Global of the
 *  agent (Design Studio -> Globals, type secret), which the engine fills into
 *  the header like any other attribute: `Bearer {{openrouter_api_key}}`.
 *
 *  Two uses, one definition: `FlowOpsService` refuses an operation that writes
 *  a literal key, and the chat host masks the ones already in a flow before
 *  `get_flow` hands it over. */

export const WEB_REQUEST_TYPES: string[] = [TYPE_ACTION.WEB_REQUEST, TYPE_ACTION.WEB_REQUESTV2];

/** What `get_flow` shows instead of a literal key. Refused on the way back in,
 *  so the chat cannot overwrite a working key with the mask. */
export const REDACTED_SECRET = '<redacted: literal key, move it to a Global>';

/** Shapes that are a key whatever field they sit in: provider keys
 *  (`sk-...`, OpenAI, OpenRouter, Anthropic) and a bearer token that is not a
 *  `{{template}}`. Sixteen characters keeps prose and examples out. */
const KEY_IN_TEXT = /\bsk-[A-Za-z0-9_-]{16,}|\bBearer\s+(?!\{\{)[A-Za-z0-9._~+\/=-]{16,}/;

/** Headers whose value is a credential by name: any literal value there is a key. */
const CREDENTIAL_HEADER = /authorization|api[-_]?key|token|secret|password/i;

/** A key passed in the query string (`?key=...`, `&api_key=...`). */
const KEY_IN_QUERY = /[?&](?:api[-_]?key|key|token|access_token|secret)=(?!\{\{)[^&#\s]{16,}/i;

const isTemplated = (value: string): boolean => value.includes('{{');

function headerEntries(headers: unknown): Array<[string, string]> {
  if (!headers) { return []; }
  if (typeof headers === 'string') {
    try { return headerEntries(JSON.parse(headers)); } catch { return [['', headers]]; }
  }
  if (typeof headers !== 'object') { return []; }
  return Object.entries(headers as Record<string, unknown>)
    .filter(([, v]) => typeof v === 'string') as Array<[string, string]>;
}

function isLiteralHeaderSecret(name: string, value: string): boolean {
  if (!value.trim() || isTemplated(value) && !KEY_IN_TEXT.test(value)) { return false; }
  return KEY_IN_TEXT.test(value)
    || (CREDENTIAL_HEADER.test(name) && !isTemplated(value)
        && value.trim().replace(/^(Bearer|Basic|Token)\s+/i, '').length >= 8);
}

/** The fields of a web request action that carry a literal key or the mask,
 *  in the order the refusal names them. Empty when there is nothing to say,
 *  and for any other action type. */
export function literalSecretFields(actionType: string, fields?: Record<string, any>): string[] {
  if (!fields || WEB_REQUEST_TYPES.indexOf(actionType) === -1) { return []; }
  const found: string[] = [];
  const headers = headerEntries(fields.headersString);
  if (headers.some(([name, value]) => value.includes(REDACTED_SECRET) || isLiteralHeaderSecret(name, value))) {
    found.push('headersString');
  }
  if (typeof fields.url === 'string' && (KEY_IN_TEXT.test(fields.url) || KEY_IN_QUERY.test(fields.url))) {
    found.push('url');
  }
  if (typeof fields.jsonBody === 'string'
      && (KEY_IN_TEXT.test(fields.jsonBody) || fields.jsonBody.includes(REDACTED_SECRET))) {
    found.push('jsonBody');
  }
  return found;
}

/** The refusal the chat reads, and repeats to the user in its own words. */
export function literalSecretRefusal(actionType: string, fields: string[]): string {
  return `This "${actionType}" carries an API key written in ${fields.join(', ')}. ` +
    'Never write a key into the flow: it is stored in the agent, exported with it and shown to ' +
    'anyone who opens the block. Put the key in a Global of the agent and reference it by name, ' +
    'e.g. "Authorization": "Bearer {{openrouter_api_key}}". You cannot create a Global: ask the ' +
    'user for the name of theirs, or propose one and tell them to create it (Design Studio -> ' +
    'Globals, type secret). If the user pasted the key in the chat, tell them to consider ' +
    `rotating it. A value shown as "${REDACTED_SECRET}" is a key already in the flow: replace ` +
    'it with the Global, never send the mask back.';
}

/** A copy of the flow with every literal key of a web request replaced by
 *  `REDACTED_SECRET`. Templated values (`{{name}}`) are left as they are. */
export function withoutLiteralSecrets<T>(flow: T): T {
  const copy = JSON.parse(JSON.stringify(flow));
  for (const intent of Array.isArray(copy?.intents) ? copy.intents : []) {
    for (const action of Array.isArray(intent?.actions) ? intent.actions : []) {
      if (!action || WEB_REQUEST_TYPES.indexOf(action._tdActionType) === -1) { continue; }
      const headers = action.headersString;
      if (headers && typeof headers === 'object') {
        for (const [name, value] of Object.entries(headers)) {
          if (typeof value === 'string' && isLiteralHeaderSecret(name, value)) {
            headers[name] = REDACTED_SECRET;
          }
        }
      }
      if (typeof action.url === 'string') {
        action.url = action.url
          .replace(new RegExp(KEY_IN_TEXT.source, 'g'), REDACTED_SECRET)
          .replace(new RegExp(KEY_IN_QUERY.source, 'gi'), m => m.slice(0, m.indexOf('=') + 1) + REDACTED_SECRET);
      }
      if (typeof action.jsonBody === 'string') {
        action.jsonBody = action.jsonBody.replace(new RegExp(KEY_IN_TEXT.source, 'g'), REDACTED_SECRET);
      }
    }
  }
  return copy;
}
