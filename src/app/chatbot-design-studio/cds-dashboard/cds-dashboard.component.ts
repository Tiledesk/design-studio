
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
import { ServiceInitializationService } from 'src/app/services/service-initialization.service';
import { ChangelogService } from 'src/app/services/changelog.service';
import { WidgetManagerService } from 'src/app/services/widget-manager.service';

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
    private readonly serviceInitializationService: ServiceInitializationService,
    private readonly changelogService: ChangelogService,
    private readonly widgetManager: WidgetManagerService
  ) {}

  

  ngOnInit() {
    // ---------------------------------------
    // Changelog alert
    // ---------------------------------------
    this.showChangelog = this.changelogService.shouldShowChangelog();
    // Assicura che initFinished sia false prima di iniziare
    this.initFinished = false;
    this.executeAsyncFunctionsInSequence();
    this.widgetManager.hideWidget();
  }

  onSwipe(event: WheelEvent){
    this.stageService.onSwipe(event);
  }


  onCloseChangelog(){
    this.showChangelog = false;
    this.changelogService.markChangelogAsSeen();
  }

  async getUrlParams(): Promise<boolean> {
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
            this.dashboardService.setParams(params);
            resolve(true);
          },
          error: (error) => {
            this.errorHandler.handleInitializationError(error, 'getUrlParams');
            reject(false);
          },
          complete: () => {
            this.logger.log('COMPLETE');
          }
        });
    });
  }

  /**************** CUSTOM FUNCTIONS ****************/
  /** 
   * execute Async Functions In Sequence
   * Le funzioni async sono gestite in maniera sincrona ed eseguite in coda
   * da aggiungere un loader durante il processo e se tutte vanno a buon fine 
   * possiamo visualizzare lo stage completo
   */
  async executeAsyncFunctionsInSequence() {
    this.logger.log('[CDS DSHBRD] executeAsyncFunctionsInSequence -------------> ');    
    try {
      // Step 1: getUrlParams (deve essere primo per ottenere id_faq_kb e projectID)
      const getUrlParams = await this.getUrlParams();
      this.logger.log('[CDS DSHBRD] Risultato 1 (getUrlParams):', getUrlParams);
      if (!getUrlParams) {
        throw new Error('Failed to get URL parameters');
      }

      // Step 2: getCurrentProject (deve essere prima di initialize)
      const getCurrentProject = await this.dashboardService.getCurrentProject();
      this.logger.log('[CDS DSHBRD] Risultato 2 (getCurrentProject):', getCurrentProject);
      if (!getCurrentProject) {
        throw new Error('Failed to get current project');
      }

      this.project = this.dashboardService.project;
      this.initialize();

      // Step 3: Operazioni parallele (getBotById e getDeptsByProjectId)
      // Queste operazioni sono indipendenti e possono essere eseguite in parallelo
      const [getBotById, getDefaultDepartmentId] = await Promise.all([
        this.dashboardService.getBotById(),
        this.dashboardService.getDeptsByProjectId()
      ]);

      this.logger.log('[CDS DSHBRD] Risultato 3 (getBotById):', getBotById);
      this.logger.log('[CDS DSHBRD] Risultato 4 (getDeptsByProjectId):', getDefaultDepartmentId);

      if (!getBotById) {
        throw new Error('Failed to get bot by ID');
      }

      if (!getDefaultDepartmentId) {
        throw new Error('Failed to get default department');
      }

      // Tutte le operazioni completate con successo
      if (getUrlParams && getBotById && getCurrentProject && getDefaultDepartmentId) {
        this.logger.log('[CDS DSHBRD] Ho finito di inizializzare la dashboard');
        this.selectedChatbot = this.dashboardService.selectedChatbot;
        this.initFinished = true;
      }
    } catch (error) {
      this.errorHandler.handleInitializationError(error, 'executeAsyncFunctionsInSequence');
    }
  }

  private initialize(){
    this.serviceInitializationService.initializeAllServices(this.project._id);
    this.widgetManager.hideWidget();
  }


  /**************** START EVENTS HEADER ****************/

  /** onToggleSidebarWith */
  onToggleSidebarWith(IS_OPEN) {
    this.IS_OPEN_SIDEBAR = IS_OPEN;
  }

  /** Go back to previous page */
  goBack() {
    let dashbordBaseUrl = this.appConfigService.getConfig().dashboardBaseUrl + '#/project/'+ this.dashboardService.projectID + '/bots/my-chatbots/all'
    window.open(dashbordBaseUrl, '_self')
    // this.location.back()
    // this.router.navigate(['project/' + this.project._id + '/bots/my-chatbots/all']);
    this.widgetManager.showWidget();
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
