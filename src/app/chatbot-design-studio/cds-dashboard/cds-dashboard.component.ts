
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import {
  ActivatedRoute, Event as RouterEvent, NavigationCancel, NavigationEnd, NavigationError, Router
} from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
// import { TranslateService } from '@ngx-translate/core';

// SERVICES //
import { DashboardService } from 'src/app/services/dashboard.service';
import { ControllerService } from '../services/controller.service';

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
import { StageService } from 'src/app/chatbot-design-studio/services/stage.service';
import { WebhookService } from '../services/webhook-service.service';
import { UploadService } from 'src/chat21-core/providers/abstract/upload.service';
import { AgentChatHostService } from '../agent-chat/agent-chat-host.service';
import { IntentService } from '../services/intent.service';

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

  /** panel agent chat -- mounted here (not in cds-canvas) so it survives a
   *  canvas rebuild on flow switch; see cds-dashboard.component.html. */
  private subscriptionAgentChatPanel: Subscription;
  IS_OPEN_PANEL_AGENT_CHAT: boolean = false;

  /** Gates the chat panel to the blocks section. It reads only the URL's last
   *  segment, which a flow switch leaves as 'blocks', so it cannot flicker
   *  across a flow rebuild: it only flips when the user leaves or re-enters
   *  the blocks route entirely.
   *
   *  Driven by *completed* navigation, not by NavigationStart. Every child
   *  section is `loadChildren` and the parent route carries AuthGuard and
   *  RoleGuard, so a NavigationStart is only an intention: a guard can reject
   *  it and a lazy chunk can fail to load. Gating on the intention destroys
   *  this panel -- and the iframe, the conversation and any tool call in
   *  flight with it -- for a navigation that then never happens, leaving the
   *  user still on `blocks` with the chat gone and nothing to bring it back.
   *  cds-header.component.ts has the same shape, where the same weakness only
   *  hides a button until the next navigation. */
  private subscriptionRouteChanges: Subscription;
  isBlockSectionActive: boolean = true;

  /** Gates the router-outlet -- and nothing else -- so a flow switch can
   *  destroy and rebuild whatever the outlet holds. The chat panel is its
   *  sibling on purpose: inside this gate every switch would take the iframe,
   *  and the conversation in it, with the canvas. */
  flowVisible: boolean = true;

  
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
    private router: Router,
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
    private readonly controllerService: ControllerService,
    private readonly agentChatHostService: AgentChatHostService,
    private readonly intentService: IntentService,
    private readonly changeDetectorRef: ChangeDetectorRef
  ) {
    this.manageRouteChanges();
  }

  /** Checks the current route once at construction time (the initial load may
   *  already be on a non-blocks section), then recomputes isBlockSectionActive
   *  from `router.url` every time a navigation *settles* -- completed
   *  (NavigationEnd), rejected by a guard or redirected (NavigationCancel), or
   *  failed to load its chunk (NavigationError).
   *
   *  Recomputed from `router.url` rather than from the event's own url so all
   *  three cases read the same source: after a NavigationEnd it is the URL
   *  just reached, and after a cancel or an error it is the URL the studio is
   *  still on -- which is precisely the answer the gate needs in that case.
   *
   *  A flow switch DOES raise these events -- openFlow() below navigates the
   *  router -- and cannot flicker this value, because only the URL's last
   *  segment is read and `:faqkbid` sits on the parent route: the last segment
   *  is 'blocks' before and after the switch, so this never observably passes
   *  through false and the chat panel is never destroyed. */
  private manageRouteChanges() {
    this.isBlockSectionActive = this.isBlocksUrl(this.router.url);

    this.subscriptionRouteChanges = this.router.events
      .pipe(filter((event: RouterEvent) =>
        event instanceof NavigationEnd
        || event instanceof NavigationCancel
        || event instanceof NavigationError))
      .subscribe(() => {
        this.isBlockSectionActive = this.isBlocksUrl(this.router.url);
      });
  }

  /** The blocks section is the URL whose last segment is 'blocks'. */
  private isBlocksUrl(url: string): boolean {
    return (url || '').split('?')[0].split('/').slice(-1)[0] === 'blocks';
  }

  ngOnInit() {
    // ---------------------------------------
    // Changelog alert
    // ---------------------------------------
    this.showChangelog = this.checkForChangelogNotify();
    this.executeAsyncFunctionsInSequence();
    // Whoever wants to move the studio to another flow of the family -- the
    // agent through open_flow, the Subagents panel through a click -- goes
    // through the same method. The panel reads it off DashboardService rather
    // than off the chat host: a side panel that navigates by asking the chat
    // to navigate would stop working the day the chat is disabled.
    this.agentChatHostService.setFlowNavigator((faqKbId) => this.openFlow(faqKbId));
    this.dashboardService.openFlow = (faqKbId) => this.openFlow(faqKbId);
    this.hideShowWidget('hide');

    /** SUBSCRIBE TO THE STATE AGENT CHAT PANEL */
    this.subscriptionAgentChatPanel = this.controllerService.isOpenAgentChatPanel$
      .subscribe((isOpen: boolean) => { this.IS_OPEN_PANEL_AGENT_CHAT = isOpen; });
  }

  ngOnDestroy() {
    // Published on an app-scoped service by an instance that is going away:
    // left behind, it would navigate through a destroyed component's router
    // and change detector.
    this.dashboardService.openFlow = null;
    // The same withdrawal, for the same reason, from the other service this
    // component published a navigator on: it closes over this component's
    // router and change detector, and this component is going away. Harmless
    // today only because the chat panel's own ngOnDestroy calls detach();
    // symmetry is what keeps it harmless.
    this.agentChatHostService.clearFlowNavigator();
    if (this.subscriptionAgentChatPanel) {
      this.subscriptionAgentChatPanel.unsubscribe();
    }
    if (this.subscriptionRouteChanges) {
      this.subscriptionRouteChanges.unsubscribe();
    }
  }

  /** Open another flow of this family without reloading the page.
   *
   *  The canvas is destroyed and rebuilt rather than re-initialised in place.
   *  It owns stage, connectors, undo stack, selection and drag listeners, and
   *  its own initialize() already builds every one of them from an id_faq_kb;
   *  a reset-by-hand path would have to remember each (stage.service.ts alone
   *  reads the flow id in thirty places), and a forgotten one does not raise
   *  -- it draws the new flow with the old flow's connectors.
   *
   *  Resolves only once the new canvas exists, because the agent's next act
   *  after open_flow is a get_flow. */
  public async openFlow(faqKbId: string): Promise<void> {
    if (!faqKbId || faqKbId === this.dashboardService.id_faq_kb) { return; }
    // The URL is part of the state: a manual refresh, or the back button,
    // must land where the user actually is.
    const navigated = await this.router.navigate(
      ['project', this.dashboardService.projectID, 'chatbot', faqKbId, 'blocks']);
    if (!navigated) {
      // AuthGuard and RoleGuard sit on this route, and a redirect cancels a
      // navigation too: navigate() then resolves false and the studio is
      // still on the old flow. Rebuilding the canvas and returning normally
      // would report a move that did not happen -- the one outcome worse
      // than refusing, because the agent then patches what it did not open.
      throw new Error(
        `Could not open "${faqKbId}": the studio refused to navigate to it. `
        + `The open flow is still "${this.dashboardService.id_faq_kb}".`);
    }
    // The canvas has moved, so nothing on the studio's undo stack belongs to
    // the flow now open. Left in place, the canvas's own Ctrl+Z (and the
    // toolbar control driven by behaviorUndoRedo) would pop an entry holding
    // the PREVIOUS flow's intents and hand them to restoreIntent(), which
    // inserts them into this one -- each still carrying its old id_faq_kb,
    // which IntentService.updateIntent copies into the payload of the next
    // write that touches it. That write then persists into the other chatbot
    // while the chat host's guard, which compares tool-level ids, sees
    // nothing wrong. FlowOpsService refuses its own Undo across a switch; the
    // canvas's controls are closed here, at the same event.
    this.intentService.arrayUNDO = [];
    this.intentService.arrayREDO = [];
    this.intentService.behaviorUndoRedo.next({ undo: false, redo: false });
    // And the chat panel drops the Undo it was offering, so it stops offering
    // one that would now be refused.
    this.agentChatHostService.notifyFlowSwitched(faqKbId);
    // `route.params` is still subscribed from getUrlParams(), so setParams()
    // has already run for the new id by the time navigate() resolves.
    this.flowVisible = false;
    // Not cosmetic, and the reason this method is not four plain statements:
    // false and true set in the same turn collapse into one change-detection
    // pass, the *ngIf never sees false, and the canvas is reused with the old
    // flow's stage still on it -- which looks correct until the second switch.
    // detectChanges() forces the destruction to happen here, before the load.
    this.changeDetectorRef.detectChanges();
    try {
      await this.dashboardService.getBotById();
      this.selectedChatbot = this.dashboardService.selectedChatbot;
      // The canvas loads the intents itself -- but fire-and-forget from its
      // own ngOnInit, and only after an HTTP round trip. Until that lands,
      // IntentService.listOfIntents (what get_flow reads) still holds the
      // PREVIOUS flow's blocks, and nothing clears it on destroy. Resolving
      // before then hands the agent the new id with the old intents, and
      // apply_flow_patch compares only the id, so the guard would pass and
      // the batch would be written to the new flow with the old flow's
      // intent ids. Loading them here costs one duplicate GET on an explicit
      // switch, and makes that window impossible instead of merely short.
      await this.intentService.getAllIntents(this.dashboardService.id_faq_kb);
    } catch (error) {
      // id_faq_kb has already moved to the new flow, while listOfIntents still
      // holds the previous flow's blocks -- the exact pairing the awaited load
      // above exists to make impossible. Telling the agent to "read it with
      // get_flow" would hand it the new id with the old flow's intents, and a
      // patch declaring the new id then passes the host's guard and writes the
      // old flow's intent ids into the new flow. Emptying the list makes
      // get_flow answer with an empty flow -- wrong only in that it is
      // incomplete, and unusable for a patch either way -- instead of another
      // flow's contents presented as this one's.
      this.intentService.listOfIntents = [];
      this.intentService.prevListOfIntent = [];
      // Both getBotById() and getAllIntents() reject with the bare value
      // `false`, not an Error. Passed through, the agent is handed a tool
      // failure with no message at all; this is the only text it ever sees.
      throw new Error(
        `Opened "${faqKbId}" but could not load it`
        + `${error instanceof Error ? ': ' + error.message : ''}. `
        + `The flow is not readable in this state -- do not patch anything; `
        + `open it again with open_flow.`);
    } finally {
      // In `finally`, not because the studio would otherwise be stranded --
      // DashboardService sends a bot it cannot load to project/unauthorized
      // -- but because that navigation is asynchronous and a guard can
      // cancel it, and a canvas left hidden here would then be a studio with
      // no canvas and no error on screen.
      //
      // The canvas reads selectedChatbot and id_faq_kb in its own ngOnInit,
      // so it may only come back now that both name the new flow. Detected
      // here too, so this promise resolves with the canvas already rebuilt --
      // the agent's next act after open_flow is a get_flow.
      this.flowVisible = true;
      this.changeDetectorRef.detectChanges();
    }
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
