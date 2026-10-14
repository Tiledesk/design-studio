
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
import { DataTableService } from 'src/app/services/data-table.service';
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
import { IntentService } from '../services/intent.service';
import { StageService } from 'src/app/chatbot-design-studio/services/stage.service';
import { ReadOnlyService, isReadOnlyRoute } from 'src/app/services/read-only.service';
import { WebhookService } from '../services/webhook-service.service';
import { UploadService } from 'src/chat21-core/providers/abstract/upload.service';

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
  /** Sola lettura: niente header, niente sidebar, banner sempre in vista. */
  IS_READ_ONLY: boolean = false;
  /** Il canvas e' montato. Va a false e poi a true per ricostruirlo su un altro flusso (vedi rebuildFlow). */
  flowVisible: boolean = true;
  BRAND_BASE_INFO = BRAND_BASE_INFO;
  
  private logger: LoggerService = LoggerInstance.getInstance();
  constructor(
    private route: ActivatedRoute,
    private appConfigService: AppConfigService,
    private appStorageService: AppStorageService,
    private dashboardService: DashboardService,
    private kbService: KnowledgeBaseService,
    private dataTableService: DataTableService,
    public departmentService: DepartmentService,
    private uploadService: UploadService,
    public faqKbService: FaqKbService,
    public faqService: FaqService,
    private openaiService: OpenaiService,
    private whatsappService: WhatsappService,
    private stageService: StageService,
    private readonly webhookService: WebhookService,
    private readonly readOnlyService: ReadOnlyService,
    private readonly router: Router,
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly intentService: IntentService
  ) {}

  /**
   * Accende la sola lettura se questa e' la rotta di preview.
   *
   * Va fatto **prima** che il canvas carichi il flusso, e lo e': il canvas vive dentro
   * il router-outlet di questo guscio, che lo rende solo a inizializzazione finita.
   *
   * La forma di `data` e' insolita -- e' un array di un oggetto, `[{ roles: [...] }]`,
   * perche' cosi' la legge RoleGuard -- e l'ereditarieta' dei dati di rotta verso il
   * figlio a percorso vuoto puo' consegnarla come array o come oggetto con chiave `0`.
   * `data[0]` va bene in entrambi i casi.
   */
  private applyReadOnlyFromRoute(): void {
    if (isReadOnlyRoute(this.route.snapshot.data)) {
      this.readOnlyService.enable();
      this.IS_READ_ONLY = true;
      this.logger.log('[CDS DSHBRD] read-only: nessuna modifica verra\' salvata');
    }
  }

  

  ngOnInit() {
    // ---------------------------------------
    // Changelog alert
    // ---------------------------------------
    this.applyReadOnlyFromRoute();
    this.showChangelog = this.checkForChangelogNotify();
    this.executeAsyncFunctionsInSequence();
    this.hideShowWidget('hide');
    // Chi cambia flusso (il pannello dei subagent) passa da qui: il guscio resta montato e
    // ricostruisce il solo canvas, senza ricaricare la pagina.
    this.dashboardService.openFlow = (faqKbId: string) => this.openFlow(faqKbId);
    this.dashboardService.refreshFlow = () => this.refreshFlow();
  }

  ngOnDestroy() {
    this.dashboardService.openFlow = null;
    this.dashboardService.refreshFlow = null;
  }

  /**
   * Apre un altro flusso del progetto senza ricaricare la pagina.
   *
   * Il canvas viene distrutto e ricreato, non reinizializzato sul posto: possiede stage,
   * connettori, undo, selezione e listener di trascinamento, e il suo `initialize()` li
   * costruisce tutti da un `id_faq_kb`; un azzeramento a mano dovrebbe ricordarsene uno per uno
   * e quello dimenticato non alza errori, disegna il flusso nuovo coi connettori del vecchio.
   * L'URL fa parte dello stato: un refresh manuale o il tasto indietro devono atterrare dove
   * l'utente e' davvero. La rotta di sola lettura (`preview`) resta tale.
   */
  public async openFlow(faqKbId: string): Promise<void> {
    if (!faqKbId || faqKbId === this.dashboardService.id_faq_kb) { return; }
    const section = this.readOnlyService.readOnly ? 'preview' : 'chatbot';
    const navigated = await this.router.navigate(
      ['project', this.dashboardService.projectID, section, faqKbId, 'blocks']);
    if (!navigated) {
      // Una guardia o un redirect annullano la navigazione: navigate() risolve false e lo
      // studio e' ancora sul flusso di prima. Ricostruire il canvas direbbe di essersi mossi.
      throw new Error(
        `Could not open "${faqKbId}": the studio refused to navigate to it. `
        + `The open flow is still "${this.dashboardService.id_faq_kb}".`);
    }
    await this.rebuildFlow(faqKbId);
  }

  /** Ricostruisce il canvas sul flusso che la rotta indica adesso, senza ricaricare la pagina. */
  private async rebuildFlow(faqKbId: string): Promise<void> {
    // Niente dello stack di undo appartiene al flusso che si apre: un Ctrl+Z riporterebbe
    // dentro i blocchi del flusso precedente, con il loro id_faq_kb.
    this.intentService.arrayUNDO = [];
    this.intentService.arrayREDO = [];
    this.intentService.behaviorUndoRedo.next({ undo: false, redo: false });
    // `route.params` e' ancora sottoscritto da getUrlParams(): setParams() e' gia' passato
    // per il nuovo id quando navigate() risolve.
    this.flowVisible = false;
    // false e true nello stesso giro di change detection collasserebbero in uno: l'*ngIf non
    // vedrebbe mai il false e il canvas verrebbe riusato con lo stage del flusso vecchio.
    this.changeDetectorRef.detectChanges();
    try {
      await this.dashboardService.getBotById();
      this.selectedChatbot = this.dashboardService.selectedChatbot;
      // Il canvas carica i blocchi da solo nel suo ngOnInit, ma dopo una chiamata HTTP: fino ad
      // allora IntentService.listOfIntents terrebbe i blocchi del flusso precedente. Caricarli
      // qui costa un GET in piu' e chiude quella finestra.
      await this.intentService.getAllIntents(this.dashboardService.id_faq_kb);
    } catch (error) {
      this.intentService.listOfIntents = [];
      this.intentService.prevListOfIntent = [];
      throw new Error(
        `Opened "${faqKbId}" but could not load it`
        + `${error instanceof Error ? ': ' + error.message : ''}.`);
    } finally {
      // In `finally`: un canvas lasciato nascosto sarebbe uno studio senza canvas e senza errore.
      this.flowVisible = true;
      this.changeDetectorRef.detectChanges();
    }
  }

  /** Rilegge il flusso aperto in place (blocchi e attributi), come farebbe un reload, senza reload.
   *  Per le modifiche fatte fuori dal canvas che il canvas deve vedere: un subagent cancellato
   *  mentre il parent e' aperto. */
  public async refreshFlow(): Promise<void> {
    const faqKbId = this.dashboardService.id_faq_kb;
    if (!faqKbId) { return; }
    await this.rebuildFlow(faqKbId);
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
    this.dataTableService.initialize(serverBaseURL, this.project._id)
    this.openaiService.initialize(serverBaseURL, this.project._id)
    this.whatsappService.initialize(whatsappBaseUrl, this.project._id)
    this.webhookService.initialize(serverBaseURL, this.project._id);
    this.uploadService.initialize(this.project._id);

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
