import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  Renderer2,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDragMove, moveItemInArray } from '@angular/cdk/drag-drop';
import { firstValueFrom, Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Action, ActionIntentConnected } from 'src/app/models/action-model';
import { Form, Intent } from 'src/app/models/intent-model';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';
import { TYPE_ACTION, TYPE_ACTION_VXML, ACTIONS_LIST, TYPE_CHATBOT } from 'src/app/chatbot-design-studio/utils-actions';
import { INTENT_COLORS, TYPE_INTENT_NAME, replaceItemInArrayForKey, checkInternalIntent, UNTITLED_BLOCK_PREFIX, DATE_NEW_CHATBOT } from 'src/app/chatbot-design-studio/utils';
import { IntentService } from '../../../services/intent.service';
import { ConnectorService } from '../../../services/connector.service';
import { StageService } from '../../../services/stage.service';
import { ControllerService } from '../../../services/controller.service';
import { TranslateService } from '@ngx-translate/core';
import { AppConfigService } from 'src/app/services/app-config';
import { DashboardService } from 'src/app/services/dashboard.service';
import { WebhookService } from 'src/app/chatbot-design-studio/services/webhook-service.service';

export enum HAS_SELECTED_TYPE {
  ANSWER = "HAS_SELECTED_ANSWER",
  QUESTION = "HAS_SELECTED_QUESTION",
  FORM = "HAS_SELECTED_FORM",
  ACTION = "HAS_SELECTED_ACTION",
  INTENT = "HAS_SELECTED_INTENT",
}

@Component({
  selector: 'cds-intent',
  templateUrl: './cds-intent.component.html',
  styleUrls: ['./cds-intent.component.scss']
})

export class CdsIntentComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  @Input() intent: Intent;
  @Input() hideActionPlaceholderOfActionPanel: boolean;
  @Input() chatbotSubtype: string;
  @Input() IS_OPEN_PANEL_INTENT_DETAIL: boolean;

  @Output() componentRendered = new EventEmitter<string>();
  @Output() questionSelected = new EventEmitter();
  @Output() formSelected = new EventEmitter();
  @Output() actionSelected = new EventEmitter();
  @Output() actionDeleted = new EventEmitter();
  @Output() showPanelActions = new EventEmitter();
  @Output() deleteIntent = new EventEmitter();
  @Output() openIntent = new EventEmitter<Intent>();
  @Output() changeColorIntent = new EventEmitter();

  @ViewChild('resizeElement', { static: false }) resizeElement: ElementRef;
  @ViewChild('openActionMenuBtn', { static: false }) openActionMenuBtnRef: ElementRef;


  subscriptions: Array<{ key: string, value: Subscription }> = [];
  unsubscribe$: Subject<any> = new Subject<any>();

  alphaConnectors: number;
  connectorsIn: any;
  formSize: number = 0;
  questionCount: number = 0;
  listOfActions: Action[];
  HAS_SELECTED_TYPE = HAS_SELECTED_TYPE;
  TYPE_ACTION = TYPE_ACTION;
  TYPE_ACTION_VXML = TYPE_ACTION_VXML;
  ACTIONS_LIST = ACTIONS_LIST;
  elementTypeSelected: HAS_SELECTED_TYPE;
  isOpen: boolean = true;
  positionMenu: any;
  isStart = false;
  isDefaultFallback = false;

  startAction: any;
  isDragging: boolean = false;
  actionDragPlaceholderWidth: number;
  hideActionDragPlaceholder: boolean;
  newActionCreated: Action;
  dragDisabled: boolean = true;
  connectorIsOverAnIntent: boolean = false;
  /** Usato per distinguere click da drag (es. apertura pannello intent). */
  private hasMouseMoved: boolean = false;
  webHookTooltipText: string;
  isInternalIntent: boolean = false;
  actionIntent: ActionIntentConnected;
  isActionIntent: boolean = false;
  isAgentsAvailable: boolean = false;
  showIntentOptions: boolean = true;
  webhookUrl: string;
  serverBaseURL: any;
  chatbot_id: string;
  isUntitledBlock: boolean = false;
  isNewChatbot: boolean = false;

  intentColor: any = INTENT_COLORS.COLOR1;

  /** Label tradotte (STEP 5: evitare pipe translate ripetute in template; aggiornate al cambio lingua). */
  labelQuestion = '';
  labelForm = '';
  labelAddAnActionToBlock = '';
  labelAddAnActionToBlockDescription = '';
  labelAddAction = '';

  /** View model stabile per stili intent (background, outline): aggiornato solo quando cambiano intent/colore o selezione, per ridurre checkStylingProperty. */
  vm: { backgroundColor: string; outline: string } = { backgroundColor: '', outline: 'none' };
  private _lastSelectedId: string | null = null;
  private _lastIntentActive: boolean = false;

  private readonly logger: LoggerService = LoggerInstance.getInstance();


  /**
   * Chiamato da Angular alla creazione del componente.
   * Inietta i servizi e avvia initSubscriptions per registrare le subscription agli observable (intent, connettori, colore, ecc.).
   */
  constructor(
    public intentService: IntentService,
    public appConfigService: AppConfigService,
    private readonly connectorService: ConnectorService,
    private readonly stageService: StageService,
    private readonly controllerService: ControllerService,
    private readonly translate: TranslateService,
    private readonly elemenRef: ElementRef,
    private readonly renderer: Renderer2,
    private readonly appStorageService: AppStorageService,
    private readonly dashboardService: DashboardService,
    private readonly webhookService: WebhookService,
  ) {
    this.initSubscriptions();
  }

  /** Aggiorna le label tradotte (chiamato in ngOnInit e al cambio lingua). */
  private updateTranslationLabels(): void {
    this.labelQuestion = this.translate.instant('Question');
    this.labelForm = this.translate.instant('Form');
    this.labelAddAnActionToBlock = this.translate.instant('CDSCanvas.AddAnActionToBlock');
    this.labelAddAnActionToBlockDescription = this.translate.instant('CDSCanvas.AddAnActionToBlockDescription');
    this.labelAddAction = this.translate.instant('CDSCanvas.AddAction');
  }

  /**
   * Chiamata dal constructor alla creazione del componente.
   * Registra le subscription RxJS (behaviorIntent, liveActiveIntent, alphaConnectors$, behaviorIntentColor, connectorsIn)
   * per reagire agli aggiornamenti dall’esterno; evita doppie subscription e fa cleanup in ngOnDestroy.
   */
  initSubscriptions(): void {
    this.logger.log('[CDS-INTENT-SLICE2] STEP1: Inizializzazione subscription - Pattern takeUntil verificato');
    let subscribtion: any;
    let subscribtionKey: string;

    subscribtionKey = 'behaviorIntent';
    subscribtion = this.subscriptions.find(item => item.key === subscribtionKey);
    if (!subscribtion) {
      subscribtion = this.intentService.behaviorIntent.pipe(takeUntil(this.unsubscribe$)).subscribe(intent => {
        this.logger.log('[CDS-INTENT-SLICE2] STEP4: behaviorIntent emesso - Test funzionale OK', intent?.intent_id);
        if (intent && this.intent && intent.intent_id === this.intent.intent_id) {
          this.logger.log("[CDS-INTENT] sto modificando l'intent: ", this.intent, " con : ", intent);
          this.intent = intent;
          this.updateIntentStyleVm();
          this.setAgentsAvailable();
          this.updateIsUntitledBlock();
          if (intent['attributesChanged']) {
            this.logger.log("[CDS-INTENT] ho solo cambiato la posizione sullo stage");
            delete intent['attributesChanged'];
          } else {
            this.logger.log("[CDS-INTENT] aggiorno le actions dell'intent");
            this.listOfActions = this.intent.actions;
            this.updateActionsOutline();
            this.setActionIntent();
          }

          if (this.intent.question) {
            const question_segment = this.intent.question.split(/\r?\n/).filter(element => element);
            this.questionCount = question_segment.length;
          } else {
            this.questionCount = 0;
          }

          if (this.intent?.form && (this.intent.form !== null)) {
            this.formSize = Object.keys(this.intent.form).length;
          } else {
            this.formSize = 0;
          }

          this.updateShowIntentOptions();
        }
      });
      const subscribe = { key: subscribtionKey, value: subscribtion };
      this.subscriptions.push(subscribe);
      this.logger.log('[CDS-INTENT-SLICE2] STEP3: behaviorIntent creata con takeUntil - Pattern consistente OK');
    } else {
      this.logger.log('[CDS-INTENT-SLICE2] STEP6: behaviorIntent già esistente - Anti-doppia-subscription OK');
    }

    subscribtionKey = 'intentLiveActive';
    subscribtion = this.subscriptions.find(item => item.key === subscribtionKey);
    if (!subscribtion) {
      subscribtion = this.intentService.liveActiveIntent.pipe(takeUntil(this.unsubscribe$)).subscribe(data => {
          if (data) {
            this.logger.log('[CDS-INTENT-SLICE2] STEP4: liveActiveIntent emesso - Test funzionale OK', data.intent?.intent_id);
            const intent = data.intent;
            const logAnimationType = data.logAnimationType;
            const scale = data.scale;
            if(intent && intent.intent_id !== this.intent?.intent_id && this.intent?.intent_display_name === TYPE_CHATBOT.WEBHOOK){
              this.removeCssClassIntentActive('live-start-intent', '#intent-content-' + this.intent.intent_id);
            } else if(!intent && this.intent?.intent_display_name === TYPE_CHATBOT.WEBHOOK){
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
                if(logAnimationType) {
                  this.stageService.centerStageOnTopPosition(this.intent.id_faq_kb, stageElement, scale);
                }
              }, 500);
            }
          } else {
            if(this.intent?.intent_display_name === TYPE_CHATBOT.WEBHOOK){
              this.removeCssClassIntentActive('live-start-intent', '#intent-content-' + this.intent.intent_id);
            }
            this.removeCssClassIntentActive('live-active-intent-pulse', '#intent-content-' + this.intent?.intent_id);
          }
      });
      const subscribe = { key: subscribtionKey, value: subscribtion };
      this.subscriptions.push(subscribe);
      this.logger.log('[CDS-INTENT-SLICE2] STEP3: liveActiveIntent creata con takeUntil - Pattern consistente OK');
    } else {
      this.logger.log('[CDS-INTENT-SLICE2] STEP6: liveActiveIntent già esistente - Anti-doppia-subscription OK');
    }

    subscribtionKey = 'alphaConnectors';
    subscribtion = this.subscriptions.find(item => item.key === subscribtionKey);
    if (!subscribtion) {
      subscribtion = this.stageService.alphaConnectors$.pipe(takeUntil(this.unsubscribe$)).subscribe(value => {
        this.logger.log('[CDS-INTENT-SLICE2] STEP2: alphaConnectors$ emesso con takeUntil - Standardizzazione OK', value);
        this.logger.log('[CDS-INTENT-SLICE2] STEP4: alphaConnectors$ emesso - Test funzionale OK', value);
        this.alphaConnectors = value;
        if (this.intent?.intent_id) {
          this.loadConnectorsIn();
        }
      });
      const subscribe = { key: subscribtionKey, value: subscribtion };
      this.subscriptions.push(subscribe);
      this.logger.log('[CDS-INTENT-SLICE2] STEP2: alphaConnectors$ creata con takeUntil - Standardizzazione OK');
      this.logger.log('[CDS-INTENT-SLICE2] STEP3: alphaConnectors$ creata con takeUntil - Pattern consistente OK');
    } else {
      this.logger.log('[CDS-INTENT-SLICE2] STEP6: alphaConnectors$ già esistente - Anti-doppia-subscription OK');
    }

    subscribtionKey = 'changeIntentColor';
    subscribtion = this.subscriptions.find(item => item.key === subscribtionKey);
    if (!subscribtion) {
      subscribtion = this.intentService.behaviorIntentColor.pipe(takeUntil(this.unsubscribe$)).subscribe(resp => {
        if(resp.intentId && resp.intentId === this.intent?.intent_id){
          this.logger.log('[CDS-INTENT-SLICE2] STEP4: behaviorIntentColor emesso - Test funzionale OK', resp.color);
          if(resp.color){
            this.changeIntentColor(resp.color);
          }
        }
      });
      const subscribe = { key: subscribtionKey, value: subscribtion };
      this.subscriptions.push(subscribe);
      this.logger.log('[CDS-INTENT-SLICE2] STEP3: behaviorIntentColor creata con takeUntil - Pattern consistente OK');
    } else {
      this.logger.log('[CDS-INTENT-SLICE2] STEP6: behaviorIntentColor già esistente - Anti-doppia-subscription OK');
    }

    subscribtionKey = 'intentSelection';
    subscribtion = this.subscriptions.find(item => item.key === subscribtionKey);
    if (!subscribtion) {
      subscribtion = this.intentService.behaviorIntentSelection.pipe(takeUntil(this.unsubscribe$)).subscribe(() => {
        this.updateIntentStyleVm();
        this.updateActionsOutline();
      });
      this.subscriptions.push({ key: subscribtionKey, value: subscribtion });
    }

    this.logger.log('[CDS-INTENT-SLICE2] STEP3: Tutte le subscription inizializzate - Pattern consistente OK', `Total: ${this.subscriptions.length}`);
  }


  /**
   * Chiamata da Angular dopo la prima change detection sugli input.
   * Avvia l’inizializzazione del blocco intent (webhook, tipo, actions, attributi, connettori) nell’ordine richiesto.
   */
  async ngOnInit(): Promise<void> {
    this.logger.log('[CDS-INTENT] ngOnInit-->', this.intent, this.questionCount);
    
    if(this.chatbotSubtype !== TYPE_CHATBOT.CHATBOT){
      this.showIntentOptions = false;
    }
    
    await this.initializeWebhook();
    this.initializeIntentType();
    this.initializeActions();
    this.initializeAttributes();
    this.initializeConnectors();
    this.updateIntentStyleVm();
    this.updateTranslationLabels();
    this.translate.onLangChange.pipe(takeUntil(this.unsubscribe$)).subscribe(() => this.updateTranslationLabels());
  }

  /**
   * Chiamata da ngOnInit solo per intent di tipo WEBHOOK.
   * Recupera l’URL del webhook esistente o ne crea uno nuovo, così il blocco può esporre l’endpoint.
   */
  private async initializeWebhook(): Promise<void> {
    if(this.intent.intent_display_name === TYPE_INTENT_NAME.WEBHOOK){
      this.serverBaseURL = this.appConfigService.getConfig().apiUrl;
      this.chatbot_id = this.dashboardService.id_faq_kb;
      this.webhookUrl = await this.getWebhook();
      if(!this.webhookUrl){
        this.webhookUrl = await this.createWebhook(this.intent);
      }
    }
  }

  /**
   * Chiamata da ngOnInit dopo initializeWebhook.
   * Imposta isStart/isDefaultFallback e, per START/WEBHOOK, garantisce almeno un’action e assegna startAction; altrimenti carica lo stato con setIntentSelected.
   */
  private initializeIntentType(): void {
    if(this.intent.intent_display_name === TYPE_INTENT_NAME.DEFAULT_FALLBACK){
      this.isDefaultFallback = true;
    }
    if(this.intent.intent_display_name === TYPE_INTENT_NAME.START || this.intent.intent_display_name === TYPE_INTENT_NAME.WEBHOOK){
      this.isStart = true;
      if(this.intent.actions.length === 0){
        let action = new Action;
        action._tdActionType =  "intent";
        this.intent.actions.push(action);
      }
      this.showIntentOptions = false;
      this.startAction = this.intent.actions[0];
    }
    else {
      this.setIntentSelected();
    }
  }

  /**
   * Chiamata da ngOnInit; esegue setActionIntent in un setTimeout(100ms) per dare tempo al DOM/stage di essere pronto prima di creare/aggiornare i connettori.
   */
  private initializeActions(): void {
    setTimeout(() => {
      this.setActionIntent();
    }, 100);
  }

  /**
   * Chiamata da ngOnInit dopo initializeIntentType/initializeActions.
   * Imposta flag (internal, untitled, showIntentOptions, newChatbot), registra i listener per i connettori e sincronizza il colore dell’intent.
   */
  private initializeAttributes(): void {
    this.isInternalIntent = checkInternalIntent(this.intent);
    this.updateIsUntitledBlock();
    this.updateShowIntentOptions();
    this.checkIfNewChatbot();
    this.addEventListener();
    this.setIntentAttributes();
  }

  /**
   * Chiamata da ngOnInit alla fine dell’init.
   * Carica la lista dei connettori in ingresso per questo intent e si sottoscrive agli aggiornamenti (ConnectorService) per tenerla aggiornata.
   */
  private initializeConnectors(): void {
    this.loadConnectorsIn();
    this.initConnectorsInSubscription();
  }

  /**
   * Chiamata da initializeWebhook per intent WEBHOOK.
   * Chiede al WebhookService l’URL del webhook del chatbot e lo restituisce (o null in caso di errore).
   */
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

  /**
   * Chiamata da initializeWebhook quando getWebhook non restituisce un URL.
   * Crea un nuovo webhook via WebhookService per questo intent e restituisce l’URL (o null in caso di errore).
   */
  async createWebhook(intent: Intent): Promise<string | null> {
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
   * Chiamata da initializeConnectors e dalla subscription alphaConnectors$ quando cambia l’opacità.
   * Legge da ConnectorService i connettori in ingresso per questo intent e aggiorna connectorsIn per il template.
   */
  private loadConnectorsIn(): void {
    if (!this.intent?.intent_id) {
      this.logger.warn('[CONNECTORS] Intent non disponibile per caricare connettori');
      return;
    }

    const connectors = this.connectorService.getConnectorsInByIntent(this.intent.intent_id);
    this.connectorsIn = [...connectors];
    this.logger.log(`[CONNECTORS] Connettori in ingresso caricati per blocco ${this.intent.intent_id}: totale ${connectors.length} connettori`);
  }

  /**
   * Chiamata da initializeConnectors una sola volta per intent.
   * Sottoscrive all’observable dei connettori in ingresso (ConnectorService) e aggiorna connectorsIn al ogni emissione, evitando subscription duplicate.
   */
  private initConnectorsInSubscription(): void {
    if (!this.intent?.intent_id) {
      this.logger.warn('[CONNECTORS] Intent non disponibile per inizializzare subscription connettori');
      return;
    }

    const keyConnectorsIn = 'connectorsIn';
    if (this.subscriptions.find(item => item.key === keyConnectorsIn)) {
      this.logger.log(`[CONNECTORS] Subscription già esistente per blocco ${this.intent.intent_id}`);
      this.logger.log('[CDS-INTENT-SLICE2] STEP6: connectorsInChanged$ già esistente - Anti-doppia-subscription OK');
      return;
    }

    this.logger.log(`[CONNECTORS] Mi sottoscrivo agli aggiornamenti connettori per blocco ${this.intent.intent_id}`);
    const sub = this.connectorService.getConnectorsInObservable(this.intent.intent_id)
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(connectors => {
        this.logger.log('[CDS-INTENT-SLICE2] STEP4: connectorsInChanged$ emesso - Test funzionale OK', connectors?.length);
        this.updateConnectorsIn(connectors);
      });
    
    this.subscriptions.push({ key: keyConnectorsIn, value: sub });
    this.logger.log(`[CONNECTORS] Subscription attiva per blocco ${this.intent.intent_id}`);
    this.logger.log('[CDS-INTENT-SLICE2] STEP3: connectorsInChanged$ creata con takeUntil - Pattern consistente OK');
  }

  /**
   * Chiamata dal callback della subscription connettori in initConnectorsInSubscription.
   * Sostituisce connectorsIn con l’array ricevuto per aggiornare la vista (es. cds-connector-in).
   */
  private updateConnectorsIn(connectors: any[]): void {
    this.connectorsIn = [...connectors];
    this.logger.log(`[CONNECTORS] Aggiorno il numero dei connettori in ingresso per blocco ${this.intent.intent_id}: totale ${connectors.length} connettori`);
  }

  /**
   * Chiamata da Angular quando cambiano gli input (es. intent, hideActionPlaceholderOfActionPanel).
   * Aggiorna l’opacità del placeholder “aggiungi action” in base a hideActionPlaceholderOfActionPanel, aggiorna agents e isUntitledBlock se cambia l’intent.
   */
  ngOnChanges(changes: SimpleChanges): void {
    this.logger.log('[CDS-INTENT] hideActionPlaceholderOfActionPanel (dragged from sx panel) ', this.hideActionPlaceholderOfActionPanel);
    if (this.hideActionPlaceholderOfActionPanel === false) {
      const addActionPlaceholderEl = document.querySelector('.add--action-placeholder');
      if (addActionPlaceholderEl instanceof HTMLElement) {
        this.logger.log('[CDS-INTENT] HERE 1 !!!! addActionPlaceholderEl ', addActionPlaceholderEl);
        if (addActionPlaceholderEl !== null) {
          addActionPlaceholderEl.style.opacity = '0';
        }
      }
    } else if (this.hideActionPlaceholderOfActionPanel === true) {
      const addActionPlaceholderEl = document.querySelector('.add--action-placeholder');
      if (addActionPlaceholderEl instanceof HTMLElement) {
        this.logger.log('[CDS-INTENT] HERE 2 !!!! addActionPlaceholderEl ', addActionPlaceholderEl);
        if (addActionPlaceholderEl !== null) {
          addActionPlaceholderEl.style.opacity = '1';
        }
      }
    }
    this.setAgentsAvailable();
    if (changes['intent']) {
      if (!changes['intent'].firstChange) {
        this.updateIsUntitledBlock();
      }
      this.updateIntentStyleVm();
    }
  }

  /**
   * Chiamata dalla subscription behaviorIntent e da ngOnChanges.
   * Imposta isAgentsAvailable e intent.agents_available in base al valore attuale dell’intent (per mostrare/nascondere l’icona agents).
   */
  private setAgentsAvailable(): void {
    if (this.intent.agents_available != false) { 
      this.intent.agents_available = true;
      this.isAgentsAvailable = true;
    } else {
      this.isAgentsAvailable = false;
    }
  }

  /**
   * Chiamata da behaviorIntent, ngOnInit (via initializeAttributes), ngOnChanges.
   * Imposta isUntitledBlock se il nome dell’intent inizia con UNTITLED_BLOCK_PREFIX, per mostrare/nascondere il titolo.
   */
  private updateIsUntitledBlock(): void {
    this.isUntitledBlock = this.intent?.intent_display_name?.startsWith(UNTITLED_BLOCK_PREFIX) ?? false;
  }

  /**
   * Chiamata da behaviorIntent, initializeAttributes, setIntentSelected.
   * Imposta showIntentOptions a false se non ci sono domande né campi form; non sovrascrive un false già impostato (es. per subtype/start/webhook).
   */
  private updateShowIntentOptions(): void {
    if (this.showIntentOptions === false) {
      return;
    }
    if (this.questionCount === 0 && this.formSize === 0) {
      this.showIntentOptions = false;
    } else {
      this.showIntentOptions = true;
    }
  }

  /**
   * Chiamata da initializeAttributes in ngOnInit.
   * Imposta isNewChatbot confrontando la data di creazione del chatbot con DATE_NEW_CHATBOT (per regole UI/UX sui chatbot “nuovi”).
   */
  private checkIfNewChatbot(): void {
    const cutoffDate = DATE_NEW_CHATBOT;
    const chatbot = this.dashboardService.selectedChatbot;
    this.logger.log('[CDS-INTENT] checkIfNewChatbot: ', chatbot?.createdAt);
    if (!chatbot || !chatbot.createdAt) {
      this.isNewChatbot = true;
      this.logger.log('[CDS-INTENT] checkIfNewChatbot: nessuna data di creazione, impostato a true');
      return;
    }

    try {
      this.isNewChatbot = chatbot.createdAt >= cutoffDate;
      this.logger.log('[CDS-INTENT] checkIfNewChatbot:', {
        isNewChatbot: this.isNewChatbot
      });
    } catch (error) {
      this.logger.error('[CDS-INTENT] checkIfNewChatbot error:', error);
      this.isNewChatbot = true;
    }
  }

  /**
   * Chiamata da Angular dopo che la view del componente è stata inizializzata.
   * Emette componentRendered per il preload del canvas, avvia il ResizeObserver sul blocco per aggiornare i connettori al ridimensionamento, e riapplica gli attributi intent (colore).
   */
  ngAfterViewInit(): void {
    this.logger.log("[CDS-INTENT]  •••• ngAfterViewInit ••••");
    setTimeout(() => {
      this.componentRendered.emit(this.intent.intent_id);
    }, 0);
    const elementoDom = this.resizeElement?.nativeElement;
    if (elementoDom) {
      const resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          if (!this.isDragging) {
            this.connectorService.updateConnector(this.intent.intent_id);
          }
        }
      });
      resizeObserver.observe(elementoDom);
    }
    this.setIntentAttributes();
  }


  /**
   * Chiamata da Angular prima della distruzione del componente.
   * Completa unsubscribe$ per disiscriversi da tutte le subscription e evitare memory leak.
   */
  ngOnDestroy(): void {
    this.logger.log('[CDS-INTENT-SLICE2] STEP5: ngOnDestroy chiamato - Cleanup subscription iniziato', `Total subscriptions: ${this.subscriptions.length}`);
    this.unsubscribe();
    this.logger.log('[CDS-INTENT-SLICE2] STEP5: unsubscribe$ emesso e completato - Memory leak prevenuto OK');
  }


  /**
   * Chiamata da ngOnDestroy.
   * Emette su unsubscribe$ e completa il Subject così tutte le subscription con takeUntil(unsubscribe$) si chiudono.
   */
  unsubscribe(): void {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }

  /**
   * Chiamata da initializeAttributes in ngOnInit.
   * Registra su document i listener per gli eventi custom dei connettori (release su intent, passaggio sopra/fuori) per aggiornare classi CSS (outline, ripple).
   */
  addEventListener(): void {
    document.addEventListener(
      'connector-release-on-intent',
      (e: CustomEvent) => {
        if (e.detail.toId === this.intent.intent_id) {
          const intentContentEl = document.querySelector(`#intent-content-${e.detail.toId}`);
          if (intentContentEl instanceof HTMLElement) {
            intentContentEl.classList.remove('outline-border');
            intentContentEl.classList.add('ripple-effect');
            setTimeout(() => intentContentEl.classList.remove('ripple-effect'), 2000);
          }
        }
      },
      true
    );
    document.addEventListener(
      'connector-moved-over-intent',
      (e: CustomEvent) => {
        if (e.detail?.toId === this.intent.intent_id) {
          this.connectorIsOverAnIntent = true;
          const intentContentEl = document.querySelector(`#intent-content-${e.detail.toId}`);
          if (intentContentEl instanceof HTMLElement) {
            intentContentEl.classList.add('outline-border');
          }
        }
      },
      true
    );
    document.addEventListener(
      'connector-moved-out-of-intent',
      (e: CustomEvent) => {
        if (e.detail?.toId === this.intent.intent_id) {
          const intentContentEl = document.querySelector(`#intent-content-${e.detail.toId}`);
          if (intentContentEl instanceof HTMLElement) {
            intentContentEl.classList.remove('outline-border');
          }
        }
        this.connectorIsOverAnIntent = false;
      },
      true
    );
  }

  /**
   * Chiamata da behaviorIntent (quando l’intent viene aggiornato), da initializeActions (setTimeout in ngOnInit) e indirettamente da onUpdateAndSaveAction.
   * Gestisce l’action “connect to block”: crea/aggiorna actionIntent e nextBlockAction, crea o rimuove il connettore verso l’altro blocco in base a isActionIntent e stageService.loaded.
   */
  private setActionIntent(): void {
    try {
      let connectorID = '';
      let fromId: string, toId: string;
      if(this.intent.attributes.nextBlockAction){
        this.actionIntent = this.intent.attributes.nextBlockAction;
        fromId = this.actionIntent._tdActionId?this.intent.intent_id+'/'+this.actionIntent._tdActionId:null;
        toId = this.actionIntent.intentName?this.actionIntent.intentName.replace("#", ""):null;
      } else {
        this.actionIntent = this.intentService.createNewAction(TYPE_ACTION.INTENT);
        this.intent.attributes.nextBlockAction = this.actionIntent;
      }
      this.logger.log('[CDS-INTENT] actionIntent :: ', this.actionIntent);
      this.isActionIntent = this.intent.actions.some(obj => obj._tdActionType === TYPE_ACTION.INTENT);
      if(this.isActionIntent){
        this.actionIntent = null;
        if(fromId && toId && fromId !== '' && toId !== ''){
          connectorID = fromId+"/"+toId;
          this.connectorService.deleteConnector(this.intent, connectorID);
        }
      } else if(fromId && toId && fromId !== '' && toId !== ''){
          if(this.stageService.loaded === true){
            this.connectorService.createConnectorFromId(fromId, toId);
          }
        }
    } catch (error) {
      this.logger.log('[CDS-INTENT] error: ', error);
    }
  }

  /**
   * Chiamata dalla subscription liveActiveIntent (test site) per evidenziare il blocco attivo.
   * Aggiunge una classe CSS all’elemento del blocco intent identificato da componentID.
   */
  private addCssClassIntentActive(className: string, componentID: string): void {
    const element = this.elemenRef.nativeElement.querySelector(componentID);
    if (element) {
      element.classList.add(className);
    }
  }

  /**
   * Chiamata dalla subscription liveActiveIntent quando il blocco non è più attivo.
   * Rimuove la classe CSS dall’elemento del blocco se presente.
   */
  private removeCssClassIntentActive(className: string, componentID: string): void {
    const element = this.elemenRef.nativeElement.querySelector(componentID);
    if (element?.classList.contains(className)) {
      element.classList.remove(className);
    }
  }

  /**
   * Chiamata internamente quando serve un feedback visivo temporaneo (es. evidenziazione per X secondi).
   * Aggiunge la classe all’elemento e la rimuove dopo delay secondi.
   */
  private addCssClassAndRemoveAfterTime(className: string, componentID: string, delay: number): void {
    const element = this.elemenRef.nativeElement.querySelector(componentID);
    if (element) {
      element.classList.add(className);
      setTimeout(() => element.classList.remove(className), delay * 1000);
    }
  }

  /**
   * Chiamata da ngAfterViewInit e dalla subscription behaviorIntent (indirettamente).
   * Sincronizza intentColor con intent.attributes.color e imposta un default se manca, per colore blocco e connettori.
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
  }

  /**
   * Chiamata da initializeIntentType per intent non START/WEBHOOK.
   * Carica listOfActions, questionCount e formSize dall’intent, applica patch position e aggiorna showIntentOptions.
   */
  private setIntentSelected(): void {
    this.listOfActions = null;
    this.formSize = 0;
    this.questionCount = 0;
    try {
      if (this.intent) {
        this.patchAttributesPosition();
        this.listOfActions = this.intent.actions;
        this.updateActionsOutline();
        if (this.intent.question) {
          const question_segment = this.intent.question.split(/\r?\n/).filter(element => element);
          this.questionCount = question_segment.length;
        }
      }
      if (this.intent?.form && this.intent.form !== null) {
        this.formSize = Object.keys(this.intent.form).length;
      } else {
        this.formSize = 0;
      }
      this.updateShowIntentOptions();
    } catch (error) {
      this.logger.error("error: ", error);
    }
  }


  /**
   * Chiamata da setIntentSelected.
   * Assicura che intent.attributes.position esista (retrocompatibilità) per il posizionamento sullo stage.
   */
  private patchAttributesPosition(): void {
    if (!this.intent?.attributes) {
      this.intent['attributes'] = {};
    }
    if (!this.intent.attributes.position) {
      this.intent.attributes['position'] = { 'x': 0, 'y': 0 };
    }
  }


  /**
   * Chiamata dal template (o da componenti figli) per ottenere titolo/icona da mostrare per un’action.
   * Restituisce l’oggetto in ACTIONS_LIST corrispondente al tipo _tdActionType dell’action.
   */
  getActionParams(action: Action): any {
    const enumKeys = Object.keys(TYPE_ACTION);
    let keyAction = '';
    try {
      for (const key of enumKeys) {
        if (TYPE_ACTION[key] === action._tdActionType) {
          keyAction = key;
          return ACTIONS_LIST[keyAction];
        }
      }
      return;
    } catch (error) {
      console.error("[CDS-INTENT] getActionParams ERROR: ", error);
      return;
    }
  }

  /**
   * Chiamata dal template al click su un’action nel blocco.
   * Notifica IntentService della selezione, imposta elementTypeSelected e emette actionSelected verso il parent (canvas) per aprire il pannello dettaglio.
   */
  onSelectAction(action: Action, index: number, idAction: HAS_SELECTED_TYPE): void {
    this.logger.log('[CDS-INTENT] onActionSelected action: ', action);
    this.logger.log('[CDS-INTENT] onActionSelected index: ', index);
    this.logger.log('[CDS-INTENT] onActionSelected idAction: ', idAction);
    this.elementTypeSelected = idAction;
    this.intentService.selectAction(this.intent.intent_id, idAction);
    this.actionSelected.emit({ action: action, index: index, maxLength: this.listOfActions.length });
  }

  /**
   * Chiamata dal template al click sull’opzione Question.
   * Seleziona l’intent nel servizio e emette questionSelected con il testo delle domande per aprire il pannello domande.
   */
  onSelectQuestion(elementSelected: HAS_SELECTED_TYPE): void {
    this.elementTypeSelected = elementSelected;
    this.intentService.setIntentSelected(this.intent.intent_id);
    this.questionSelected.emit(this.intent.question);
  }

  /**
   * Chiamata dal template al click sull’opzione Form.
   * Seleziona l’intent, crea un Form vuoto se manca, e emette formSelected per aprire il pannello form.
   */
  onSelectForm(elementSelected: HAS_SELECTED_TYPE): void {
    this.elementTypeSelected = elementSelected;
    this.intentService.setIntentSelected(this.intent.intent_id);
    if (this.intent && !this.intent.form) {
      this.intent.form = new Form();
    }
    this.formSelected.emit(this.intent.form);
  }

  /**
   * Chiamata dal template (cds-action-controls) quando l’utente clicca su modifica/copia/elimina su un’action.
   * Esegue edit (apre dettaglio), delete (rimuove connettori e action e chiama deleteSelectedAction) o copy (copia in localStorage).
   */
  onClickControl(event: 'copy' | 'delete' | 'edit', action: Action, index: number): void {
    this.logger.log('[CDS-INTENT] onClickControl', event, action);
    if (event === 'edit') {
      this.onSelectAction(action, index, action._tdActionId);
    } else if (event === 'delete') {
      this.intent.attributes.connectors = this.intentService.deleteIntentAttributesConnectorByAction(action._tdActionId, this.intent);
      this.intentService.selectAction(this.intent.intent_id, action._tdActionId);
      this.intentService.deleteSelectedAction();
    } else if (event === 'copy') {
      this.copyAction(action);
    }
  }

  /**
   * Chiamata dal template (keydown) quando si preme un tasto sull’action in focus.
   * Se il tasto è Backspace, Escape o Canc, elimina l’action selezionata tramite IntentService.
   */
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Backspace' || event.key === 'Escape' || event.key === 'Canc') {
      this.intentService.deleteSelectedAction();
    }
  }


  /**
   * Chiamata da Angular CDK durante il drag di un’action (cdkDragMoved).
   * Sposta il preview del drag (customDragPreview) seguendo il puntatore per un feedback visivo corretto.
   */
  public onDragMove(event: CdkDragMove): void {
    const element = document.getElementById('customDragPreview');
    if (element) {
      const xPos = event.pointerPosition.x - 122;
      const yPos = event.pointerPosition.y - 20;
      element.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
    }
  }

  /**
   * Chiamata dal template (cdkDragStarted) quando inizia il drag di un’action.
   * Chiude il pannello dettaglio, salva l’intent di partenza in IntentService (per spostamento tra intent), imposta isDragging e gestisce visivamente placeholder/add-action durante il drag.
   */
  onDragStarted(event: any, previousIntentId: string, index: number): void {
    this.controllerService.closeActionDetailPanel();
    this.intentService.setPreviousIntentId(previousIntentId);
    this.isDragging = true;
    const actionDragPlaceholder = document.querySelector('.action-drag-placeholder');
    const addActionPlaceholderEl = document.querySelector('.add--action-placeholder');
    const myObserver = new ResizeObserver(entries => {
      entries.forEach(entry => {
        this.actionDragPlaceholderWidth = entry.contentRect.width;
        if (this.actionDragPlaceholderWidth <= 270) {
          this.hideActionDragPlaceholder = false;
          if (actionDragPlaceholder instanceof HTMLElement) {
            actionDragPlaceholder.style.opacity = '1';
          }
          if (addActionPlaceholderEl instanceof HTMLElement) {
            addActionPlaceholderEl.style.opacity = '0';
          }
        } else {
          this.hideActionDragPlaceholder = true;
          if (actionDragPlaceholder instanceof HTMLElement) {
            actionDragPlaceholder.style.opacity = '0';
          }
          if (addActionPlaceholderEl instanceof HTMLElement) {
            addActionPlaceholderEl.style.opacity = '1';
          }
        }
      });
    });
    if (actionDragPlaceholder) {
      myObserver.observe(actionDragPlaceholder);
    }
  }



  /**
   * Chiamata dal template (cdkDragReleased) quando termina il drag di un’action.
   * Resetta isDragging e chiede a ConnectorService di aggiornare i connettori per questo intent.
   */
  onDragEnded(event: any, index: number): void {
    this.isDragging = false;
    this.connectorService.updateConnector(this.intent.intent_id);
  }

  /**
   * Predicate stabile per [cdkDropListEnterPredicate]: stessa riferimento a ogni CD per evitare re-evaluazione inutili.
   * Blocca l’ingresso nella lista se il chatbot è “nuovo” e l’intent ha già un’action (limite un’action per blocco).
   */
  readonly dropListEnterPredicate = (item: CdkDrag<any>) => {
    if (this.isNewChatbot && this.intent?.actions?.length) {
      return false;
    }
    return true;
  };

  /**
   * Usata dal template come trackBy nell’*ngFor delle action: identifica univocamente l’item per ridurre re-render.
   */
  trackByActionId(_index: number, action: Action): string {
    return action._tdActionId;
  }

  /**
   * Aggiorna vm (backgroundColor, outline) in base a intent e selezione. Chiamato da ngOnInit, ngOnChanges (intent), ngDoCheck (selezione).
   * Evita oggetti ngStyle nel template e riduce checkStylingProperty durante CD.
   */
  private updateIntentStyleVm(): void {
    if (!this.intent?.attributes?.color) {
      this.vm.backgroundColor = '';
      this.vm.outline = 'none';
      this._lastSelectedId = this.intentService.intentSelectedID;
      this._lastIntentActive = this.intentService.intentActive;
      return;
    }
    const c = this.intent.attributes.color;
    this.vm.backgroundColor = `rgba(${c}, 0.35)`;
    this.vm.outline =
      this.intentService.intentSelectedID === this.intent.intent_id && this.intentService.intentActive
        ? `2px solid rgba(${c}, 1)`
        : 'none';
    this._lastSelectedId = this.intentService.intentSelectedID;
    this._lastIntentActive = this.intentService.intentActive;
  }

  /**
   * Pre-calcola action._outline e action._isNoFeatured per ogni action in listOfActions.
   * Chiamato quando si aggiorna listOfActions o quando cambia actionSelectedID; evita funzioni/ngClass nel template.
   */
  private updateActionsOutline(): void {
    if (!this.listOfActions?.length) {
      return;
    }
    const c = this.intent?.attributes?.color;
    const selectedId = this.intentService.actionSelectedID;
    for (const action of this.listOfActions) {
      const a = action as Action & { _outline?: string; _isNoFeatured?: boolean };
      a._outline = c && selectedId === action._tdActionId ? `2px solid rgba(${c}, 1)` : 'none';
      a._isNoFeatured = action._tdActionType !== TYPE_ACTION.REPLY;
    }
  }

  /**
   * Chiamate da cds-connector-in (onShowConnectorsIn / onHideConnectorsIn). Implementazione vuota per evitare binding morti.
   */
  onShowConnectorsIn(): void {}

  onHideConnectorsIn(): void {}

  /**
   * Chiamata dal template (cdkDropListDropped) quando si rilascia un’action sulla lista di questo intent.
   * Gestisce tre casi: riordino nello stesso intent (moveItemInArray), spostamento da altro intent (moveActionBetweenDifferentIntents), nuova action dal pannello (moveNewActionIntoIntent). Per chatbot nuovi blocca il drop se c’è già un’action.
   */
  async onDropAction(event: CdkDragDrop<string[]>) {
    this.logger.log('[CDS-INTENT] onDropAction: ', event, this.intent.actions);
    if (this.isNewChatbot && this.intent.actions && this.intent.actions.length > 0) {
      this.logger.log('[CDS-INTENT] onDropAction: impedito drop - chatbot nuovo e c\'è già un\'action nell\'intent');
      return;
    }

    this.controllerService.closeAllPanels();
    this.intentService.setIntentSelected(this.intent.intent_id);
    if (event.previousContainer === event.container) {
      moveItemInArray(this.intent.actions, event.previousIndex, event.currentIndex);
      this.intentService.updateIntent(this.intent, null);
    } else {
      try {
        const action: any = event.previousContainer.data[event.previousIndex];
        if (event.previousContainer.data.length > 0) {
          if (action._tdActionType) {
            this.logger.log("[CDS-INTENT] onDropAction sposto la action tra 2 intent differenti");
            this.intentService.moveActionBetweenDifferentIntents(event, action, this.intent.intent_id);
            this.intentService.updateIntent(this.intent, null);
            this.connectorService.updateConnectorsOfBlock(this.intent.intent_id);
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


  /**
   * Chiamata dai componenti figli (action) tramite output (updateAndSaveAction) quando l’utente modifica un’action o quando cambia un connettore.
   * Aggiorna l’array intent.actions con l’oggetto ricevuto (replaceItemInArrayForKey) e persiste l’intent tramite IntentService.
   */
  public async onUpdateAndSaveAction(object: any): Promise<void> {
    if (object?._tdActionId) {
      this.intent.actions = replaceItemInArrayForKey('_tdActionId', this.intent.actions, object);
    }
    this.logger.log('[CDS-INTENT] onUpdateAndSaveAction:::: ', object, this.intent, this.intent.actions);
    this.intentService.updateIntent(this.intent);
  }

  /** Alias per compatibilità: il template può chiamare onActionUpdate (updateAndSaveAction). */
  public onActionUpdate(object: any): void {
    this.onUpdateAndSaveAction(object);
  }

  /**
   * Chiamata dal template al click sul pulsante “Aggiungi action” (nel placeholder o nel footer).
   * Calcola la posizione del menu flottante in base al bottone (calleBy), seleziona l’intent e emette showPanelActions verso il canvas per aprire il pannello delle action.
   */
  openActionMenu(intent: Intent, calleBy: string): void {
    this.logger.log('[CDS-INTENT] openActionMenu > intent ', intent);
    this.logger.log('[CDS-INTENT] openActionMenu > calleBy ', calleBy);
    const openActionMenuElm = this.openActionMenuBtnRef.nativeElement.getBoundingClientRect();
    let xOffSet = openActionMenuElm.width + 10;
    if (calleBy === 'add-action-placeholder') {
      xOffSet = 277;
    }
    const buttonXposition = openActionMenuElm.x + xOffSet;
    const buttonYposition = openActionMenuElm.y;
    this.logger.log('[CDS-INTENT] openActionMenu > openActionMenuBtnRef ', openActionMenuElm);
    this.logger.log('[CDS-INTENT] openActionMenu > buttonXposition ', buttonXposition);
    const data = { x: buttonXposition, y: buttonYposition, intent, addAction: true };
    this.intentService.setIntentSelected(this.intent.intent_id);
    this.showPanelActions.emit(data);
  }

  /**
   * Chiamata dal template al click sul contenuto del blocco intent.
   * Apre il pannello dettaglio intent solo se non c’è stato movimento del mouse (click vero, non drag), il blocco è start e il pannello non è già aperto; evita di aprire dopo un drag.
   */
  onOpenIntentPanel(intent: Intent): void {
    this.logger.log('[CDS-INTENT] onOpenIntentPanel > intent', this.intent, " con : ", intent);
    if (!this.hasMouseMoved && !intent['attributesChanged'] && this.isStart && !this.IS_OPEN_PANEL_INTENT_DETAIL) {
      this.openIntentPanel(intent);
    }
  }

  /**
   * Chiamata dal template (mousedown) sul blocco intent.
   * Resetta hasMouseMoved per distinguere un click da un drag quando poi si riceve il click.
   */
  onIntentMouseDown(event: MouseEvent): void {
    this.hasMouseMoved = false;
  }

  /**
   * Chiamata dal template (mousemove) sul blocco intent.
   * Imposta hasMouseMoved a true così onOpenIntentPanel non aprirà il pannello se l’utente stava trascinando.
   */
  onIntentMouseMove(event: MouseEvent): void {
    this.hasMouseMoved = true;
  }

  /**
   * Chiamata dal template (cds-panel-intent-controls) quando l’utente clicca un’opzione del menu intent (webhook, colore, delete, test, copy, open).
   * Esegue l’azione corrispondente: toggle webhook, cambio colore, delete, test, copy intent o apertura pannello.
   */
  onOptionClicked(event: 'webhook' | 'color' | 'delete' | 'test' | 'copy' | 'open'): void {
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


  /**
   * Chiamata da onOptionClicked quando l’utente sceglie “copy” dal menu intent.
   * Serializza l’intent e lo salva in localStorage tramite IntentService e AppStorageService per un successivo incolla.
   */
  private copyIntent(): void {
    const intent = JSON.parse(JSON.stringify(this.intent));
    const element = { element: intent, type: 'INTENT', chatbot: this.intent.id_faq_kb, intentId: this.intent.intent_id };
    const data = this.intentService.copyElement(element);
    this.appStorageService.setItem(data.key, data.data);
  }

  /**
   * Chiamata da onClickControl quando l’utente sceglie “copy” su un’action.
   * Serializza l’action e la salva in localStorage tramite IntentService e AppStorageService per un successivo incolla.
   */
  private copyAction(ele: Action): void {
    const action = JSON.parse(JSON.stringify(ele));
    const element = { element: action, type: 'ACTION', chatbot: this.intent.id_faq_kb, intentId: this.intent.intent_id };
    const data = this.intentService.copyElement(element);
    this.appStorageService.setItem(data.key, data.data);
  }

  /**
   * Chiamata da onOptionClicked quando l’utente sceglie “test” dal menu intent.
   * Delega a IntentService l’apertura del flusso “Test it out” per questo intent.
   */
  onOpenTestItOut(): void {
    this.intentService.openTestItOut(this.intent);
  }

  /**
   * Chiamata da onOptionClicked (opzione webhook) o dal template.
   * Inverte webhook_enabled sull’intent, seleziona l’intent e persiste l’aggiornamento per abilitare/disabilitare il webhook del blocco.
   */
  toggleIntentWebhook(intent: Intent): void {
    this.logger.log('[CDS-INTENT] toggleIntentWebhook  intent ', intent);
    this.logger.log('[CDS-INTENT] toggleIntentWebhook  intent webhook_enabled ', intent.webhook_enabled);
    this.intentService.setIntentSelected(this.intent.intent_id);
    intent.webhook_enabled = !intent.webhook_enabled;
    this.intentService.updateIntent(this.intent, null);
  }

  /**
   * Chiamata da onOptionClicked quando l’utente sceglie “delete” dal menu intent.
   * Emette deleteIntent verso il parent (canvas) che gestirà la rimozione dell’intent e l’aggiornamento della lista.
   */
  onDeleteIntent(intent: Intent): void {
    this.deleteIntent.emit(intent);
  }

  /**
   * Chiamata dal template quando si clicca su un intent di tipo WEBHOOK (es. header).
   * Apre il pannello dettaglio intent solo se questo blocco è effettivamente un webhook.
   */
  openWebhookIntentPanel(intent: Intent): void {
    if (this.intent.intent_display_name === TYPE_INTENT_NAME.WEBHOOK) {
      this.openIntentPanel(intent);
    }
  }

  /**
   * Chiamata da onOpenIntentPanel, onOptionClicked (open), openWebhookIntentPanel e da altri punti che devono aprire il pannello dettaglio.
   * Seleziona l’intent nel servizio e emette openIntent verso il parent per mostrare il pannello.
   */
  openIntentPanel(intent: Intent): void {
    this.intentService.setIntentSelected(this.intent.intent_id);
    this.openIntent.emit(intent);
  }

  /**
   * Chiamata da onOptionClicked (opzione color) quando l’utente vuole cambiare il colore del blocco.
   * Seleziona l’intent e emette changeColorIntent verso il parent che aprirà il menu colore.
   */
  onColorIntent(intent: Intent): void {
    this.intentService.setIntentSelected(this.intent.intent_id);
    this.changeColorIntent.emit(intent);
  }

  /**
   * Chiamata da changeIntentColor (e possibilmente dal parent dopo la scelta del colore).
   * Imposta il colore dei connettori in uscita da questo intent tramite ConnectorService (con opacità fissa 0.7).
   */
  setConnectorColor(color: string): void {
    const nwColor = color ?? INTENT_COLORS.COLOR1;
    const opacity = 0.7;
    this.connectorService.setConnectorColor(this.intent.intent_id, nwColor, opacity);
  }

  /**
   * Chiamata dalla subscription behaviorIntentColor (quando si sceglie un colore dal menu) e da onOptionClicked indirettamente.
   * Aggiorna intentColor e intent.attributes.color, applica il colore ai connettori e persiste l’intent.
   */
  changeIntentColor(color: string): void {
    if (color) {
      this.intentColor = color;
      this.intent.attributes.color = color;
      this.setConnectorColor(color);
      this.intentService.updateIntent(this.intent);
    }
  }
}