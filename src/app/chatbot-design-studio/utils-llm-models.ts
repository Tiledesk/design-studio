/**
 * Utility functions for LLM model management
 */

import { firstValueFrom } from 'rxjs';
import { ProjectService } from 'src/app/services/projects.service';
import { DashboardService } from 'src/app/services/dashboard.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { AppConfigService } from 'src/app/services/app-config';
import { loadTokenMultiplier } from 'src/app/utils/util';
import { OPENAI_MODEL, generateLlmModelsFlat } from 'src/app/chatbot-design-studio/utils-ai_models';

export interface LlmModel {
  modelName: string;
  llm: string;
  model: string;
  description: string;
  src: string;
  status: "active" | "inactive";
  configured: boolean;
  multiplier?: string;
  min_tokens?: number;
  max_output_tokens?: number;
  reasoning?: boolean;
}

export interface AutocompleteOption {
  label: string;
  value: string;
}

export interface ModelOption {
  name: string;
  value: string;
  description: string;
  status: "active" | "inactive";
}

export interface ActionModel {
  llm: string;
  model: string;
  labelModel: string;
}


export interface InitLLMModelsParams {
  projectService: ProjectService;
  dashboardService: DashboardService;
  appConfigService: AppConfigService;
  logger: LoggerService;
  componentName: string;
}

export interface InitLLMModelsResult {
  llm_models_flat: LlmModel[];
  autocompleteOptions: AutocompleteOption[];
  autocompleteOptionsFlat: AutocompleteOption[];
  multiplier: string | null;
  actionLabelModel: string;
}

/**
 * Sorts autocomplete options prioritizing OpenAI models
 * @param autocompleteOptions Array of autocomplete options to sort
 * @param llmModels Array of LLM models for reference
 * @returns Sorted array of autocomplete options
 */
export function sortAutocompleteOptions(
  autocompleteOptions: AutocompleteOption[],
  llmModels: LlmModel[]
): AutocompleteOption[] {
  return autocompleteOptions.sort((a, b) => {
    // Find corresponding models in llmModels for both elements
    const modelA = llmModels.find(el => el.modelName === a.value);
    const modelB = llmModels.find(el => el.modelName === b.value);
    
    // If both are OpenAI, sort alphabetically
    if (modelA?.llm?.toLowerCase() === 'openai' && modelB?.llm?.toLowerCase() === 'openai') {
      return a.label.localeCompare(b.label);
    }
    
    // If only A is OpenAI, A comes first
    if (modelA?.llm?.toLowerCase() === 'openai' && modelB?.llm?.toLowerCase() !== 'openai') {
      return -1;
    }
    
    // If only B is OpenAI, B comes first
    if (modelA?.llm?.toLowerCase() !== 'openai' && modelB?.llm?.toLowerCase() === 'openai') {
      return 1;
    }
    
    // If neither is OpenAI, sort alphabetically
    return a.label.localeCompare(b.label);
  });
}

/**
 * Gets models by LLM provider name
 * @param value LLM provider name (e.g., 'openai', 'anthropic')
 * @param llmModelList Array of LLM model configurations
 * @returns Array of model options for the specified provider
 */
export function getModelsByName(
  value: string, 
  llmModelList: Array<{ value: string; models: ModelOption[] }>
): ModelOption[] {
  const model = llmModelList.find((model) => model.value === value);
  return model?.models || [];
}

/**
 * Retrieves project integrations
 * @param projectService ProjectService instance
 * @param dashboardService DashboardService instance
 * @param logger LoggerService instance
 * @returns Promise with integrations data
 */
export async function getIntegrations(
  projectService: ProjectService,
  dashboardService: DashboardService,
  logger: LoggerService
): Promise<any> {
  const projectID = dashboardService.projectID;
  try {
    const response = await firstValueFrom(projectService.getIntegrations(projectID));
    logger.log('[LLM-UTILS] - integrations response:', response.value);
    return response;
  } catch (error) {
    logger.log('[LLM-UTILS] getIntegrations ERROR:', error);
    return null;
  }
}

/**
 * Retrieves a specific integration by name
 * @param projectService ProjectService instance
 * @param dashboardService DashboardService instance
 * @param logger LoggerService instance
 * @param integrationName Name of the integration to retrieve
 * @returns Promise with integration data
 */
export async function getIntegrationByName(
  projectService: ProjectService,
  dashboardService: DashboardService,
  logger: LoggerService,
  integrationName: string
): Promise<any> {
  const projectID = dashboardService.projectID;
  try {
    const response = await firstValueFrom(projectService.getIntegrationByName(projectID, integrationName));
    logger.log('[LLM-UTILS] - integration response:', response.value);
    return response;
  } catch (error) {
    logger.log('[LLM-UTILS] getIntegrationByName ERROR:', error);
    return null;
  }
}

/**
 * Retrieves and updates models from integration
 * @param projectService ProjectService instance
 * @param dashboardService DashboardService instance
 * @param logger LoggerService instance
 * @param llmModelList Array of LLM model configurations
 * @param modelName Name of the model/integration to retrieve (e.g., 'ollama', 'groq', etc.)
 * @returns Promise that resolves when models are updated
 */
export async function getIntegrationModels(
  projectService: ProjectService,
  dashboardService: DashboardService,
  logger: LoggerService,
  llmModelList: Array<{ value: string; models: ModelOption[] }>,
  modelName: string
): Promise<void> {
  for (const model of llmModelList) {
    if (model.value === modelName) {
      const NEW_MODELS = await getIntegrationByName(projectService, dashboardService, logger, modelName);
      if (NEW_MODELS?.value?.models) {
        logger.log(`[LLM-UTILS] - NEW_MODELS for ${modelName}:`, NEW_MODELS.value.models);
        const models = NEW_MODELS.value.models.map(item => ({
          name: item,
          value: item,
          description: '',
          status: 'active' as const
        }));
        model.models = models;
      }
    }
  }
}

/** 
 * Manages GPT-5 model specific settings
 * @param modelName The model name to check
 * @param action The action object to update
 * @param ai_setting The AI settings object to update
 */
export function manageGpt5ModelSettings(
  action: any,
  ai_setting: any
): void {
  let modelName = action?.model;
  if (!modelName || !action || !ai_setting) {
    return;
  }

  const isGpt5 = modelName.toLowerCase().startsWith('gpt-5');
  
  if (isGpt5) {
    action.temperature = 1;
    ai_setting['temperature'].disabled = true;
    // if (ai_setting['max_tokens']) {
    //   ai_setting['max_tokens'].max = 100000;
    // }
  } else {
    ai_setting['temperature'].disabled = false;
    // if (ai_setting['max_tokens']) {
    //   ai_setting['max_tokens'].max = 8192;
    //   if (action.max_tokens > 8192) {
    //     action.max_tokens = 8192;
    //   }
    // }
  }
}

/**
 * Filters models to keep only those present in the aiModels configuration.
 * @param models Array of models to filter
 * @param aiModelsParsed Parsed aiModels config from loadTokenMultiplier
 * @param getModelKey Function to extract the model key from each item
 * @returns Filtered array of models
 */
export function filterModelsByAiModelsConfig<T>(
  models: T[],
  aiModelsParsed: Record<string, number | null>,
  getModelKey: (model: T) => string
): T[] {
  const allowedKeys = Object.keys(aiModelsParsed || {});
  return models.filter(m => allowedKeys.includes(getModelKey(m)));
}

/**
 * Sets the selected model and updates related properties
 * @param modelName The label of the model to set
 * @param llmModels Array of available LLM models
 * @param logger LoggerService instance
 * @returns SetModelResult with updated model information
 */
export function setModel(
  modelName: string,
  llmModels: LlmModel[],
  logger: LoggerService
): LlmModel {
  logger.log("[LLM-UTILS] setModel modelName: ", modelName);
  const model = llmModels.find(m => m.modelName === modelName);
  return model;
}

/**
 * Initializes LLM models configuration
 * @param params Parameters for initialization
 * @returns Promise with initialization result
 */
export async function initLLMModels(params: InitLLMModelsParams): Promise<LlmModel[]> {
  const { projectService, dashboardService, appConfigService, logger, componentName } = params;
  
  const INTEGRATIONS = await getIntegrations(projectService, dashboardService, logger);
  // logger.log(`[${componentName}] 1 - integrations:`, INTEGRATIONS);

  // Generate LLM models
  let llm_models_flat = generateLlmModelsFlat();

  // Filter only active models
  llm_models_flat = llm_models_flat.filter(model => model.status === 'active');

  // Set configured status for llm_models_flat
  // First, initialize all models as not configured
  llm_models_flat.forEach(model => {
    model.configured = false;
  });

  // First pass: Set configured = true for models that match configured integrations
  if(INTEGRATIONS){
    INTEGRATIONS.forEach((el: any) => {
      if(el.name && el.value?.apikey){
        llm_models_flat.forEach(model => {
          // If the model's LLM provider matches the integration name, set configured = true
          if(model.llm === el.name) {
            model.configured = true;
          }
        });
      }
    });
  }
  
  // Second pass: Always set configured = true for openai, ollama, vllm
  // (these don't require explicit project integration configuration)
  llm_models_flat.forEach(model => {
    const llmLower = model.llm.toLowerCase();
    if(llmLower === 'openai' || llmLower === 'ollama' || llmLower === 'vllm'){
      model.configured = true;
    }
  });
  // logger.log(`[${componentName}] - this.llm_models_flat:`, llm_models_flat);

  // Set token multiplier and filter by aiModels config
  const ai_models = loadTokenMultiplier(appConfigService.getConfig().aiModels);
  logger.log(`[${componentName}] ai_models:`, ai_models);
  llm_models_flat = filterModelsByAiModelsConfig(llm_models_flat, ai_models, m => m.model);
  llm_models_flat.forEach(model => {
    if (ai_models[model.model]) {
      (model as LlmModel).multiplier = ai_models[model.model].toString() + ' x tokens';
    }
  });

  // sort llm_models_flat by llm, placing "openai" first and continuing the sort in ascending alphabetical order
  // as the second criterion, model, again in ascending alphabetical order
  llm_models_flat.sort((a, b) => {
    if (a.llm === 'openai' && b.llm !== 'openai') {
      return -1;
    }
    return a.model.localeCompare(b.model);
  });
  logger.log(`[${componentName}] llm_models_flat`, llm_models_flat);
  return llm_models_flat;
}
