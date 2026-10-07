import { literalSecretFields, withoutLiteralSecrets, REDACTED_SECRET } from './agent-chat-secrets';

const KEY = 'sk-or-v1-2e41a51c78e39ec54ac9eae1c031b266e8711dc4';

describe('agent-chat-secrets — literal keys in a web request', () => {

  it('finds a provider key in the header, whatever the header is called', () => {
    expect(literalSecretFields('webrequestv2', { headersString: { Authorization: `Bearer ${KEY}` } }))
      .toEqual(['headersString']);
    expect(literalSecretFields('webrequestv2', { headersString: { 'X-Custom': KEY } }))
      .toEqual(['headersString']);
  });

  it('finds any literal value in a header named as a credential', () => {
    expect(literalSecretFields('webrequestv2', { headersString: { 'x-api-key': 'abcdef123456' } }))
      .toEqual(['headersString']);
  });

  it('accepts a Global, a short or empty value and the ordinary headers', () => {
    expect(literalSecretFields('webrequestv2', { headersString: {
      Authorization: 'Bearer {{openrouter_api_key}}', 'x-api-key': '{{ocr_key}}', 'X-Token-Type': 'jwt',
      'Content-Type': 'application/json', 'User-Agent': 'TiledeskBotRuntime', 'Cache-Control': 'no-cache' } }))
      .toEqual([]);
  });

  it('reads a header object that arrives as a JSON string', () => {
    expect(literalSecretFields('webrequestv2', { headersString: JSON.stringify({ Authorization: `Bearer ${KEY}` }) }))
      .toEqual(['headersString']);
  });

  it('finds a key in the query string and in the body', () => {
    expect(literalSecretFields('webrequestv2', { url: 'https://api.example.com/ocr?key=AIzaSyA1234567890abcdef' }))
      .toEqual(['url']);
    expect(literalSecretFields('webrequestv2', { jsonBody: `{"api_key":"${KEY}"}` })).toEqual(['jsonBody']);
    expect(literalSecretFields('webrequestv2', { url: 'https://api.example.com/ocr?key={{ocr_key}}' })).toEqual([]);
  });

  it('refuses the mask sent back as if it were a value', () => {
    expect(literalSecretFields('webrequestv2', { headersString: { Authorization: REDACTED_SECRET } }))
      .toEqual(['headersString']);
  });

  it('leaves every other action type alone', () => {
    expect(literalSecretFields('reply', { text: `Bearer ${KEY}` })).toEqual([]);
  });

  it('masks literal keys in the flow get_flow hands over, and keeps the templated ones', () => {
    const flow = { intents: [{ actions: [{
      _tdActionType: 'webrequestv2',
      headersString: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', 'x-api-key': '{{k}}' },
      url: 'https://api.example.com/ocr?token=abcdef1234567890abcd&lang=it',
      jsonBody: `{"key":"${KEY}","file":{{attachment.url | json}}}`
    }] }] };
    const masked: any = withoutLiteralSecrets(flow);
    const action = masked.intents[0].actions[0];
    expect(action.headersString.Authorization).toBe(REDACTED_SECRET);
    expect(action.headersString['Content-Type']).toBe('application/json');
    expect(action.headersString['x-api-key']).toBe('{{k}}');
    expect(action.url).toBe(`https://api.example.com/ocr?token=${REDACTED_SECRET}&lang=it`);
    expect(action.jsonBody).not.toContain(KEY);
    expect(action.jsonBody).toContain('{{attachment.url | json}}');
    expect((flow.intents[0].actions[0] as any).headersString.Authorization).toContain(KEY);
  });
});
