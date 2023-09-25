
import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
// import { TranslateService } from '@ngx-translate/core';

// SERVICES //
import { IntentService } from 'src/app/chatbot-design-studio/services/intent.service';
import { ControllerService } from 'src/app/chatbot-design-studio/services/controller.service';
import { ConnectorService } from 'src/app/chatbot-design-studio/services/connector.service';
import { DashboardService } from 'src/app/chatbot-design-studio/services/dashboard.service';

// MODEL //
import { Project } from 'src/app/models/project-model';
import { Chatbot } from 'src/app/models/faq_kb-model';

// UTILS //
import { SIDEBAR_PAGES } from 'src/app/chatbot-design-studio/utils';
import { Intent } from 'src/app/models/intent-model';

//LOGGER
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';


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

  id_faq_kb: string;
  id_faq: string;
  botType: string;
  intent_id: string;
  project: Project;
  projectID: string;
  defaultDepartmentId: string;
  selectedChatbot: Chatbot
  activeSidebarSection: string;
  isBetaUrl: boolean = false;

  private logger: LoggerService = LoggerInstance.getInstance();
  
  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private dashboardService: DashboardService,
    private intentService: IntentService,
    private controllerService: ControllerService,
    private connectorService: ConnectorService,
    // private translate: TranslateService
  ) {}

  ngOnInit() {
    this.logger.log("•••• [CDS DSHBRD] ngOnInit ••••");
    this.executeAsyncFunctionsInSequence();
    this.hideShowWidget('hide')
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
      const getBotById = await this.dashboardService.getBotById();
      this.logger.log('[CDS DSHBRD] Risultato 3:', getBotById, this.selectedChatbot);
      const getCurrentProject = await this.dashboardService.getCurrentProject();
      this.logger.log('[CDS DSHBRD] Risultato 4:', getCurrentProject);
      const getBrowserVersion = await this.dashboardService.getBrowserVersion();
      this.logger.log('[CDS DSHBRD] Risultato 5:', getBrowserVersion);
      const getDefaultDepartmentId = this.dashboardService.getDeptsByProjectId();
      this.logger.log('[CDS DSHBRD] Risultato 6:', getDefaultDepartmentId);
      if (getTranslations && getUrlParams && getBotById && getCurrentProject && getBrowserVersion && getDefaultDepartmentId) {
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

  /** getUrlParams **
   * GET FROM ROUTE PARAMS (PASSED FROM FAQ COMPONENT):
   * THE FAQ ID - WHEN THE CALLBACK IS COMPLETED RUN GET-FAQ-BY-ID THAT RETURN THE OBJECT FAQ
   * AND THE FAQ KB ID (THEN USED IN THE GOBACK)
  */
  private async getUrlParams(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.route.params.subscribe((params) => {
        this.id_faq_kb = params['faqkbid'];
        this.id_faq = params['faqid'];
        this.botType = params['bottype'];
        this.intent_id = params['intent_id'];
        this.dashboardService.setParams(params);
        resolve(true);
      }, (error) => {
        this.logger.error('ERROR: ', error);
        reject(false);
      }, () => {
        this.logger.log('COMPLETE');
      });
    });
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
    this.logger.log('[CDS DSHBRD] goBack ');
    this.router.navigate(['project/' + this.project._id + '/bots/my-chatbots/all']);
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
    if(typeof event === "boolean"){
      this.IS_OPEN_PANEL_WIDGET = true;
    } else {
      this.IS_OPEN_PANEL_WIDGET = !this.IS_OPEN_PANEL_WIDGET;
    }
    if(this.IS_OPEN_PANEL_WIDGET){
      this.controllerService.closeActionDetailPanel();
      this.controllerService.closeButtonPanel();
      // this.intentService.setLiveActiveIntent(null);
      this.controllerService.closeAddActionMenu();
      this.connectorService.removeConnectorDraft();
    }
  }
  /*****************************************************/


  /**************** START EVENTS PANEL INTENT ****************/

  /** onClosePanelWidget */
  onClosePanelWidget(){
    this.logger.log('[CDS DSHBRD] onClosePanelWidget');
    this.IS_OPEN_PANEL_WIDGET = false;
  }

  /** SIDEBAR OUTPUT EVENTS */
  onClickItemList(event: string) {
    this.logger.log('[CDS DSHBRD] active section-->', event);
    if(event !== 'cds-sb-intents'){
      // this.connectorService.initializeConnectors();
      this.IS_OPEN_PANEL_WIDGET = false;
    }
    this.activeSidebarSection = event;
  }
  /*****************************************************/ 

}
