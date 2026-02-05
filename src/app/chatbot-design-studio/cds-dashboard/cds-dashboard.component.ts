
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
// import { TranslateService } from '@ngx-translate/core';

// SERVICES //
import { DashboardService } from 'src/app/services/dashboard.service';
import { DashboardFacadeService } from 'src/app/services/dashboard-facade.service';
import { WidgetManagerService } from 'src/app/services/widget-manager.service';

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
import { Subject } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';
import { environment } from 'src/environments/environment';
import { BRAND_BASE_INFO } from '../utils-resources';
import { StageService } from 'src/app/chatbot-design-studio/services/stage.service';
import { WebhookService } from '../services/webhook-service.service';

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
  private destroy$ = new Subject<void>();
  
  constructor(
    private route: ActivatedRoute,
    private appConfigService: AppConfigService,
    private appStorageService: AppStorageService,
    private dashboardService: DashboardService,
    private dashboardFacade: DashboardFacadeService,
    private widgetManager: WidgetManagerService,
    private kbService: KnowledgeBaseService,
    public departmentService: DepartmentService,
    public faqKbService: FaqKbService,
    public faqService: FaqService,
    private openaiService: OpenaiService,
    private whatsappService: WhatsappService,
    private stageService: StageService, 
    private readonly webhookService: WebhookService
  ) {
    this.logger.log('[SLICE3] WidgetManagerService injected successfully - hideWidget() and showWidget() methods available');
    this.logger.log('[SLICE3] All hideShowWidget() calls replaced - Old method removed from component');
  }

  

  ngOnInit() {
    // this.logger.log('[SLICE1] ngOnInit - Dashboard component initialization started');
    this.logger.log('[SLICE3] ngOnInit - WidgetManagerService injected and ready');
    this.showChangelog = this.checkForChangelogNotify();
    this.initDashboard();
    this.logger.log('[SLICE3] Calling widgetManager.hideWidget() - Widget hidden at startup');
    this.widgetManager.hideWidget();
  }

  ngOnDestroy(): void {
    // this.logger.log('[SLICE1] ngOnDestroy - Cleaning up subscriptions (takeUntil destroy$)');
    this.destroy$.next();
    this.destroy$.complete();
    // this.logger.log('[SLICE1] ngOnDestroy - Subscriptions cleaned up, no memory leaks');
  }

  onSwipe(event: WheelEvent){
    this.stageService.onSwipe(event);
  }


  checkForChangelogNotify(): boolean { 
    if(!BRAND_BASE_INFO['DOCS']){
      return false
    }
    let changelogKey = this.appStorageService.getItem("changelog")
    if(!changelogKey){
      return true
    }
    if(changelogKey && changelogKey !== environment.VERSION){
      let stored_minor_version = changelogKey.split('.')[1]
      let local_minor_version = environment.VERSION.split('.')[1]
      if(stored_minor_version === local_minor_version){
        return false
      }
      return true
    }
    return false;
  }

  onCloseChangelog(){
    this.showChangelog = false;
    this.appStorageService.setItem('changelog', environment.VERSION)
  }

  /**************** CUSTOM FUNCTIONS ****************/
  /**
   * Inizializza la dashboard usando DashboardFacadeService con pattern reattivo.
   */
  private initDashboard(): void {
    // this.logger.log('[SLICE1] initDashboard - Dashboard loading started');
    this.logger.log('[CDS DSHBRD] initDashboard -------------> ');
    
    // this.logger.log('[SLICE2] CdsDashboardComponent - Route params subscription already managed correctly (Slice 1) - Pattern consistent');
    this.route.params.pipe(
      takeUntil(this.destroy$),
      switchMap(params => {
        // this.logger.log('[SLICE1] Route params received - Navigation working:', params);
        // this.logger.log('[SLICE2] CdsDashboardComponent - Route params received - Navigation working correctly');
        this.logger.log('[CDS DSHBRD] Route params:', params);
        return this.dashboardFacade.initDashboard(params);
      })
    ).subscribe({
      next: ({ project, chatbot, defaultDept }) => {
        this.logger.log('[CDS DSHBRD] InitDashboard success:', { project, chatbot, defaultDept });
        
        // Checklist: project popolato
        this.project = project;
        // this.logger.log('[SLICE1] Project populated:', { id: project?._id, name: project?.name });
        
        // Checklist: selectedChatbot popolato
        this.selectedChatbot = chatbot;
        // this.logger.log('[SLICE1] SelectedChatbot populated:', { id: chatbot?._id, name: chatbot?.name });
        
        this.defaultDepartmentId = defaultDept?._id;
        
        this.initialize();
        
        // Checklist: initFinished diventa true
        this.initFinished = true;
        // this.logger.log('[SLICE1] initFinished set to true - Dashboard loaded correctly');
        this.logger.log('[CDS DSHBRD] Dashboard initialization completed');
      },
      error: (error) => {
        // this.logger.error('[SLICE1] InitDashboard error - Console error detected:', error);
        this.logger.error('[SLICE3] InitDashboard error - Console error detected:', error);
        this.logger.error('[CDS DSHBRD] InitDashboard error:', error);
        console.error('error: ', error);
      }
    });
  }

  private initialize(){
    // this.logger.log('[SLICE1] initialize() called - Initializing services');
    let serverBaseURL = this.appConfigService.getConfig().apiUrl
    let whatsappBaseUrl = this.appConfigService.getConfig().whatsappTemplatesBaseUrl

    this.departmentService.initialize(serverBaseURL, this.project._id);
    this.faqKbService.initialize(serverBaseURL, this.project._id)
    this.faqService.initialize(serverBaseURL, this.project._id)
    this.kbService.initialize(serverBaseURL, this.project._id)
    this.openaiService.initialize(serverBaseURL, this.project._id)
    this.whatsappService.initialize(whatsappBaseUrl, this.project._id)
    this.webhookService.initialize(serverBaseURL, this.project._id);

    // this.logger.log('[SLICE1] All services initialized:', {
    //   departmentService: true,
    //   faqKbService: true,
    //   faqService: true,
    //   kbService: true,
    //   openaiService: true,
    //   whatsappService: true,
    //   webhookService: true
    // });

    this.logger.log('[SLICE3] Calling widgetManager.hideWidget() after services initialization - Widget hidden after initialization');
    this.widgetManager.hideWidget();

  }


  /**************** START EVENTS HEADER ****************/

  /** onToggleSidebarWith */
  onToggleSidebarWith(IS_OPEN) {
    this.IS_OPEN_SIDEBAR = IS_OPEN;
  }

  /** Go back to previous page */
  // COMMENTATO: Il pulsante che chiama questo metodo è commentato nel template del header
  // Per ripristinare: decommentare (goToBck)="goBack()" nel template e il pulsante nel header
  // goBack() {
  //   let dashbordBaseUrl = this.appConfigService.getConfig().dashboardBaseUrl + '#/project/'+ this.dashboardService.projectID + '/bots/my-chatbots/all'
  //   window.open(dashbordBaseUrl, '_self')
  //   // this.location.back()
  //   // this.router.navigate(['project/' + this.project._id + '/bots/my-chatbots/all']);
  //   this.hideShowWidget('show');
  // }
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

}
