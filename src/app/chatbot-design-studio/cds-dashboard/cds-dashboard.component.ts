
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import {
  ActivatedRoute, Event as RouterEvent, NavigationCancel, NavigationEnd, NavigationError, Router
} from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
// import { TranslateService } from '@ngx-translate/core';

// SERVICES //
import { DashboardService } from 'src/app/services/dashboard.service';
import { AiService } from 'src/app/services/ai.service';
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
import { StageService, DEFAULT_PANELS_STATE } from 'src/app/chatbot-design-studio/services/stage.service';
import { ReadOnlyService, isReadOnlyRoute } from 'src/app/services/read-only.service';
import { WebhookService } from '../services/webhook-service.service';
import { UploadService } from 'src/chat21-core/providers/abstract/upload.service';
import { AgentChatHostService } from '../agent-chat/agent-chat-host.service';
import { IntentService } from '../services/intent.service';
import { LeftPanelStateService, LeftPanelTab } from '../services/left-panel-state.service';
import { TranslateService } from '@ngx-translate/core';
import { AgentFromPromptService } from '../agent-chat/agent-chat-from-prompt.service';
const swal = require('sweetalert');


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
  /** La chat ha una colonna sua, che si apre insieme a una delle tre schede e non al loro posto.
   *  Il pannello resta montato comunque -- vedi il commento nel template. */
  get IS_OPEN_PANEL_AGENT_CHAT(): boolean {
    return this.leftPanelState.isChatOpen;
  }

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
  /** Sola lettura: niente header, niente sidebar, banner sempre in vista. */
  IS_READ_ONLY: boolean = false;
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
    private readonly changeDetectorRef: ChangeDetectorRef,
    // In coda di proposito: agent-chat-flow-switch.spec.ts costruisce il componente a mano con
    // argomenti posizionali, quindi i servizi aggiunti dopo vanno appesi qui e non in mezzo.
    private aiService: AiService,
    private readonly readOnlyService: ReadOnlyService,
    private readonly leftPanelState: LeftPanelStateService,
    // I due facoltativi restano in fondo, e non e' una preferenza: in TypeScript un parametro
    // obbligatorio non puo' seguirne uno facoltativo, quindi spostarli piu' su non compila.
    private readonly agentFromPromptService?: AgentFromPromptService,
    private readonly translate?: TranslateService
  ) {
    this.manageRouteChanges();
  }

  /** An agent just created from a description in the dashboard: start the build before the chat
   *  opens.
   *
   *  The order is the point. The chat joins a run that is already in progress when it mounts, so
   *  the run must exist first; started afterwards, it would have nobody to execute its tools and
   *  would sit waiting. If the runtime refuses, the agent exists all the same: the chat opens
   *  anyway and the user is handed their own text back rather than being left to rewrite it. */
  /** True while the AI chat is building the agent that was just described in the dashboard.
   *
   *  Only that case, not every turn of the chat: someone typing into the chat can see it
   *  working and does not need to be told. Someone who described an agent in another page and
   *  landed on a canvas with three blocks on it has no idea why they are there, whether
   *  anything is happening, or how long to wait. */
  IS_BUILDING_FROM_PROMPT: boolean = false;
  private buildingSubscription: Subscription;

  /** Watches the chat until the build it was given comes to rest.
   *
   *  `idle` is the fact to wait for -- the chat says it once per turn, however the turn ended.
   *  But the first status can arrive before the chat has joined the run that was started for
   *  it, so an `idle` that no `busy` preceded means "not started yet", not "finished", and
   *  taking the message down on it would hide it a moment before anything appeared.
   *
   *  The timeout is the other half: if the chat never reports anything -- an old build, a
   *  failure the panel handles on its own -- a banner nobody can dismiss is worse than one
   *  that leaves too early. */
  private watchAgentBuild(): void {
    const STOP_WAITING_AFTER_MS = 5 * 60 * 1000;
    this.IS_BUILDING_FROM_PROMPT = true;
    let seenBusy = false;

    const stop = () => {
      this.IS_BUILDING_FROM_PROMPT = false;
      this.buildingSubscription?.unsubscribe();
      this.changeDetectorRef.detectChanges();
    };

    this.buildingSubscription = this.agentChatHostService.status$.subscribe((state) => {
      if (state === 'busy') { seenBusy = true; return; }
      if (seenBusy) { stop(); }
    });
    setTimeout(() => { if (this.IS_BUILDING_FROM_PROMPT) { stop(); } }, STOP_WAITING_AFTER_MS);
  }

  private async sendPendingAgentPrompt(): Promise<void> {
    const botId = this.dashboardService.selectedChatbot?._id;
    const pending = botId ? this.agentFromPromptService?.takePending(botId) : null;
    if (!pending) { return; }

    // Configured is checked after the note is taken, not before: an unconfigured studio has no
    // way to build the flow, and leaving the note behind would only make it fire on the next
    // agent opened in this tab.
    if (!this.agentChatHostService.isConfigured?.()) {
      this.logger.log('[CDS DSHBRD] a description arrived but the agent chat is not configured');
      this.handBackAgentPrompt(pending.prompt);
      return;
    }

    try {
      await this.agentFromPromptService.startRun(this.dashboardService.projectID, pending);
      this.watchAgentBuild();
    } catch (error) {
      this.logger.error('[CDS DSHBRD] agent from prompt: run not started', error);
      this.handBackAgentPrompt(pending.prompt);
    }
  }

  /** Gives the user their own words back when nothing is going to build from them.
   *
   *  The note is consumed by the time we get here -- it has to be, or it would fire again on the
   *  next agent opened in this tab. So this is the only copy left: without it the description is
   *  swallowed and the person is left to rewrite from memory something they already wrote. */
  private handBackAgentPrompt(prompt: string): void {
    swal({
      title: this.translate?.instant('CDSAgentFromPrompt.SendFailedTitle'),
      text: `${this.translate?.instant('CDSAgentFromPrompt.SendFailedText')}\n\n${prompt}`,
      icon: 'warning'
    });
  }

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
    // `route?.snapshot?` e non `route.snapshot`: il guscio viene costruito a mano in
    // alcuni test con una rotta finta, e un errore qui fermerebbe tutta
    // l'inizializzazione. Senza dati di rotta non e' la preview, quindi si modifica.
    if (isReadOnlyRoute(this.route?.snapshot?.data)) {
      this.readOnlyService.enable();
      this.IS_READ_ONLY = true;
      this.logger.log('[CDS DSHBRD] read-only: nessuna modifica verra\' salvata');
    }
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
    this.applyReadOnlyFromRoute();
    this.showChangelog = this.checkForChangelogNotify();
    this.executeAsyncFunctionsInSequence();
    // Whoever wants to move the studio to another flow of the family -- the
    // agent through open_flow, the Subagents panel through a click -- goes
    // through the same method. The panel reads it off DashboardService rather
    // than off the chat host: a side panel that navigates by asking the chat
    // to navigate would stop working the day the chat is disabled.
    this.agentChatHostService.setFlowNavigator((faqKbId) => this.openFlow(faqKbId));
    this.dashboardService.openFlow = (faqKbId) => this.openFlow(faqKbId);
    this.dashboardService.refreshFlow = () => this.refreshFlow();
    this.hideShowWidget('hide');

    /** SUBSCRIBE TO THE STATE AGENT CHAT PANEL */
    this.subscriptionAgentChatPanel = this.controllerService.isOpenAgentChatPanel$
      .subscribe((isOpen: boolean) => {
        // Il canale resta per i punti che aprono la chat da fuori (la creazione da descrizione):
        // muove la colonna della chat, che ha uno stato suo.
        if (isOpen) { this.leftPanelState.openChat(); } else { this.leftPanelState.closeChat(); }
        // Non si salva: la chat si apre a ogni ricaricamento qualunque cosa sia salvata, quindi
        // ricordarla sarebbe uno stato che nessuno interroga.
      });
  }

  ngOnDestroy() {
    // Published on an app-scoped service by an instance that is going away:
    // left behind, it would navigate through a destroyed component's router
    // and change detector.
    this.dashboardService.openFlow = null;
    this.dashboardService.refreshFlow = null;
    // The same withdrawal, for the same reason, from the other service this
    // component published a navigator on: it closes over this component's
    // router and change detector, and this component is going away. Harmless
    // today only because the chat panel's own ngOnDestroy calls detach();
    // symmetry is what keeps it harmless.
    this.agentChatHostService.clearFlowNavigator();
    // Lo studio si chiude: il prossimo agente che si apre e' un avvio, e riparte dalla chat.
    // Senza questo, uscire verso l'elenco e rientrare su un altro agente -- che non ricarica la
    // pagina -- lo aprirebbe sull'ultima scheda guardata su quello di prima.
    this.leftPanelState.restartBoot();
    this.buildingSubscription?.unsubscribe();
    if (this.subscriptionAgentChatPanel) {
      this.subscriptionAgentChatPanel.unsubscribe();
    }
    if (this.subscriptionRouteChanges) {
      this.subscriptionRouteChanges.unsubscribe();
    }
  }

  /** Decide com'e' la sinistra aprendo un agente, e cosa non toccare cambiando flusso.
   *
   *  Due eventi diversi, due regole diverse, ed e' `isBooting` a distinguerli:
   *
   *  - **ricaricare il chatbot** (refresh della pagina, o un agente aperto dall'elenco): la chat
   *    si apre sempre, qualunque cosa sia salvata -- e' da li' che si comincia a lavorare a un
   *    flusso, e ritrovarsi la colonna chiusa perche' giorni prima si era chiusa non aiuta
   *    nessuno. Le tre schede invece tornano come erano state lasciate su questo agente;
   *  - **ricostruire il canvas** (aprire un subagent, un `open_flow` chiesto dalla chat, un
   *    subagent appena creato): non si tocca niente. Lo stato vive in un servizio che dura quanto
   *    l'applicazione, non quanto il canvas, quindi "mantenere" vuol dire non intervenire. Chi
   *    apre un subagent lo fa dalla scheda dei subagent, e ritrovarsene un'altra davanti vorrebbe
   *    dire perdere l'elenco da cui si sta navigando -- proprio quando serve per tornare indietro.
   *    Vale anche per la chat: chiusa prima di spostarsi, resta chiusa.
   */
  private restoreLeftPanels(): void {
    if (!this.leftPanelState.isBooting) { return; }

    // Chiamate facoltative, come le altre su questo servizio: una preferenza che non si riesce a
    // leggere vale quanto una che non c'e'. Rinunciare ad aprire la sinistra perche' la memoria
    // non ha risposto sarebbe un guasto travestito da scelta.
    const current: any = this.dashboardService.selectedChatbot;
    const familyId = current?.subtype === 'subagent'
      ? current?.parent_id
      : this.dashboardService.id_faq_kb;
    const snapshot = this.stageService?.getLeftPanelSnapshot?.(familyId, this.dashboardService.id_faq_kb)
      || { isOpen: false, activeTab: 'subagents' as LeftPanelTab };

    this.leftPanelState.hydrate(snapshot);
    // La chat esiste solo dove e' configurata: altrove una colonna aperta sarebbe un riquadro
    // bianco, e il pulsante per riaprirla non c'e'.
    if (this.agentChatHostService.isConfigured?.()) { this.leftPanelState.openChat(); }
    else { this.leftPanelState.closeChat(); }
    this.leftPanelState.finishBoot();
  }

  onCloseAgentChat(): void {
    this.leftPanelState.closeChat();
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
    await this.rebuildFlow(faqKbId);
  }

  /** Rebuilds the canvas on the flow the route now names, without a page
   *  reload: what openFlow() does after navigating, and what refreshFlow()
   *  does on the flow already open. */
  private async rebuildFlow(faqKbId: string): Promise<void> {
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
    // Qui non si rimescola la sinistra: ricostruire il canvas non e' aprire un agente, e cosa
    // sta aperto a sinistra e' quello che l'utente sta guardando adesso. La preferenza salvata
    // descrive com'era questo agente l'ultima volta, che qui non e' la domanda.
  }

  /** Reloads the open flow in place -- its blocks, its attributes -- as a page
   *  reload would, without one. For changes made outside the canvas that the
   *  canvas must reflect, e.g. a subagent deleted while its parent is open. */
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
      // Between knowing which agent is open and opening the chat: the run has to exist before
      // the panel mounts, or the chat attaches to nothing and the description is lost.
      await this.sendPendingAgentPrompt();
      this.restoreLeftPanels();
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
    this.aiService.initialize(serverBaseURL, this.project._id)
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
