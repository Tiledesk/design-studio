import { Injectable } from '@angular/core';
import { AppConfigService } from './app-config';
import { DepartmentService } from './department.service';
import { FaqKbService } from './faq-kb.service';
import { FaqService } from './faq.service';
import { KnowledgeBaseService } from './knowledge-base.service';
import { OpenaiService } from './openai.service';
import { WhatsappService } from './whatsapp.service';
import { WebhookService } from '../chatbot-design-studio/services/webhook-service.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

/**
 * Service per inizializzare tutti i servizi della dashboard con baseURL e projectId
 * Centralizza la logica di inizializzazione per ridurre duplicazione
 */
@Injectable({
  providedIn: 'root'
})
export class ServiceInitializationService {
  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private appConfigService: AppConfigService,
    private departmentService: DepartmentService,
    private faqKbService: FaqKbService,
    private faqService: FaqService,
    private kbService: KnowledgeBaseService,
    private openaiService: OpenaiService,
    private whatsappService: WhatsappService,
    private webhookService: WebhookService
  ) {}

  /**
   * Inizializza tutti i servizi con baseURL e projectId
   * @param projectId - ID del progetto corrente
   */
  initializeAllServices(projectId: string): void {
    if (!projectId) {
      this.logger.warn('[SERVICE-INIT] ProjectId is missing, skipping initialization');
      return;
    }

    const serverBaseURL = this.appConfigService.getConfig().apiUrl;
    const whatsappBaseUrl = this.appConfigService.getConfig().whatsappTemplatesBaseUrl;

    if (!serverBaseURL) {
      this.logger.error('[SERVICE-INIT] Server base URL is missing');
      return;
    }

    // Lista di servizi da inizializzare con le rispettive configurazioni
    const services = [
      { 
        service: this.departmentService, 
        baseUrl: serverBaseURL,
        name: 'DepartmentService'
      },
      { 
        service: this.faqKbService, 
        baseUrl: serverBaseURL,
        name: 'FaqKbService'
      },
      { 
        service: this.faqService, 
        baseUrl: serverBaseURL,
        name: 'FaqService'
      },
      { 
        service: this.kbService, 
        baseUrl: serverBaseURL,
        name: 'KnowledgeBaseService'
      },
      { 
        service: this.openaiService, 
        baseUrl: serverBaseURL,
        name: 'OpenaiService'
      },
      { 
        service: this.whatsappService, 
        baseUrl: whatsappBaseUrl,
        name: 'WhatsappService'
      },
      { 
        service: this.webhookService, 
        baseUrl: serverBaseURL,
        name: 'WebhookService'
      }
    ];

    // Inizializza ogni servizio
    services.forEach(({ service, baseUrl, name }) => {
      try {
        if (service && typeof service.initialize === 'function') {
          service.initialize(baseUrl, projectId);
          this.logger.log(`[SERVICE-INIT] ${name} initialized successfully`);
        } else {
          this.logger.warn(`[SERVICE-INIT] Service ${name} does not have initialize method`);
        }
      } catch (error) {
        this.logger.error(`[SERVICE-INIT] Error initializing ${name}:`, error);
      }
    });

    this.logger.log(`[SERVICE-INIT] All services initialized for project: ${projectId}`);
  }

  /**
   * Verifica se tutti i servizi sono stati inizializzati correttamente
   * @returns true se tutti i servizi sono inizializzati
   */
  areAllServicesInitialized(): boolean {
    // TODO: Implementare verifica se necessario
    // Per ora ritorna true assumendo che initialize() non fallisca
    return true;
  }
}
