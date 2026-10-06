import { RuntimeModel } from '../../agent-chat/agent-chat-settings.service';
import { buildModelOptions, formatContext, formatPrice, OptionTexts } from './agent-chat-llm-settings.options';

const TEXTS: OptionTexts = {
  defaultMarker: 'default',
  curated: 'Curated',
  openRouter: 'All OpenRouter models',
  priceUnknown: 'price n/a',
  unavailable: 'no longer available — the default is used',
};

const m = (o: Partial<RuntimeModel> & { id: string; label: string }): RuntimeModel => ({
  provider: 'p', vision: false, pricing: null, default: false, ...o,
});
const def = m({ id: 'deepseek:v4-flash', label: 'DeepSeek V4 Flash', provider: 'deepseek', default: true,
  pricing: { input_per_mtok: 0.0264, output_per_mtok: 1.28 }, context_length: 1048576 });
const sonnet = m({ id: 'anthropic:sonnet', label: 'Claude Sonnet 5.5', provider: 'anthropic',
  pricing: { input_per_mtok: 2, output_per_mtok: 10 }, context_length: 1000000, group: 'curated' });
const qwenMax = m({ id: 'openrouter:qwen/max', label: 'Qwen Max', provider: 'Qwen', group: 'openrouter',
  pricing: { input_per_mtok: 1.475, output_per_mtok: 3 }, context_length: 262144 });
const noPrice = m({ id: 'x:x', label: 'X', context_length: 200000 });
const noCtx = m({ id: 'y:y', label: 'Y', pricing: { input_per_mtok: 0.0264, output_per_mtok: 1.28 } });

describe('buildModelOptions', () => {
  const byId = (o: any[], id: string) => o.find(x => x.id === id);

  it('puts the default first, then curated, then OpenRouter', () => {
    const o = buildModelOptions([def, qwenMax, sonnet], '', TEXTS);
    expect(o.map(x => [x.id, x.group])).toEqual([
      ['', 'Curated'], [sonnet.id, 'Curated'], [qwenMax.id, 'All OpenRouter models']]);
  });
  it('treats a missing group as curated', () => {
    const o = buildModelOptions([def, noPrice, noCtx], '', TEXTS);
    expect(o.every(x => x.group === 'Curated')).toBeTrue();
  });
  it('labels a model with price and context', () => {
    expect(byId(buildModelOptions([def, sonnet], '', TEXTS), sonnet.id).label)
      .toBe('Claude Sonnet 5.5 · $2 / $10 · 1M');
  });
  it('labels a model without pricing', () => {
    expect(byId(buildModelOptions([def, noPrice], '', TEXTS), noPrice.id).label).toBe('X · price n/a · 200K');
  });
  it('omits the context when unknown', () => {
    expect(byId(buildModelOptions([def, noCtx], '', TEXTS), noCtx.id).label).toBe('Y · $0.0264 / $1.28');
  });
  it('rounds prices to three significant digits', () => {
    expect(formatPrice({ input_per_mtok: 1.475, output_per_mtok: 3 }, 'n/a')).toBe('$1.48 / $3');
    expect(formatPrice(null, 'n/a')).toBe('n/a');
  });
  it('marks the default', () => {
    expect(buildModelOptions([def, sonnet], '', TEXTS)[0].label)
      .toBe('DeepSeek V4 Flash — default · $0.0264 / $1.28 · 1M');
  });
  it('search text covers label, id and provider', () => {
    const o = buildModelOptions([def, sonnet], '', TEXTS);
    const s = byId(o, sonnet.id).searchText;
    expect(s).toContain('anthropic');
    expect(s).toContain('claude sonnet');
    expect(s).toBe(s.toLowerCase());
  });
  it('adds the saved model as unavailable when it is not listed', () => {
    const o = buildModelOptions([def, sonnet], 'openai:gone/model', TEXTS);
    expect(o[1]).toEqual(jasmine.objectContaining({ id: 'openai:gone/model', disabled: true, group: 'Curated',
      label: 'openai:gone/model (no longer available — the default is used)' }));
  });
  it('does not add an unavailable option for a listed or default selection', () => {
    for (const id of ['', sonnet.id, def.id]) {
      const o = buildModelOptions([def, sonnet], id, TEXTS);
      expect(o.some(x => x.disabled)).toBeFalse();
    }
  });
  it('formats context sizes', () => {
    expect([formatContext(1048576), formatContext(2000000), formatContext(200000), formatContext(262144), formatContext(undefined)])
      .toEqual(['1M', '2M', '200K', '262K', null]);
  });
});
