
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { takeUntil, first } from 'rxjs/operators';
// import { TranslateService } from '@ngx-translate/core';

// SERVICES //
import { DashboardService } from 'src/app/services/dashboard.service';

// MODEL //
import { Project } from 'src/app/models/project-model';
import { Chatbot } from 'src/app/models/faq_kb-model';

// UTILS //
import { SETTINGS_SECTION, SIDEBAR_PAGES } from 'src/app/chatbot-design-studio/utils';
import { Intent } from 'src/app/models/intent-model';

//LOGGER
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { KnowledgeBaseService } from 'src/app/services/knowledge-base.service';
import { OpenaiService } from 'src/app/services/openai.service';
import { WhatsappService } from 'src/app/services/whatsapp.service';
import { AppConfigService } from 'src/app/services/app-config';
import { DepartmentService } from 'src/app/services/department.service';
import { FaqKbService } from 'src/app/services/faq-kb.service';
import { FaqService } from 'src/app/services/faq.service';
import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';
import { BRAND_BASE_INFO } from '../utils-resources';
import { StageService } from 'src/app/chatbot-design-studio/services/stage.service';
import { WebhookService } from '../services/webhook-service.service';
import { DashboardErrorHandlerService } from 'src/app/services/dashboard-error-handler.service';
import { DashboardFacadeService } from 'src/app/services/dashboard-facade.service';

@Component({
  selector: 'appdashboard-cds-dashboard',
  templateUrl: './cds-dashboard.component.html',
  styleUrls: ['./cds-dashboard.component.scss']
})
export class CdsDashboardComponent implements OnInit, OnDestroy {
  // @ViewChild('chatbot--dashboard') canvas!: ElementRef;
  
  SIDEBAR_PAGES = SIDEBAR_PAGES;
  initFinished:boolean = false;
  IS_OPEN_SIDEBAR: boolean = false;
  IS_OPEN_INTENTS_LIST: boolean = true;
  IS_OPEN_PANEL_WIDGET: boolean = false;

  
  project: Project;
  defaultDepartmentId: string;
  selectedChatbot: Chatbot
  activeSidebarSection: SIDEBAR_PAGES = SIDEBAR_PAGES.INTENTS;
  activeDetailSection: SETTINGS_SECTION = SETTINGS_SECTION.DETAIL
  isBetaUrl: boolean = false;
  showChangelog: boolean = false;
  BRAND_BASE_INFO = BRAND_BASE_INFO;
  
  private logger: LoggerService = LoggerInstance.getInstance();
  
  // --- Subscription cleanup ---
  private destroy$ = new Subject<void>();
  private routeParamsSubscription: Subscription | null = null;
  constructor(
    private route: ActivatedRoute,
    private appConfigService: AppConfigService,
    private appStorageService: AppStorageService,
    private dashboardService: DashboardService,
    private kbService: KnowledgeBaseService,
    public departmentService: DepartmentService,
    public faqKbService: FaqKbService,
    public faqService: FaqService,
    private openaiService: OpenaiService,
    private whatsappService: WhatsappService,
    private stageService: StageService, 
    private readonly webhookService: WebhookService,
    private readonly errorHandler: DashboardErrorHandlerService,
    private readonly dashboardFacade: DashboardFacadeService
  ) {}

  

  ngOnInit() {
    // ---------------------------------------
    // Changelog alert
    // ---------------------------------------
    this.showChangelog = this.dashboardFacade.shouldShowChangelog();
    // Assicura che initFinished sia false prima di iniziare
    this.initFinished = false;
    this.executeAsyncFunctionsInSequence();
  }

  onSwipe(event: WheelEvent){
    this.stageService.onSwipe(event);
  }


  onCloseChangelog(){
    this.showChangelog = false;
    this.dashboardFacade.markChangelogAsSeen();
  }

  /**************** CUSTOM FUNCTIONS ****************/
  /** 
   * execute Async Functions In Sequence
   * Usa il DashboardFacadeService per inizializzare la dashboard in modo reattivo.
   * Il facade gestisce il caricamento parallelo di progetto, bot e departments.
   */
  async executeAsyncFunctionsInSequence() {
    this.logger.log('[CDS DSHBRD] executeAsyncFunctionsInSequence -------------> ');    
    try {
      // Step 1: Ottieni i parametri dalla route
      const params = await this.getUrlParams();
      if (!params) {
        throw new Error('Failed to get URL parameters');
      }

      // Step 2: Usa il facade per inizializzare tutto (progetto, bot, departments in parallelo)
      this.dashboardFacade.initDashboard(params)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (result) => {
            this.logger.log('[CDS DSHBRD] Dashboard initialized successfully:', result);
            // Aggiorna lo stato del componente con i dati caricati
            this.project = result.project;
            this.selectedChatbot = result.chatbot;
            if (result.defaultDept) {
              this.defaultDepartmentId = result.defaultDept._id;
            }
            this.initFinished = true;
          },
          error: (error) => {
            this.logger.error('[CDS DSHBRD] Error initializing dashboard:', error);
            this.errorHandler.handleInitializationError(error, 'executeAsyncFunctionsInSequence');
          }
        });
    } catch (error) {
      this.errorHandler.handleInitializationError(error, 'executeAsyncFunctionsInSequence');
    }
  }

  /**
   * Ottiene i parametri dalla route e li restituisce come Promise.
   * Modificato per restituire i params invece di un boolean.
   */
  async getUrlParams(): Promise<any> {
    return new Promise((resolve, reject) => {
      // Cleanup previous subscription if exists
      if (this.routeParamsSubscription) {
        this.routeParamsSubscription.unsubscribe();
      }
      
      this.routeParamsSubscription = this.route.params
        .pipe(
          takeUntil(this.destroy$),
          first() // Completa dopo primo emit (route params tipicamente emettono una volta)
        )
        .subscribe({
          next: (params) => {
            this.logger.log('[ DSHBRD-SERVICE ] getUrlParams  PARAMS', params);
            resolve(params);
          },
          error: (error) => {
            this.errorHandler.handleInitializationError(error, 'getUrlParams');
            reject(null);
          },
          complete: () => {
            this.logger.log('COMPLETE');
          }
        });
    });
  }


  /**************** START EVENTS HEADER ****************/

  /** onToggleSidebarWith */
  onToggleSidebarWith(IS_OPEN) {
    this.IS_OPEN_SIDEBAR = IS_OPEN;
  }

  /** Go back to previous page */
  goBack() {
    this.dashboardFacade.navigateBackToBotsDashboard();
  }
  /*****************************************************/


  /**************** START EVENTS PANEL INTENT ****************/
  /** SIDEBAR OUTPUT EVENTS */
  onClickItemList(event: SIDEBAR_PAGES) {
    this.logger.log('[CDS DSHBRD] active section-->', event);
    if(event !== SIDEBAR_PAGES.INTENTS){
      // this.connectorService.initializeConnectors();
      // this.eventTestItOutHeader.next(null);
    }
    this.activeSidebarSection = event;
  }
  /*****************************************************/ 

  ngOnDestroy(): void {
    // Cleanup route params subscription
    if (this.routeParamsSubscription) {
      this.routeParamsSubscription.unsubscribe();
      this.routeParamsSubscription = null;
    }
    
    // Cleanup all subscriptions via takeUntil
    this.destroy$.next();
    this.destroy$.complete();
  }

}
