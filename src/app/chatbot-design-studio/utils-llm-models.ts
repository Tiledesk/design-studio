/**
 * Utility functions for LLM model management
 */

import { firstValueFrom } from 'rxjs';
import { ProjectService } from 'src/app/services/projects.service';
import { DashboardService } from 'src/app/services/dashboard.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';

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
