
// =============================
// IMPORTS
// =============================
// Angular core
import { Renderer2, Component, OnInit, Input, Output, EventEmitter, ViewChild, ElementRef, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
// RxJS
import { firstValueFrom, Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
// Angular CDK Drag & Drop
import { CdkDragDrop, CdkDrag, moveItemInArray, CdkDragMove } from '@angular/cdk/drag-drop';
// Modelli
import { Form, Intent } from 'src/app/models/intent-model';
import { Action, ActionIntentConnected } from 'src/app/models/action-model';
// Servizi
import { IntentService } from '../../../services/intent.service';
import { ConnectorService } from '../../../services/connector.service';
import { StageService } from '../../../services/stage.service';
import { ControllerService } from '../../../services/controller.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';
import { AppConfigService } from 'src/app/services/app-config';
import { DashboardService } from 'src/app/services/dashboard.service';
import { WebhookService } from 'src/app/chatbot-design-studio/services/webhook-service.service';
// Utility e costanti
import { INTENT_COLORS, TYPE_INTENT_NAME, UNTITLED_BLOCK_PREFIX, DATE_NEW_CHATBOT, replaceItemInArrayForKey, checkInternalIntent, isValidColor, areValidIds, findActionKey, addCssClassToElement, removeCssClassFromElement, calculateQuestionCount, calculateFormSize } from 'src/app/chatbot-design-studio/utils';
import { TYPE_ACTION, TYPE_ACTION_VXML, ACTIONS_LIST, TYPE_CHATBOT } from 'src/app/chatbot-design-studio/utils-actions';
// import { INTENT_COLORS, TYPE_INTENT_NAME, replaceItemInArrayForKey, checkInternalIntent, generateShortUID, UNTITLED_BLOCK_PREFIX, DATE_NEW_CHATBOT } from 'src/app/chatbot-design-studio/utils';


// =============================
// ENUM
// =============================
/**
 * Tipi di selezione possibili all'interno dell'intent
 */
export enum HAS_SELECTED_TYPE {
  ANSWER = "HAS_SELECTED_ANSWER",
  QUESTION = "HAS_SELECTED_QUESTION",
  FORM = "HAS_SELECTED_FORM",
  ACTION = "HAS_SELECTED_ACTION",
  INTENT = "HAS_SELECTED_INTENT",
}

// =============================
// COMPONENT DECORATOR
// =============================
@Component({
  selector: 'cds-intent',
  templateUrl: './cds-intent.component.html',
  styleUrls: ['./cds-intent.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})

export class CdsIntentComponent implements OnInit, OnDestroy {
  // OTTIMIZZATO: Rimossa implementazione OnChanges, usiamo getter/setter per controllo fine
  private _intent: Intent;
  private _hideActionPlaceholderOfActionPanel: boolean;
  
  @Input() 
  set intent(value: Intent) {
    const previousIntentId = this._intent?.intent_id;
    this._intent = value;
    
    // Aggiorna valori precomputati solo se l'intent è cambiato (non al primo set)
    if (previousIntentId && previousIntentId !== value?.intent_id) {
      this.updateComputedColors();
      this.updateComputedTemplateValues();
      this.cdr.markForCheck();
    }
  }
  get intent(): Intent {
    return this._intent;
  }
  
  @Input() 
  set hideActionPlaceholderOfActionPanel(value: boolean) {
    // Aggiorna placeholder solo se il valore è cambiato
    if (this._hideActionPlaceholderOfActionPanel !== value) {
      this._hideActionPlaceholderOfActionPanel = value;
      this.updateActionPlaceholderVisibility(value);
    }
  }
  get hideActionPlaceholderOfActionPanel(): boolean {
    return this._hideActionPlaceholderOfActionPanel;
  }
  
  @Input() chatbotSubtype: string;
  @Input() IS_OPEN_PANEL_INTENT_DETAIL: boolean;
  
  // ----------- OUTPUTS -----------
  /** Evento emesso quando il componente è stato renderizzato */
  @Output() componentRendered = new EventEmitter<string>();
  /** Evento emesso quando viene selezionata una domanda (deprecato) */
  @Output() questionSelected = new EventEmitter();
  /** Evento emesso quando viene selezionato un form (deprecato) */
  @Output() formSelected = new EventEmitter();
  /** Evento emesso quando viene selezionata un'azione (deprecato) */
  @Output() actionSelected = new EventEmitter();

  /** Evento emesso quando viene eliminata un'azione */
  @Output() actionDeleted = new EventEmitter();
  /** Evento per mostrare il pannello delle azioni */
  @Output() showPanelActions = new EventEmitter(); // nk
  /** Evento per eliminare l'intent */
  @Output() deleteIntent = new EventEmitter();
  /** Evento per aprire l'intent */
  @Output() openIntent = new EventEmitter<Intent>();
  /** Evento per cambiare il colore dell'intent */
  @Output() changeColorIntent = new EventEmitter();

  // ----------- VIEWCHILD -----------
  /** Elemento DOM per il resize dell'intent */
  @ViewChild('resizeElement', { static: false }) resizeElement: ElementRef;
  /** Bottone per aprire il menu azioni */
  @ViewChild('openActionMenuBtn', { static: false }) openActionMenuBtnRef: ElementRef;

  // ----------- PROPRIETÀ DI STATO -----------
  /** Gestione delle subscription per pulizia */
  subscriptions: Array<{ key: string, value: Subscription }> = [];
  /** Subject per l'unsubscribe centralizzato */
  unsubscribe$: Subject<any> = new Subject<any>();

  /** Numero di connettori alpha */
  alphaConnectors: number;
  /** Connettori in ingresso */
  connectorsIn: any;
  /** Numero di campi nel form */
  formSize: number = 0;
  /** Numero di domande */
  questionCount: number = 0;
  /** Lista delle azioni dell'intent */
  listOfActions: Action[];

  /** Enum e costanti per template */
  HAS_SELECTED_TYPE = HAS_SELECTED_TYPE;
  TYPE_ACTION = TYPE_ACTION;
  TYPE_ACTION_VXML = TYPE_ACTION_VXML;
  ACTIONS_LIST = ACTIONS_LIST;

  /** Tipo di elemento selezionato */
  elementTypeSelected: HAS_SELECTED_TYPE;
  /** Stato di apertura del pannello intent */
  isOpen: boolean = true;
  /** Posizione del menu */
  positionMenu: any;
  /** Se l'intent è di tipo start */
  isStart = false;
  /** Se l'intent è fallback di default */
  isDefaultFallback = false;
  /** Azione di start */
  startAction: any;
  /** Se è in drag & drop */
  isDragging: boolean = false;
  /** Larghezza placeholder drag */
  actionDragPlaceholderWidth: number;
  /** Se nascondere il placeholder drag */
  hideActionDragPlaceholder: boolean;
  /** Nuova azione creata */
  newActionCreated: Action;
  /** Se il drag è disabilitato */
  dragDisabled: boolean = true;
  /** Se il connettore è sopra un intent */
  connectorIsOverAnIntent: boolean = false;
  // Track mouse movement to distinguish click from drag
  // OTTIMIZZATO: Usa timestamp invece di mousemove per evitare 100+ listener
  private mouseDownTimestamp: number = 0;
  private readonly CLICK_MAX_DURATION_MS = 200; // Se mousedown + click < 200ms = click, altrimenti drag
  
  // ResizeObserver per ottimizzare le performance
  private resizeObserver: ResizeObserver | null = null;
  private resizeDebounceTimeout: any = null;
  private readonly RESIZE_DEBOUNCE_MS = 150; // Debounce per evitare troppe chiamate durante resize
  webHookTooltipText: string;
  /** Se l'intent è interno */
  isInternalIntent: boolean = false;
  
  // Gestione visibilità controlli intent (ottimizzazione performance)
  showIntentControls: boolean = false; // Nascosto di default, mostrato solo su hover dopo 500ms
  private hoverTimeout: any = null;
  private readonly HOVER_DELAY_MS = 500; // Delay per mostrare controlli su hover
  
  // Valori precomputati per cds-panel-intent-controls (ottimizzazione performance)
  deleteOptionEnabled: boolean = false;
  displayName: string = '';
  webhookEnabled: boolean = false;
  actionIntent: ActionIntentConnected;
  /** Se l'intent ha un'azione INTENT */
  isActionIntent: boolean = false;
  /** Se ci sono agenti disponibili */
  isAgentsAvailable: boolean = false;
  /** Se mostrare le opzioni intent */
  showIntentOptions: boolean = true;
  /** URL webhook */
  webhookUrl: string;
  /** Base URL server */
  serverBaseURL: any;
  /** ID chatbot */
  chatbot_id: string;

  isUntitledBlock: boolean = false;
  isNewChatbot: boolean = false;

  /** Colore dell'intent */
  intentColor: any = INTENT_COLORS.COLOR1;
  
  // Colore di sfondo precomputato (equivalente a rgba con alpha 0.35 su sfondo bianco)
  backgroundColor: string = 'rgb(255, 255, 255)';
  
  // Outline precomputato (equivalente a rgba con alpha 1.0)
  outlineStyle: string = 'none';
  
  // ID precomputato per evitare concatenazione stringa nel template
  intentContentId: string = '';
  
  // Classi precomputate per evitare binding multipli
  intentClasses: { [key: string]: boolean } = {};

  // Classi precomputate per agents-available (evita binding classe valutato ad ogni change detection)
  agentsAvailableClasses: { [key: string]: boolean } = {};

  // ID precomputato per block-header (evita concatenazione stringa nel template)
  blockHeaderId: string = '';

  // Espressioni booleane precomputate per evitare valutazioni nel template
  hasQuestions: boolean = false;
  hasForm: boolean = false;

  // Costanti enum precomputate per evitare accessi diretti nel template
  readonly QUESTION_TYPE = HAS_SELECTED_TYPE.QUESTION;
  readonly FORM_TYPE = HAS_SELECTED_TYPE.FORM;

  // Proprietà precomputata per evitare valutazione espressione complessa nel template
  showConnectorIn: boolean = false;

  // Proprietà per disattivare cdkDrag durante pan/zoom (ottimizzazione performance)
  isPanOrZoomActive: boolean = false;

  // Proprietà precomputate per actions list (ottimizzazione performance)
  hasActions: boolean = false; // Precomputato da listOfActions?.length > 0
  canEnterDropListResult: boolean = true; // Precomputato da canEnterDropList(intent)
  actionClasses: Map<string, { [key: string]: boolean }> = new Map(); // Memoizzazione classi per action
  actionOutlineStyle: Map<string, string> = new Map(); // Memoizzazione outline style per action
  currentActionSelectedID: string | null = null; // Cache per actionSelectedID del servizio

  /** Flag per tracciare se gli event listener sono stati aggiunti */
  private eventListenersAdded = false;

  /** Handler per event listener - salvati come proprietà per il cleanup */
  private handleConnectorRelease = (e: CustomEvent) => {
    if (e.detail?.toId !== this.intent.intent_id) {
      return;
    }

    const intentContentEl = document.querySelector(`#intent-content-${e.detail.toId}`);
    if (intentContentEl instanceof HTMLElement) {
      intentContentEl.classList.remove("outline-border");
      intentContentEl.classList.add("ripple-effect");
      
      setTimeout(() => {
        intentContentEl.classList.remove("ripple-effect");
      }, 2000);
    }
  };

  private handleConnectorMovedOver = (e: CustomEvent) => {
    if (e.detail?.toId !== this.intent.intent_id) {
      return;
    }

    this.connectorIsOverAnIntent = true;
    const intentContentEl = document.querySelector(`#intent-content-${e.detail.toId}`);
    
    if (intentContentEl instanceof HTMLElement) {
      intentContentEl.classList.add("outline-border");
    }
  };

  private handleConnectorMovedOut = (e: CustomEvent) => {
    if (e.detail?.toId === this.intent.intent_id) {
      const intentContentEl = document.querySelector(`#intent-content-${e.detail.toId}`);
      
      if (intentContentEl instanceof HTMLElement) {
        intentContentEl.classList.remove("outline-border");
      }
    }
    
    this.connectorIsOverAnIntent = false;
  };

  /** Logger centralizzato */
  private readonly logger: LoggerService = LoggerInstance.getInstance();


  // ----------- COSTRUTTORE -----------
  constructor(
    public intentService: IntentService,
    public appConfigService: AppConfigService,
    private readonly connectorService: ConnectorService,
    public readonly stageService: StageService, // Public per accesso nel template
    private readonly controllerService: ControllerService,
    private readonly elemenRef: ElementRef,
    private readonly appStorageService: AppStorageService,
    private readonly dashboardService: DashboardService,
    private readonly webhookService: WebhookService,
    private readonly cdr: ChangeDetectorRef, // Per gestire manualmente change detection con OnPush
  ) {
    this.initSubscriptions();
  }

  /**
   * Inizializza tutte le subscription necessarie per la gestione reattiva dello stato dell'intent.
   * Ogni subscription viene registrata in this.subscriptions per una facile pulizia.
   */
  initSubscriptions() {
    let subscribtion: any;
    let subscribtionKey: string;
    /** SUBSCRIBE TO THE INTENT CREATED OR UPDATED */
    subscribtionKey = 'behaviorIntent';
    subscribtion = this.subscriptions.find(item => item.key === subscribtionKey);
    if (!subscribtion) {
      subscribtion = this.intentService.behaviorIntent.pipe(takeUntil(this.unsubscribe$)).subscribe(intent => {
        if (intent && this._intent && intent.intent_id === this._intent.intent_id) {
          this.logger.log("[CDS-INTENT] sto modificando l'intent: ", this._intent, " con : ", intent);
          
          // Aggiorna direttamente _intent per evitare trigger del setter (già gestito qui)
          this._intent = intent;
          
          this.setAgentsAvailable();

           // Aggiorna isUntitledBlock quando l'intent viene modificato
           this.updateIsUntitledBlock();
           if (intent['attributesChanged']) {
             this.logger.log("[CDS-INTENT] ho solo cambiato la posizione sullo stage");
             delete intent['attributesChanged'];
           } else { // if(this.intent.actions.length !== intent.actions.length && intent.actions.length>0)
             this.logger.log("[CDS-INTENT] aggiorno le actions dell'intent");
             this.listOfActions = this.intent.actions;
             this.setActionIntent();
           }

            // Se è cambiata solo la posizione, non aggiorno le azioni
          if (intent['attributesChanged']) {
              this.logger.log("[CDS-INTENT] Solo posizione cambiata");
            delete intent['attributesChanged'];
          } else { // if(this.intent.actions.length !== intent.actions.length && intent.actions.length>0)
            this.logger.log("[CDS-INTENT] aggiorno le actions dell'intent");
        this.listOfActions = this._intent.actions;
        this.setActionIntent();
        
        // Aggiorna hasActions e canEnterDropListResult
        this.updateHasActions();
        this.updateCanEnterDropListResult();
        
        // Aggiorna valori precomputati per actions
        this.updateCurrentActionSelectedID();
        this.updateAllActionsComputedValues();
        
        // Aggiorna valori controlli intent (deleteOptionEnabled potrebbe cambiare)
        this.updateIntentControlsValues();
            // cerca il primo connect to block e fissalo in fondo
            // this.listOfActions = this.intent.actions.filter(function(obj) {
            //   return obj._tdActionType !== TYPE_ACTION.INTENT;
            // });
          }
          
          // Aggiorna i colori precomputati se il colore è cambiato
          if (intent.attributes?.color !== this.intentColor) {
            this.updateComputedColors();
          }
          
          // Aggiorna valori template
          this.updateComputedTemplateValues();
          
          // Aggiorna valori controlli intent
          this.updateIntentControlsValues();
          
          // Con OnPush, notifica manualmente il change detection
          this.cdr.markForCheck();
          

          //UPDATE QUESTIONS
          if (this._intent.question) {
            const question_segment = this._intent.question.split(/\r?\n/).filter(element => element);
            this.questionCount = question_segment.length;
          } else {
            this.questionCount = 0;
          }

          //UPDATE FORM
          if (this._intent?.form && (this._intent.form !== null)) {
            this.formSize = Object.keys(this._intent.form).length;
          } else {
            this.formSize = 0;
          }

          // Aggiorna espressioni booleane precomputate
          this.updateComputedBooleanExpressions();

          // Aggiorna showIntentOptions basandosi su questionCount e formSize
          this.updateShowIntentOptions();
          
          // Aggiorna listOfActions se necessario
          if (intent.actions) {
            this.listOfActions = intent.actions;
            this.updateHasActions();
            this.updateCanEnterDropListResult();
            this.updateAllActionsComputedValues();
          }
          
          // Con OnPush, notifica manualmente il change detection
          this.cdr.markForCheck();
        }
      });
      this.subscriptions.push({ key: subscribtionKey, value: subscribtion });
    }

    // --- Subscription: Intent live attivo dal test site ---
    const keyIntentLiveActive = 'intentLiveActive';
    if (!this.subscriptions.find(item => item.key === keyIntentLiveActive)) {
      const sub = this.intentService.liveActiveIntent
        .pipe(takeUntil(this.unsubscribe$))
        .subscribe(data => {
          if (data) {
            const intent = data.intent;
            const logAnimationType = data.logAnimationType;
            const scale = data.scale;
            const currentIntentId = this._intent?.intent_id;
            const currentIntentDisplayName = this._intent?.intent_display_name;
            
            if(intent && intent.intent_id !== currentIntentId && currentIntentDisplayName === TYPE_CHATBOT.WEBHOOK){
              this.removeCssClassIntentActive('live-start-intent', '#intent-content-' + currentIntentId);
            } else if(!intent && currentIntentDisplayName === TYPE_CHATBOT.WEBHOOK){
              const stageElement = document.getElementById(currentIntentId);
              this.addCssClassIntentActive('live-start-intent', '#intent-content-' + currentIntentId);
              this.stageService.centerStageOnTopPosition(this._intent.id_faq_kb, stageElement, scale);
            } else if (!intent || intent.intent_id !== currentIntentId) {
              setTimeout(() => {
                this.removeCssClassIntentActive('live-active-intent-pulse', '#intent-content-' + currentIntentId);
              }, 500);
            } else if (intent && this._intent && intent.intent_id === currentIntentId) {
              // this.removeCssClassIntentActive('live-active-intent-pulse', '#intent-content-' + this.intent?.intent_id);
              this.removeCssClassIntentActive('live-active-intent-pulse', '#intent-content-' + currentIntentId);
              setTimeout(() => {
                this.addCssClassIntentActive('live-active-intent-pulse', '#intent-content-' + (intent.intent_id));
                const stageElement = document.getElementById(intent.intent_id);
                if(logAnimationType) {
                  this.stageService.centerStageOnTopPosition(this._intent.id_faq_kb, stageElement, scale);
                }
                // Con OnPush, notifica manualmente il change detection
                this.cdr.markForCheck();
              }, 500);
            }
          } else {
            if(this._intent?.intent_display_name === TYPE_CHATBOT.WEBHOOK){
              this.removeCssClassIntentActive('live-start-intent', '#intent-content-' + this._intent.intent_id);
            }
            this.removeCssClassIntentActive('live-active-intent-pulse', '#intent-content-' + this._intent?.intent_id);
          }
          
          // Con OnPush, notifica manualmente il change detection
          this.cdr.markForCheck();
      });
      this.subscriptions.push({ key: keyIntentLiveActive, value: sub });
    }

    // --- Subscription: Valore alphaConnectors (per aggiornare i connettori in ingresso) ---
    const keyAlphaConnectors = 'alphaConnectors';
    if (!this.subscriptions.find(item => item.key === keyAlphaConnectors)) {
      const sub = this.stageService.alphaConnectors$.subscribe(value => {
        this.alphaConnectors = value;
        // Ricarica i connettori quando cambia l'opacità
        if (this.intent?.intent_id) {
          this.loadConnectorsIn();
        }
        // Con OnPush, notifica manualmente il change detection
        this.cdr.markForCheck();
      });
      this.subscriptions.push({ key: keyAlphaConnectors, value: sub });
    }

    // --- Subscription: Cambio colore intent ---
    const keyChangeIntentColor = 'changeIntentColor';
    if (!this.subscriptions.find(item => item.key === keyChangeIntentColor)) {
      const sub = this.intentService.behaviorIntentColor
        .pipe(takeUntil(this.unsubscribe$))
        .subscribe(resp => {
          if (resp.intentId && resp.intentId === this.intent?.intent_id && resp.color) {
            this.changeIntentColor(resp.color);
          }
          // Con OnPush, notifica manualmente il change detection
          this.cdr.markForCheck();
        });
      this.subscriptions.push({ key: keyChangeIntentColor, value: sub });
    }
  }

  /**
   * Inizializza il componente intent con tutte le configurazioni necessarie.
   * Gestisce webhook, tipi speciali di intent (start, fallback), e configurazione iniziale.
   */
  // async ngOnInit(): Promise<void> {
  //     this.logger.log('[CDS-INTENT] ngOnInit-->', this.intent, this.questionCount);
  //     if(this.chatbotSubtype !== TYPE_CHATBOT.CHATBOT){
  //       this.showIntentOptions = false;
  //     } 
  // }


  async ngOnInit(): Promise<void> {
    this.logger.log('[CDS-INTENT] ngOnInit-->', this.intent);

    if(this.chatbotSubtype !== TYPE_CHATBOT.CHATBOT){
      this.showIntentOptions = false;
    } 
    // --- Configurazione opzioni intent in base al tipo chatbot ---
    this.configureIntentOptions();
    
    // --- Gestione webhook per intent di tipo webhook ---
    if (this.intent.intent_display_name === TYPE_INTENT_NAME.WEBHOOK) {
      await this.initializeWebhook();
    }
    
    // --- Configurazione intent speciali (fallback, start) ---
    this.configureSpecialIntents();
    
    // --- Inizializzazione stato e attributi ---
    this.initializeIntentState();

    // Aggiorna showIntentOptions dopo l'inizializzazione
    this.updateShowIntentOptions();

    this.updateIsUntitledBlock();
    
    // Verifica se il chatbot è nuovo (creato dopo il 01/06/2025)
    this.checkIfNewChatbot();
  }


  /**
   * Configura le opzioni dell'intent in base al tipo di chatbot
   */
  private configureIntentOptions(): void {
    if (this.chatbotSubtype !== TYPE_CHATBOT.CHATBOT) {
        this.showIntentOptions = false;
    } 
  }

  /**
   * Inizializza il webhook per l'intent corrente
   */
  private async initializeWebhook(): Promise<void> {
        this.serverBaseURL = this.appConfigService.getConfig().apiUrl;
        this.chatbot_id = this.dashboardService.id_faq_kb;
    
    // Prova a recuperare webhook esistente, altrimenti ne crea uno nuovo
        this.webhookUrl = await this.getWebhook();
    if (!this.webhookUrl) {
          this.webhookUrl = await this.createWebhook(this.intent);
        }
      }

  /**
   * Configura intent speciali come DEFAULT_FALLBACK, START e WEBHOOK
   */
  private configureSpecialIntents(): void {
    // Configura intent di fallback di default
    if (this.intent.intent_display_name === TYPE_INTENT_NAME.DEFAULT_FALLBACK) {
        this.isDefaultFallback = true;
      }
    
    // Configura intent di start o webhook
    if (this.intent.intent_display_name === TYPE_INTENT_NAME.START || 
        this.intent.intent_display_name === TYPE_INTENT_NAME.WEBHOOK) {
        this.isStart = true;
      this.showIntentOptions = false;
      
      // Assicura che ci sia almeno un'azione per intent di start
      if (this.intent.actions.length === 0) {
        const action = new Action();
        action._tdActionType = "intent";
          this.intent.actions.push(action);
        }
        this.startAction = this.intent.actions[0];
        // Aggiorna classi precomputate quando cambia isStart
        this.updateComputedTemplateValues();
      }
      else {
        this.setIntentSelected();
      }
  }

  /**
   * Inizializza lo stato dell'intent e configura l'azione intent
   */
  private initializeIntentState(): void {
    // Imposta l'azione intent con un piccolo delay per assicurarsi che tutto sia pronto
      setTimeout(() => {
        this.setActionIntent();
      }, 100); 
      this.isInternalIntent = checkInternalIntent(this.intent)
      this.updateIsUntitledBlock();
      // Aggiorna showIntentOptions dopo l'inizializzazione
      this.updateShowIntentOptions();
      // Verifica se il chatbot è nuovo (creato dopo il 01/06/2025)
      this.checkIfNewChatbot();
      
      // Aggiorna classi precomputate dopo checkIfNewChatbot
      this.updateComputedTemplateValues();
      this.addEventListener();
      this.setIntentAttributes();
      
      // --- Carica i connettori in ingresso iniziali ---
      this.loadConnectorsIn();
      
      // --- Sottoscriviti agli aggiornamenti dei connettori ---
      this.initConnectorsInSubscription();
      
      // Aggiorna i colori precomputati dopo l'inizializzazione
      this.updateComputedColors();
      
      // Aggiorna i valori precomputati per template
      this.updateComputedTemplateValues();
      
      // Aggiorna le espressioni booleane precomputate
      this.updateComputedBooleanExpressions();
      
      // Aggiorna showConnectorIn dopo l'inizializzazione
      this.updateShowConnectorIn();
      
      // Aggiorna hasActions e canEnterDropListResult
      this.updateHasActions();
      this.updateCanEnterDropListResult();
      
      // Aggiorna valori precomputati per actions
      this.updateCurrentActionSelectedID();
      this.updateAllActionsComputedValues();
      
      // Sottoscrivi a panZoomActive$ per disattivare cdkDrag durante pan/zoom
      this.initPanZoomSubscription();
      
      // Aggiorna i valori precomputati per cds-panel-intent-controls
      this.updateIntentControlsValues();
  }

  async getWebhook(): Promise<string | null> {
    try {
      const resp: any = await firstValueFrom(this.webhookService.getWebhook(this.chatbot_id));
      this.logger.log("[cds-intent] getWebhook : ", resp);
      const webhookUrl = resp?.webhook_id ? `${this.serverBaseURL}webhook/${resp.webhook_id}` : null;
      return webhookUrl;
    } catch (error) {
      this.logger.log("[cds-intent] error getWebhook: ", error);
      return null;
    }
  }

  async createWebhook(intent): Promise<string | null> {
    this.logger.log("[cds-intent] createWebhook : ", this.chatbot_id, intent.intent_id);
    const copilot = this.chatbotSubtype === TYPE_CHATBOT.COPILOT;
    try {
      const resp: any = await firstValueFrom(this.webhookService.createWebhook(this.chatbot_id, intent.intent_id, true, copilot));
      this.logger.log("[cds-intent] createWebhook : ", resp);
      return resp?.webhook_id ? `${this.serverBaseURL}webhook/${resp.webhook_id}` : null;
    } catch (error) {
      this.logger.log("[cds-intent] error createWebhook: ", error);
      return null;
    }
  }


  /**
   * Carica i connettori in ingresso per questo intent.
   * Viene chiamata quando l'intent viene renderizzato.
   */
  private loadConnectorsIn(): void {
    if (!this.intent?.intent_id) {
      this.logger.warn('[CONNECTORS] Intent non disponibile per caricare connettori');
      return;
    }

    // Carica i connettori in ingresso
    const connectors = this.connectorService.getConnectorsInByIntent(this.intent.intent_id);
    this.connectorsIn = [...connectors]; // Spread operator crea un nuovo array per il change detection
    this.logger.log(`[CONNECTORS] Connettori in ingresso caricati per blocco ${this.intent.intent_id}: totale ${connectors.length} connettori`);
  }

  /**
   * Inizializza la subscription a panZoomActive$ per disattivare cdkDrag durante pan/zoom.
   */
  private initPanZoomSubscription(): void {
    const keyPanZoom = 'panZoomActive';
    
    // Verifica se la subscription esiste già
    if (this.subscriptions.find(item => item.key === keyPanZoom)) {
      this.logger.log(`[CDS-INTENT] Subscription panZoomActive già esistente per blocco ${this.intent.intent_id}`);
      return;
    }

    // Sottoscrivi a panZoomActive$ per disattivare cdkDrag durante pan/zoom
    const sub = this.stageService.panZoomActive$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(isActive => {
        this.isPanOrZoomActive = isActive;
        this.cdr.markForCheck(); // Notifica OnPush
      });
    
    this.subscriptions.push({ key: keyPanZoom, value: sub });
    this.logger.log(`[CDS-INTENT] Subscription panZoomActive attiva per blocco ${this.intent.intent_id}`);
  }

  /**
   * Inizializza la subscription ai connettori in ingresso per questo intent.
   * Viene chiamata in ngOnInit quando l'intent è sicuramente disponibile.
   */
  private initConnectorsInSubscription(): void {
    if (!this.intent?.intent_id) {
      this.logger.warn('[CONNECTORS] Intent non disponibile per inizializzare subscription connettori');
      return;
    }

    const keyConnectorsIn = 'connectorsIn';
    // Evita di creare subscription duplicate
    if (this.subscriptions.find(item => item.key === keyConnectorsIn)) {
      this.logger.log(`[CONNECTORS] Subscription già esistente per blocco ${this.intent.intent_id}`);
      return;
    }

    // Usa l'observable filtrato del servizio che emette solo per questo intent
    this.logger.log(`[CONNECTORS] Mi sottoscrivo agli aggiornamenti connettori per blocco ${this.intent.intent_id}`);
    const sub = this.connectorService.getConnectorsInObservable(this.intent.intent_id)
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(connectors => {
        this.updateConnectorsIn(connectors);
      });
    
    this.subscriptions.push({ key: keyConnectorsIn, value: sub });
    this.logger.log(`[CONNECTORS] Subscription attiva per blocco ${this.intent.intent_id}`);
  }

  /**
   * Aggiorna connectorsIn con nuovi valori ricevuti dall'observable.
   * @param connectors - Array di connettori aggiornati
   */
  private updateConnectorsIn(connectors: any[]): void {
    this.connectorsIn = [...connectors]; // Spread operator crea un nuovo array per il change detection
    this.logger.log(`[CONNECTORS] Aggiorno il numero dei connettori in ingresso per blocco ${this.intent.intent_id}: totale ${connectors.length} connettori`);
    
    // Aggiorna showConnectorIn quando cambiano i connettori
    this.updateShowConnectorIn();
    
    // Aggiorna valori controlli intent (deleteOptionEnabled potrebbe cambiare)
    this.updateIntentControlsValues();
    
    // Con OnPush, notifica manualmente il change detection
    this.cdr.markForCheck();
  }


  // private setActionIntent(){
  //   try {
  //     let connectorID = '';
  //     let fromId, toId;
  //     if(this.intent.attributes.nextBlockAction){
  //       this.actionIntent = this.intent.attributes.nextBlockAction;
  //       fromId = this.actionIntent._tdActionId?this.intent.intent_id+'/'+this.actionIntent._tdActionId:null;
  //       toId = this.actionIntent.intentName?this.actionIntent.intentName.replace("#", ""):null;
  //     } else {
  //       this.actionIntent = this.intentService.createNewAction(TYPE_ACTION.INTENT);
  //       this.intent.attributes.nextBlockAction = this.actionIntent;
  //     }
  //     this.logger.log('[CDS-INTENT] actionIntent1 :: ', this.actionIntent);
  //     // this.logger.log('[CDS-INTENT] connectorID:: ', connectorID, fromId, toId);
  //     this.isActionIntent = this.intent.actions.some(obj => obj._tdActionType === TYPE_ACTION.INTENT);
  //     if(this.isActionIntent){
  //       this.actionIntent = null;
  //       if(fromId && toId && fromId !== '' && toId !== ''){
  //         connectorID = fromId+"/"+toId;
  //         this.connectorService.deleteConnector(connectorID);
  //       }
  //     }  else {
  //       if(fromId && toId && fromId !== '' && toId !== ''){
  //         if(this.stageService.loaded == true){
  //           this.connectorService.createConnectorFromId(fromId, toId);
  //         }
  //       }
  //     }
  //   } catch (error) {
  //     this.logger.log('[CDS-INTENT] error: ', error);
  //   }
  // }

  /**
   * OTTIMIZZATO: Rimossa implementazione OnChanges.
   * 
   * Perché:
   * 1. Con OnPush + getter/setter abbiamo controllo più fine
   * 2. La logica per `intent` è già gestita da subscription RxJS (behaviorIntent)
   * 3. Evitiamo chiamate inutili quando cambiano altri Input
   * 4. querySelector costoso viene chiamato solo quando necessario
   * 
   * Benefici:
   * - Con 100+ intent, evitiamo 100+ chiamate a ngOnChanges quando cambiano altri Input
   * - querySelector viene chiamato solo quando hideActionPlaceholderOfActionPanel cambia
   * - Maggiore controllo e performance
   */

  /**
   * Aggiorna la visibilità del placeholder delle action.
   * OTTIMIZZATO: Chiamato solo quando hideActionPlaceholderOfActionPanel cambia (via setter).
   * Usa ViewChild se disponibile, altrimenti querySelector come fallback.
   */
  private updateActionPlaceholderVisibility(shouldHide: boolean): void {
    // Usa requestAnimationFrame per evitare layout thrashing
    requestAnimationFrame(() => {
      // Prova prima con ViewChild se disponibile (più performante)
      // Altrimenti usa querySelector come fallback
      const addActionPlaceholderEl = this.elemenRef?.nativeElement?.querySelector('.add--action-placeholder');
      
      if (addActionPlaceholderEl instanceof HTMLElement) {
        addActionPlaceholderEl.style.opacity = shouldHide ? '0' : '1';
        this.logger.log('[CDS-INTENT] updateActionPlaceholderVisibility:', shouldHide);
      }
    });
  }

  /**
   * Gestisce la visibilità del placeholder delle azioni in base al flag hideActionPlaceholderOfActionPanel.
   * Fix per un bug dove il placeholder rimaneva visibile quando un'azione veniva trascinata dal pannello sinistro.
   */
  private handleActionPlaceholderVisibility(): void {
      const addActionPlaceholderEl = document.querySelector('.add--action-placeholder');
    
    if (!(addActionPlaceholderEl instanceof HTMLElement)) {
      return;
    }

    // Nasconde il placeholder se hideActionPlaceholderOfActionPanel è false
    if (this.hideActionPlaceholderOfActionPanel === false) {
          addActionPlaceholderEl.style.opacity = '0';
        }
    // Mostra il placeholder se hideActionPlaceholderOfActionPanel è true
    else if (this.hideActionPlaceholderOfActionPanel === true) {
          addActionPlaceholderEl.style.opacity = '1';
        }
      }


  /**
   * Imposta la disponibilità degli agenti per l'intent corrente.
   * Se agents_available non è esplicitamente false, viene impostato a true.
   */
  private setAgentsAvailable(): void {
    if (this.intent.agents_available !== false) {
      this.intent.agents_available = true;
      this.isAgentsAvailable = true;
    } else {
      this.isAgentsAvailable = false;
    }
    
    // Aggiorna classi precomputate per agents-available quando cambia isAgentsAvailable
    this.updateComputedTemplateValues();
  }

  /** updateIsUntitledBlock
   * Aggiorna la variabile isUntitledBlock basandosi sul nome dell'intent
   */
  private updateIsUntitledBlock(){
    this.isUntitledBlock = this.intent?.intent_display_name?.startsWith(UNTITLED_BLOCK_PREFIX) ?? false;
  }


    /** updateShowIntentOptions
   * Aggiorna showIntentOptions basandosi su questionCount e formSize
   * showIntentOptions deve essere false se questionCount e formSize sono entrambi == 0
   */
    private updateShowIntentOptions(){
      // Non modificare showIntentOptions se è già stato impostato a false per altri motivi
      // (es. chatbotSubtype !== CHATBOT, START, WEBHOOK)
      if(this.showIntentOptions === false){
        return;
      }
      // Imposta a false se questionCount e formSize sono entrambi 0
      if(this.questionCount === 0 && this.formSize === 0){
        this.showIntentOptions = false;
      } else {
        this.showIntentOptions = true;
      }
    }

  /** checkIfNewChatbot
   * Verifica se il chatbot è stato creato dopo il 01/06/2025
   * Se la data di creazione è precedente al 01/06/2025, isNewChatbot = false
   * Altrimenti isNewChatbot = true
   */
  private checkIfNewChatbot(): void {
    
    //this.isNewChatbot = false;
    //return;
    const cutoffDate = DATE_NEW_CHATBOT;
    const chatbot = this.dashboardService.selectedChatbot;
    this.logger.log('[CDS-INTENT] checkIfNewChatbot: ', chatbot.createdAt);


    if (!chatbot || !chatbot.createdAt) {
      // Se non c'è data di creazione, considera come nuovo chatbot
      this.isNewChatbot = true;
      this.logger.log('[CDS-INTENT] checkIfNewChatbot: nessuna data di creazione, impostato a true');
      return;
    }

    try {
      // Se la data di creazione è precedente al ... (DATE_NEW_CHATBOT), isNewChatbot = false
      // Altrimenti (successiva o uguale), isNewChatbot = true
      this.isNewChatbot = chatbot.createdAt >= cutoffDate;
      this.logger.log('[CDS-INTENT] checkIfNewChatbot:', {
        isNewChatbot: this.isNewChatbot
      });
    } catch (error) {
      this.logger.error('[CDS-INTENT] checkIfNewChatbot error:', error);
      // In caso di errore, considera come nuovo chatbot
      this.isNewChatbot = true;
    }
  }


  /**
   * Inizializza il componente dopo che la view è stata renderizzata.
   * Configura il ResizeObserver per monitorare i cambiamenti di dimensione e notifica che il componente è pronto.
   */
  ngAfterViewInit() {
    this.logger.log("[CDS-INTENT]  •••• ngAfterViewInit ••••");
    
    // Inizializza ResizeObserver solo se i connettori sono abilitati
    // Evita overhead inutile se i connettori sono disabilitati
    if (this.stageService.getConnectorsEnabled()) {
      this.setupResizeObserver();
    }
    
    // Usa requestAnimationFrame invece di setTimeout per emettere componentRendered
    // È più efficiente e si allinea al ciclo di rendering del browser
    requestAnimationFrame(() => {
      this.componentRendered.emit(this.intent.intent_id);
      // Non serve markForCheck qui: l'evento viene emesso, non cambia lo stato del componente
    });
    
    this.setIntentAttributes();
  }

  /**
   * Configura il ResizeObserver con debounce per ottimizzare le performance.
   * Il callback viene chiamato solo dopo che il resize è stabile per RESIZE_DEBOUNCE_MS ms.
   */
  private setupResizeObserver(): void {
    if (this.resizeObserver) {
      // Se esiste già, disconnetti prima di ricrearlo
      this.resizeObserver.disconnect();
    }

    this.resizeObserver = new ResizeObserver(entries => {
      // Skip se connettori sono stati disabilitati dopo l'inizializzazione
      if (!this.stageService.getConnectorsEnabled()) {
        return;
      }

      // Skip durante drag per evitare aggiornamenti inutili
      if (this.isDragging) {
        return;
      }

      // Debounce: cancella il timeout precedente e ne crea uno nuovo
      // Questo evita troppe chiamate durante resize continuo
      clearTimeout(this.resizeDebounceTimeout);
      this.resizeDebounceTimeout = setTimeout(() => {
        for (const entry of entries) {
          const nuovaAltezza = entry.contentRect.height;
          this.logger.log('[CDS-INTENT] ResizeObserver - Nuova altezza del div:', nuovaAltezza);
          this.connectorService.updateConnector(this.intent.intent_id);
        }
      }, this.RESIZE_DEBOUNCE_MS);
    });

    const elementoDom = this.resizeElement?.nativeElement;
    if (elementoDom) {
      this.resizeObserver.observe(elementoDom);
    }
  }


  /**
   * Notifica al componente padre che questo intent è stato renderizzato.
   * Usa setTimeout per assicurarsi che la notifica avvenga dopo il ciclo di rendering.
   */
  private notifyComponentRendered(): void {
    setTimeout(() => {
      this.componentRendered.emit(this.intent.intent_id);
    }, 0);
  }

  /**
   * Lifecycle hook chiamato quando il componente viene distrutto.
   * Esegue il cleanup completo di tutte le risorse per evitare memory leak.
   */
  ngOnDestroy() {
    this.logger.log('[CDS-INTENT] ngOnDestroy - Avvio cleanup componente');
  
    // Cleanup di tutte le risorse in ordine di priorità
    this.cleanupResizeObserver();
    this.cleanupEventListeners();
    this.cleanupSubscriptions();
    
    this.logger.log('[CDS-INTENT] ngOnDestroy - Cleanup completato');
  }

  /**
   * Pulisce il ResizeObserver per evitare memory leak.
   * Disconnette l'observer e imposta il riferimento a null.
   */
  private cleanupResizeObserver(): void {
    if (this.resizeObserver) {
      this.logger.log('[CDS-INTENT] Cleanup ResizeObserver');
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }

  /**
   * Pulisce tutti gli event listener aggiunti al document.
   * Rimuove gli event listener per evitare memory leak.
   */
  private cleanupEventListeners(): void {
    if (!this.eventListenersAdded) {
      return;
    }
    this.logger.log('[CDS-INTENT] Cleanup event listeners');
    
    // Rimuove tutti gli event listener aggiunti
    document.removeEventListener("connector-release-on-intent", this.handleConnectorRelease, true);
    document.removeEventListener("connector-moved-over-intent", this.handleConnectorMovedOver, true);
    document.removeEventListener("connector-moved-out-of-intent", this.handleConnectorMovedOut, true);

    this.eventListenersAdded = false;
    this.logger.log('[CDS-INTENT] Event listeners rimossi');
  }

  /**
   * Pulisce tutte le subscription RxJS per evitare memory leak.
   * Completa il Subject unsubscribe$ e pulisce l'array delle subscription.
   */
  private cleanupSubscriptions(): void {
    this.logger.log('[CDS-INTENT] Cleanup subscriptions');
    
    // Completa il Subject per terminare tutte le subscription che usano takeUntil
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
    
    // Pulisce l'array delle subscription
    this.subscriptions.forEach(subscription => {
      if (subscription.value && !subscription.value.closed) {
        subscription.value.unsubscribe();
      }
    });
    
    this.subscriptions = [];
  }

  /**
   * @deprecated Usa cleanupSubscriptions() invece di questo metodo.
   * Mantenuto per compatibilità ma non dovrebbe essere chiamato direttamente.
   */
  unsubscribe() {
    this.logger.warn('[CDS-INTENT] Metodo unsubscribe() deprecato, usa cleanupSubscriptions()');
    this.cleanupSubscriptions();
  }

  /**
   * Aggiunge event listener per gestire eventi di drag & drop dei connettori.
   * Gli event listener vengono aggiunti solo una volta per evitare duplicazioni.
   */
  addEventListener() {
    // Evita duplicazione di event listener
    if (this.eventListenersAdded) {
      return;
    }

    document.addEventListener("connector-release-on-intent", this.handleConnectorRelease, true);
    document.addEventListener("connector-moved-over-intent", this.handleConnectorMovedOver, true);
    document.addEventListener("connector-moved-out-of-intent", this.handleConnectorMovedOut, true);

    this.eventListenersAdded = true;
    this.logger.log('[CDS-INTENT] Event listeners aggiunti');
  }

  /**
   * Configura l'azione INTENT e gestisce la creazione/eliminazione dei connettori associati.
   * L'azione INTENT rappresenta la connessione tra questo intent e il prossimo intent nel flusso.
   */
  private setActionIntent(): void {
    try {
      // Configura l'azione INTENT e ottiene gli ID per i connettori
      const { actionIntent, fromId, toId } = this.configureActionIntent();
      
      // Verifica se l'intent ha già un'azione INTENT nelle sue azioni
      this.checkExistingIntentAction();
      
      // Gestisce la creazione o eliminazione dei connettori
      this.handleConnectorManagement(fromId, toId);
      
    } catch (error) {
      this.logger.error('[CDS-INTENT] Errore in setActionIntent:', error);
  }
  }

  /**
   * Configura l'azione INTENT e restituisce gli ID necessari per i connettori.
   */
  private configureActionIntent(): { actionIntent: ActionIntentConnected, fromId: string | null, toId: string | null } {
    let fromId: string | null = null;
    let toId: string | null = null;

    // Se esiste già un'azione INTENT negli attributi, la usa
    if (this.intent.attributes.nextBlockAction) {
        this.actionIntent = this.intent.attributes.nextBlockAction;
      fromId = this.buildFromId();
      toId = this.buildToId();
      } else {
      // Altrimenti crea una nuova azione INTENT
        this.actionIntent = this.intentService.createNewAction(TYPE_ACTION.INTENT);
        this.intent.attributes.nextBlockAction = this.actionIntent;
      }

    this.logger.log('[CDS-INTENT] ActionIntent configurato:', this.actionIntent);
    
    return { actionIntent: this.actionIntent, fromId, toId };
  }

  /**
   * Costruisce l'ID di origine per il connettore.
   */
  private buildFromId(): string | null {
    return this.actionIntent._tdActionId 
      ? `${this.intent.intent_id}/${this.actionIntent._tdActionId}`
      : null;
  }

  /**
   * Costruisce l'ID di destinazione per il connettore.
   */
  private buildToId(): string | null {
    return this.actionIntent.intentName 
      ? this.actionIntent.intentName.replace("#", "")
      : null;
  }

  /**
   * Verifica se l'intent ha già un'azione INTENT nelle sue azioni.
   * Se sì, rimuove l'azione INTENT dagli attributi.
   */
  private checkExistingIntentAction(): void {
    this.isActionIntent = this.intent.actions.some(action => action._tdActionType === TYPE_ACTION.INTENT);
    
    if (this.isActionIntent) {
      this.logger.log('[CDS-INTENT] Intent ha già un\'azione INTENT, rimuovo actionIntent');
        this.actionIntent = null;
    }
  }

  /**
   * Gestisce la creazione o eliminazione dei connettori in base alla presenza di azioni INTENT.
   */
  private handleConnectorManagement(fromId: string | null, toId: string | null): void {
    // Se non ci sono ID validi, non fare nulla
    if (!areValidIds(fromId, toId)) {
      return;
    }

    const connectorId = `${fromId}/${toId}`;

    if (this.isActionIntent) {
      // Se c'è già un'azione INTENT, elimina il connettore
      this.logger.log('[CDS-INTENT] Eliminazione connettore:', connectorId);
      this.connectorService.deleteConnector(this.intent, connectorId);
    } else if (this.stageService.loaded) {
      // Se non c'è un'azione INTENT e lo stage è caricato, crea il connettore
      this.logger.log('[CDS-INTENT] Creazione connettore:', connectorId);
      this.connectorService.createConnectorFromId(fromId, toId);
    }
  }

  /**
   * Aggiunge una classe CSS a un elemento dell'intent.
   * Utilizzato per applicare stili di stato attivo o di selezione.
   * 
   * @param className - Nome della classe CSS da aggiungere
   * @param componentID - Selettore CSS per identificare l'elemento target
   */
  private addCssClassIntentActive(className: string, componentID: string): void {
    addCssClassToElement(this.elemenRef, className, componentID, this.logger);
  }

  /**
   * Rimuove una classe CSS da un elemento dell'intent.
   * Utilizzato per rimuovere stili di stato attivo o di selezione.
   * 
   * @param className - Nome della classe CSS da rimuovere
   * @param componentID - Selettore CSS per identificare l'elemento target
   */
  private removeCssClassIntentActive(className: string, componentID: string): void {
    this.logger.log('[CDS-INTENT] ngOnInit-->', this.intent);
    if(this.intent) {
      removeCssClassFromElement(this.elemenRef, className, componentID, this.logger);
    }
  }

  /**
   * Configura gli attributi dell'intent, in particolare il colore.
   * Inizializza gli attributi se non esistono e imposta il colore di default se non specificato.
   */
  /**
   * Resetta i contatori dell'intent (azioni, domande, form).
   */
  private resetIntentCounters(): void {
    this.listOfActions = null;
    this.formSize = 0;
    this.questionCount = 0;
  }

  /**
   * Configura lo stato dell'intent quando viene selezionato.
   * Inizializza le proprietà dell'intent e calcola le metriche (azioni, domande, form).
   */
  private setIntentSelected(): void {
    try {
      // Reset delle proprietà di conteggio
      this.resetIntentCounters();
      
      if (this.intent) {
        // Configura la posizione degli attributi
        this.patchAttributesPosition();
        
        // Configura le azioni dell'intent
        this.configureIntentActions();
        
        // Calcola le metriche usando le funzioni del servizio
        const metrics = this.intentService.setIntentSelectedWithMetrics(this.intent);
        this.questionCount = metrics.questionCount;
        this.formSize = metrics.formSize;
      }
      // Aggiorna showIntentOptions basandosi su questionCount e formSize
      this.updateShowIntentOptions();
      this.logger.debug("[CDS-INTENT] Intent selezionato configurato:", this.intent?.intent_id);
    } catch (error) {
      this.logger.error("[CDS-INTENT] Errore nella configurazione dell'intent selezionato:", error);
    }
  }

  /**
   * Configura gli attributi dell'intent, in particolare il colore.
   * Inizializza gli attributi se non esistono e imposta il colore di default se non specificato.
   */
  private setIntentAttributes(): void {
    if (!this.intent?.attributes) {
      this.intent['attributes'] = {};
    }
    if(this.intent.attributes.color && this.intent.attributes.color !== undefined){
      const nwColor = this.intent.attributes.color;
      this.intentColor = nwColor;
    } else {
      this.intentColor = INTENT_COLORS.COLOR1;
      this.intent.attributes.color = INTENT_COLORS.COLOR1;
    }
    
    // Precomputa i colori per evitare calcoli nel template
    this.updateComputedColors();
  }

  /**
   * Calcola il colore equivalente senza trasparenza.
   * Converte rgba(r, g, b, 0.35) su sfondo bianco in rgb equivalente.
   * Formula: result = (foreground * alpha) + (background * (1 - alpha))
   * @param colorString Stringa nel formato "r, g, b" (es. "255, 0, 0")
   * @returns Stringa rgb equivalente (es. "rgb(242, 242, 255)")
   */
  private computeBackgroundColor(colorString: string): string {
    if (!colorString) {
      return 'rgb(255, 255, 255)';
    }
    
    const parts = colorString.split(',').map(s => parseInt(s.trim(), 10));
    if (parts.length !== 3 || parts.some(isNaN)) {
      return 'rgb(255, 255, 255)';
    }
    
    const [r, g, b] = parts;
    const alpha = 0.35;
    const white = 255;
    
    // Calcolo: (colore * alpha) + (bianco * (1 - alpha))
    const resultR = Math.round((r * alpha) + (white * (1 - alpha)));
    const resultG = Math.round((g * alpha) + (white * (1 - alpha)));
    const resultB = Math.round((b * alpha) + (white * (1 - alpha)));
    
    return `rgb(${resultR}, ${resultG}, ${resultB})`;
  }

  /**
   * Calcola lo stile outline se l'intent è selezionato.
   * @param colorString Stringa nel formato "r, g, b"
   * @returns Stringa outline o 'none'
   */
  private computeOutlineStyle(colorString: string, isSelected: boolean, isActive: boolean): string {
    if (!isSelected || !isActive || !colorString) {
      return 'none';
    }
    
    return `2px solid rgb(${colorString})`;
  }

  /**
   * Aggiorna i colori precomputati basandosi sullo stato corrente dell'intent.
   */
  private updateComputedColors(): void {
    const colorString = this.intent?.attributes?.color || INTENT_COLORS.COLOR1;
    const isSelected = this.intentService.intentSelectedID === this.intent?.intent_id;
    const isActive = this.intentService.intentActive;
    
    this.backgroundColor = this.computeBackgroundColor(colorString);
    this.outlineStyle = this.computeOutlineStyle(colorString, isSelected, isActive);
    
    // Aggiorna outline style per actions quando cambia il colore
    this.updateAllActionsComputedValues();
    
    // Con OnPush, dobbiamo notificare manualmente il change detection
    this.cdr.markForCheck();
  }

  /**
   * Aggiorna i valori precomputati per template (id, classi).
   * Chiamato quando cambiano isStart, isNewChatbot o intent.
   */
  private updateComputedTemplateValues(): void {
    // Precomputa ID per evitare concatenazione stringa nel template
    this.intentContentId = this.intent?.intent_id ? `intent-content-${this.intent.intent_id}` : '';
    
    // Precomputa ID block-header per evitare concatenazione stringa nel template
    this.blockHeaderId = this.intent?.intent_id ? `block-header-${this.intent.intent_id}` : '';
    
    // Precomputa classi per evitare binding multipli
    this.intentClasses = {
      'isStart': this.isStart,
      'tds-slim-intent': this.isNewChatbot
    };
    
    // Precomputa classi per agents-available (evita binding classe valutato ad ogni change detection)
    this.agentsAvailableClasses = {
      'isStart': this.isStart && this.isAgentsAvailable
    };
    
    // Aggiorna showConnectorIn quando cambia isStart
    this.updateShowConnectorIn();
  }

  /**
   * Aggiorna le espressioni booleane precomputate per evitare valutazioni nel template.
   * Chiamato quando cambiano questionCount o formSize.
   */
  private updateComputedBooleanExpressions(): void {
    this.hasQuestions = this.questionCount > 0;
    this.hasForm = this.formSize > 0;
  }

  /**
   * Aggiorna hasActions basandosi su listOfActions.length.
   * Chiamato quando cambia listOfActions.
   */
  private updateHasActions(): void {
    this.hasActions = (this.listOfActions?.length ?? 0) > 0;
  }

  /**
   * Aggiorna canEnterDropListResult basandosi su canEnterDropList(intent).
   * Chiamato quando cambiano le dipendenze.
   */
  private updateCanEnterDropListResult(): void {
    // canEnterDropList ritorna una funzione, quindi dobbiamo chiamarla e verificare il risultato
    // Per semplicità, memoizziamo il risultato della funzione canEnterDropList
    // La funzione canEnterDropList ritorna una funzione predicate, quindi dobbiamo testarla
    // Per ora, assumiamo che il risultato dipenda solo da isNewChatbot e listOfActions.length
    this.canEnterDropListResult = !(this.isNewChatbot && (this.listOfActions?.length ?? 0) > 0);
  }

  /**
   * Aggiorna le classi precomputate per una action specifica.
   * @param action - Action per cui calcolare le classi
   * @param isLast - Se è l'ultima action nella lista
   */
  private updateActionClasses(action: Action, isLast: boolean): { [key: string]: boolean } {
    // CORRETTO: Logica corretta (rimossa doppia negazione errata)
    const isNoFeaturedAction = action._tdActionType !== TYPE_ACTION.REPLY 
      && action._tdActionType !== TYPE_ACTION_VXML.DTMF_FORM 
      && action._tdActionType !== TYPE_ACTION_VXML.BLIND_TRANSFER;
    
    return {
      'cds-no-featured-action': isNoFeaturedAction,
      'cds-last-action': isLast
    };
  }

  /**
   * Aggiorna l'outline style precomputato per una action specifica.
   * @param action - Action per cui calcolare l'outline style
   */
  private updateActionOutlineStyle(action: Action): string {
    const isSelected = this.currentActionSelectedID === action._tdActionId;
    if (isSelected) {
      const color = this.intent?.attributes?.color || INTENT_COLORS.COLOR1;
      return `2px solid rgba(${color}, 1)`;
    }
    return 'none';
  }

  /**
   * Aggiorna currentActionSelectedID dal servizio.
   * Chiamato quando cambia actionSelectedID nel servizio.
   */
  private updateCurrentActionSelectedID(): void {
    this.currentActionSelectedID = this.intentService.actionSelectedID;
  }

  /**
   * Aggiorna tutte le classi e gli stili precomputati per tutte le actions.
   * Chiamato quando cambiano listOfActions, actionSelectedID, o intent.attributes.color.
   */
  private updateAllActionsComputedValues(): void {
    // Aggiorna currentActionSelectedID prima di calcolare gli stili
    this.updateCurrentActionSelectedID();
    
    if (!this.listOfActions || this.listOfActions.length === 0) {
      this.actionClasses.clear();
      this.actionOutlineStyle.clear();
      return;
    }

    // Aggiorna classi e stili per ogni action
    this.listOfActions.forEach((action, index) => {
      const isLast = index === this.listOfActions.length - 1;
      const actionId = action._tdActionId || `action-${index}`;
      
      // Aggiorna classi
      this.actionClasses.set(actionId, this.updateActionClasses(action, isLast));
      
      // Aggiorna outline style
      this.actionOutlineStyle.set(actionId, this.updateActionOutlineStyle(action));
    });
  }

  /**
   * Aggiorna showConnectorIn basandosi su isStart, connectorsIn e stageService.getConnectorsEnabled().
   * Chiamato quando cambiano le dipendenze per evitare valutazione espressione complessa nel template.
   */
  private updateShowConnectorIn(): void {
    this.showConnectorIn = !this.isStart 
      && (this.connectorsIn?.length ?? 0) > 0 
      && this.stageService.getConnectorsEnabled();
  }

  /**
   * Aggiorna i valori precomputati per cds-panel-intent-controls.
   * Elimina valutazioni nel template e accessi diretti a proprietà intent.
   */
  private updateIntentControlsValues(): void {
    // Precomputa deleteOptionEnabled invece di valutare listOfActions?.length > 0 nel template
    this.deleteOptionEnabled = (this.listOfActions?.length ?? 0) > 0;
    
    // Precomputa displayName invece di accedere a intent.intent_display_name nel template
    this.displayName = this.intent?.intent_display_name || '';
    
    // Precomputa webhookEnabled invece di accedere a intent.webhook_enabled nel template
    this.webhookEnabled = this.intent?.webhook_enabled || false;
  }

  private setIntentSelected_2() {
    this.listOfActions = null;
    this.formSize = 0;
    this.questionCount = 0;
    try {
      if (this.intent) {
        // document.documentElement.style.setProperty('--intent-color', `rgba(${this.intentColor}, 1)`);
        /** // this.patchAllActionsId(); */
        this.patchAttributesPosition();
        this.listOfActions = this.intent.actions;
        
        // Aggiorna valori controlli intent (deleteOptionEnabled potrebbe cambiare)
        this.updateIntentControlsValues();
        if (this.intent.question) {
          const question_segment = this.intent.question.split(/\r?\n/).filter(element => element);
          this.questionCount = question_segment.length;
        }
      }
      if (this.intent?.form && (this.intent.form !== null)) {
        this.formSize = Object.keys(this.intent.form).length;
      } else {
        this.formSize = 0;
      }
      
      // Aggiorna espressioni booleane precomputate
      this.updateComputedBooleanExpressions();
      
      // Aggiorna showIntentOptions basandosi su questionCount e formSize
      this.updateShowIntentOptions();
    } catch (error) {
      this.logger.error("error: ", error);
    }
  }

  /**
   * Configura le azioni dell'intent.
   */
  private configureIntentActions(): void {
        this.listOfActions = this.intent.actions;
    this.logger.debug("[CDS-INTENT] Azioni configurate:", this.listOfActions?.length || 0);
  }

  /**
   * Assicura che l'intent abbia gli attributi di posizione configurati.
   * Crea gli attributi se non esistono e imposta la posizione di default.
   */
  private patchAttributesPosition(): void {
    this.intentService.patchAttributesPosition(this.intent);
  }

  /**
   * Ottiene i parametri di configurazione per un'azione specifica.
   * Cerca l'azione nell'enum TYPE_ACTION e restituisce la configurazione corrispondente.
   * 
   * @param action - L'azione per cui ottenere i parametri
   * @returns La configurazione dell'azione o undefined se non trovata
   */
  getActionParams(action: any): any {
    return this.intentService.getActionParams(action, TYPE_ACTION, ACTIONS_LIST);
  }

  private copyIntent(){
    let intent = JSON.parse(JSON.stringify(this.intent));
    const element = {element: intent, type: 'INTENT', chatbot:this.intent.id_faq_kb, intentId: this.intent.intent_id}
    let data = this.intentService.copyElement(element);
    this.appStorageService.setItem(data.key, data.data)
  }

  private copyAction(ele){
    let action = JSON.parse(JSON.stringify(ele));
    const element = {element: action, type: 'ACTION', chatbot:this.intent.id_faq_kb, intentId: this.intent.intent_id}
    let data = this.intentService.copyElement(element);
    this.appStorageService.setItem(data.key, data.data)
  }

  toggleIntentWebhook(intent) {
    this.logger.log('[CDS-INTENT] toggleIntentWebhook  intent ', intent)
    this.logger.log('[CDS-INTENT] toggleIntentWebhook  intent webhook_enabled ', intent.webhook_enabled)
    this.intentService.setIntentSelected(this.intent.intent_id);
    this.updateComputedColors(); // Aggiorna outline se l'intent viene selezionato
    intent.webhook_enabled = !intent.webhook_enabled;
    this.intentService.updateIntent(this.intent, null);
  }

  openIntentPanel(intent: Intent){
    this.intentService.setIntentSelected(this.intent.intent_id);
    this.updateComputedColors(); // Aggiorna outline se l'intent viene selezionato
    this.openIntent.emit(intent);
  }

  setConnectorColor(color: string){
    const nwColor = color ?? INTENT_COLORS.COLOR1;
    const opacity = 0.7;
    const intentFromId = this.intent.intent_id;
    this.connectorService.setConnectorColor(intentFromId, nwColor, opacity);
  }

  changeIntentColor(color){
    if(color){
      this.intentColor = color;
      this.intent.attributes.color = color;
      this.setConnectorColor(color);
      this.intentService.updateIntent(this.intent);
      
      // Aggiorna i colori precomputati
      this.updateComputedColors();
    }
  }


  // =============================
  // TEMPLATE HELPER METHODS
  // =============================

  /**
   * Genera gli stili dinamici per l'intent
   * Ottimizza le performance evitando calcoli inline nel template
   * 
   * @returns Oggetto con gli stili CSS per l'intent
   */
  getIntentStyles(): { [key: string]: string } {
    if (!this.intent?.attributes?.color) {
      return {};
    }

    const color = this.intent.attributes.color;
    const isSelected = this.intentService.intentSelectedID === this.intent.intent_id && this.intentService.intentActive;
    
    return {
      'background-color': `rgba(${color}, 0.35)`,
      'outline': isSelected ? `2px solid rgba(${color}, 1)` : 'none'
    };
  }

  /**
   * Genera gli stili dinamici per l'azione
   * Ottimizza le performance evitando calcoli inline nel template
   * 
   * @param action - L'azione per cui generare gli stili
   * @returns Oggetto con gli stili CSS per l'azione
   */
  getActionStyles(action: Action): { [key: string]: string } {
    if (!this.intent?.attributes?.color || !action?._tdActionId) {
      return {};
    }

    const color = this.intent.attributes.color;
    const isSelected = this.intentService.actionSelectedID === action._tdActionId;
    
    return {
      'outline': isSelected ? `2px solid rgba(${color}, 1)` : 'none'
    };
  }


  /**
   * Verifica se un'azione è considerata "featured" (principale)
   * Semplifica la logica condizionale nel template
   * 
   * @param action - L'azione da verificare
   * @returns true se l'azione è featured, false altrimenti
   */
  isFeaturedAction(action: Action): boolean {
    if (!action?._tdActionType) {
      return false;
    }

    return action._tdActionType === TYPE_ACTION.REPLY || 
           action._tdActionType === TYPE_ACTION_VXML.DTMF_FORM || 
           action._tdActionType === TYPE_ACTION_VXML.BLIND_TRANSFER;
  }

  // =============================
  // EVENT HANDLERS - CALLED FROM HTML TEMPLATE
  // =============================

  /**
   * Gestisce la selezione di un'azione nell'intent
   * @param action - L'azione selezionata
   * @param index - L'indice dell'azione nella lista
   * @param idAction - Il tipo di selezione (HAS_SELECTED_TYPE)
   */
  onActionSelect(action: any, index: number, idAction: HAS_SELECTED_TYPE): void {
    this.logger.log('[CDS-INTENT] onActionSelect - action:', action, 'index:', index, 'idAction:', idAction);
    
    // Imposta il tipo di elemento selezionato
    this.elementTypeSelected = idAction;
    
    // Seleziona l'azione nel service
    this.intentService.selectAction(this.intent.intent_id, idAction);
    
    // Emette l'evento di selezione con i dettagli dell'azione
    this.actionSelected.emit({ 
      action: action, 
      index: index, 
      maxLength: this.listOfActions.length 
    });
  }

  /**
   * Gestisce la selezione della domanda dell'intent
   * @param elementSelected - Il tipo di elemento selezionato (HAS_SELECTED_TYPE.QUESTION)
   */
  onQuestionSelect(elementSelected: HAS_SELECTED_TYPE): void {
    this.logger.log('[CDS-INTENT] onQuestionSelect - elementSelected:', elementSelected, 'question:', this.intent.question);
    
    // Imposta il tipo di elemento selezionato
    this.elementTypeSelected = elementSelected;
    this.intentService.setIntentSelected(this.intent.intent_id)
    this.updateComputedColors(); // Aggiorna outline se l'intent viene selezionato
    /** // this.isIntentElementSelected = true; */
    this.questionSelected.emit(this.intent.question);
  }

  /**
   * Gestisce la selezione del form dell'intent
   * @param elementSelected - Il tipo di elemento selezionato (HAS_SELECTED_TYPE.FORM)
   */
  onFormSelect(elementSelected: HAS_SELECTED_TYPE): void {
    this.logger.log('[CDS-INTENT] onFormSelect - elementSelected:', elementSelected);
    
    // Imposta il tipo di elemento selezionato
    this.elementTypeSelected = elementSelected;
    this.intentService.setIntentSelected(this.intent.intent_id)
    this.updateComputedColors(); // Aggiorna outline se l'intent viene selezionato
    if (this.intent && !this.intent.form) {
      this.intent.form = new Form();
      this.logger.log('[CDS-INTENT] onFormSelect - Creato nuovo form per intent:', this.intent.intent_id);
    }
    
    // Emette l'evento con il form dell'intent
    this.formSelected.emit(this.intent.form);
  }

  /**
   * Gestisce i controlli sulle azioni (edit, delete, copy)
   * @param event - Il tipo di evento ('copy' | 'delete' | 'edit')
   * @param action - L'azione su cui eseguire il controllo
   * @param index - L'indice dell'azione nella lista
   */
  onActionControl(event: 'copy' | 'delete' | 'edit', action: Action, index: number): void {
    this.logger.log('[CDS-INTENT] onActionControl - event:', event, 'action:', action);
    
    switch (event) {
      case 'edit':
        // Seleziona l'azione per la modifica
        this.onActionSelect(action, index, action._tdActionId);
        break;
        
      case 'delete':
        // Rimuove i connettori associati all'azione
        this.intent.attributes.connectors = this.intentService.deleteIntentAttributesConnectorByAction(
          action._tdActionId, 
          this.intent
        );
        
        // Seleziona e elimina l'azione
        this.intentService.selectAction(this.intent.intent_id, action._tdActionId);
      this.intentService.deleteSelectedAction();
        break;
        
      case 'copy':
        // Copia l'azione
      this.copyAction(action);
        break;
        
      default:
        this.logger.warn('[CDS-INTENT] onActionControl - Evento non gestito:', event);
        break;
    }
  }

  /**
   * Gestisce gli eventi di tastiera per le azioni
   * @param event - L'evento di tastiera
   */
  onKeyPress(event: KeyboardEvent): void {
    this.logger.log('[CDS-INTENT] onKeyPress - key:', event.key);
    
    // Chiavi che attivano l'eliminazione dell'azione selezionata
    const deleteKeys = ['Backspace', 'Escape', 'Canc'];
    
    if (deleteKeys.includes(event.key)) {
      this.logger.log('[CDS-INTENT] onKeyPress - Eliminazione azione selezionata tramite tasto:', event.key);
      this.intentService.deleteSelectedAction();
      
      // Aggiorna valori precomputati per actions quando viene eliminata un'action
      this.updateCurrentActionSelectedID();
      this.updateAllActionsComputedValues();
      this.cdr.markForCheck();
    }
  }

  /**
   * Gestisce il movimento del drag preview durante il drag & drop
   * @param event - L'evento di movimento del drag
   */
  public onDragPreviewMove(event: CdkDragMove): void {
    const element = document.getElementById('customDragPreview');
    if (element) {
      // Calcola la posizione del preview con offset per centrarlo
      const xPos = event.pointerPosition.x - 122;
      const yPos = event.pointerPosition.y - 20;
      element.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
    }
}

  /**
   * Gestisce l'inizio del drag & drop di un'azione
   * @param event - L'evento di drag
   * @param previousIntentId - ID dell'intent precedente
   * @param index - Indice dell'azione
   */
  onDragStart(event: any, previousIntentId: string, index: number): void {
    this.logger.log('[CDS-INTENT] onDragStart - event:', event, 'previousIntentId:', previousIntentId, 'index:', index);
    
    // Chiude il pannello dei dettagli dell'azione
    this.controllerService.closeActionDetailPanel();
    
    // Imposta l'ID dell'intent precedente e lo stato di dragging
    this.intentService.setPreviousIntentId(previousIntentId);
    this.isDragging = true;
    this.logger.log('[CDS-INTENT] onDragStart - isDragging:', this.isDragging);
    
    // Nascondi controlli durante drag (requisito UX)
    this.hideIntentControls();
    
    // ----------------------------------
    // Hide action arrow on drag started 
    // ----------------------------------
    // const actionArrowElem = <HTMLElement>document.querySelector(`#action-arrow-${index}`);
    // actionArrowElem.style.display = 'none';
    // this.logger.log('[CDS-INTENT] onDragStarted actionArrowElem', actionArrowElem)
    // const actionDragPlaceholderWidth = actionDragPlaceholder.offsetWidth;
    // this.logger.log('[CDS-INTENT] onDragStarted actionDragPlaceholderWidth', actionDragPlaceholderWidth)

    // --------------------------------------------------------------------------------------------------
    // Bug fix: When an action is dragged, the "drag placeholder" moves up and changes size to full width
    // --------------------------------------------------------------------------------------------------
    const actionDragPlaceholder = document.querySelector('.action-drag-placeholder');
    const addActionPlaceholderEl = document.querySelector('.add--action-placeholder');

    this.logger.log('[CDS-INTENT] onDragStart - actionDragPlaceholder:', actionDragPlaceholder);
    this.logger.log('[CDS-INTENT] onDragStart - addActionPlaceholderEl:', addActionPlaceholderEl);
    
    // Crea un observer per monitorare il ridimensionamento del placeholder
    const resizeObserver = new ResizeObserver(entries => {
      entries.forEach(entry => {
        this.actionDragPlaceholderWidth = entry.contentRect.width;
        this.logger.log('[CDS-INTENT] onDragStart - placeholder width:', this.actionDragPlaceholderWidth);
        
        // Gestisce la visibilità dei placeholder in base alla larghezza
        this.handlePlaceholderVisibility(actionDragPlaceholder, addActionPlaceholderEl);
      });
    });
    
    // Inizia a osservare il placeholder
    if (actionDragPlaceholder) {
      resizeObserver.observe(actionDragPlaceholder);
    }
  }



  /** onDragEnded
   * get the action moved and update its connectors */
  onDragEnded(event, index) {
    this.logger.log('[CDS-INTENT] onDragEnded: ', event, this.intent.intent_id);
    this.isDragging = false;
    
    // Dopo drag, i controlli verranno mostrati solo se in hover (gestito da onIntentMouseEnter)
    // Non mostrare immediatamente per evitare flickering
    
    this.connectorService.updateConnector(this.intent.intent_id);
    /** 
    // const previousIntentId = this.intentService.previousIntentId;
    // if(previousIntentId){
    //   this.logger.log("[CDS-INTENT] onDropAction previousIntentId: ", previousIntentId);
    //   this.connectorService.updateConnector(previousIntentId);
    // }
    // this.connectorService.updateConnector(this.intent.intent_id);
    // */
  }


  /** Predicate function that only allows type='intent' to be dropped into a list. */
  canEnterDropList(action: any) {
    return (item: CdkDrag<any>) => {
      // Se il chatbot è nuovo, disabilita il drop se c'è già un'action nell'intent
      // Mantiene il limite di una action per blocco intent per i chatbot nuovi
      if (this.isNewChatbot && this.intent.actions && this.intent.actions.length > 0) {
        return false;
      }
      // Per i chatbot esistenti, permette il drop normalmente
      return true;
    }
  }

  /**
   * Gestisce la fine del drag & drop di un'azione
   * @param event - L'evento di drag
   * @param index - Indice dell'azione
   */
  onDragEnd(event: any, index: number): void {
    this.logger.log('[CDS-INTENT] onDragEnd - event:', event, 'intentId:', this.intent.intent_id, 'index:', index);
    
    // Resetta lo stato di dragging
    this.isDragging = false;
    
    // Aggiorna i connettori dell'intent
    this.connectorService.updateConnector(this.intent.intent_id);
  }

  /**
   * Gestisce il drop di un'azione nell'intent
   * @param event - L'evento di drop
   */
  async onActionDrop(event: CdkDragDrop<string[]>): Promise<void> {
    this.logger.log('[CDS-INTENT] onActionDrop - event:', event, 'actions:', this.intent.actions);
    
    // Se è un nuovo chatbot e l'intent ha già almeno un'azione, non permettere il drop
    if (this.isNewChatbot && this.listOfActions?.length > 0 && event.previousContainer !== event.container) {
      this.logger.log('[CDS-INTENT] onActionDrop - Drop negato: isNewChatbot è true e l\'intent ha già un\'azione');
      return;
    }
    
    // Aggiorna listOfActions dopo il drop
    this.listOfActions = this.intent.actions;
    this.updateHasActions();
    this.updateCanEnterDropListResult();
    this.updateAllActionsComputedValues();
    
    // Per i chatbot esistenti, esegue il drop normalmente
    this.controllerService.closeAllPanels();
    this.intentService.setIntentSelected(this.intent.intent_id);
    this.updateComputedColors(); // Aggiorna outline se l'intent viene selezionato
    if (event.previousContainer === event.container) {
      // Spostamento all'interno dello stesso container
      this.handleInternalDrop(event);
    } else {
      // Spostamento tra container diversi
      await this.handleExternalDrop(event);
    }
  }

  /**
   * Gestisce l'aggiornamento e il salvataggio di un'azione
   * @param object - L'oggetto azione da aggiornare
   */
  public async onActionUpdate(object: any): Promise<void> {
    this.logger.log('[CDS-INTENT] onActionUpdate - object:', object);
    
    // Aggiorna l'azione nella lista se ha un ID
    if (object?._tdActionId) {
      this.intent.actions = replaceItemInArrayForKey('_tdActionId', this.intent.actions, object);
      this.logger.log('[CDS-INTENT] onActionUpdate - Azione aggiornata nella lista');
    }
    
    // Salva l'intent aggiornato
    this.intentService.updateIntent(this.intent);
    this.logger.log('[CDS-INTENT] onActionUpdate - Intent salvato');
  }

  /**
   * Gestisce i click sulle opzioni dell'intent (webhook, color, delete, test, copy, open)
   * @param event - Il tipo di evento selezionato
   */
  onIntentOptionClick(event: 'webhook' | 'color' | 'delete' | 'test' | 'copy' | 'open'): void {
    this.logger.log('[CDS-INTENT] onIntentOptionClick - event:', event);
    
    switch (event) {
      case 'webhook':
        this.toggleIntentWebhook(this.intent);
        break;
      case 'color':
        this.onIntentColorChange(this.intent);
        break;
      case 'delete':
        this.onIntentDelete(this.intent);
        break;
      case 'test':
        this.onIntentTest();
        break;
      case 'copy':
        this.copyIntent();
        break;
      case 'open':
        this.openIntentPanel(this.intent);
        break;
      default:
        this.logger.warn('[CDS-INTENT] onIntentOptionClick - Evento non gestito:', event);
        break;
    }
  }

  /**
   * Apre la modalità di test per l'intent
   */
  onIntentTest(): void {
    this.logger.log('[CDS-INTENT] onIntentTest - Apertura test per intent:', this.intent.intent_id);
    this.intentService.openTestItOut(this.intent);
  }

  /**
   * Gestisce l'eliminazione di un intent
   * @param intent - L'intent da eliminare
   */
  onIntentDelete(intent: Intent): void {
    this.logger.log('[CDS-INTENT] onIntentDelete - Eliminazione intent:', intent.intent_id);
    this.deleteIntent.emit(intent);
  }

  /**
   * Gestisce il cambio colore di un intent
   * @param intent - L'intent per cui cambiare il colore
   */
  onIntentColorChange(intent: Intent): void {
    this.logger.log('[CDS-INTENT] onIntentColorChange - Cambio colore per intent:', intent.intent_id);
    
    // Seleziona l'intent e emette l'evento di cambio colore
    this.intentService.setIntentSelected(this.intent.intent_id);
    this.changeColorIntent.emit(intent);
  }

  /**
   * Gestisce l'evento di click per aprire il pannello webhook dell'intent
   * @param intent - L'intent per cui aprire il pannello webhook
   */
  onWebhookPanelOpen(intent: Intent): void {
    const webhookIntent = this.intent.intent_display_name === TYPE_INTENT_NAME.WEBHOOK;
    if (webhookIntent) {
      this.logger.log('[CDS-INTENT] onWebhookPanelOpen - Apertura pannello webhook per intent:', intent.intent_id);
      this.openIntentPanel(intent);
    }
  }

  /**
   * OTTIMIZZATO: Usa timestamp invece di hasMouseMoved per distinguere click da drag.
   * Se mousedown + click < CLICK_MAX_DURATION_MS = click veloce (non drag).
   */
  onOpenIntentPanel(intent: Intent, event?: MouseEvent){
    this.logger.log('[CDS-INTENT] onOpenIntentPanel > intent', this.intent, " con : ", intent);
    
    // FIX: Non aprire il panel se il click è sui controlli intent (evita interferenza)
    if (event) {
      const target = event.target as HTMLElement;
      const isClickOnControls = target.closest('cds-panel-intent-controls') !== null 
        || target.closest('.intent-header-action-btn') !== null
        || target.closest('.intent-header-actions-wpr') !== null;
      
      if (isClickOnControls) {
        // Il click è sui controlli, lascia che gestiscano l'evento
        return;
      }
    }
    
    // Calcola durata tra mousedown e click
    const clickDuration = Date.now() - this.mouseDownTimestamp;
    const isQuickClick = clickDuration < this.CLICK_MAX_DURATION_MS;
    
    // Only open panel if it was a quick click (not drag) and other conditions are met
    if(isQuickClick && !intent['attributesChanged'] && this.isStart && !this.IS_OPEN_PANEL_INTENT_DETAIL){
      this.openIntentPanel(intent);
    }
  }

  /**
   * OTTIMIZZATO: Usa timestamp invece di mousemove per distinguere click da drag.
   * Elimina la necessità di (mousemove) su ogni intent (100+ listener).
   * FIX: Non nascondere controlli se il click è sui controlli stessi (evita regressione).
   */
  onIntentMouseDown(event: MouseEvent): void {
    this.mouseDownTimestamp = Date.now();
    
    // FIX: Non nascondere controlli se il click è sui controlli intent (evita regressione)
    // Verifica se il click è su un elemento dentro cds-panel-intent-controls o sui suoi bottoni
    const target = event.target as HTMLElement;
    const isClickOnControls = target.closest('cds-panel-intent-controls') !== null 
      || target.closest('.intent-header-action-btn') !== null
      || target.closest('.intent-header-actions-wpr') !== null;
    
    if (!isClickOnControls) {
      // Nascondi controlli immediatamente su mousedown solo se non si clicca sui controlli (requisito UX)
      this.hideIntentControls();
    }
  }

  /**
   * RIMOSSO: onIntentMouseMove non è più necessario.
   * Usiamo timestamp in mousedown + durata click per distinguere click da drag.
   */

  /**
   * Gestisce l'evento mouseenter per mostrare i controlli intent dopo 500ms.
   * OTTIMIZZATO: Debounce 500ms per evitare flickering e ridurre overhead rendering.
   */
  onIntentMouseEnter(event: MouseEvent): void {
    // Skip se in drag (controlli devono rimanere nascosti)
    if (this.isDragging) {
      return;
    }
    
    // Cancella timeout precedente se esiste (hover rapido)
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }
    
    // Mostra controlli dopo 500ms (requisito UX)
    this.hoverTimeout = setTimeout(() => {
      if (!this.isDragging) { // Double-check: non mostrare se drag iniziato durante hover
        this.showIntentControls = true;
        this.cdr.markForCheck(); // Con OnPush, notifica manualmente il change detection
      }
      this.hoverTimeout = null;
    }, this.HOVER_DELAY_MS);
  }

  /**
   * Gestisce l'evento mouseleave per nascondere immediatamente i controlli intent.
   * OTTIMIZZATO: Nasconde subito per ridurre overhead rendering.
   */
  onIntentMouseLeave(event: MouseEvent): void {
    // Cancella timeout hover se ancora attivo (hover rapido < 500ms)
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }
    
    // Nascondi controlli immediatamente
    this.hideIntentControls();
  }

  /**
   * Nasconde i controlli intent immediatamente.
   * Chiamato su mousedown, drag start, e mouseleave.
   */
  private hideIntentControls(): void {
    if (this.showIntentControls) {
      this.showIntentControls = false;
      this.cdr.markForCheck(); // Con OnPush, notifica manualmente il change detection
    }
  }

  /**
   * Gestisce l'evento di click per aprire il menu delle azioni
   * @param intent - L'intent per cui aprire il menu
   * @param calleBy - Identificatore del chiamante per posizionamento
   */
  onActionMenuOpen(intent: any, calleBy: string): void {
    this.logger.log('[CDS-INTENT] onActionMenuOpen - intent:', intent, 'calleBy:', calleBy);
    
    // Calcola la posizione del menu
    const openActionMenuElm = this.openActionMenuBtnRef.nativeElement.getBoundingClientRect();
    let xOffSet = openActionMenuElm.width + 10;
    
    // Aggiusta l'offset per il placeholder di aggiunta azione
    if (calleBy === 'add-action-placeholder') {
      xOffSet = 277;
    }
    
    const buttonXposition = openActionMenuElm.x + xOffSet;
    const buttonYposition = openActionMenuElm.y;
    
    this.logger.log('[CDS-INTENT] onActionMenuOpen - Posizione calcolata:', { x: buttonXposition, y: buttonYposition });
    
    // Prepara i dati per l'emissione dell'evento
    const data = { 
      'x': buttonXposition, 
      'y': buttonYposition, 
      'intent': intent, 
      'addAction': true 
    };
    
    // Seleziona l'intent e mostra il pannello delle azioni
    this.intentService.setIntentSelected(this.intent.intent_id);
    this.showPanelActions.emit(data);
  }

  /**
   * Predicato per determinare se un elemento può essere inserito nella drop list
   * @param intent - L'intent per cui verificare la possibilità di inserimento
   * @returns Funzione che restituisce false se isNewChatbot è true e l'intent ha già un'azione
   */
  onDropListEnterCheck(intent: any): (item: CdkDrag<any>) => boolean {
    return (item: CdkDrag<any>): boolean => {
      // Se è un nuovo chatbot e l'intent ha già almeno un'azione, non permettere il drop
      if (this.isNewChatbot && this.listOfActions?.length > 0) {
        this.logger.log('[CDS-INTENT] onDropListEnterCheck - Drop negato: isNewChatbot è true e l\'intent ha già un\'azione');
        return false;
      }
      return true;
    };
  }

  /**
   * Gestisce l'evento di visualizzazione dei connettori in entrata
   */
  onConnectorsInShow(): void {
    this.logger.log('[CDS-INTENT] onConnectorsInShow - Mostrando connettori in entrata');
    // Implementazione per mostrare i connettori in entrata
  }

  /**
   * Gestisce l'evento di nascondimento dei connettori in entrata
   */
  onConnectorsInHide(): void {
    this.logger.log('[CDS-INTENT] onConnectorsInHide - Nascondendo connettori in entrata');
    // Implementazione per nascondere i connettori in entrata
  }

  /**
   * Gestisce la visibilità dei placeholder durante il drag & drop
   * @param actionDragPlaceholder - Elemento placeholder per il drag
   * @param addActionPlaceholderEl - Elemento placeholder per aggiungere azioni
   */
  private handlePlaceholderVisibility(actionDragPlaceholder: Element | null, addActionPlaceholderEl: Element | null): void {
    const threshold = 270;
    
    if (this.actionDragPlaceholderWidth <= threshold) {
      // Mostra il placeholder del drag e nasconde quello di aggiunta
      this.hideActionDragPlaceholder = false;
      this.updatePlaceholderOpacity(actionDragPlaceholder, addActionPlaceholderEl, '1', '0');
      this.logger.log('[CDS-INTENT] handlePlaceholderVisibility - Mostrando placeholder drag');
    } else {
      // Nasconde il placeholder del drag e mostra quello di aggiunta
      this.hideActionDragPlaceholder = true;
      this.updatePlaceholderOpacity(actionDragPlaceholder, addActionPlaceholderEl, '0', '1');
      this.logger.log('[CDS-INTENT] handlePlaceholderVisibility - Nascondendo placeholder drag');
    }
  }

  /**
   * Aggiorna l'opacità degli elementi placeholder
   * @param actionDragPlaceholder - Elemento placeholder per il drag
   * @param addActionPlaceholderEl - Elemento placeholder per aggiungere azioni
   * @param dragOpacity - Opacità per il placeholder del drag
   * @param addOpacity - Opacità per il placeholder di aggiunta
   */
  private updatePlaceholderOpacity(
    actionDragPlaceholder: Element | null, 
    addActionPlaceholderEl: Element | null, 
    dragOpacity: string, 
    addOpacity: string
  ): void {
    if (actionDragPlaceholder instanceof HTMLElement) {
      actionDragPlaceholder.style.opacity = dragOpacity;
    }
    if (addActionPlaceholderEl instanceof HTMLElement) {
      addActionPlaceholderEl.style.opacity = addOpacity;
    }
  }


  /**
   * Gestisce il drop esterno (container diverso)
   * @param event - L'evento di drop
   */
  private async handleExternalDrop(event: CdkDragDrop<string[]>): Promise<void> {
    try {
      // Se è un nuovo chatbot e l'intent ha già almeno un'azione, non permettere il drop
      if (this.isNewChatbot && this.listOfActions?.length > 0) {
        this.logger.log('[CDS-INTENT] handleExternalDrop - Drop negato: isNewChatbot è true e l\'intent ha già un\'azione');
        return;
      }
      
      const action: any = event.previousContainer.data[event.previousIndex];
      
      if (event.previousContainer.data.length > 0) {
        if (action._tdActionType) {
          // Spostamento di un'azione esistente tra intent diversi
          this.logger.log('[CDS-INTENT] handleExternalDrop - Spostamento azione tra intent diversi');
          this.intentService.moveActionBetweenDifferentIntents(event, action, this.intent.intent_id);
          this.intentService.updateIntent(this.intent, null);
          this.connectorService.updateConnectorsOfBlock(this.intent.intent_id);
        } else if (action.value?.type) {
          // Aggiunta di una nuova azione dall'elenco elementi
          this.logger.log('[CDS-INTENT] handleExternalDrop - Aggiunta nuova azione da panel elements');
          this.intentService.moveNewActionIntoIntent(event.currentIndex, action, this.intent.intent_id);
        }
      }
    } catch (error) {
      this.logger.error('[CDS-INTENT] handleExternalDrop - Errore durante il drop esterno:', error);
      console.error(error);
    }
  }

  /**
   * Gestisce il drop interno (stesso container)
   * @param event - L'evento di drop
   */
  private handleInternalDrop(event: CdkDragDrop<string[]>): void {
    this.logger.log('[CDS-INTENT] handleInternalDrop - Spostamento interno');
    moveItemInArray(this.intent.actions, event.previousIndex, event.currentIndex);
    this.intentService.updateIntent(this.intent, null);
  }
  /** ******************************
   * intent controls options: END 
   * ****************************** */
}
