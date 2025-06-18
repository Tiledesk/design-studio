// =============================
// IMPORTS
// =============================
// Angular core
import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, ViewChild, ElementRef, OnChanges, OnDestroy } from '@angular/core';
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
import { TYPE_ACTION, TYPE_ACTION_VXML, ACTIONS_LIST, TYPE_CHATBOT } from 'src/app/chatbot-design-studio/utils-actions';
import { INTENT_COLORS, TYPE_INTENT_NAME, replaceItemInArrayForKey, checkInternalIntent, isValidColor, areValidIds, findActionKey, addCssClassToElement, removeCssClassFromElement, calculateQuestionCount, calculateFormSize } from 'src/app/chatbot-design-studio/utils';

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
  styleUrls: ['./cds-intent.component.scss']
})

// =============================
// COMPONENT CLASS
// =============================
export class CdsIntentComponent implements OnInit, OnDestroy, OnChanges {
  // ----------- INPUTS -----------
  /** Intent da visualizzare e gestire */
  @Input() intent: Intent;
  /** Nasconde il placeholder delle azioni nel pannello azioni */
  @Input() hideActionPlaceholderOfActionPanel: boolean;
  /** Sottotipo del chatbot (es: chatbot, copilot, ecc.) */
  @Input() chatbotSubtype: string;
  
  // ----------- OUTPUTS -----------
  /** Evento emesso quando il componente è stato renderizzato */
  @Output() componentRendered = new EventEmitter<string>();
  /** Evento emesso quando viene selezionata una domanda (deprecato) */
  @Output() questionSelected = new EventEmitter(); // !!! SI PUO' ELIMINARE
  /** Evento emesso quando viene selezionata una risposta (deprecato) */
  @Output() answerSelected = new EventEmitter(); // !!! SI PUO' ELIMINARE
  /** Evento emesso quando viene selezionato un form (deprecato) */
  @Output() formSelected = new EventEmitter(); // !!! SI PUO' ELIMINARE
  /** Evento emesso quando viene selezionata un'azione (deprecato) */
  @Output() actionSelected = new EventEmitter(); // !!! SI PUO' ELIMINARE

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
  /** Tooltip webhook */
  webHookTooltipText: string;
  /** Se l'intent è interno */
  isInternalIntent: boolean = false;
  /** Azione INTENT collegata */
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

  /** Colore dell'intent */
  intentColor: any = INTENT_COLORS.COLOR1;

  /** ResizeObserver per monitorare i cambiamenti di dimensione */
  private resizeObserver: ResizeObserver | null = null;

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
    private readonly stageService: StageService,
    private readonly controllerService: ControllerService,
    private readonly elemenRef: ElementRef,
    private readonly appStorageService: AppStorageService,
    private readonly dashboardService: DashboardService,
    private readonly webhookService: WebhookService,
  ) {
    this.initSubscriptions();
  }

  /**
   * Inizializza tutte le subscription necessarie per la gestione reattiva dello stato dell'intent.
   * Ogni subscription viene registrata in this.subscriptions per una facile pulizia.
   */
  initSubscriptions() {
    // --- Subscription: Aggiornamento intent (creazione o modifica) ---
    const keyBehaviorIntent = 'behaviorIntent';
    if (!this.subscriptions.find(item => item.key === keyBehaviorIntent)) {
      const sub = this.intentService.behaviorIntent
        .pipe(takeUntil(this.unsubscribe$))
        .subscribe(intent => {
          // Aggiorna lo stato locale solo se l'intent corrisponde
        if (intent && this.intent && intent.intent_id === this.intent.intent_id) {
            this.logger.log("[CDS-INTENT] Modifica intent: ", this.intent, " con: ", intent);
          this.intent = intent;
          this.setAgentsAvailable();

            // Se è cambiata solo la posizione, non aggiorno le azioni
          if (intent['attributesChanged']) {
              this.logger.log("[CDS-INTENT] Solo posizione cambiata");
            delete intent['attributesChanged'];
            } else {
              this.logger.log("[CDS-INTENT] Aggiorno le actions dell'intent");
            this.listOfActions = this.intent.actions;
            this.setActionIntent();
          }
          
            // Aggiorna conteggio domande
          if (this.intent.question) {
            const question_segment = this.intent.question.split(/\r?\n/).filter(element => element);
            this.questionCount = question_segment.length;
          } else {
            this.questionCount = 0;
          }

            // Aggiorna conteggio form
          if (this.intent?.form && (this.intent.form !== null)) {
            this.formSize = Object.keys(this.intent.form).length;
          } else {
            this.formSize = 0;
          }
        }
      });
      this.subscriptions.push({ key: keyBehaviorIntent, value: sub });
    }

    // --- Subscription: Intent live attivo dal test site ---
    const keyIntentLiveActive = 'intentLiveActive';
    if (!this.subscriptions.find(item => item.key === keyIntentLiveActive)) {
      const sub = this.intentService.liveActiveIntent
        .pipe(takeUntil(this.unsubscribe$))
        .subscribe(data => {
          if (data) {
            const { intent, logAnimationType, scale } = data;
            // Gestione animazioni e selezione intent live
            if (intent && intent.intent_id !== this.intent?.intent_id && this.intent?.intent_display_name === TYPE_CHATBOT.WEBHOOK) {
              this.removeCssClassIntentActive('live-start-intent', '#intent-content-' + this.intent.intent_id);
            } else if (!intent && this.intent?.intent_display_name === TYPE_CHATBOT.WEBHOOK) {
              const stageElement = document.getElementById(this.intent.intent_id);
              this.addCssClassIntentActive('live-start-intent', '#intent-content-' + this.intent.intent_id);
              this.stageService.centerStageOnTopPosition(this.intent.id_faq_kb, stageElement, scale);
            } else if (!intent || intent.intent_id !== this.intent?.intent_id) {
              setTimeout(() => {
                this.removeCssClassIntentActive('live-active-intent-pulse', '#intent-content-' + (this.intent.intent_id));
              }, 500);
            } else if (intent && this.intent && intent.intent_id === this.intent?.intent_id) {
              this.removeCssClassIntentActive('live-active-intent-pulse', '#intent-content-' + (this.intent.intent_id));
              setTimeout(() => {
                this.addCssClassIntentActive('live-active-intent-pulse', '#intent-content-' + (intent.intent_id));
                const stageElement = document.getElementById(intent.intent_id);
                if (logAnimationType) {
                  this.stageService.centerStageOnTopPosition(this.intent.id_faq_kb, stageElement, scale);
                }
              }, 500);
            }
          } else {
            // Rimuove eventuali classi se nessun intent live è attivo
            if (this.intent?.intent_display_name === TYPE_CHATBOT.WEBHOOK) {
              this.removeCssClassIntentActive('live-start-intent', '#intent-content-' + this.intent.intent_id);
            }
            this.removeCssClassIntentActive('live-active-intent-pulse', '#intent-content-' + this.intent?.intent_id);
          }
      });
      this.subscriptions.push({ key: keyIntentLiveActive, value: sub });
    }

    // --- Subscription: Valore alphaConnectors (per aggiornare i connettori in ingresso) ---
    const keyAlphaConnectors = 'alphaConnectors';
    if (!this.subscriptions.find(item => item.key === keyAlphaConnectors)) {
      const sub = this.stageService.alphaConnectors$.subscribe(value => {
        this.alphaConnectors = value;
        this.getAllConnectorsIn();
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
      });
      this.subscriptions.push({ key: keyChangeIntentColor, value: sub });
    }
  }

  /**
   * Inizializza il componente intent con tutte le configurazioni necessarie.
   * Gestisce webhook, tipi speciali di intent (start, fallback), e configurazione iniziale.
   */
  async ngOnInit(): Promise<void> {
      this.logger.log('[CDS-INTENT] ngOnInit-->', this.intent);
    
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
    
    // --- Setup event listener e attributi finali ---
    this.setupEventListenersAndAttributes();
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
    } else {
      // Per intent normali, imposta lo stato selezionato
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
    
    // Verifica se l'intent è interno
    this.isInternalIntent = checkInternalIntent(this.intent);
  }

  /**
   * Configura event listener e attributi finali dell'intent
   */
  private setupEventListenersAndAttributes(): void {
      this.addEventListener();
      this.setIntentAttributes();
  }

  async getWebhook(): Promise<string | null> {
    try {
      const resp: any = await firstValueFrom(this.webhookService.getWebhook(this.chatbot_id));
      this.logger.log("[cds-header] getWebhook : ", resp);
      const webhookUrl = resp?.webhook_id ? `${this.serverBaseURL}webhook/${resp.webhook_id}` : null;
      return webhookUrl;
    } catch (error) {
      this.logger.log("[cds-header] error getWebhook: ", error);
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

  private getAllConnectorsIn(){
    if(this.intent){
      this.connectorsIn = this.connectorService.searchConnectorsInByIntent(this.intent.intent_id);
    }
  }

  /**
   * Gestisce i cambiamenti degli input del componente.
   * Principalmente gestisce la visibilità del placeholder delle azioni e aggiorna lo stato degli agenti.
   */
  ngOnChanges(changes: SimpleChanges): void {
    // Gestisce la visibilità del placeholder delle azioni quando viene trascinata un'azione
    this.handleActionPlaceholderVisibility();
    
    // Aggiorna lo stato degli agenti disponibili
    this.setAgentsAvailable();
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
  }

  /**
   * Inizializza il componente dopo che la view è stata renderizzata.
   * Configura il ResizeObserver per monitorare i cambiamenti di dimensione e notifica che il componente è pronto.
   */
  ngAfterViewInit() {
    this.logger.log("[CDS-INTENT] ngAfterViewInit - Inizializzazione componente");
    
    // Configura il ResizeObserver per monitorare i cambiamenti di dimensione
    this.setupResizeObserver();
    
    // Notifica che il componente è stato renderizzato
    this.notifyComponentRendered();
    
    // Imposta gli attributi finali dell'intent
    this.setIntentAttributes();
  }

  /**
   * Configura il ResizeObserver per monitorare i cambiamenti di dimensione dell'elemento intent.
   * Aggiorna i connettori quando le dimensioni cambiano (eccetto durante il drag).
   */
  private setupResizeObserver(): void {
    if (!this.resizeElement?.nativeElement) {
      this.logger.warn("[CDS-INTENT] resizeElement non disponibile");
      return;
    }

    const resizeObserver = new ResizeObserver(entries => {
      entries.forEach(entry => {
        const newHeight = entry.contentRect.height;
        this.logger.log('[CDS-INTENT] Nuova altezza del div:', newHeight);
        
        // Aggiorna i connettori solo se non si sta facendo drag
        if (!this.isDragging) {
          this.connectorService.updateConnector(this.intent.intent_id);
      }
    });
    });

    // Salva il riferimento per il cleanup
    this.resizeObserver = resizeObserver;
    
    // Inizia a osservare l'elemento
    resizeObserver.observe(this.resizeElement.nativeElement);
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
    removeCssClassFromElement(this.elemenRef, className, componentID, this.logger);
  }

  /**
   * Configura gli attributi dell'intent, in particolare il colore.
   * Inizializza gli attributi se non esistono e imposta il colore di default se non specificato.
   */
  private setIntentAttributes(): void {
    this.intentService.setIntentAttributes(this.intent);
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
      
      this.logger.debug("[CDS-INTENT] Intent selezionato configurato:", this.intent?.intent_id);
      
    } catch (error) {
      this.logger.error("[CDS-INTENT] Errore nella configurazione dell'intent selezionato:", error);
    }
  }

  /**
   * Resetta i contatori dell'intent.
   */
  private resetIntentCounters(): void {
    this.listOfActions = null;
    this.formSize = 0;
    this.questionCount = 0;
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
    intent.webhook_enabled = !intent.webhook_enabled;
    this.intentService.updateIntent(this.intent, null);
  }

  openIntentPanel(intent: Intent){
    this.intentService.setIntentSelected(this.intent.intent_id);
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
    }
  }

  // =============================
  // EVENT HANDLERS - FUNZIONI CHIAMATE DAL FILE HTML
  // =============================
  // Queste funzioni gestiscono gli eventi provenienti dal template HTML
  // e rappresentano l'interfaccia tra la vista e la logica del componente

  /**
   * Gestisce la selezione di un'azione nell'intent
   * @param action - L'azione selezionata
   * @param index - L'indice dell'azione nella lista
   * @param idAction - Il tipo di selezione (HAS_SELECTED_TYPE)
   */
  onSelectAction(action: any, index: number, idAction: HAS_SELECTED_TYPE): void {
    this.logger.log('[CDS-INTENT] onSelectAction - action:', action, 'index:', index, 'idAction:', idAction);
    
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
  onSelectQuestion(elementSelected: HAS_SELECTED_TYPE): void {
    this.logger.log('[CDS-INTENT] onSelectQuestion - elementSelected:', elementSelected, 'question:', this.intent.question);
    
    // Imposta il tipo di elemento selezionato
    this.elementTypeSelected = elementSelected;
    
    // Seleziona l'intent nel service
    this.intentService.setIntentSelected(this.intent.intent_id);
    
    // Emette l'evento con la domanda dell'intent
    this.questionSelected.emit(this.intent.question);
  }

  /**
   * Gestisce la selezione del form dell'intent
   * @param elementSelected - Il tipo di elemento selezionato (HAS_SELECTED_TYPE.FORM)
   */
  onSelectForm(elementSelected: HAS_SELECTED_TYPE): void {
    this.logger.log('[CDS-INTENT] onSelectForm - elementSelected:', elementSelected);
    
    // Imposta il tipo di elemento selezionato
    this.elementTypeSelected = elementSelected;
    
    // Seleziona l'intent nel service
    this.intentService.setIntentSelected(this.intent.intent_id);
    
    // Crea un nuovo form se non esiste
    if (this.intent && !this.intent.form) {
      this.intent.form = new Form();
      this.logger.log('[CDS-INTENT] onSelectForm - Creato nuovo form per intent:', this.intent.intent_id);
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
  onClickControl(event: 'copy' | 'delete' | 'edit', action: Action, index: number): void {
    this.logger.log('[CDS-INTENT] onClickControl - event:', event, 'action:', action);
    
    switch (event) {
      case 'edit':
        // Seleziona l'azione per la modifica
        this.onSelectAction(action, index, action._tdActionId);
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
        this.logger.warn('[CDS-INTENT] onClickControl - Evento non gestito:', event);
        break;
    }
  }

  /**
   * Gestisce gli eventi di tastiera per le azioni
   * @param event - L'evento di tastiera
   */
  onKeydown(event: KeyboardEvent): void {
    this.logger.log('[CDS-INTENT] onKeydown - key:', event.key);
    
    // Chiavi che attivano l'eliminazione dell'azione selezionata
    const deleteKeys = ['Backspace', 'Escape', 'Canc'];
    
    if (deleteKeys.includes(event.key)) {
      this.logger.log('[CDS-INTENT] onKeydown - Eliminazione azione selezionata tramite tasto:', event.key);
      this.intentService.deleteSelectedAction();
    }
  }

  public onDragMove(event: CdkDragMove): void {
    const element = document.getElementById('customDragPreview');
    if (element) {
      const xPos = event.pointerPosition.x - 122;
      const yPos = event.pointerPosition.y - 20;
      element.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
    }
}

  onDragStarted(event, previousIntentId, index) {
    this.controllerService.closeActionDetailPanel();
    this.logger.log('[CDS-INTENT] onDragStarted event ', event, 'previousIntentId ', previousIntentId);
    this.logger.log('[CDS-INTENT] onDragStarted index ', index);
    this.intentService.setPreviousIntentId(previousIntentId);
    this.isDragging = true;
    this.logger.log('[CDS-INTENT] isDragging - onDragStarted', this.isDragging)
    
    const actionDragPlaceholder = document.querySelector('.action-drag-placeholder');
    const addActionPlaceholderEl = document.querySelector('.add--action-placeholder');

    this.logger.log('[CDS-INTENT] onDragStarted actionDragPlaceholder', actionDragPlaceholder)
    this.logger.log('[CDS-INTENT] onDragStarted addActionPlaceholderEl ', addActionPlaceholderEl)
    const myObserver = new ResizeObserver(entries => {
      entries.forEach(entry => {
        this.actionDragPlaceholderWidth = entry.contentRect.width
        this.logger.log('[CDS-INTENT] width actionDragPlaceholderWidth', this.actionDragPlaceholderWidth);
        if (this.actionDragPlaceholderWidth <= 270) {
          this.hideActionDragPlaceholder = false;
          this.logger.log('[CDS-INTENT] Hide action drag placeholder', this.hideActionDragPlaceholder);
          if (actionDragPlaceholder instanceof HTMLElement) {
            actionDragPlaceholder.style.opacity = '1';
          }
          if (addActionPlaceholderEl instanceof HTMLElement) {
            addActionPlaceholderEl.style.opacity = '0';
          }
          this.logger.log('[CDS-INTENT] HERE 1 !!!! ');
        } else {
          this.hideActionDragPlaceholder = true;
          this.logger.log('[CDS-INTENT] Hide action drag placeholder', this.hideActionDragPlaceholder);
          if (actionDragPlaceholder instanceof HTMLElement) {
            actionDragPlaceholder.style.opacity = '0';
          }
          if (addActionPlaceholderEl instanceof HTMLElement) {
            addActionPlaceholderEl.style.opacity = '1';
          }
          this.logger.log('[CDS-INTENT] HERE 2 !!!! ');
        }
      });
    });
    myObserver.observe(actionDragPlaceholder);
  }

  onDragEnded(event, index) {
    this.logger.log('[CDS-INTENT] onDragEnded: ', event, this.intent.intent_id);
    this.isDragging = false;
    this.connectorService.updateConnector(this.intent.intent_id);
  }

  async onDropAction(event: CdkDragDrop<string[]>) {
    this.logger.log('[CDS-INTENT] onDropAction: ', event, this.intent.actions);
    this.controllerService.closeAllPanels();
    this.intentService.setIntentSelected(this.intent.intent_id);
    if (event.previousContainer === event.container) {
      moveItemInArray(this.intent.actions, event.previousIndex, event.currentIndex);
      this.intentService.updateIntent(this.intent, null);
    } else {
      try {
        let action: any = event.previousContainer.data[event.previousIndex];
        if (event.previousContainer.data.length > 0) {
          if (action._tdActionType) {
            this.logger.log("[CDS-INTENT] onDropAction sposto la action tra 2 intent differenti");
            this.intentService.moveActionBetweenDifferentIntents(event, action, this.intent.intent_id);
            this.intentService.updateIntent(this.intent, null);
            this.connectorService.updateConnectorsOfBlock(this.intent.intent_id)
          } else if (action.value?.type) {
            this.logger.log("[CDS-INTENT] onDropAction aggiungo una nuova action all'intent da panel elements - action ", this.newActionCreated);
            this.intentService.moveNewActionIntoIntent(event.currentIndex, action, this.intent.intent_id);
          }
        }
      } catch (error) {
        console.error(error);
      }
    }
  }

  public async onUpdateAndSaveAction(object) {
    let connector = null;
    if(object?._tdActionId){
      this.intent.actions = replaceItemInArrayForKey('_tdActionId', this.intent.actions, object);
    }
    this.logger.log('[CDS-INTENT] onUpdateAndSaveAction:::: ', object, this.intent, this.intent.actions);
    this.intentService.updateIntent(this.intent);
  }

  onOptionClicked(event: 'webhook' | 'color' | 'delete' | 'test' | 'copy' | 'open'){
    switch(event){
      case 'webhook':
        this.toggleIntentWebhook(this.intent);
        break;
      case 'color':
        this.onColorIntent(this.intent)
        break;
      case 'delete':
        this.onDeleteIntent(this.intent)
        break;
      case 'test':
        this.onOpenTestItOut();
        break;
      case 'copy':
        this.copyIntent();
        break;
      case 'open':
        this.openIntentPanel(this.intent);
        break;
    }
  }

  onOpenTestItOut(){
    this.intentService.openTestItOut(this.intent);
  }

  onDeleteIntent(intent: Intent) {
    this.deleteIntent.emit(intent);
  }

  onColorIntent(intent: Intent) {
    this.intentService.setIntentSelected(this.intent.intent_id);
    this.changeColorIntent.emit(intent);
  }

  /**
   * Gestisce l'evento di click per aprire il pannello webhook dell'intent
   * @param intent - L'intent per cui aprire il pannello webhook
   */
  onOpenWebhookIntentPanel(intent: Intent) {
    const webhookIntent = this.intent.intent_display_name === TYPE_INTENT_NAME.WEBHOOK ? true : false;
    if (webhookIntent) {
      this.openIntentPanel(intent);
    }
  }

  /**
   * Gestisce l'evento di click per aprire il menu delle azioni
   * @param intent - L'intent per cui aprire il menu
   * @param calleBy - Identificatore del chiamante per posizionamento
   */
  onOpenActionMenu(intent: any, calleBy: string) {
    this.logger.log('[CDS-INTENT] onOpenActionMenu > intent ', intent)
    this.logger.log('[CDS-INTENT] onOpenActionMenu > calleBy ', calleBy)
    const openActionMenuElm = this.openActionMenuBtnRef.nativeElement.getBoundingClientRect()
    let xOffSet = openActionMenuElm.width + 10
    if (calleBy === 'add-action-placeholder') {
      xOffSet = 277
    }
    let buttonXposition = openActionMenuElm.x + xOffSet
    let buttonYposition = openActionMenuElm.y
    this.logger.log('[CDS-INTENT] onOpenActionMenu > openActionMenuBtnRef ', openActionMenuElm)
    this.logger.log('[CDS-INTENT] onOpenActionMenu > buttonXposition ', buttonXposition)
    const data = { 'x': buttonXposition, 'y': buttonYposition, 'intent': intent, 'addAction': true };
    this.intentService.setIntentSelected(this.intent.intent_id);
    this.showPanelActions.emit(data);
  }

  /**
   * Predicato per determinare se un elemento può essere inserito nella drop list
   * @param action - L'azione per cui verificare la possibilità di inserimento
   * @returns Funzione che restituisce sempre true (tutti gli elementi possono essere inseriti)
   */
  onCanEnterDropList(action: any) {
    return (item: CdkDrag<any>) => {
      return true
    }
  }

}


