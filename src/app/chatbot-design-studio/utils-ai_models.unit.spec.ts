import { COHERE_MODEL, DEFAULT_MODEL, GOOGLE_MODEL, ANTHROPIC_MODEL, GROQ_MODEL, DEEPSEEK_MODEL, OPENAI_MODEL } from './utils-ai_models';
import { hasFixedTemperature } from './utils-llm-models';

/**
 * The model catalogue is the same as Design Studio v3 (corrected list of 12/11/2026):
 * new AI actions start on gpt-5.4-mini, and the OpenAI models that only take the
 * default temperature (gpt-5.x and gpt-6.x) switch the temperature field off.
 */
describe('AI models catalogue', () => {

  it('starts new AI actions on an active gpt-5.4-mini', () => {
    expect(DEFAULT_MODEL).toBeDefined();
    expect(DEFAULT_MODEL.value).toBe('gpt-5.4-mini');
    expect(DEFAULT_MODEL.status).toBe('active');
  });

  it('has no repeated model inside a provider', () => {
    const providers = { COHERE_MODEL, GOOGLE_MODEL, ANTHROPIC_MODEL, GROQ_MODEL, DEEPSEEK_MODEL, OPENAI_MODEL };
    Object.entries(providers).forEach(([name, models]) => {
      const values = models.map(m => m.value);
      const repeated = values.filter((v, i) => values.indexOf(v) !== i);
      expect(repeated).withContext(name).toEqual([]);
    });
  });

  it('lists the gpt-6 models', () => {
    const gpt6 = OPENAI_MODEL.filter(m => m.value.startsWith('gpt-6'));
    expect(gpt6.length).toBeGreaterThan(0);
  });
});

describe('hasFixedTemperature', () => {

  it('is true for gpt-5.x and gpt-6.x, whatever the case', () => {
    expect(hasFixedTemperature('gpt-5.4-mini')).toBeTrue();
    expect(hasFixedTemperature('Gpt-5.4')).toBeTrue();
    expect(hasFixedTemperature('gpt-6-sol')).toBeTrue();
    expect(hasFixedTemperature('GPT-6.1-terra')).toBeTrue();
  });

  it('is false for the other models and for no model', () => {
    expect(hasFixedTemperature('gpt-4o')).toBeFalse();
    expect(hasFixedTemperature('gpt-4.1-mini')).toBeFalse();
    expect(hasFixedTemperature('claude-sonnet-4-5')).toBeFalse();
    expect(hasFixedTemperature('openai/gpt-5')).toBeFalse();
    expect(hasFixedTemperature(undefined)).toBeFalse();
    expect(hasFixedTemperature('')).toBeFalse();
  });
});
