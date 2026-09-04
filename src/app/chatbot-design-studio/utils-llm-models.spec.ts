import { of } from 'rxjs';
import { getIntegrationModels, ModelOption } from './utils-llm-models';

/**
 * getIntegrationModels reads the model list straight off the integration
 * record, and each provider stores it in a different shape. Before OpenRouter
 * existed the object shape was filtered out silently, so no model ever reached
 * the picker; these specs pin all three shapes.
 */
describe('getIntegrationModels', () => {

  function services(value: any) {
    return {
      projectService: { getIntegrationByName: () => of({ value }) } as any,
      dashboardService: { projectID: 'project-1' } as any,
      logger: { log: () => {}, error: () => {} } as any,
    };
  }

  function list(providerValue: string): Array<{ value: string; models: ModelOption[] }> {
    return [{ value: providerValue, models: [] }];
  }

  async function load(providerValue: string, value: any) {
    const { projectService, dashboardService, logger } = services(value);
    const llmModelList = list(providerValue);
    await getIntegrationModels(projectService, dashboardService, logger, llmModelList, providerValue);
    return llmModelList[0].models;
  }

  it('reads the OpenRouter object shape, labelling by name and routing by id', async () => {
    const models = await load('openrouter', {
      apikey: 'sk-or-x',
      models: [
        { id: 'openai/gpt-4o', name: 'OpenAI: GPT-4o', providers: ['azure'], allow_fallbacks: false, sort: 'price' },
        { id: 'meta-llama/llama-3.3-70b', name: 'Meta: Llama 3.3 70B', providers: [] },
      ],
    });

    expect(models.length).toBe(2);
    expect(models[0].name).toBe('OpenAI: GPT-4o');
    expect(models[0].value).toBe('openai/gpt-4o');
    expect(models[1].value).toBe('meta-llama/llama-3.3-70b');
  });

  it('falls back to the id when an entry has no name', async () => {
    const models = await load('openrouter', { models: [{ id: 'openai/gpt-4o' }] });

    expect(models.length).toBe(1);
    expect(models[0].name).toBe('openai/gpt-4o');
    expect(models[0].value).toBe('openai/gpt-4o');
  });

  it('skips entries with no usable id', async () => {
    const models = await load('openrouter', {
      models: [{ name: 'no id at all' }, { id: '   ' }, { id: 'openai/gpt-4o' }],
    });

    expect(models.length).toBe(1);
    expect(models[0].value).toBe('openai/gpt-4o');
  });

  it('still reads the legacy flat string shape used by Ollama', async () => {
    const models = await load('ollama', { models: ['llama3', '  ', 'mistral'] });

    expect(models.map(m => m.value)).toEqual(['llama3', 'mistral']);
    expect(models[0].name).toBe('llama3');
  });

  it('still reads the multi-endpoint vLLM shape', async () => {
    const models = await load('vllm', {
      servers: [{ name: 'gpu-box', models: ['qwen3'] }],
    });

    expect(models.length).toBe(1);
    expect(models[0].name).toBe('gpu-box ・ qwen3');
    expect(models[0].value).toBe('qwen3');
    expect(models[0].vllmServer).toBe('gpu-box');
  });

  it('leaves the list untouched when the integration has no models', async () => {
    const models = await load('openrouter', { apikey: 'sk-or-x', models: [] });

    expect(models).toEqual([]);
  });
});
