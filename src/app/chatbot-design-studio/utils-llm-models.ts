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
  labelModel: string;
  llm: string;
  model: string;
  description: string;
  src: string;
  status: "active" | "inactive";
  configured: boolean;
  multiplier?: string;
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

export interface SetModelResult {
  selectedModelConfigured: boolean;
  action: ActionModel;
  labelModel: string;
  multiplier: string | null;
}

export interface InitLLMModelsParams {
  projectService: ProjectService;
  dashboardService: DashboardService;
  appConfigService: AppConfigService;
  logger: LoggerService;
  action: any;
  llm_model: Array<{ value: string; models: ModelOption[] }>;
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
    const modelA = llmModels.find(el => el.labelModel === a.value);
    const modelB = llmModels.find(el => el.labelModel === b.value);
    
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
 * Sets the selected model and updates related properties
 * @param labelModel The label of the model to set
 * @param llmModels Array of available LLM models
 * @param logger LoggerService instance
 * @returns SetModelResult with updated model information
 */
export function setModel(
  labelModel: string,
  llmModels: LlmModel[],
  logger: LoggerService
): SetModelResult {
  logger.log("[LLM-UTILS] setModel labelModel: ", labelModel);
  const model = llmModels.find(m => m.labelModel === labelModel);
  
  if (model) {
    logger.log("[LLM-UTILS] model: ", model);
    return {
      selectedModelConfigured: model.configured,
      action: {
        llm: model.llm,
        model: model.model,
        labelModel: model.labelModel
      },
      labelModel: model.labelModel,
      multiplier: model.multiplier || null
    };
  } else {
    return {
      selectedModelConfigured: true,
      action: {
        llm: '',
        model: '',
        labelModel: ''
      },
      labelModel: '',
      multiplier: null
    };
  }
}

/**
 * Initializes LLM models configuration
 * @param params Parameters for initialization
 * @returns Promise with initialization result
 */
export async function initLLMModels(params: InitLLMModelsParams): Promise<InitLLMModelsResult> {
  const { projectService, dashboardService, appConfigService, logger, action, llm_model, componentName } = params;
  
  const INTEGRATIONS = await getIntegrations(projectService, dashboardService, logger);
  logger.log(`[${componentName}] 1 - integrations:`, INTEGRATIONS);
  
  // Generate LLM models
  const llm_models_flat = generateLlmModelsFlat();
  
  if(INTEGRATIONS){
    INTEGRATIONS.forEach((el: any) => {
      logger.log(`[${componentName}] 1 - integration:`, el.name, el.value?.apikey);
      if(el.name){
        llm_models_flat.forEach(model => {
          if(model.llm === el.name && el.value?.apikey) {
            model.configured = true;
          } else if(model.llm.toLowerCase() === 'openai' || model.llm.toLowerCase() === 'ollama' || model.llm.toLowerCase() === 'vllm'){
            model.configured = true;
          } else {
            model.configured = false;
          }
        });
      }
    });
  }
  
  logger.log(`[${componentName}] - this.llm_models_flat:`, llm_models_flat);
  
  const autocompleteOptions: AutocompleteOption[] = [];
  logger.log(`[${componentName}] initLLMModels`, action.llm);
  const actionLabelModel = '';
  let multiplier: string | null = null;
  
  /** SET GPT MODELS */
  const ai_models = loadTokenMultiplier(appConfigService.getConfig().aiModels);
  OPENAI_MODEL.forEach(el => {
    if (ai_models[el.value]) {
      el.additionalText = `${ai_models[el.value]} x tokens`;
      el.status = 'active';
    } else {
      el.additionalText = null;
      el.status = 'inactive';
    }
  });

  // Assegna i moltiplicatori ai modelli in llm_models_flat
  llm_models_flat.forEach(model => {
    if (ai_models[model.model]) {
      (model as LlmModel).multiplier = ai_models[model.model].toString();
    }
  });
  
  if(action.llm){
    const filteredModels = getModelsByName(action.llm, llm_model).filter(el => el.status === 'active');
    filteredModels.forEach(el => autocompleteOptions.push({label: el.name, value: el.value}));
    logger.log(`[${componentName}] filteredModels`, filteredModels);
  }
  
  const autocompleteOptionsFlat: AutocompleteOption[] = [];
  llm_models_flat.forEach(el => autocompleteOptionsFlat.push({label: el.labelModel, value: el.labelModel}));
  const sortedAutocompleteOptionsFlat = sortAutocompleteOptions(autocompleteOptionsFlat, llm_models_flat);
  logger.log(`[${componentName}] autocompleteOptionsFlat`, sortedAutocompleteOptionsFlat);
  
  return {
    llm_models_flat,
    autocompleteOptions,
    autocompleteOptionsFlat: sortedAutocompleteOptionsFlat,
    multiplier,
    actionLabelModel
  };
}
