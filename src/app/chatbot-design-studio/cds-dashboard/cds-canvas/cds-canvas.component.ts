import { Component, OnInit, ViewChild, ElementRef, HostListener, Input, ChangeDetectorRef, AfterViewInit, NgZone } from '@angular/core';
import { Observable, Subscription, skip, firstValueFrom, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { TranslateService } from '@ngx-translate/core';

// SERVICES
import { IntentService } from '../../services/intent.service';
import { StageService } from '../../services/stage.service';
import { ConnectorService } from '../../services/connector.service';
import { ControllerService } from '../../services/controller.service';
import { DashboardService } from 'src/app/services/dashboard.service';
import { NoteService } from 'src/app/services/note.service';
import { NoteResizeStateService } from './note-resize-state.service';

// MODEL //
import { Intent, Form } from 'src/app/models/intent-model';
import { Button, Action} from 'src/app/models/action-model';
import { Note } from 'src/app/models/note-model';
import { NoteType } from 'src/app/models/note-types';
import { Chatbot } from 'src/app/models/faq_kb-model';

// UTILS //
import { INTENT_COLORS, RESERVED_INTENT_NAMES, TYPE_INTENT_ELEMENT, TYPE_OF_MENU, INTENT_TEMP_ID, OPTIONS, STAGE_SETTINGS, TYPE_INTENT_NAME } from '../../utils';
import { LOGOS_ITEMS } from './../../utils-resources';
import { TYPE_CHATBOT } from 'src/app/chatbot-design-studio/utils-actions';

import { storage } from 'firebase';
import { LogService } from 'src/app/services/log.service';
import { WebhookService } from '../../services/webhook-service.service';

// CORE
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';

@Component({
  selector: 'cds-canvas',
  templateUrl: './cds-canvas.component.html',
  styleUrls: ['./cds-canvas.component.scss']
})
export class CdsCanvasComponent implements OnInit, AfterViewInit {

  // ============================================================
  // VIEW CHILDREN & INPUTS
  // ============================================================
  @ViewChild('receiver_elements_dropped_on_stage', { static: false }) receiverElementsDroppedOnStage: ElementRef;
  @ViewChild('drawer_of_items_to_zoom_and_drag', { static: false }) drawerOfItemsToZoomAndDrag: ElementRef;
  @ViewChild('cdsOptions') cdsOptions: any;

  @Input() onHeaderTestItOut: Observable<Intent>;

  // ============================================================
  // DOM EVENT LISTENERS
  // ============================================================
  listnerConnectorDrawn: (e: CustomEvent) => void;
  listnerMovedAndScaled: (e: CustomEvent) => void;
  listnerKeydown: (e: KeyboardEvent) => void;
  listnerConnectorSelected: (e: CustomEvent) => void;
  listnerConnectorDeselected: (e: CustomEvent) => void;
  listnerConnectorUpdated: (e: CustomEvent) => void;
  listnerConnectorDeleted: (e: CustomEvent) => void;
  listnerConnectorCreated: (e: CustomEvent) => void;
  listnerConnectorDraftReleased: (e: CustomEvent) => void;
  listnerEndDragging: (e: CustomEvent) => void;
  listnerDragged: (e: CustomEvent) => void;
  listnerStartDragging: (e: CustomEvent) => void;

  // ============================================================
  // ROUTE PARAMS
  // ============================================================
  blockId: string | null = null;
  blockName: string | null = null;

  // ============================================================
  // CHATBOT & PROJECT DATA
  // ============================================================
  id_faq_kb: string;
  chatbotSubtype: string;
  selectedChatbot: Chatbot;
  projectID: string;

  // ============================================================
  // CONSTANTS
  // ============================================================
  TYPE_OF_MENU = TYPE_OF_MENU;
  TYPE_INTENT_NAME = TYPE_INTENT_NAME;
  LOGOS_ITEMS = LOGOS_ITEMS;

  // ============================================================
  // INTENTS & EVENTS
  // ============================================================
  listOfIntents: Array<Intent> = [];
  listOfEvents: Array<Intent> = [];
  hasClickedAddAction: boolean = false;
  hideActionPlaceholderOfActionPanel: boolean;

  // ============================================================
  // NOTES
  // ============================================================
  listOfNotes: Array<Note> = [];
  isNoteModeActive: boolean = false;
  private pendingImageDraftNoteId: string | null = null;
  pendingAutoFocusNoteId: string | null = null;
  private saveNoteDetailTimer: any = null;
  private pendingNoteToSave: Note | null = null;

  // ============================================================
  // LOADING & RENDERING STATE
  // ============================================================
  totElementsOnTheStage: number = 0;
  countRenderedElements = 0;
  renderedAllIntents = false;
  renderedAllElements = false;
  loadingProgress = 0;
  mapOfConnectors = [];
  mapOfIntents = [];
  labelInfoLoading: string = 'Loading';

  // ============================================================
  // UI PANEL STATES
  // ============================================================
  IS_OPEN_INTENTS_LIST: boolean = true;
  IS_OPEN_ADD_ACTIONS_MENU: boolean = false;
  IS_OPEN_PANEL_ACTION_DETAIL: boolean = false;
  IS_OPEN_PANEL_BUTTON_CONFIG: boolean = false;
  IS_OPEN_PANEL_WIDGET: boolean = false;
  IS_OPEN_PANEL_CONNECTOR_MENU: boolean = false;
  IS_OPEN_CONTEXT_MENU: boolean = false;
  IS_OPEN_COLOR_MENU: boolean = false;
  IS_OPEN_WIDGET_LOG: boolean = false;
  IS_OPEN_PANEL_INTENT_DETAIL: boolean = false;
  IS_OPEN_PANEL_NOTE_DETAIL: boolean = false;
  IS_OPEN_PUBLISH_PANEL: boolean = false;

  // ============================================================
  // UI POSITIONS & SELECTED ELEMENTS
  // ============================================================
  positionFloatMenu: any = { 'x': 0, 'y': 0 };
  elementIntentSelected: any;
  buttonSelected: any;
  connectorSelected: any;
  mousePosition: any;
  positionContextMenu: any = { 'x': 0, 'y': 0 };
  positionColortMenu: any = { 'x': 0, 'y': 0 };
  noteSelected: Note;
  startDraggingPosition: any = null;
  mesage_request_id: string;
  testitOutFirstClick: boolean = false;
  stateUndoRedo: any = { undo: false, redo: false };

  // ============================================================
  // SUBSCRIPTIONS
  // ============================================================
  private subscriptionListOfIntents: Subscription;
  private subscriptionChangedConnectorAttributes: Subscription;
  private subscriptionOpenAddActionMenu: Subscription;
  private subscriptionOpenDetailPanel: Subscription;
  private subscriptionOpenButtonPanel: Subscription;
  private subscriptionOpenWidgetPanel: Subscription;
  private subscriptionWidgetLoaded: Subscription;
  private subscriptionUndoRedo: Subscription;
  private subscriptionTogglePublishPanelState: Subscription;

  // ============================================================
  // PRIVATE STATE
  // ============================================================
  private readonly logger: LoggerService = LoggerInstance.getInstance();
  private readonly unsubscribe$: Subject<any> = new Subject<any>();
  private debounceTimeout: any;
  /** rAF throttle for moved-and-scaled: at most one Angular update per frame */
  private _movedAndScaledRafId: number | null = null;
  private _movedAndScaledPendingDetail: { scale: number; x: number; y: number } | null = null;

  // ============================================================
  // CONSTRUCTOR & LIFECYCLE
  // ============================================================
  constructor(
    private readonly intentService: IntentService,
    private readonly stageService: StageService,
    private readonly connectorService: ConnectorService,
    private readonly controllerService: ControllerService,
    private readonly translate: TranslateService,
    public dashboardService: DashboardService,
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly route: ActivatedRoute,
    public appStorageService: AppStorageService,
    public logService: LogService,
    public webhookService: WebhookService,
    private readonly noteService: NoteService,
    private readonly ngZone: NgZone,
    public noteResizeState: NoteResizeStateService
  ) {
    this.setSubscriptions();
    this.setListnerEvents();
  }

  ngOnInit(): void {
    this.logger.log("[CDS-CANVAS]  •••• ngOnInit ••••");
    this.getParamsFromURL();
    this.initialize();
  }

  ngAfterViewInit() {
    this.logger.log("[CDS-CANVAS]  •••• ngAfterViewInit ••••");
    this.stageService.initializeStage(this.id_faq_kb);
    if (this.stageService.settings?.open_intent_list_state != null) {
      this.IS_OPEN_INTENTS_LIST = this.stageService.settings.open_intent_list_state;
    }

    this.stageService.setDrawer();
    this.connectorService.initializeConnectors();
    this.changeDetectorRef.detectChanges();

    setTimeout(() => {
      this.showStageForLimitTime();
    }, 20000);
  }

  ngOnDestroy() {
    this.unsubscribe();
    this.connectorService.clearRetryQueue();

    if (this.saveNoteDetailTimer) {
      clearTimeout(this.saveNoteDetailTimer);
      this.saveNoteDetailTimer = null;
    }

    if (this.pendingNoteToSave) {
      this.executeSaveNoteDetail();
    }

    if (this.subscriptionWidgetLoaded) {
      this.subscriptionWidgetLoaded.unsubscribe();
    }

    document.removeEventListener("connector-drawn", this.listnerConnectorDrawn, false);
    document.removeEventListener("moved-and-scaled", this.listnerMovedAndScaled, false);
    document.removeEventListener("start-dragging", this.listnerStartDragging, false);
    document.removeEventListener("keydown", this.listnerKeydown, false);
    document.removeEventListener("connector-selected", this.listnerConnectorSelected, false);
    document.removeEventListener("connector-deselected", this.listnerConnectorDeselected, false);
    document.removeEventListener("connector-updated", this.listnerConnectorUpdated, false);
    document.removeEventListener("connector-deleted", this.listnerConnectorDeleted, false);
    document.removeEventListener("connector-created", this.listnerConnectorCreated, false);
    document.removeEventListener("connector-draft-released", this.listnerConnectorDraftReleased, false);
    document.removeEventListener("end-dragging", this.listnerEndDragging, false);
    document.removeEventListener("dragged", this.listnerDragged, false);
  }

  // ============================================================
  // PRIVATE INITIALIZATION METHODS
  // ============================================================
  private unsubscribe(): void {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }

  private getParamsFromURL() {
    this.route.queryParams.subscribe(params => {
      this.blockId = params['blockid'];
      this.blockName = params['blockname'];
    });
  }

  private async initialize() {
    this.selectedChatbot = this.dashboardService.selectedChatbot;
    this.projectID = this.dashboardService.projectID;
    this.id_faq_kb = this.dashboardService.id_faq_kb;
    this.listOfIntents = [];

    this.connectorService.clearRetryQueue();

    let getAllIntents = await this.intentService.getAllIntents(this.id_faq_kb);
    if (getAllIntents) {
      this.listOfIntents = this.intentService.listOfIntents;
      this.refreshIntents();
      this.initLoadingStage();
      this.mapOfIntents = await this.intentService.setMapOfIntents();
      this.mapOfConnectors = await this.connectorService.setMapOfConnectors(this.listOfIntents);
      const numIntents = Object.values(this.mapOfIntents).length;
      const numConnectors = Object.values(this.mapOfConnectors).length;
      this.totElementsOnTheStage = numIntents + numConnectors;
      this.logger.log('[CDS-CANVAS] totElementsOnTheStage ::', this.stageService.loaded, numIntents, numConnectors);
    }

    let copyPasteTEMP = JSON.parse(localStorage.getItem('copied_items'));
    this.logger.log('[CDS-CANVAS]  copyPasteTEMP', copyPasteTEMP);
    if (copyPasteTEMP) {
      this.intentService.arrayCOPYPAST = copyPasteTEMP['copy'];
    }

    this.chatbotSubtype = this.dashboardService.selectedChatbot.subtype ? this.dashboardService.selectedChatbot.subtype : TYPE_CHATBOT.CHATBOT;

    const rawNotes = this.dashboardService.selectedChatbot.attributes?.notes || [];
    this.listOfNotes = rawNotes.map((n: any) => {
      if (!n) return n;
      const t = n.type;
      if (t === 'image' || t === 'video') {
        return { ...n, type: 'media' };
      }
      return n;
    });
  }

  private setSubscriptions() {
    this.subscriptionChangedConnectorAttributes = this.connectorService.observableChangedConnectorAttributes
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((connector: any) => {
        this.logger.log('[CDS-CANVAS] --- AGGIORNATO connettore ', connector);
      });

    this.subscriptionUndoRedo = this.intentService.behaviorUndoRedo
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((undoRedo: any) => {
        this.logger.log('[cds-panel-intent-list] --- AGGIORNATO undoRedo ', undoRedo);
        if (undoRedo) {
          this.stateUndoRedo = undoRedo;
        }
      });

    this.subscriptionListOfIntents = this.intentService.getIntents()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(intents => {
        this.logger.log("[CDS-CANVAS] --- AGGIORNATO ELENCO INTENTS", intents);
        if (intents.length > 0) {
          this.listOfIntents = intents;
        }
      });

    this.subscriptionOpenDetailPanel = this.controllerService.isOpenActionDetailPanel$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((element: { type: TYPE_INTENT_ELEMENT, element: Action | string | Form }) => {
        this.elementIntentSelected = element;
        if (element.type) {
          this.closeAllPanels();
          this.IS_OPEN_PANEL_ACTION_DETAIL = true;
          this.intentService.inactiveIntent();
          this.removeConnectorDraftAndCloseFloatMenu();
        } else {
          this.IS_OPEN_PANEL_ACTION_DETAIL = false;
        }
        this.logger.log('[CDS-CANVAS]  isOpenActionDetailPanel ', element, this.IS_OPEN_PANEL_ACTION_DETAIL);
      });

    this.subscriptionOpenButtonPanel = this.controllerService.isOpenButtonPanel$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((button: Button) => {
        this.buttonSelected = button;
        this.logger.log('[CDS-CANVAS]  isOpenButtonPanel ', button);

        if (button) {
          this.closeAllPanels();
          this.closeActionDetailPanel();
          this.removeConnectorDraftAndCloseFloatMenu();
          setTimeout(() => {
            this.IS_OPEN_PANEL_BUTTON_CONFIG = true;
          }, 0);
        } else {
          this.IS_OPEN_PANEL_BUTTON_CONFIG = false;
        }
      });

    this.subscriptionOpenAddActionMenu = this.controllerService.isOpenAddActionMenu$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((menu: any) => {
        if (menu) {
          this.closeAllPanels();
          this.closeActionDetailPanel();
        } else {
          this.IS_OPEN_ADD_ACTIONS_MENU = false;
        }
      });

    this.subscriptionOpenWidgetPanel = this.intentService.BSTestItOut.pipe(
      skip(1),
      takeUntil(this.unsubscribe$)
    ).subscribe((intent) => {
      this.logger.log("[CDS-CANVAS] ******* BSTestItOut ", intent);
      if (intent) {
        this.onTestItOut(intent);
        this.IS_OPEN_WIDGET_LOG = true;
      } else {
        this.logger.log('[CDS-CANVAS] CLOSE TEST IT OUT');
        this.IS_OPEN_PANEL_WIDGET = false;
      }
    });

    this.subscriptionTogglePublishPanelState = this.controllerService.isOpenPublishPanel$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((event: any) => {
        this.logger.log("[CDS-CANVAS] has opened Publish panel ", event);
        this.logger.log("[CDS-CANVAS] has opened Publish IS_OPEN_PUBLISH_PANEL ", this.IS_OPEN_PUBLISH_PANEL);

        if (event) {
          this.closeAllPanels();
          this.closeActionDetailPanel();
          this.removeConnectorDraftAndCloseFloatMenu();
          setTimeout(() => {
            this.IS_OPEN_PUBLISH_PANEL = true;
          }, 0);
        } else {
          this.IS_OPEN_PUBLISH_PANEL = false;
        }
      });
  }

  private setListnerEvents() {
    this.listnerConnectorDrawn = this.onConnectorDrawn.bind(this);
    document.addEventListener("connector-drawn", this.listnerConnectorDrawn, false);

    this.listnerConnectorCreated = this.onConnectorCreated.bind(this);
    document.addEventListener("connector-created", this.listnerConnectorCreated, false);

    this.listnerConnectorDeleted = this.onConnectorDeleted.bind(this);
    document.addEventListener("connector-deleted", this.listnerConnectorDeleted, false);

    this.listnerConnectorUpdated = this.onConnectorUpdated.bind(this);
    document.addEventListener("connector-updated", this.listnerConnectorUpdated, false);

    this.listnerConnectorSelected = this.onConnectorSelected.bind(this);
    document.addEventListener("connector-selected", this.listnerConnectorSelected, false);

    this.listnerConnectorDeselected = this.onConnectorDeselected.bind(this);
    document.addEventListener('connector-deselected', this.listnerConnectorDeselected, false);

    this.listnerConnectorDraftReleased = this.onConnectorDraftReleased.bind(this);
    document.addEventListener("connector-draft-released", this.listnerConnectorDraftReleased, false);

    // moved-and-scaled: listener registrato fuori dalla zona Angular (runOutsideAngular) così
    // il handler non scatena il change detection a ogni evento di pan/zoom; gli aggiornamenti
    // Angular avvengono al massimo una volta per frame tramite batching rAF in onMovedAndScaled.
    this.listnerMovedAndScaled = this.onMovedAndScaled.bind(this);
    this.ngZone.runOutsideAngular(() => {
      document.addEventListener("moved-and-scaled", this.listnerMovedAndScaled, false);
    });

    this.listnerStartDragging = this.onStartDragging.bind(this);
    document.addEventListener("start-dragging", this.listnerStartDragging, false);

    this.listnerDragged = this.onDragged.bind(this);
    document.addEventListener("dragged", this.listnerDragged, false);

    this.listnerEndDragging = this.onEndDragging.bind(this);
    document.addEventListener("end-dragging", this.listnerEndDragging, false);

    this.listnerKeydown = this.onKeydown.bind(this);
    document.addEventListener("keydown", this.listnerKeydown, false);
  }

  // ============================================================
  // LOADING & RENDERING METHODS
  // ============================================================
  initLoadingStage() {
    this.stageService.loaded = false;
    this.totElementsOnTheStage = 0;
    this.countRenderedElements = 0;
    this.renderedAllIntents = false;
    this.renderedAllElements = false;
    this.loadingProgress = 0;
    this.mapOfConnectors = [];
    this.mapOfIntents = [];
    this.labelInfoLoading = 'Loading';
    this.logger.log("[CDS-CANVAS]  initLoadingStage ••••", this.stageService.loaded);
  }

  onIntentRendered(intentID) {
    if (this.stageService.loaded === false && this.renderedAllElements === false) {
      this.labelInfoLoading = 'CDSCanvas.intentsProgress';
      if (this.mapOfIntents[intentID]) {
        this.mapOfIntents[intentID].shown = 'true';
        this.countRenderedElements++;
        this.loadingProgress += (this.countRenderedElements / this.totElementsOnTheStage) * 100;
      }
      this.logger.log("[CDS-CANVAS3] •••• onIntentRendered •••• ", intentID, this.countRenderedElements);
      const allShownTrue = Object.values(this.mapOfIntents).every(intent => intent.shown === 'true');
      if (allShownTrue) {
        this.onAllIntentsRendered();
      }
    }
  }

  async onAllIntentsRendered() {
    this.labelInfoLoading = 'CDSCanvas.intentsComplete';
    this.logger.log("[CDS-CANVAS]  •••• Tutti i cds-intent sono stati renderizzati ••••", this.countRenderedElements);

    setTimeout(() => {
      requestAnimationFrame(() => {
        this.logger.log("[CDS-CANVAS]  •••• Inizio disegno connettori dopo rendering completo ••••");
        this.connectorService.createConnectors(this.listOfIntents);
        this.renderedAllIntents = true;
      });
    }, 100);
  }

  checkAllConnectors(connector) {
    this.logger.log("[CDS-CANVAS]  •••• checkAllConnectors ••••", connector, this.mapOfConnectors);
    if (this.stageService.loaded === false && this.renderedAllElements === false) {
      this.labelInfoLoading = 'CDSCanvas.connectorsProgress';
      if (this.mapOfConnectors[connector.id] && this.mapOfConnectors[connector.id].shown !== 'true') {
        this.mapOfConnectors[connector.id].shown = 'true';
        this.countRenderedElements++;
        this.loadingProgress += (this.countRenderedElements / this.totElementsOnTheStage) * 100;
        this.logger.log("[CDS-CANVAS]  •••• E' stato creato un nuovo connettore verifico ••••", this.mapOfConnectors[connector.id], connector.id, this.countRenderedElements);
      }
    }
    this.checkAndShowStage();
  }

  private checkAndShowStage() {
    if (this.stageService.loaded === false) {
      const allShownTrue = Object.values(this.mapOfConnectors).every(connector => connector.shown !== 'false');
      this.logger.log("[CDS-CANVAS]  •••• checkAndshowStage", this.mapOfConnectors, allShownTrue);
      if (allShownTrue) {
        this.stageService.loaded = true;
        this.loadingProgress = 100;
        this.renderedAllElements = true;
        this.labelInfoLoading = 'CDSCanvas.connectorsComplete';
        this.logger.log("[CDS-CANVAS]  •••• Tutti i connettori sono stati renderizzati ••••", this.countRenderedElements, this.renderedAllElements);
        setTimeout(() => {
          this.settingStage();
        }, 100);
      }
    }
  }

  private settingStage() {
    if (this.stageService.settings?.zoom) {
      this.connectorService.setScale(this.stageService.settings?.zoom);
      this.logger.log("[CDS-CANVAS]  •••• imposto scala dei connettori ••••", this.stageService.settings?.zoom);
    }

    this.stageService.setAlphaConnectorsByLocalStorage();
    this.logger.log("[CDS-CANVAS]  •••• imposto alpha ••••: ");

    if (this.stageService.settings?.position) {
      this.logger.log("[CDS-CANVAS]  •••• imposto position ••••: ", this.stageService);
      this.stageService.setPositionByLocalStorage();
    } else {
      this.logger.log("[CDS-CANVAS]  •••• se è la prima volta che carico il bot quindi this.stageService.settings.position non esiste ••••:: ", this.blockId, this.blockName);
      this.intentService.setStartIntent();
    }
  }

  private showStageForLimitTime() {
    this.labelInfoLoading = 'CDSCanvas.loadingCompleteWithErrors';
    this.stageService.loaded = true;
    this.loadingProgress = 100;
    this.renderedAllElements = true;
  }

  // ============================================================
  // DOM EVENT HANDLERS
  // ============================================================
  private onConnectorDrawn(e: CustomEvent): void {
    const connector = e.detail.connector;
    this.setConnectorColor(connector);
    this.checkAllConnectors(connector);
  }

  private onConnectorCreated(e: CustomEvent): void {
    this.logger.log("[CDS-CANVAS] connector-created:", e);
    const connector = e.detail.connector;
    connector['created'] = true;
    delete connector['deleted'];
    this.connectorService.addConnectorToList(connector);
    this.intentService.onChangedConnector(connector);
  }

  private onConnectorDeleted(e: CustomEvent): void {
    this.logger.log("[CDS-CANVAS] connector-deleted:", e);
    const connector = e.detail.connector;
    connector['deleted'] = true;
    delete connector['created'];
    this.connectorService.deleteConnectorToList(connector.id);
    this.intentService.onChangedConnector(connector);
    this.IS_OPEN_PANEL_CONNECTOR_MENU = false;
  }

  private onConnectorUpdated(e: CustomEvent): void {
    this.logger.log("[CDS-CANVAS] connector-updated:", e);
    const connector = e.detail.connector;
    connector['updated'] = true;
    this.intentService.onChangedConnector(connector);
  }

  private onConnectorDeselected(e: CustomEvent): void {
    // Gestisce la deselezione del connettore
  }

  private onConnectorSelected(e: CustomEvent): void {
    this.closeAllPanels();
    this.closeActionDetailPanel();
    this.setConnectorSelected(e.detail.connector.id);
    this.IS_OPEN_PANEL_CONNECTOR_MENU = true;
    this.mousePosition = e.detail.mouse_pos;
    this.mousePosition.x -= -10;
    this.mousePosition.y -= 25;
    this.intentService.unselectAction();
  }

  private onStartDragging(e: CustomEvent): void {
    const el = e.detail.element;
    if (el.classList.contains('cds-note')) {
      return;
    }
    this.logger.log('[CDS-CANVAS] start-dragging ', el);
    this.removeConnectorDraftAndCloseFloatMenu();
    this.intentService.setIntentSelectedById(el.id);
    this.startDraggingPosition = { x: el.offsetLeft, y: el.offsetTop };
    el.style.zIndex = 2;
  }

  private onDragged(e: CustomEvent): void {
    const el = e.detail.element;
    if (el.classList.contains('cds-note')) {
      return;
    }
    const x = e.detail.x;
    const y = e.detail.y;
    this.connectorService.moved(el, x, y);
    this.intentService.setIntentSelectedPosition(el.offsetLeft, el.offsetTop);
  }

  private onEndDragging(e: CustomEvent): void {
    const el = e.detail.element;
    if (el.classList.contains('cds-note')) {
      return;
    }
    this.logger.log('[CDS-CANVAS] end-dragging ', el);
    this.logger.log('[CDS-CANVAS] end-dragging ', this.intentService.intentSelected?.attributes?.position);
    this.logger.log('[CDS-CANVAS] end-dragging ', this.startDraggingPosition);
    if (this.intentService.intentSelected) {
      const pos = this.intentService.intentSelected.attributes.position;
      const dragged = !this.startDraggingPosition ||
        (pos && (pos.x !== this.startDraggingPosition.x || pos.y !== this.startDraggingPosition.y));
      this.closeAllPanels();
      this.intentService.updateIntentSelected();
      if (!dragged) {
        this.openWebhookIntentPanel(this.intentService.intentSelected);
      }
    }
  }

  private onConnectorDraftReleased(e: CustomEvent): void {
    this.logger.log("[CDS-CANVAS] connector-draft-released :: ", e.detail);
    if (!e?.detail) {
      return;
    }
    let detail = e.detail;
    const arrayOfClass = detail.target.classList.value.split(' ');
    if (detail.target && arrayOfClass.includes("receiver-elements-dropped-on-stage") && detail.toPoint && detail.menuPoint) {
      this.logger.log("[CDS-CANVAS] ho rilasciato il connettore tratteggiato nello stage (nell'elemento con classe 'receiver_elements_dropped_on_stage') e quindi apro il float menu");
      const intentId = e.detail.fromId.split('/')[0];
      const intent = this.intentService.getIntentFromId(intentId);
      if (intent.attributes?.color) {
        detail.color = intent.attributes.color;
      } else {
        detail.color = INTENT_COLORS.COLOR1;
      }
      this.openFloatMenuOnConnectorDraftReleased(detail);
    } else {
      this.logger.log("[CDS-CANVAS] ho rilasciato in un punto qualsiasi del DS ma non sullo stage quindi non devo aprire il menu", detail);
      this.removeConnectorDraftAndCloseFloatMenu();
    }
  }

  /**
   * Handler per moved-and-scaled (pan/zoom). Esegue fuori dalla zona Angular.
   * Batching rAF: accumula l'ultimo detail e pianifica al massimo un requestAnimationFrame per frame;
   * nel callback rAF rientra in zona (ngZone.run) una sola volta per applicare scale, chiudere menu e salvare posizione.
   */
  private onMovedAndScaled(e: CustomEvent): void {
    this._movedAndScaledPendingDetail = e.detail;
    if (this._movedAndScaledRafId != null) return;
    this._movedAndScaledRafId = requestAnimationFrame(() => {
      this._movedAndScaledRafId = null;
      const detail = this._movedAndScaledPendingDetail;
      this._movedAndScaledPendingDetail = null;
      if (detail == null) return;
      this.ngZone.run(() => {
        this.connectorService.tiledeskConnectors.scale = detail.scale;
        if (this.IS_OPEN_ADD_ACTIONS_MENU || this.IS_OPEN_CONTEXT_MENU || this.IS_OPEN_COLOR_MENU || this.connectorService.connectorDraft != null) {
          this.removeConnectorDraftAndCloseFloatMenu();
        }
        clearTimeout(this.debounceTimeout);
        this.debounceTimeout = setTimeout(() => {
          this.logger.log('[CDS-CANVAS] moved-and-scaled ', detail);
          this.stageService.savePositionByPos(this.id_faq_kb, { x: detail.x, y: detail.y });
        }, 100);
      });
    });
  }

  private onKeydown(e: KeyboardEvent): void {
    this.logger.log('[CDS-CANVAS]  keydown ', e);
    var focusedElement = document.activeElement;
    if (focusedElement.tagName === 'TEXTAREA' || focusedElement.tagName === 'INPUT') {
      return;
    }
    if (this.IS_OPEN_PANEL_ACTION_DETAIL || this.IS_OPEN_PANEL_INTENT_DETAIL) {
      this.logger.log('[CDS-CANVAS] Panel is open - skipping canvas undo/redo');
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') {
      e.preventDefault();
      this.logger.log("Hai premuto Ctrl+ALT+Z (o Command+Alt+Z)!");
      this.intentService.restoreLastREDO();
    } else if ((e.ctrlKey || e.metaKey) && e.key === "z") {
      e.preventDefault();
      this.logger.log("Hai premuto Ctrl+Z (o Command+Z)!");
      this.intentService.restoreLastUNDO();
    }
  }

  @HostListener('document:click', ['$event'])
  documentClick(event: any): void {
    this.logger.log('[CDS CANVAS] DOCUMENT CLICK event: ', event.target, event);
    if (event.target.id.startsWith("cdk-drop-list-") && !event.target.className.includes('button-replies')) {
      this.removeConnectorDraftAndCloseFloatMenu();
      this.controllerService.stopTestItOut();
      this.closeAllPanels();
      this.closeActionDetailPanel();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeydownHandler(event: KeyboardEvent) {
    if (event.key === 'Escape' || event.key === 'Canc' && !this.hasClickedAddAction) {
      if (!this.hasClickedAddAction) {
        this.removeConnectorDraftAndCloseFloatMenu();
      } else {
        this.IS_OPEN_ADD_ACTIONS_MENU = false;
      }
    }
  }

  // ============================================================
  // INTENT METHODS
  // ============================================================
  getIntentPosition(intentId: string) {
    return this.intentService.getIntentPosition(intentId);
  }

  private refreshIntents() {
    this.setDragAndListnerEventToElements();
    if (this.renderedAllIntents === true) {
      this.connectorService.createConnectors(this.listOfIntents);
    }
  }

  private setDragAndListnerEventToElements() {
    this.logger.log("[CDS CANVAS] AGGIORNO ELENCO LISTNER");
    this.listOfIntents.forEach(intent => {
      this.intentService.setDragAndListnerEventToElement(intent.intent_id);
    });
  }

  setConnectorColor(connector: any) {
    const idIntentFrom = connector.id.split('/')[0];
    const intent = this.intentService.getIntentFromId(idIntentFrom);
    const color = intent?.attributes?.color ?? INTENT_COLORS.COLOR1;
    const opacity = this.stageService.getAlpha() / 100;
    this.connectorService.setConnectorColor(intent.intent_id, color, opacity);
  }

  private removeConnectorDraftAndCloseFloatMenu() {
    this.connectorService.removeConnectorDraft();
    this.IS_OPEN_ADD_ACTIONS_MENU = false;
    this.IS_OPEN_CONTEXT_MENU = false;
    this.IS_OPEN_COLOR_MENU = false;
  }

  private posCenterIntentSelected(intent) {
    if (intent?.intent_id) {
      let stageElement = document.getElementById(intent.intent_id);
      let id_faq_kb = this.dashboardService.id_faq_kb;
      this.logger.log('[CDS-CANVAS] posCenterIntentSelected: ', stageElement);
      this.stageService.centerStageOnElement(id_faq_kb, stageElement);
    }
  }

  private async deleteIntent(intent) {
    this.logger.log('[CDS-CANVAS]  deleteIntent', intent);
    this.intentService.setIntentSelectedById();
    this.intentService.deleteIntentNew(intent);
  }

  private closeAllPanels() {
    if (this.IS_OPEN_PANEL_WIDGET) {
      this.closePanelWidget();
    }
    this.IS_OPEN_PANEL_ACTION_DETAIL = false;
    this.IS_OPEN_PANEL_INTENT_DETAIL = false;
    this.IS_OPEN_PANEL_NOTE_DETAIL = false;
    this.IS_OPEN_PANEL_BUTTON_CONFIG = false;
    this.IS_OPEN_PANEL_CONNECTOR_MENU = false;
    this.IS_OPEN_CONTEXT_MENU = false;
    this.IS_OPEN_COLOR_MENU = false;
    this.IS_OPEN_PANEL_WIDGET = false;
    this.IS_OPEN_PUBLISH_PANEL = false;
  }

  private closeExtraPanels() {
    this.IS_OPEN_COLOR_MENU = false;
  }

  private closeActionDetailPanel() {
    this.IS_OPEN_PANEL_ACTION_DETAIL = false;
  }

  private openFloatMenuOnConnectorDraftReleased(detail) {
    this.logger.log("[CDS CANVAS] ho rilasciato in un punto qualsiasi dello stage e quindi apro il float menu", detail);
    this.positionFloatMenu = this.stageService.setPositionActionsMenu(detail.menuPoint);
    detail.menuPoint = this.positionFloatMenu;
    this.closeAllPanels();
    this.closeActionDetailPanel();
    this.IS_OPEN_ADD_ACTIONS_MENU = true;
    this.hasClickedAddAction = false;
    this.connectorService.createConnectorDraft(detail);
    this.logger.log('[CDS CANVAS] OPEN MENU hasClickedAddAction', this.hasClickedAddAction);
  }

  // ============================================================
  // EVENT HANDLERS - INTENT LIST
  // ============================================================
  onToogleSidebarIntentsList() {
    this.logger.log('[CDS-CANVAS] onToogleSidebarIntentsList  ');
    this.IS_OPEN_INTENTS_LIST = !this.IS_OPEN_INTENTS_LIST;
    this.removeConnectorDraftAndCloseFloatMenu();
    this.stageService.saveSettings(this.id_faq_kb, STAGE_SETTINGS.openIntentListState, this.IS_OPEN_INTENTS_LIST);
    this.logger.log('[CDS-CANVAS] onToogleSidebarIntentsList   this.IS_OPEN_INTENTS_LIST ', this.IS_OPEN_INTENTS_LIST);
  }

  onSelectIntent(intent: Intent) {
    this.logger.log('[CDS-CANVAS] onSelectIntent::: ', intent);
    if (!this.hasClickedAddAction) {
      this.removeConnectorDraftAndCloseFloatMenu();
    }
    this.intentService.setIntentSelected(intent.intent_id);
    this.posCenterIntentSelected(intent);
    this.closeAllPanels();
    this.closeActionDetailPanel();
  }

  onDeleteIntent(intent: Intent) {
    if (!this.hasClickedAddAction) {
      this.removeConnectorDraftAndCloseFloatMenu();
    }
    this.closeAllPanels();
    this.closeActionDetailPanel();
    this.deleteIntent(intent);
  }

  onChangeColorIntent(intent: Intent) {
    this.logger.log('[CDS-CANVAS] onColorIntent: ', intent.intent_id);
    this.closeAllPanels();
    const element = document.getElementById(intent.intent_id);
    if (element) {
      const rect = element.getBoundingClientRect();
      const topRightX = rect.left;
      const topRightY = rect.top;
      this.logger.log('[CDS-CANVAS] `Coordinate angolo in alto a destra: X=${topRightX}, Y=${topRightY}`');
      this.positionColortMenu.x = topRightX;
      this.positionColortMenu.y = topRightY;
      this.IS_OPEN_COLOR_MENU = true;
    } else {
      console.error(`Elemento con ID '${intent.intent_id}' non trovato.`);
    }
  }

  onHideColortMenu() {
    this.IS_OPEN_COLOR_MENU = false;
  }

  onOpenIntent(intent: Intent) {
    this.logger.log('[CDS-CANVAS] onOpenIntent: ', intent.intent_id);
    this.onIntentSelected(intent);
  }

  // ============================================================
  // EVENT HANDLERS - INTENT
  // ============================================================
  onIntentSelected(intent) {
    this.logger.log('[CDS-CANVAS] onIntentSelected ', intent.intent_id);
    this.closeAllPanels();
    this.removeConnectorDraftAndCloseFloatMenu();
    this.intentService.setIntentSelectedById(intent.intent_id);
    this.closeActionDetailPanel();
    setTimeout(() => {
      this.elementIntentSelected = intent;
      this.IS_OPEN_PANEL_INTENT_DETAIL = true;
    }, 0);
  }

  /**
   * Gestisce la selezione di una nota e apre il panel dei dettagli
   * Simile a onIntentSelected per gli intent
   */
  /** Restituisce la left da usare per la nota: valore live durante resize orizzontale, altrimenti note.x (evita flicker). */
  getNoteLeft(note: Note): number {
    return this.noteResizeState.getNoteLeft(note);
  }

  onNoteSelected(note: Note | null): void {
     this.logger.log('[CDS-CANVAS] onNoteSelected',note);
    if (note) {
      // Verifica se il pannello è già aperto sulla stessa nota
      if (this.IS_OPEN_PANEL_NOTE_DETAIL && 
          this.noteSelected && 
          this.noteSelected.note_id === note.note_id) {
        // Il pannello è già aperto sulla stessa nota, non fare nulla
        // this.logger.log('[CDS-CANVAS] onNoteSelected - panel already open for note:', note.note_id);
        return;
      }
      
      // Apri il panel quando una nota viene selezionata (stateNote === 1 o 2)
      // this.logger.log('[CDS-CANVAS] onNoteSelected ', note.note_id);
      this.closeAllPanels();
      this.removeConnectorDraftAndCloseFloatMenu();
      this.closeActionDetailPanel();
      setTimeout(() => {
        this.noteSelected = note;
        this.IS_OPEN_PANEL_NOTE_DETAIL = true;
      }, 0);
    } else {
      // Chiudi il panel quando note è null (stato cambiato a 0)
      this.IS_OPEN_PANEL_NOTE_DETAIL = false;
      this.noteSelected = null;
    }
  }

  /** onActionSelected  **
   * @ Close WHEN AN ACTION IS SELECTED FROM AN INTENT
   * - actions context menu (static & float)
   * - button configuration panel  
   * - test widget
  */
  onActionSelected(event) {
    this.logger.log('[CDS-CANVAS] onActionSelected from PANEL INTENT - action ', event.action, ' - index ', event.index);
    if (!this.hasClickedAddAction) {
      this.removeConnectorDraftAndCloseFloatMenu();
    }
    this.controllerService.openActionDetailPanel(TYPE_INTENT_ELEMENT.ACTION, event.action);
  }

  onQuestionSelected(question: string) {
    this.logger.log('[CDS-CANVAS] onQuestionSelected from PANEL INTENT - question ', question);
    if (!this.hasClickedAddAction) {
      this.removeConnectorDraftAndCloseFloatMenu();
    }
    this.controllerService.openActionDetailPanel(TYPE_INTENT_ELEMENT.QUESTION, question);
  }

  onIntentFormSelected(intentform: Form) {
    if (!this.hasClickedAddAction) {
      this.removeConnectorDraftAndCloseFloatMenu();
    }
    this.controllerService.openActionDetailPanel(TYPE_INTENT_ELEMENT.FORM, intentform);
  }

  onShowPanelActions(event) {
    this.logger.log('[CDS-CANVAS] showPanelActions event:: ', event);
    this.closeAllPanels();
    this.closeActionDetailPanel();
    this.hasClickedAddAction = event.addAction;
    this.logger.log('[CDS-CANVAS] showPanelActions hasClickedAddAction:: ', this.hasClickedAddAction);
    const pos = { 'x': event.x, 'y': event.y };
    this.intentService.setIntentSelectedById(event.intent.intent_id);
    this.positionFloatMenu = pos;
    this.logger.log('[CDS-CANVAS] showPanelActions positionFloatMenu ', this.positionFloatMenu);
    this.IS_OPEN_ADD_ACTIONS_MENU = true;
    this.intentService.inactiveIntent();
  }

  onTestItOut(intent: Intent) {
    if (intent) {
      this.closeAllPanels();
      this.testitOutFirstClick = true;
      this.intentService.startTestWithIntent(intent);
      this.controllerService.closeActionDetailPanel();
      this.controllerService.closeButtonPanel();
      this.controllerService.closeAddActionMenu();
      this.connectorService.removeConnectorDraft();
      this.intentService.setIntentSelectedById(intent.intent_id);
      this.intentService.setIntentSelected(intent.intent_id);
      this.closeExtraPanels();
      this.logger.log('[CDS-CANVAS] onTestItOut intent ', intent);
    }
    const subtype = this.dashboardService.selectedChatbot.subtype;
    if (subtype !== TYPE_CHATBOT.WEBHOOK && subtype != TYPE_CHATBOT.COPILOT) {
      setTimeout(() => {
        this.controllerService.playTestItOut();
        this.IS_OPEN_PANEL_WIDGET = true;
      }, 100);
    }
  }

  onActionDeleted(event) {
    // onActionDeleted
  }

  // ============================================================
  // EVENT HANDLERS - PANEL ELEMENTS
  // ============================================================
  onMouseOverActionMenuSx(event: boolean) {
    this.logger.log('[CDS-CANVAS] onMouseOverActionMenuSx ', event);
  }

  onHideActionPlaceholderOfActionPanel(event) {
    this.logger.log('[CDS-CANVAS] onHideActionPlaceholderOfActionPanel event : ', event);
  }

  // ============================================================
  // EVENT HANDLERS - DROP & CREATE INTENT
  // ============================================================
  async onDroppedElementToStage(event: CdkDragDrop<string[]>) {
    this.logger.log('[CDS-CANVAS] droppedElementOnStage:: ', event);
    let pos = this.connectorService.tiledeskConnectors.logicPoint(event.dropPoint);
    pos.x = pos.x - 132;
    let action: any = event.previousContainer.data[event.previousIndex];
    if (action.value && action.value.type) {
      this.logger.log('[CDS-CANVAS] ho draggato una action da panel element sullo stage');
      this.closeAllPanels();
      this.closeActionDetailPanel();
      this.createNewIntentFromPanelElement(pos, action.value.type);
    } else if (action) {
      this.logger.log('[CDS-CANVAS] ho draggato una action da un intent sullo stage');
      let prevIntentOfaction = this.listOfIntents.find((intent) => intent.actions.some((act) => act._tdActionId === action._tdActionId));
      prevIntentOfaction.actions = prevIntentOfaction.actions.filter((act) => act._tdActionId !== action._tdActionId);
      this.connectorService.deleteConnectorsFromActionByActionId(action._tdActionId);
      this.connectorService.updateConnector(prevIntentOfaction.intent_id);
      this.intentService.refreshIntent(prevIntentOfaction);
      this.listOfIntents = this.listOfIntents.map(obj => obj.intent_id === prevIntentOfaction.intent_id ? prevIntentOfaction : obj);
      this.createNewIntentDraggingActionFromAnotherIntent(pos, action);
    }
  }

  async createNewIntentFromConnectorDraft(typeAction, connectorDraft) {
    const toPoint = connectorDraft.toPoint;
    const newAction = this.intentService.createNewAction(typeAction);
    let intent = this.intentService.createNewIntent(this.id_faq_kb, newAction, toPoint, connectorDraft.color);
    this.logger.log('[CDS-CANVAS] ho creato intent: ', intent);
    this.intentService.addNewIntentToListOfIntents(intent);
    this.removeConnectorDraftAndCloseFloatMenu();
    const fromId = connectorDraft.fromId;
    const toId = intent.intent_id;
    this.logger.log('[CDS-CANVAS] sto per creare il connettore ', connectorDraft, fromId, toId);
    const resp = await this.connectorService.createConnectorFromId(fromId, toId, true, null);
    if (resp) {
      let splitFromId = fromId.split('/');
      let intent_id = splitFromId[0];
      let prevIntent = this.intentService.prevListOfIntent.find((obj) => obj.intent_id === intent_id);
      let nowIntent = this.listOfIntents.find((obj) => obj.intent_id === prevIntent.intent_id);
      let pos = this.listOfIntents.length - 1;
      this.logger.log('[CDS-CANVAS] sto per chiamare settingAndSaveNewIntent ', prevIntent, nowIntent);
      this.settingAndSaveNewIntent(pos, intent, nowIntent, prevIntent);
    }
  }

  async createNewIntentFromPanelElement(pos, typeAction) {
    const newAction = this.intentService.createNewAction(typeAction);
    let intent = this.intentService.createNewIntent(this.id_faq_kb, newAction, pos);
    this.intentService.addNewIntentToListOfIntents(intent);
    const newIntent = await this.settingAndSaveNewIntent(pos, intent, null, null);
  }

  async createNewIntentDraggingActionFromAnotherIntent(pos, action) {
    let prevIntent = this.intentService.prevListOfIntent.find((intent) => intent.actions.some((act) => act._tdActionId === action._tdActionId));
    let nowIntent = this.listOfIntents.find((obj) => obj.intent_id === prevIntent.intent_id);
    this.logger.log('[CDS-CANVAS] createNewIntentDraggingActionFromAnotherIntent: ', prevIntent, nowIntent, this.listOfIntents);
    let intent = this.intentService.createNewIntent(this.id_faq_kb, action, pos);
    this.intentService.addNewIntentToListOfIntents(intent);
    const newIntent = await this.settingAndSaveNewIntent(pos, intent, nowIntent, prevIntent);
  }

  private async settingAndSaveNewIntent(pos, intent, nowIntent, prevIntent) {
    this.logger.log('[CDS-CANVAS] sto per configurare il nuovo intent creato con pos e action ::: ', pos, intent, nowIntent, prevIntent);
    intent.id = INTENT_TEMP_ID;
    this.intentService.setDragAndListnerEventToElement(intent.intent_id);
    this.intentService.setIntentSelected(intent.intent_id);
    this.closeExtraPanels();
    const savedIntent = await this.intentService.saveNewIntent(intent, nowIntent, prevIntent);
  }

  // ============================================================
  // EVENT HANDLERS - ADD ACTION MENU
  // ============================================================
  async onAddActionFromActionMenu(event) {
    this.logger.log('[CDS-CANVAS] onAddActionFromActionMenu:: ', event);
    this.IS_OPEN_ADD_ACTIONS_MENU = true;
    const connectorDraft = this.connectorService.connectorDraft;

    if (connectorDraft?.toPoint && !this.hasClickedAddAction) {
      this.logger.log("[CDS-CANVAS] ho trascinato il connettore e sto per creare un intent", connectorDraft);
      this.createNewIntentFromConnectorDraft(event.type, connectorDraft);
    } else if (this.hasClickedAddAction) {
      this.logger.log("[CDS-CANVAS] ho premuto + quindi creo una nuova action e la aggiungo all'intent");
      const newAction = this.intentService.createNewAction(event.type);
      this.intentService.addActionToIntentSelected(newAction);
      this.controllerService.closeAddActionMenu();
    }
  }

  setConnectorSelected(idConnection) {
    const idConnector = idConnection.substring(0, idConnection.lastIndexOf('/'));
    this.connectorSelected = {};
    const intentId = idConnector.split('/')[0];
    let intent = this.intentService.getIntentFromId(intentId);
    if (intent.attributes?.connectors) {
      if (intent.attributes.connectors[idConnector]) {
        this.connectorSelected = intent.attributes.connectors[idConnector];
      }
    }
    this.connectorSelected.id = idConnection;
    this.logger.log("[CDS-CANVAS] setConnectorSelected: ", this.connectorSelected, idConnector);
  }

  async onAddActionFromConnectorMenu(event) {
    let intent: Intent;
    this.logger.log('[CDS-CANVAS] onAddActionFromConnectorMenu:: ', event, this.connectorSelected);

    if (this.connectorSelected?.id) {
      const intentId = this.connectorSelected.id.split('/')[0];
      intent = this.intentService.getIntentFromId(intentId);
      if (intent && !intent.attributes?.connectors) {
        intent.attributes['connectors'] = {};
      }

      this.logger.log('[CDS-CANVAS] onAddActionFromConnectorMenu intent:: ', intent);

      if (event.type === "show-hide" && event.connector) {
        this.logger.log('[CDS-CANVAS] show-hide:: ', event.connector);
        this.connectorService.hideDefaultConnector(event.connector.id);
        this.connectorService.showContractConnector(event.connector.id);
        this.intentService.updateIntentAttributeConnectors(event.connector);
        this.IS_OPEN_PANEL_CONNECTOR_MENU = false;
      }
      if (event.type === "delete") {
        this.logger.log('[CDS-CANVAS] delete connector:: ', intentId, intent);
        this.connectorService.deleteConnector(intent, event.connector.id, true, true);
        this.IS_OPEN_PANEL_CONNECTOR_MENU = false;
      }
      if (event.type === "line-text") {
        this.logger.log('[CDS-CANVAS] line-text:: ', event.connector);
        this.connectorService.updateConnectorLabel(this.connectorSelected.id, event.connector.label);
        this.intentService.updateIntentAttributeConnectors(event.connector);
        this.IS_OPEN_PANEL_CONNECTOR_MENU = false;
      }
    }
  }

  openWebhookIntentPanel(intent: Intent) {
    const webhookIntent = intent.intent_display_name === TYPE_INTENT_NAME.WEBHOOK ? true : false;
    if (webhookIntent) {
      this.onOpenIntent(intent);
    }
  }

  // ============================================================
  // EVENT HANDLERS - OPTIONS PANEL
  // ============================================================
  async onOptionClicked(resp) {
    this.closeExtraPanels();
    let option = resp.option;
    let alpha = resp.alpha;
    switch (option) {
      case OPTIONS.ZOOM_IN: {
        await this.stageService.changeScale(this.id_faq_kb, 'in');
        break;
      }
      case OPTIONS.ZOOM_OUT: {
        await this.stageService.changeScale(this.id_faq_kb, 'out');
        break;
      }
      case OPTIONS.CENTER: {
        await this.stageService.scaleAndCenter(this.id_faq_kb, this.listOfIntents);
        break;
      }
      case OPTIONS.UNDO: {
        this.intentService.restoreLastUNDO();
        break;
      }
      case OPTIONS.REDO: {
        this.intentService.restoreLastREDO();
        break;
      }
      case OPTIONS.ALPHA: {
        this.logger.log("[CDS-CANVAS] alphaConnectors: ", alpha);
        this.stageService.setAlphaConnectors(this.id_faq_kb, alpha);
        break;
      }
      case OPTIONS.NOTE: {
        this.isNoteModeActive = resp.isActive !== undefined ? resp.isActive : !this.isNoteModeActive;
        this.logger.log("[CDS-CANVAS] note mode active: ", this.isNoteModeActive);
        break;
      }
    }
  }

  onStageClick(event: MouseEvent): void {
    if (this.isNoteModeActive) {
      return;
    }
  }

  // ============================================================
  // EVENT HANDLERS - NOTES
  // ============================================================
  onNoteDroppedOnStage(evt: { noteType: NoteType; clientX: number; clientY: number }): void {
    try {
      const pos = this.connectorService.tiledeskConnectors.logicPoint({ x: evt.clientX, y: evt.clientY });
      const newNote = new Note(this.id_faq_kb, pos);
      newNote.type = evt.noteType || 'text';
      if (newNote.type !== 'text') {
        newNote.text = '';
      }

      // RECT NOTE: default colors differ from text notes
      if (newNote.type === 'rect') {
        newNote.backgroundColor = Note.defaultBackgroundColor('rect');
        newNote.borderColor = Note.defaultBorderColor('rect');
      }

      // MEDIA NOTE: non salvare in remoto finché non c'è un media valido.
      // Apri subito il pannello di destra per il caricamento.
      if (newNote.type === 'media') {
        // Requirement: default shadow disabled for image/media notes
        // (keep the option hidden in the panel UI)
        newNote.boxShadow = false;

        // Placeholder on stage (draft):
        // - default size with 4/3 ratio
        // - visible block (but NOT persisted remotely until media is valid)
        newNote.width = 240;
        newNote.height = 180;

        // Inizializza payload (soft typing)
        if (!newNote.payload) newNote.payload = {};
        (newNote.payload as any).imageSrc = '';
        (newNote.payload as any).imageWidth = 0;
        (newNote.payload as any).imageHeight = 0;
        (newNote.payload as any).mediaType = 'image';
        (newNote.payload as any).mediaSrc = '';
        (newNote.payload as any).mediaWidth = 0;
        (newNote.payload as any).mediaHeight = 0;

        this.pendingImageDraftNoteId = newNote.note_id;
        // Add to the stage immediately as a placeholder (draft)
        this.listOfNotes.push(newNote);
        this.noteService.notifyNotesChanged();
        return;
      }

      this.applyLastUsedColors(newNote);

      this.listOfNotes.push(newNote);
      if (!this.dashboardService.selectedChatbot.attributes) {
        this.dashboardService.selectedChatbot.attributes = {};
      }
      this.dashboardService.selectedChatbot.attributes.notes = [...this.listOfNotes];
      this.saveNoteRemotely(newNote);

      if (newNote.type === 'text') {
        this.pendingAutoFocusNoteId = newNote.note_id;
      }
      this.logger.log("[CDS-CANVAS] Note dropped on stage:", evt.noteType, pos);
    } catch (e) {
      this.logger.error("[CDS-CANVAS] Error creating note from drop:", e);
    }
  }

  onNoteAutoFocused(noteId: string): void {
    if (this.pendingAutoFocusNoteId === noteId) {
      this.pendingAutoFocusNoteId = null;
    }
  }

  onSavePanelNoteDetail(note: Note) {
    this.logger.log('[CDS-CANVAS] onSavePanelNoteDetail note (debounced)', note);

    if (!note || note == null) {
      return;
    }

    if (note.type === 'media') {
      const isValid = this.validateMediaNote(note);
      if (this.handleMediaNoteDraft(note, isValid)) {
        return;
      }
      this.commitValidMediaNote(note);
      return;
    }

    this.pendingNoteToSave = note;
    this.updateNoteInList(note);
    this.updateNoteInAttributes(note);

    if (this.saveNoteDetailTimer) {
      clearTimeout(this.saveNoteDetailTimer);
      this.saveNoteDetailTimer = null;
    }

    this.saveNoteDetailTimer = setTimeout(() => {
      this.executeSaveNoteDetail();
    }, 1000);
  }

  onDeleteNote(note: Note) {
    this.logger.log('[CDS-CANVAS] onDeleteNote note ', note);
    if (note && note != null) {
      const existsInAttributes =
        !!this.dashboardService.selectedChatbot?.attributes?.notes?.some(n => n.note_id === note.note_id);
      if (note.type === 'media' && this.pendingImageDraftNoteId === note.note_id && !existsInAttributes) {
        this.listOfNotes = this.listOfNotes.filter(n => n.note_id !== note.note_id);
        this.pendingImageDraftNoteId = null;
        this.noteService.notifyNotesChanged();
        return;
      }
      this.noteService.deleteNote(note, this.id_faq_kb).subscribe({
        next: (data) => {
          this.syncListOfNotesAfterOperation();
          this.logger.log('[CDS-CANVAS] Note deleted successfully, array updated:', data);
        },
        error: (error) => {
          this.logger.error('[CDS-CANVAS] Note Error deleting note:', error);
        }
      });
    }
  }

  onDuplicateNote(note: Note) {
    this.logger.log('[CDS-CANVAS] onDuplicateNote note ', note);
    if (note && note != null) {
      this.noteService.duplicateNote(note, this.id_faq_kb).subscribe({
        next: (duplicatedNote) => {
          this.syncListOfNotesAfterOperation();
          this.logger.log('[CDS-CANVAS] Note duplicated successfully:', duplicatedNote.note_id);
        },
        error: (error) => {
          this.logger.error('[CDS-CANVAS] Note Error duplicating note:', error);
        }
      });
    }
  }

  private setupNewNoteDefaults(note: Note, noteType: NoteType): boolean {
    if (noteType !== 'text') {
      note.text = '';
    }

    if (noteType === 'rect') {
      note.backgroundColor = Note.defaultBackgroundColor('rect');
      note.borderColor = Note.defaultBorderColor('rect');
    }

    if (noteType === 'media') {
      note.boxShadow = false;
      note.width = 240;
      note.height = 180;

      if (!note.payload) note.payload = {};
      (note.payload as any).imageSrc = '';
      (note.payload as any).imageWidth = 0;
      (note.payload as any).imageHeight = 0;
      (note.payload as any).mediaType = 'image';
      (note.payload as any).mediaSrc = '';
      (note.payload as any).mediaWidth = 0;
      (note.payload as any).mediaHeight = 0;

      this.pendingImageDraftNoteId = note.note_id;
      this.listOfNotes.push(note);
      this.noteService.notifyNotesChanged();
      this.onNoteSelected(note);
      return true;
    }

    return false;
  }

  private applyLastUsedColors(note: Note): void {
    const lastUsed = this.noteService.getLastUsedColorsForType(note.type);
    if (lastUsed) {
      if (lastUsed.backgroundColor) note.backgroundColor = lastUsed.backgroundColor;
      if (typeof lastUsed.backgroundOpacity === 'number') note.backgroundOpacity = lastUsed.backgroundOpacity;
      if (lastUsed.borderColor) note.borderColor = lastUsed.borderColor;
      if (typeof lastUsed.borderOpacity === 'number') note.borderOpacity = lastUsed.borderOpacity;
      if (typeof lastUsed.borderWidth === 'number') note.borderWidth = lastUsed.borderWidth;
      if (typeof lastUsed.boxShadow === 'boolean') note.boxShadow = lastUsed.boxShadow;
    }
    this.noteService.rememberLastUsedColorsFromNote(note);
  }

  private syncListOfNotesAfterOperation(): void {
    this.listOfNotes = this.dashboardService.selectedChatbot.attributes?.notes || [];
  }

  private async saveNoteRemotely(note: Note): Promise<void> {
    try {
      const data = await firstValueFrom(this.noteService.saveRemoteNote(note, this.id_faq_kb));
      this.logger.log("[CDS-CANVAS] Note saved remotely successfully:", note.note_id);
      if (this.dashboardService.selectedChatbot.attributes?.notes) {
        this.listOfNotes = [...this.dashboardService.selectedChatbot.attributes?.notes || []];
      }
    } catch (error) {
      this.logger.error("[CDS-CANVAS] Error saving note remotely:", error);
    }
  }

  private validateMediaNote(note: Note): boolean {
    const payload: any = note.payload || {};
    const src =
      (payload?.mediaSrc as string | undefined) ||
      (payload?.imageSrc as string | undefined);
    const w =
      (payload?.mediaWidth as number | undefined) ||
      (payload?.imageWidth as number | undefined);
    const h =
      (payload?.mediaHeight as number | undefined) ||
      (payload?.imageHeight as number | undefined);
    return !!src && typeof w === 'number' && w > 0 && typeof h === 'number' && h > 0;
  }

  private updateNoteInList(note: Note): void {
    const index = this.listOfNotes.findIndex(n => n.note_id === note.note_id);
    if (index >= 0) {
      this.listOfNotes[index] = note;
      this.noteService.notifyNotesChanged();
    }
  }

  private updateNoteInAttributes(note: Note): void {
    if (this.dashboardService.selectedChatbot.attributes?.notes) {
      const attrIndex = this.dashboardService.selectedChatbot.attributes?.notes.findIndex(n => n.note_id === note.note_id);
      if (attrIndex >= 0) {
        this.dashboardService.selectedChatbot.attributes.notes[attrIndex] = note;
      }
    }
  }

  private handleMediaNoteDraft(note: Note, isValid: boolean): boolean {
    if (!isValid) {
      const existsInList = this.listOfNotes.some(n => n.note_id === note.note_id);
      if (existsInList) {
        const idx = this.listOfNotes.findIndex(n => n.note_id === note.note_id);
        if (idx >= 0) {
          this.listOfNotes[idx] = note;
          this.noteService.notifyNotesChanged();
        }
      }
      return true;
    }
    return false;
  }

  private commitValidMediaNote(note: Note): void {
    const existsInAttributes =
      !!this.dashboardService.selectedChatbot?.attributes?.notes?.some(n => n.note_id === note.note_id);

    if (!existsInAttributes) {
      if (!this.dashboardService.selectedChatbot.attributes) {
        this.dashboardService.selectedChatbot.attributes = {};
      }
      this.dashboardService.selectedChatbot.attributes.notes = [...this.listOfNotes];
      this.noteService.notifyNotesChanged();
    }

    if (this.pendingImageDraftNoteId === note.note_id) {
      this.pendingImageDraftNoteId = null;
    }

    this.noteService.saveRemoteNote(note, this.id_faq_kb).subscribe({
      next: (data) => {
        this.listOfNotes = this.dashboardService.selectedChatbot.attributes?.notes || [];
        this.logger.log('[CDS-CANVAS] Media note saved immediately:', data);
      },
      error: (error) => {
        this.logger.error('[CDS-CANVAS] Error saving media note:', error);
      }
    });
  }

  private executeSaveNoteDetail(): void {
    if (!this.pendingNoteToSave) {
      return;
    }

    const noteToSave = this.pendingNoteToSave;
    this.pendingNoteToSave = null;
    this.saveNoteDetailTimer = null;

    this.logger.log('[CDS-CANVAS] Executing save note after debounce:', noteToSave);

    this.noteService.saveRemoteNote(noteToSave, this.id_faq_kb).subscribe({
      next: (data) => {
        this.listOfNotes = this.dashboardService.selectedChatbot.attributes?.notes || [];
        this.logger.log('[CDS-CANVAS] Note saved successfully:', data);
      },
      error: (error) => {
        this.logger.error('[CDS-CANVAS] Error saving note:', error);
      }
    });
  }

  // ============================================================
  // EVENT HANDLERS - PANEL BUTTON CONFIGURATION
  // ============================================================
  onSaveButton(button: Button) {
    this.logger.log('onSaveButton: ', this.intentService.intentSelected);
    this.intentService.updateIntent(this.intentService.intentSelected);
  }

  // ============================================================
  // EVENT HANDLERS - PANEL ACTION DETAIL
  // ============================================================
  onSavePanelIntentDetail(intentSelected: any) {
    this.logger.log('[CDS-CANVAS] onSavePanelIntentDetail intentSelected ', intentSelected);
    if (intentSelected && intentSelected != null) {
      this.intentService.updateIntent(intentSelected);
    }
  }

  // ============================================================
  // EVENT HANDLERS - CONTEXT MENU & WIDGET
  // ============================================================
  public onShowContextMenu(event: MouseEvent): void {
    event.preventDefault();
    this.logger.log('[CDS-CANVAS] onShowContextMenu:: ', event);
    const targetElement = event.target as HTMLElement;
    const customAttributeValue = targetElement.getAttribute('custom-attribute');
    if (customAttributeValue === 'tds_container') {
      this.positionContextMenu.x = event.clientX;
      this.positionContextMenu.y = event.offsetY;
      this.IS_OPEN_CONTEXT_MENU = true;
    }
  }

  public onHideContextMenu() {
    this.IS_OPEN_CONTEXT_MENU = false;
  }

  closePanelWidget() {
    this.IS_OPEN_PANEL_WIDGET = false;
  }

  onClosePanelLog() {
    this.IS_OPEN_WIDGET_LOG = false;
  }

  public onNewConversation(request_id) {
    this.logger.log('[CDS-CANVAS] onNewConversation:: ', this.elementIntentSelected, this.logService.request_id, request_id);
    if (this.logService.request_id !== request_id) {
      this.logService.initialize(request_id);
      this.IS_OPEN_WIDGET_LOG = true;
      this.mesage_request_id = request_id;
    }
  }
}
