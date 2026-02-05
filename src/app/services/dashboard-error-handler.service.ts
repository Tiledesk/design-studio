import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { NotifyService } from './notify.service';

/**
 * Service per gestire errori durante l'inizializzazione e il funzionamento della dashboard
 */
@Injectable({
  providedIn: 'root'
})
export class DashboardErrorHandlerService {
  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private notify: NotifyService,
    private router: Router
  ) {}

  /**
   * Gestisce errori durante l'inizializzazione della dashboard
   * @param error - L'errore verificatosi
   * @param step - Il nome dello step in cui è avvenuto l'errore
   * @param context - Contesto aggiuntivo per il logging
   */
  handleInitializationError(error: any, step: string, context?: any): void {
    this.logger.error(`[DASHBOARD-ERROR] Error in initialization step "${step}":`, error, context);
    
    // Determina il tipo di errore e mostra notifica appropriata
    const errorMessage = this.getErrorMessage(error, step);
    this.notify.showNotification(
      errorMessage,
      4, // danger/warning color
      'error'
    );

    // Log strutturato per debugging
    this.logStructuredError(error, step, context);
  }

  /**
   * Gestisce errori critici che richiedono redirect o azioni speciali
   * @param error - L'errore verificatosi
   * @param redirectPath - Path opzionale per redirect
   */
  handleCriticalError(error: any, redirectPath?: string): void {
    this.logger.error('[DASHBOARD-ERROR] Critical error:', error);
    
    this.notify.showNotification(
      'An error occurred. Please try again or contact support.',
      4, // danger color
      'error'
    );

    // Redirect se specificato
    if (redirectPath) {
      setTimeout(() => {
        this.router.navigate([redirectPath]);
      }, 2000);
    }
  }

  /**
   * Gestisce errori di rete o timeout
   * @param error - L'errore verificatosi
   * @param step - Il nome dello step
   */
  handleNetworkError(error: any, step: string): void {
    this.logger.error(`[DASHBOARD-ERROR] Network error in step "${step}":`, error);
    
    this.notify.showNotification(
      'Network error. Please check your connection and try again.',
      4, // danger color
      'wifi_off'
    );
  }

  /**
   * Gestisce errori di autorizzazione
   * @param error - L'errore verificatosi
   */
  handleAuthorizationError(error: any): void {
    this.logger.error('[DASHBOARD-ERROR] Authorization error:', error);
    
    // Redirect a pagina unauthorized (come nel codice originale)
    this.router.navigate(['project/unauthorized']);
  }

  /**
   * Ottiene un messaggio di errore user-friendly basato sul tipo di errore
   * @param error - L'errore verificatosi
   * @param step - Il nome dello step
   * @returns Messaggio di errore user-friendly
   */
  private getErrorMessage(error: any, step: string): string {
    // Mappa step a messaggi user-friendly
    const stepMessages: { [key: string]: string } = {
      'getUrlParams': 'Error loading URL parameters. Please refresh the page.',
      'getCurrentProject': 'Error loading project. Please try again.',
      'getBotById': 'Error loading chatbot. Please try again.',
      'getDeptsByProjectId': 'Error loading departments. Please try again.',
      'initialize': 'Error initializing services. Please refresh the page.',
      'executeAsyncFunctionsInSequence': 'Error initializing dashboard. Please refresh the page.'
    };

    // Messaggio specifico per lo step o generico
    const stepMessage = stepMessages[step] || `Error in ${step}. Please try again.`;

    // Se è un errore HTTP, aggiungi dettagli
    if (error?.status) {
      if (error.status === 401 || error.status === 403) {
        return 'You do not have permission to access this resource.';
      } else if (error.status === 404) {
        return 'Resource not found. Please check the URL.';
      } else if (error.status >= 500) {
        return 'Server error. Please try again later.';
      }
    }

    return stepMessage;
  }

  /**
   * Log strutturato dell'errore per debugging
   * @param error - L'errore verificatosi
   * @param step - Il nome dello step
   * @param context - Contesto aggiuntivo
   */
  private logStructuredError(error: any, step: string, context?: any): void {
    const errorInfo = {
      step,
      timestamp: new Date().toISOString(),
      error: {
        message: error?.message || 'Unknown error',
        status: error?.status,
        statusText: error?.statusText,
        url: error?.url
      },
      context
    };

    this.logger.error('[DASHBOARD-ERROR] Structured error info:', errorInfo);
  }
}
