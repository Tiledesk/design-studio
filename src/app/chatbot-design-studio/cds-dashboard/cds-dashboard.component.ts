
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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
import { Subject } from 'rxjs';
import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';
import { environment } from 'src/environments/environment';
import { BRAND_BASE_INFO } from '../utils-resources';


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

  
  project: Project;
  defaultDepartmentId: string;
  selectedChatbot: Chatbot
  activeSidebarSection: SIDEBAR_PAGES = SIDEBAR_PAGES.INTENTS;
  activeDetailSection: SETTINGS_SECTION = SETTINGS_SECTION.DETAIL
  isBetaUrl: boolean = false;
  showChangelog: boolean = false;
  BRAND_BASE_INFO = BRAND_BASE_INFO;
  
  private logger: LoggerService = LoggerInstance.getInstance();
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
  ) {}

  ngOnInit() {
    console.log("•••• [CDS DSHBRD] ngOnInit ••••");
    // ---------------------------------------
    // Changelog alert
    // ---------------------------------------
    this.showChangelog = this.checkForChangelogNotify();
    this.executeAsyncFunctionsInSequence();
    this.hideShowWidget('hide');
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

  async getUrlParams(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.route.params.subscribe({ next: (params) => {
          this.logger.log('[ DSHBRD-SERVICE ] getUrlParams  PARAMS', params);
          this.dashboardService.setParams(params)
          resolve(true);
        }, error: (error) => {
          this.logger.error('[ DSHBRD-SERVICE ] ERROR: ', error);
          reject(false);
        }, complete: () => {
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
      const getTranslations = await this.getTranslations();
      this.logger.log('[CDS DSHBRD] Risultato 1:', getTranslations);
      const getUrlParams = await this.getUrlParams();
      this.logger.log('[CDS DSHBRD] Risultato 2:', getUrlParams);
      const getCurrentProject = await this.dashboardService.getCurrentProject();
      this.logger.log('[CDS DSHBRD] Risultato 3:', getCurrentProject);
      this.project = this.dashboardService.project;
      this.initialize();
      const getBotById = await this.dashboardService.getBotById();
      this.logger.log('[CDS DSHBRD] Risultato 4:', getBotById, this.selectedChatbot);
      const getDefaultDepartmentId = await this.dashboardService.getDeptsByProjectId();
      this.logger.log('[CDS DSHBRD] Risultato 5:', getDefaultDepartmentId);
      if (getTranslations && getUrlParams && getBotById && getCurrentProject && getDefaultDepartmentId) {
        this.logger.log('[CDS DSHBRD] Ho finito di inizializzare la dashboard');
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
    let whatsappBaseUrl = this.appConfigService.getConfig().whatsappTemplatesBaseUrl

    this.departmentService.initialize(serverBaseURL, this.project._id);
    this.faqKbService.initialize(serverBaseURL, this.project._id)
    this.faqService.initialize(serverBaseURL, this.project._id)
    this.kbService.initialize(serverBaseURL, this.project._id)
    this.openaiService.initialize(serverBaseURL, this.project._id)
    this.whatsappService.initialize(whatsappBaseUrl, this.project._id)

    this.hideShowWidget('hide')

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
    let dashbordBaseUrl = this.appConfigService.getConfig().dashboardBaseUrl + '#/project/'+ this.dashboardService.projectID + '/bots/my-chatbots/all'
    window.open(dashbordBaseUrl, '_self')
    // this.location.back()
    // this.router.navigate(['project/' + this.project._id + '/bots/my-chatbots/all']);
    this.hideShowWidget('show');
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

}
