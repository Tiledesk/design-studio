import { Injectable } from '@angular/core';
import { Action } from 'src/app/models/action-model';
import { INTENT_ELEMENT } from '../../../../../utils';
import { ACTIONS_LIST } from 'src/app/chatbot-design-studio/utils-actions';
import { BrandService } from 'src/app/services/brand.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

/**
 * Service that provides common logic for action description components.
 * Centralizes element resolution and brand parameters to avoid code duplication.
 */
@Injectable({
  providedIn: 'root'
})
export class ActionDescriptionService {
  private readonly logger: LoggerService = LoggerInstance.getInstance();

  constructor(private brandService: BrandService) {}

  /**
   * Resolves the element configuration based on element type and action.
   * @param elementType - The type of element (action type or intent element type)
   * @param actionSelected - Optional action object for conditional logic
   * @returns The element configuration object or null if not found
   */
  resolveElement(elementType: string, actionSelected?: Action): any {
    if (!elementType) {
      return null;
    }

    try {
      switch (elementType) {
        case 'form':
        case 'question':
        case 'answer':
          return Object.values(INTENT_ELEMENT).find(el => el.type === elementType);
        
        case 'jsoncondition':
          if (actionSelected && 'noelse' in actionSelected) {
            return ACTIONS_LIST.CONDITION;
          }
          return ACTIONS_LIST.JSON_CONDITION;
        
        default:
          return Object.values(ACTIONS_LIST).find(el => el.type === elementType);
      }
    } catch (error) {
      this.logger.error('[ActionDescriptionService] Error resolving element:', error);
      return null;
    }
  }

  /**
   * Gets the brand parameters for translations.
   * @returns Brand parameters object
   */
  getBrandParams(): any {
    return this.brandService.getBrand();
  }

  /**
   * Extracts element type from action if not provided.
   * @param actionSelected - The action object
   * @param elementType - The provided element type
   * @returns The resolved element type
   */
  resolveElementType(actionSelected?: Action, elementType?: string): string {
    if (actionSelected && actionSelected._tdActionType) {
      return actionSelected._tdActionType;
    }
    return elementType || '';
  }
}
