
import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
// import { TranslateService } from '@ngx-translate/core';

// SERVICES //
import { IntentService } from 'src/app/chatbot-design-studio/services/intent.service';
import { ControllerService } from 'src/app/chatbot-design-studio/services/controller.service';
import { ConnectorService } from 'src/app/chatbot-design-studio/services/connector.service';
import { DashboardService } from 'src/app/services/dashboard.service';

// MODEL //
import { Project } from 'src/app/models/project-model';
import { Chatbot } from 'src/app/models/faq_kb-model';

// UTILS //
import { SIDEBAR_PAGES } from 'src/app/chatbot-design-studio/utils';
import { Intent } from 'src/app/models/intent-model';

//LOGGER
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { KnowledgeBaseService } from 'src/app/services/knowledge-base.service';
import { MultichannelService } from 'src/app/services/multichannel.service';
import { OpenaiService } from 'src/app/services/openai.service';
import { UsersService } from 'src/app/services/users.service';
import { WhatsappService } from 'src/app/services/whatsapp.service';
import { AppConfigService } from 'src/app/services/app-config';
import { DepartmentService } from 'src/app/services/department.service';
import { FaqKbService } from 'src/app/services/faq-kb.service';
import { FaqService } from 'src/app/services/faq.service';
import { Subject } from 'rxjs';


@Component({
  selector: 'appdashboard-cds-dashboard',
  templateUrl: './cds-dashboard.component.html',
  styleUrls: ['./cds-dashboard.component.scss']
})
export class CdsDashboardComponent implements OnInit {

  SIDEBAR_PAGES = SIDEBAR_PAGES;
  initFinished:boolean = false;
  IS_OPEN_SIDEBAR: boolean = false;
  IS_OPEN_INTENTS_LIST: boolean = true;
  IS_OPEN_PANEL_WIDGET: boolean = false;

  eventTestItOutHeader: Subject<Intent | boolean> = new Subject<Intent | boolean>();
  
  project: Project;
  defaultDepartmentId: string;
  selectedChatbot: Chatbot
  activeSidebarSection: string;
  isBetaUrl: boolean = false;

  private logger: LoggerService = LoggerInstance.getInstance();
  constructor(
    private route: ActivatedRoute,
    private appConfigService: AppConfigService,
    private dashboardService: DashboardService,
    private kbService: KnowledgeBaseService,
    public departmentService: DepartmentService,
    public faqKbService: FaqKbService,
    public faqService: FaqService,
    private openaiService: OpenaiService,
    private whatsappService: WhatsappService,
  ) {}

  ngOnInit() {
    console.log("•••• [CDS DSHBRD] ngOnInit ••••");
    this.executeAsyncFunctionsInSequence();
    this.hideShowWidget('hide')
  }

  async getUrlParams(): Promise<boolean> {
    
    return new Promise((resolve, reject) => {
      this.route.params.subscribe({ next: (params) => {
          console.log('paramssssss', params)
          // this.id_faq_kb = params['faqkbid'];
          // this.id_faq = params['faqid'];
          // this.botType = params['bottype'];
          // this.intent_id = params['intent_id'];
          this.logger.log('[ DSHBRD-SERVICE ] getUrlParams  PARAMS', params);
          // this.logger.log('[ DSHBRD-SERVICE ] getUrlParams  BOT ID ', this.id_faq_kb);
          // this.logger.log('[ DSHBRD-SERVICE ] getUrlParams  FAQ ID ', this.id_faq);
          // this.logger.log('[ DSHBRD-SERVICE ] getUrlParams  FAQ ID ', this.intent_id);
          console.log('[ DSHBRD-SERVICE ] getUrlParams', params);
          this.dashboardService.setParams(params)
          resolve(true);
        }, error: (error) => {
          this.logger.error('[ DSHBRD-SERVICE ] ERROR: ', error);
          reject(false);
        }, complete: () => {
          console.log('COMPLETE');
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
      const getTranslations = await this.getTranslations();
      this.logger.log('[CDS DSHBRD] Risultato 1:', getTranslations);
      const getUrlParams = await this.getUrlParams();
      this.logger.log('[CDS DSHBRD] Risultato 2:', getUrlParams);
      const getCurrentProject = await this.dashboardService.getCurrentProject();
      this.logger.log('[CDS DSHBRD] Risultato 3:', getCurrentProject);
      this.project = this.dashboardService.project
      console.log('ppppppppppp', this.project)
      this.initialize()
      const getBotById = await this.dashboardService.getBotById();
      this.logger.log('[CDS DSHBRD] Risultato 4:', getBotById, this.selectedChatbot);
      const getDefaultDepartmentId = this.dashboardService.getDeptsByProjectId();
      this.logger.log('[CDS DSHBRD] Risultato 5:', getDefaultDepartmentId);
      if (getTranslations && getUrlParams && getBotById && getCurrentProject && getDefaultDepartmentId) {
        this.logger.log('[CDS DSHBRD] Ho finito di inizializzare la dashboard');
        this.project = this.dashboardService.project;
        this.selectedChatbot = this.dashboardService.selectedChatbot;
        this.initFinished = true;
      }
    } catch (error) {
      console.error('error: ', error);
    }
  }

  /** GET TRANSLATIONS */
  private async getTranslations(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      // this.translateCreateFaqSuccessMsg();
      // this.translateCreateFaqErrorMsg();
      // this.translateUpdateFaqSuccessMsg();
      // this.translateUpdateFaqErrorMsg();
      // this.translateWarningMsg();
      // this.translateAreYouSure();
      // this.translateErrorDeleting();
      // this.translateDone();
      // this.translateErrorOccurredDeletingAnswer();
      // this.translateAnswerSuccessfullyDeleted();
      resolve(true);
    });
  }

  private initialize(){
    let serverBaseURL = this.appConfigService.getConfig().apiUrl

    this.departmentService.initialize(serverBaseURL, this.project._id);
    this.faqKbService.initialize(serverBaseURL, this.project._id)
    this.faqService.initialize(serverBaseURL, this.project._id)
    this.kbService.initialize(serverBaseURL, this.project._id)
    this.openaiService.initialize(serverBaseURL, this.project._id)
    this.whatsappService.initialize(serverBaseURL, this.project._id)

  }

  /** hideShowWidget */
  private hideShowWidget(status: "hide" | "show") {
    try {
      if (window && window['tiledesk']) {
        this.logger.log('[CDS DSHBRD] HIDE WIDGET ', window['tiledesk'])
        if (status === 'hide') {
          window['tiledesk'].hide();
        } else if (status === 'show') {
          window['tiledesk'].show();
        }
      }
    } catch (error) {
      this.logger.error('tiledesk_widget_hide ERROR', error)
    }
  }


  /**************** START EVENTS HEADER ****************/

  /** onToggleSidebarWith */
  onToggleSidebarWith(IS_OPEN) {
    this.IS_OPEN_SIDEBAR = IS_OPEN;
  }

  /** Go back to previous page */
  goBack() {
    let dashbordBaseUrl = this.appConfigService.getConfig().DASHBOARD_BASE_URL + 'dashboard/#/project/'+ this.dashboardService.projectID + '/bots/my-chatbots/all'
    console.log('[CDS DSHBRD] goBack ', dashbordBaseUrl, this.appConfigService.getConfig().DASHBOARD_BASE_URL);
    window.open(dashbordBaseUrl, '_self')
    // this.location.back()
    // this.router.navigate(['project/' + this.project._id + '/bots/my-chatbots/all']);
    this.hideShowWidget('show');
  }

  /** onTestItOut **
   * Open WHEN THE PLAY BUTTON IS CLICKED
   * - test widget
   * @ Close
   * - detail action panel
   * - actions context menu' (static & float),
   * - button configuration panel  
  */
  onTestItOut(event: Intent | boolean) {
    this.logger.log('[CDS DSHBRD] onTestItOut intent ', event);
    // if(typeof event === "boolean"){
    //   this.IS_OPEN_PANEL_WIDGET = true;
    // } else {
    //   this.IS_OPEN_PANEL_WIDGET = !this.IS_OPEN_PANEL_WIDGET;
    // }
    // if(this.IS_OPEN_PANEL_WIDGET){
    //   this.controllerService.closeActionDetailPanel();
    //   this.controllerService.closeButtonPanel();
    //   // this.intentService.setLiveActiveIntent(null);
    //   this.controllerService.closeAddActionMenu();
    //   this.connectorService.removeConnectorDraft();
    // }

    this.eventTestItOutHeader.next(event);
  }
  /*****************************************************/


  /**************** START EVENTS PANEL INTENT ****************/
  /** SIDEBAR OUTPUT EVENTS */
  onClickItemList(event: string) {
    this.logger.log('[CDS DSHBRD] active section-->', event);
    if(event !== 'cds-sb-intents'){
      // this.connectorService.initializeConnectors();
      this.eventTestItOutHeader.next(false);
    }
    this.activeSidebarSection = event;
  }
  /*****************************************************/ 

}
