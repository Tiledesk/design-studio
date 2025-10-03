/**
 * Utility functions for LLM model management
 */

import { firstValueFrom } from 'rxjs';
import { ProjectService } from 'src/app/services/projects.service';
import { DashboardService } from 'src/app/services/dashboard.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { AppConfigService } from 'src/app/services/app-config';
import { loadTokenMultiplier } from 'src/app/utils/util';
import { OPENAI_MODEL, generateLlmModels2 } from 'src/app/chatbot-design-studio/utils-ai_models';

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
  llm_models_2: LlmModel[];
  autocompleteOptions: AutocompleteOption[];
  autocompleteOptions_2: AutocompleteOption[];
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
  const llm_models_2 = generateLlmModels2();
  
  if(INTEGRATIONS){
    INTEGRATIONS.forEach((el: any) => {
      logger.log(`[${componentName}] 1 - integration:`, el.name, el.value?.apikey);
      if(el.name && el.value?.apikey){
        llm_models_2.forEach(model => {
          if(model.llm === el.name || model.llm.toLowerCase() === 'openai' || model.llm.toLowerCase() === 'ollama') {
            model.configured = true;
          }
        });
      }
    });
  }
  
  logger.log(`[${componentName}] - this.llm_models_2:`, llm_models_2);
  
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

  // Assegna i moltiplicatori ai modelli in llm_models_2
  llm_models_2.forEach(model => {
    if (ai_models[model.model]) {
      (model as LlmModel).multiplier = ai_models[model.model].toString();
    }
  });
  
  if(action.llm){
    const filteredModels = getModelsByName(action.llm, llm_model).filter(el => el.status === 'active');
    filteredModels.forEach(el => autocompleteOptions.push({label: el.name, value: el.value}));
    logger.log(`[${componentName}] filteredModels`, filteredModels);
  }
  
  const autocompleteOptions_2: AutocompleteOption[] = [];
  llm_models_2.forEach(el => autocompleteOptions_2.push({label: el.labelModel, value: el.labelModel}));
  const sortedAutocompleteOptions_2 = sortAutocompleteOptions(autocompleteOptions_2, llm_models_2);
  logger.log(`[${componentName}] autocompleteOptions_2`, sortedAutocompleteOptions_2);
  
  return {
    llm_models_2,
    autocompleteOptions,
    autocompleteOptions_2: sortedAutocompleteOptions_2,
    multiplier,
    actionLabelModel
  };
}
