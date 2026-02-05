import { Injectable } from '@angular/core';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

/**
 * Service per gestire la visibilità del widget Tiledesk
 * Centralizza la logica di show/hide del widget
 */
@Injectable({
  providedIn: 'root'
})
export class WidgetManagerService {
  private logger: LoggerService = LoggerInstance.getInstance();

  constructor() {}

  /**
   * Nasconde il widget Tiledesk
   */
  hideWidget(): void {
    this.setWidgetVisibility('hide');
  }

  /**
   * Mostra il widget Tiledesk
   */
  showWidget(): void {
    this.setWidgetVisibility('show');
  }

  /**
   * Imposta la visibilità del widget Tiledesk
   * @param status - 'hide' per nascondere, 'show' per mostrare
   */
  private setWidgetVisibility(status: "hide" | "show"): void {
    try {
      if (window && window['tiledesk']) {
        this.logger.log('[WIDGET-MANAGER] Setting widget visibility:', status);
        if (status === 'hide') {
          window['tiledesk'].hide();
        } else if (status === 'show') {
          window['tiledesk'].show();
        }
      } else {
        this.logger.warn('[WIDGET-MANAGER] Tiledesk widget not available');
      }
    } catch (error) {
      this.logger.error('[WIDGET-MANAGER] Error setting widget visibility:', error);
    }
  }

  /**
   * Verifica se il widget Tiledesk è disponibile
   * @returns true se il widget è disponibile, false altrimenti
   */
  isWidgetAvailable(): boolean {
    return !!(window && window['tiledesk']);
  }
}
