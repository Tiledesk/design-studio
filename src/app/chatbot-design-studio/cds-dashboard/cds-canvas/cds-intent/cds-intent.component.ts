import { Renderer2, Component, OnInit, Input, Output, EventEmitter, SimpleChanges, ViewChild, ElementRef, OnChanges, OnDestroy } from '@angular/core';
import { firstValueFrom, Subject, Subscription } from 'rxjs';
import { takeUntil, timeInterval } from 'rxjs/operators';
import { CdkDragDrop, CdkDrag, moveItemInArray, CdkDragMove, transferArrayItem, CdkDropListGroup, CdkDropList, CdkDragHandle } from '@angular/cdk/drag-drop';
import { Form, Intent } from 'src/app/models/intent-model';
import { Action, ActionIntentConnected } from 'src/app/models/action-model';
import { IntentService } from '../../../services/intent.service';
import { ConnectorService } from '../../../services/connector.service';
import { StageService } from '../../../services/stage.service';
import { ControllerService } from '../../../services/controller.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';
import { TYPE_ACTION, TYPE_ACTION_VXML, ACTIONS_LIST, TYPE_CHATBOT } from 'src/app/chatbot-design-studio/utils-actions';
import { INTENT_COLORS, TYPE_INTENT_NAME, replaceItemInArrayForKey, checkInternalIntent, generateShortUID, UNTITLED_BLOCK_PREFIX } from 'src/app/chatbot-design-studio/utils';
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

export class CdsIntentComponent implements OnInit, OnDestroy, OnChanges {
  @Input() intent: Intent;
  @Input() hideActionPlaceholderOfActionPanel: boolean;
  @Input() chatbotSubtype: string;
  @Input() IS_OPEN_PANEL_INTENT_DETAIL: boolean;
  
  @Output() componentRendered = new EventEmitter<string>();
  @Output() questionSelected = new EventEmitter(); // !!! SI PUO' ELIMINARE
  @Output() answerSelected = new EventEmitter(); // !!! SI PUO' ELIMINARE
  @Output() formSelected = new EventEmitter(); // !!! SI PUO' ELIMINARE
  @Output() actionSelected = new EventEmitter(); // !!! SI PUO' ELIMINARE

  @Output() actionDeleted = new EventEmitter();
  @Output() showPanelActions = new EventEmitter(); // nk
  // @Output() testItOut = new EventEmitter<Intent>();
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
  elementTypeSelected: HAS_SELECTED_TYPE
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
  // Track mouse movement to distinguish click from drag
  private mouseDownX: number = 0;
  private mouseDownY: number = 0;
  private hasMouseMoved: boolean = false;
  private readonly MOUSE_MOVE_THRESHOLD: number = 5; // pixels threshold to consider as drag
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
  DATE_NEW_CHATBOT = '2025-12-19T00:00:00.000Z';

  /** INTENT ATTRIBUTES */
  intentColor: any = INTENT_COLORS.COLOR1;

  private readonly logger: LoggerService = LoggerInstance.getInstance();


  constructor(
    public intentService: IntentService,
    public appConfigService: AppConfigService,
    private readonly connectorService: ConnectorService,
    private readonly stageService: StageService,
    private readonly controllerService: ControllerService,
    private readonly elemenRef: ElementRef,
    private readonly renderer: Renderer2,
    private readonly appStorageService: AppStorageService,
    private readonly dashboardService: DashboardService,
    private readonly webhookService: WebhookService,
  ) {
    this.initSubscriptions();
  }


  initSubscriptions() {
    let subscribtion: any;
    let subscribtionKey: string;
    /** SUBSCRIBE TO THE INTENT CREATED OR UPDATED */
    subscribtionKey = 'behaviorIntent';
    subscribtion = this.subscriptions.find(item => item.key === subscribtionKey);
    if (!subscribtion) {
      subscribtion = this.intentService.behaviorIntent.pipe(takeUntil(this.unsubscribe$)).subscribe(intent => {
        if (intent && this.intent && intent.intent_id === this.intent.intent_id) {
          this.logger.log("[CDS-INTENT] sto modificando l'intent: ", this.intent, " con : ", intent);
          this.intent = intent;
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
            // cerca il primo connect to block e fissalo in fondo
            // this.listOfActions = this.intent.actions.filter(function(obj) {
            //   return obj._tdActionType !== TYPE_ACTION.INTENT;
            // });
          }
          

          //UPDATE QUESTIONS
          if (this.intent.question) {
            const question_segment = this.intent.question.split(/\r?\n/).filter(element => element);
            this.questionCount = question_segment.length;
            /** this.question = this.intent.question; */
          } else {
            this.questionCount = 0;
          }

          //UPDATE FORM
          if (this.intent?.form && (this.intent.form !== null)) {
            this.formSize = Object.keys(this.intent.form).length;
          } else {
            this.formSize = 0;
          }

          // Aggiorna showIntentOptions basandosi su questionCount e formSize
          this.updateShowIntentOptions();
        }
      });
      const subscribe = { key: subscribtionKey, value: subscribtion };
      this.subscriptions.push(subscribe);
    }

    /** SUBSCRIBE TO THE INTENT LIVE SELECTED FROM TEST SITE */
    subscribtionKey = 'intentLiveActive';
    subscribtion = this.subscriptions.find(item => item.key === subscribtionKey);
    if (!subscribtion) {
      subscribtion = this.intentService.liveActiveIntent.pipe(takeUntil(this.unsubscribe$)).subscribe(data => {
        // this.logger.log("[CDS-INTENT] intentLiveActive: ", data, this.intent.intent_display_name);
          if (data) {
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
              // this.removeCssClassIntentActive('live-active-intent-pulse', '#intent-content-' + this.intent?.intent_id);
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
    }

    /** SUBSCRIBE TO THE ALPHA CONNECTOR VALUE */
    subscribtionKey = 'alphaConnectors';
    subscribtion = this.subscriptions.find(item => item.key === subscribtionKey);
    if (!subscribtion) {
      subscribtion = this.stageService.alphaConnectors$.subscribe(value => {
        // this.logger.log("[CDS-INTENT] alphaConnectors: ", value);
        this.alphaConnectors = value;
        // Ricarica i connettori quando cambia l'opacità
        if (this.intent?.intent_id) {
          this.loadConnectorsIn();
        }
      });
      const subscribe = { key: subscribtionKey, value: subscribtion };
      this.subscriptions.push(subscribe);
    }
    /** SUBSCRIBE TO THE CHANGE INTENT COLOR */
    subscribtionKey = 'changeIntentColor';
    subscribtion = this.subscriptions.find(item => item.key === subscribtionKey);
    if (!subscribtion) {
      subscribtion = this.intentService.behaviorIntentColor.pipe(takeUntil(this.unsubscribe$)).subscribe(resp => {
        if(resp.intentId && resp.intentId === this.intent?.intent_id){
          if(resp.color){
            this.changeIntentColor(resp.color);
          }
        }
      });
      const subscribe = { key: subscribtionKey, value: subscribtion };
      this.subscriptions.push(subscribe);
    }
  }


  async ngOnInit(): Promise<void> {
      this.logger.log('[CDS-INTENT] ngOnInit-->', this.intent, this.questionCount);
      if(this.chatbotSubtype !== TYPE_CHATBOT.CHATBOT){
        this.showIntentOptions = false;
      } 
      if(this.intent.intent_display_name === TYPE_INTENT_NAME.WEBHOOK){
        this.serverBaseURL = this.appConfigService.getConfig().apiUrl;
        this.chatbot_id = this.dashboardService.id_faq_kb;
        this.webhookUrl = await this.getWebhook();
        if(!this.webhookUrl){
          this.webhookUrl = await this.createWebhook(this.intent);
        }
      }
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
      setTimeout(() => {
        this.setActionIntent();
      }, 100); 
      this.isInternalIntent = checkInternalIntent(this.intent)
      this.updateIsUntitledBlock();
      // Aggiorna showIntentOptions dopo l'inizializzazione
      this.updateShowIntentOptions();
      // Verifica se il chatbot è nuovo (creato dopo il 01/06/2025)
      this.checkIfNewChatbot();
      this.addEventListener();
      this.setIntentAttributes();
      
      // --- Carica i connettori in ingresso iniziali ---
      this.loadConnectorsIn();
      
      // --- Sottoscriviti agli aggiornamenti dei connettori ---
      this.initConnectorsInSubscription();
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

  ngOnChanges(changes: SimpleChanges): void {
    // Fixed bug where an empty intent's action placeholder remains visible if an action is dragged from the left action menu
    this.logger.log('[CDS-INTENT] hideActionPlaceholderOfActionPanel (dragged from sx panel) ', this.hideActionPlaceholderOfActionPanel)
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
    // Aggiorna isUntitledBlock se l'intent cambia
    if (changes['intent'] && !changes['intent'].firstChange) {
      this.updateIsUntitledBlock();
    }
  }

  private setAgentsAvailable(){
    // /if(this.intent.agents_available != false && this.intent.intent_display_name != TYPE_INTENT_NAME.START && this.intent.intent_display_name != TYPE_INTENT_NAME.DEFAULT_FALLBACK){
    if(this.intent.agents_available != false){ 
      this.intent.agents_available = true;
      this.isAgentsAvailable = true;
    } else {
      this.isAgentsAvailable = false;
    }
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
    const cutoffDate = this.DATE_NEW_CHATBOT;
    const chatbot = this.dashboardService.selectedChatbot;
    this.logger.log('[CDS-INTENT] checkIfNewChatbot: ', chatbot.createdAt);


    if (!chatbot || !chatbot.createdAt) {
      // Se non c'è data di creazione, considera come nuovo chatbot
      this.isNewChatbot = true;
      this.logger.log('[CDS-INTENT] checkIfNewChatbot: nessuna data di creazione, impostato a true');
      return;
    }

    try {
      // Se la data di creazione è precedente al 01/06/2025, isNewChatbot = false
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

  ngAfterViewInit() {
    this.logger.log("[CDS-INTENT]  •••• ngAfterViewInit ••••");
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const nuovaAltezza = entry.contentRect.height;
        this.logger.log('[CDS-INTENT] ngAfterViewInit Nuova altezza del div:', nuovaAltezza);
        if(!this.isDragging)this.connectorService.updateConnector(this.intent.intent_id);
      }
    });
    const elementoDom = this.resizeElement.nativeElement;
    resizeObserver.observe(elementoDom);
    setTimeout(() => {
      this.componentRendered.emit(this.intent.intent_id);
    }, 0);
    this.setIntentAttributes();
  }


  ngOnDestroy() {
    this.unsubscribe();
  }


  unsubscribe() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }



  
  // ---------------------------------------------------------
  // Event listener
  // ---------------------------------------------------------
  addEventListener() {
    document.addEventListener(
      "connector-release-on-intent", (e: CustomEvent) => {
        // //this.logger.log('[CDS-INTENT] connector-release-on-intent e ', e)
        if (e.detail.toId === this.intent.intent_id) {
          const intentContentEl = document.querySelector(`#intent-content-${e.detail.toId}`);
          // const blockHeaderEl = <HTMLElement>document.querySelector(`#block-header-${e.detail.toId}`);
          // this.logger.log('[CDS-INTENT] Connector released on intent -  blockHeaderEl', blockHeaderEl)
          if (intentContentEl instanceof HTMLElement) {
            this.logger.log('[CDS-INTENT] Connector released on intent -  intentContentEl', intentContentEl)
            intentContentEl.classList.remove("outline-border")
            intentContentEl.classList.add("ripple-effect")
            setTimeout(() => {
              intentContentEl.classList.remove("ripple-effect")
            }, 2000);
          }
        }
      },
      true
    );

    document.addEventListener(
      "connector-moved-over-intent", (e: CustomEvent) => {
        // //this.logger.log('[CDS-INTENT] Connector Moved over intent e ', e);
        if (e.detail?.toId === this.intent.intent_id) {
          this.connectorIsOverAnIntent = true;
          this.logger.log('[CDS-INTENT] Connector Moved over intent connectorIsOverAnIntent ', this.connectorIsOverAnIntent)
          const intentContentEl = document.querySelector(`#intent-content-${e.detail.toId}`);
          if (intentContentEl instanceof HTMLElement) {
            this.logger.log('[CDS-INTENT] Connector Moved over intent -  intentContentEl', intentContentEl);
            intentContentEl.classList.add("outline-border");
          }
        } else {
          // //this.logger.log('[CDS-INTENT] Connector Moved over intent here yes 2 ')
        }
      },
      true
    );

    document.addEventListener(
      "connector-moved-out-of-intent", (e: CustomEvent) => {
        // // this.logger.log('[CDS-INTENT] Connector Moved out of intent e ', e);
        // !!!se il connettore è a meno di Xpx dalla fine dello stage sposta lo stage!!!!
        if (e.detail?.toId === this.intent.intent_id) {
          const intentContentEl = document.querySelector(`#intent-content-${e.detail.toId}`);
          if (intentContentEl instanceof HTMLElement) {
            this.logger.log('[CDS-INTENT] Connector Moved out of intent -  intentContentEl', intentContentEl)
            intentContentEl.classList.remove("outline-border")
          }
        }
        this.connectorIsOverAnIntent = false;
      },
      true
    );
  }




  /** CUSTOM FUNCTIONS  */

  /** setActionIntent */
  private setActionIntent(){
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

  /** addCssClassIntentActive */
  private addCssClassIntentActive(className: string, componentID: string) {
    this.logger.log("[CDS-INTENT] addCssClassIntentActive: ", className, componentID);
    let element = this.elemenRef.nativeElement.querySelector(componentID)
    if (element) {
      element.classList.add(className);
    }
  }

  private removeCssClassIntentActive(className: string, componentID: string) {
    let element = this.elemenRef.nativeElement.querySelector(componentID);
    this.logger.log('[CDS-INTENT] removeCssClassIntentActive: ', className, componentID);
    if (element && element.classList.contains(className)) {
      element.classList.remove(className);
    }
  }


  private addCssClassAndRemoveAfterTime(className: string, componentID: string, delay: number) {
    let element = this.elemenRef.nativeElement.querySelector(componentID)
    if (element) {
      element.classList.add(className)
      setTimeout(() => {
        element.classList.remove(className)
      }, delay * 1000)
    }
  }


  /** setIntentAttribute */
  private setIntentAttributes(){
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

  private setIntentSelected() {
    this.listOfActions = null;
    this.formSize = 0;
    this.questionCount = 0;
    try {
      if (this.intent) {
        // document.documentElement.style.setProperty('--intent-color', `rgba(${this.intentColor}, 1)`);
        /** // this.patchAllActionsId(); */
        this.patchAttributesPosition();
        this.listOfActions = this.intent.actions;
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
      // Aggiorna showIntentOptions basandosi su questionCount e formSize
      this.updateShowIntentOptions();
    } catch (error) {
      this.logger.error("error: ", error);
    }
  }


  /** patchAllActionsId
   * retrocompatibility patch.
   * Check if the action has a ._tdActionId attribute
   * otherwise it generates it on the fly */
  // private patchAllActionsId() {
  //   if (this.listOfActions && this.listOfActions.length > 0) {
  //     this.listOfActions.forEach(function (action, index, object) {
  //       this.logger.log('[CDS-INTENT] patchAllActionsId action: ', action);
  //       if (!action._tdActionId) {
  //       object[index] = patchActionId(action);
  //       this.logger.log('[CDS-INTENT] object: ', object[index]);
  //       }
  //     });
  //   }
  // }

  /**
   * patchAttributesPosition
   * retrocompatibility patch.
   */
  private patchAttributesPosition() {
    if (!this.intent?.attributes) {
      this.intent['attributes'] = {};
    }
    if (!this.intent.attributes.position) {
      this.intent.attributes['position'] = { 'x': 0, 'y': 0 };
    }
  }


  /** getActionParams
   * Get action parameters from a map to create the header (title, icon) 
   * */
  getActionParams(action) {
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

  /*********************************************/
  // onMouseDownIntent(){
  //   this.elementTypeSelected = null;
  // }

  // onSelectIntent(){
  //   if(!this.elementTypeSelected){
  //     this.intentSelected.emit(this.intent);
  //   }
  // }

  /** EVENTS  */

  // onSelectActionIfWebhook(action: any, index: number, idAction: HAS_SELECTED_TYPE){
  //   if(this.intent.intent_display_name === TYPE_INTENT_NAME.WEBHOOK){
  //     this.onSelectAction(action, index, idAction);
  //   }
  // }

  onSelectAction(action: any, index: number, idAction: HAS_SELECTED_TYPE) {
    this.logger.log('[CDS-INTENT] onActionSelected action: ', action);
    this.logger.log('[CDS-INTENT] onActionSelected index: ', index);
    this.logger.log('[CDS-INTENT] onActionSelected idAction: ', idAction);
    this.elementTypeSelected = idAction;
    this.intentService.selectAction(this.intent.intent_id, idAction);
    this.actionSelected.emit({ action: action, index: index, maxLength: this.listOfActions.length });
  }

  // onSelectAnswer(elementSelected) {
  //   this.elementTypeSelected = elementSelected;
  //   // this.isIntentElementSelected = true;
  //   this.answerSelected.emit(this.answer);
  // }

  onSelectQuestion(elementSelected) {
    this.logger.log('[CDS-INTENT] onSelectQuestion-->', elementSelected, this.intent.question)
    this.elementTypeSelected = elementSelected;
    this.intentService.setIntentSelected(this.intent.intent_id)
    /** // this.isIntentElementSelected = true; */
    this.questionSelected.emit(this.intent.question);
  }

  onSelectForm(elementSelected) {
    /** // this.isIntentElementSelected = true; */
    this.elementTypeSelected = elementSelected;
    this.intentService.setIntentSelected(this.intent.intent_id)
    if (this.intent && !this.intent.form) {
      let newForm = new Form()
      this.intent.form = newForm;
    }
    this.formSelected.emit(this.intent.form);
  }



  onClickControl(event: 'copy' | 'delete' | 'edit', action: Action, index: number) {
    this.logger.log('[CDS-INTENT] onClickControl', event, action);
    if (event === 'edit') {
      this.onSelectAction(action, index, action._tdActionId)
    } else if (event === 'delete') {
      
      this.intent.attributes.connectors = this.intentService.deleteIntentAttributesConnectorByAction(action._tdActionId, this.intent);
      
      this.intentService.selectAction(this.intent.intent_id, action._tdActionId)
      this.intentService.deleteSelectedAction();
      // this.actionDeleted.emit(true)
    } else if (event === 'copy') {
      this.copyAction(action);
    }
  }




  // deleteIntentAttributesConnectorByAction(actionId){
  //   const connectorsList = this.intent.attributes?.connectors;
  //   const filteredData = Object.keys(connectorsList)
  //   .filter(key => !key.includes(actionId))
  //   .reduce((acc, key) => {
  //     acc[key] = connectorsList[key];
  //     return acc;
  //   }, {});
  //   this.intent.attributes.connectors = filteredData;
  //   this.logger.log('[CDS-INTENT] deleteConnectorOfAction', this.intent.attributes.connectors);
  //   // this.connectorService.deleteConnector(this.intent, event.connector.id, true, true);
  // }
  /**
   * onKeydown
   * delete selected action by keydown backspace
   * */
  onKeydown(event) {
    this.logger.log('[CDS-INTENT] onKeydown: ', event);
    if (event.key === 'Backspace' || event.key === 'Escape' || event.key === 'Canc') {
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


  /** !!! IMPORTANT 
   * when the drag of an action starts, I save the starting intent. 
   * Useful in case I move an action between different intents 
  * */
  onDragStarted(event, previousIntentId, index) {
    this.controllerService.closeActionDetailPanel();
    this.logger.log('[CDS-INTENT] onDragStarted event ', event, 'previousIntentId ', previousIntentId);
    this.logger.log('[CDS-INTENT] onDragStarted index ', index);
    this.intentService.setPreviousIntentId(previousIntentId);
    this.isDragging = true;
    this.logger.log('[CDS-INTENT] isDragging - onDragStarted', this.isDragging)
    
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

    this.logger.log('[CDS-INTENT] onDragStarted actionDragPlaceholder', actionDragPlaceholder)
    this.logger.log('[CDS-INTENT] onDragStarted addActionPlaceholderEl ', addActionPlaceholderEl)
    const myObserver = new ResizeObserver(entries => {
      // this will get called whenever div dimension changes
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



  /** onDragEnded
   * get the action moved and update its connectors */
  onDragEnded(event, index) {
    this.logger.log('[CDS-INTENT] onDragEnded: ', event, this.intent.intent_id);
    this.isDragging = false;
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





  /** on Drop Action check the three possible cases:
   * chaimata quando muovo la action in un intent
   * 1 - moving action in the same intent 
   * 2 - moving action from another intent
   * 3 - moving new action in intent from panel elements
   */
  async onDropAction(event: CdkDragDrop<string[]>) {
    this.logger.log('[CDS-INTENT] onDropAction: ', event, this.intent.actions);
    
    // Se il chatbot è nuovo, impedisce il drop se c'è già un'action nell'intent
    // Mantiene il limite di una action per blocco intent per i chatbot nuovi
    if (this.isNewChatbot && this.intent.actions && this.intent.actions.length > 0) {
      this.logger.log('[CDS-INTENT] onDropAction: impedito drop - chatbot nuovo e c\'è già un\'action nell\'intent');
      return;
    }
    
    // Per i chatbot esistenti, esegue il drop normalmente
    this.controllerService.closeAllPanels();
    this.intentService.setIntentSelected(this.intent.intent_id);
    if (event.previousContainer === event.container) {
      // moving action in the same intent 
      moveItemInArray(this.intent.actions, event.previousIndex, event.currentIndex);
      this.intentService.updateIntent(this.intent, null);
      /** //const response = await this.intentService.onUpdateIntentWithTimeout(this.intent); */
    } else {
      try {
        let action: any = event.previousContainer.data[event.previousIndex];
        if (event.previousContainer.data.length > 0) {
          if (action._tdActionType) {
            // moving action from another intent
            this.logger.log("[CDS-INTENT] onDropAction sposto la action tra 2 intent differenti");
            this.intentService.moveActionBetweenDifferentIntents(event, action, this.intent.intent_id);
            this.intentService.updateIntent(this.intent, null);
            this.connectorService.updateConnectorsOfBlock(this.intent.intent_id)
          } else if (action.value?.type) {
            // moving new action in intent from panel elements
            this.logger.log("[CDS-INTENT] onDropAction aggiungo una nuova action all'intent da panel elements - action ", this.newActionCreated);
            this.intentService.moveNewActionIntoIntent(event.currentIndex, action, this.intent.intent_id);
            // this.onSelectAction(newAction, event.currentIndex, newAction._tdActionId)
          }
        }
      } catch (error) {
        console.error(error);
      }
    }
  }


  /**  onUpdateAndSaveAction: 
   * function called by all actions in @output whenever they are modified!
   * called when the connector is created or deleted
   * OR 
   * called when the action is modified
   * */
  public async onUpdateAndSaveAction(object) {
    //this.logger.log('[CDS-INTENT] onUpdateAndSaveAction::::', object);
    let connector = null;
    /** 
    // if(object && object.type && object.type === 'connector'){
    //   connector = object.element;
    //   this.setActionIntent();
    // } else if(object && object.type && object.type === 'action'){
    //   const action  = object.element;
    //   if(action && action._tdActionId){
    //     replaceItemInArrayForKey('_tdActionId', this.intent.actions, action);
    //   }
    // }
    // const action  = object.element; 
    // */
    if(object?._tdActionId){
      this.intent.actions = replaceItemInArrayForKey('_tdActionId', this.intent.actions, object);
    }
    /** // this.setActionIntentInListOfActions(); */
    this.logger.log('[CDS-INTENT] onUpdateAndSaveAction:::: ', object, this.intent, this.intent.actions);
    this.intentService.updateIntent(this.intent);
    /** // this.intentService.onUpdateIntentWithTimeout(this.intent, 0, true, connector); */
  }

  // private setActionIntentInListOfActions(){
  //   let actionIntent = this.actionIntent;
  //   let addIntentAction = true; 
  //   // for (let i = this.intent.actions.length - 1; i >= 0; i--) {
  //   //   if (this.intent.actions[i]._tdActionType === TYPE_ACTION.INTENT) {
  //   //     // this.actionIntent = this.intent.actions[i];
  //   //     // this.logger.log('setActionIntentInIntent:: ', this.intent.actions[i]);
  //   //     // this.intent.actions.splice(i, 1);
  //   //     addIntentAction = true;
  //   //     this.intent.actions[i] = actionIntent;
  //   //     break; 
  //   //   }
  //   // }
  //   this.intent.actions = this.intent.actions.map(function(action) {
  //     if(action._tdActionType === TYPE_ACTION.INTENT){
  //       addIntentAction = false;
  //       return actionIntent;
  //     }
  //     return action;
  //   });
  //   if (addIntentAction) {
  //     this.intent.actions.push(this.actionIntent);
  //   }
  // }

  openActionMenu(intent: any, calleBy: string) {
    this.logger.log('[CDS-INTENT] openActionMenu > intent ', intent)
    this.logger.log('[CDS-INTENT] openActionMenu > calleBy ', calleBy)
    const openActionMenuElm = this.openActionMenuBtnRef.nativeElement.getBoundingClientRect()
    let xOffSet = openActionMenuElm.width + 10 // offset = element width + padding 
    if (calleBy === 'add-action-placeholder') {
      xOffSet = 277
    }
    let buttonXposition = openActionMenuElm.x + xOffSet // 157 
    let buttonYposition = openActionMenuElm.y // - 10
    this.logger.log('[CDS-INTENT] openActionMenu > openActionMenuBtnRef ', openActionMenuElm)
    this.logger.log('[CDS-INTENT] openActionMenu > buttonXposition ', buttonXposition)
    const data = { 'x': buttonXposition, 'y': buttonYposition, 'intent': intent, 'addAction': true };
    this.intentService.setIntentSelected(this.intent.intent_id);
    this.showPanelActions.emit(data);
  }

  onOpenIntentPanel(intent: Intent){
    this.logger.log('[CDS-INTENT] onOpenIntentPanel > intent', this.intent, " con : ", intent);
    // Only open panel if there was no mouse movement (single click, not drag)
    if(!this.hasMouseMoved && !intent['attributesChanged'] && this.isStart && !this.IS_OPEN_PANEL_INTENT_DETAIL){
      this.openIntentPanel(intent);
    }
  }

  onIntentMouseDown(event: MouseEvent): void {
    this.hasMouseMoved = false;
  }

  onIntentMouseMove(event: MouseEvent): void {
    this.hasMouseMoved = true;
  }
  /** ******************************
   * intent controls options: START
   * ****************************** */
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

  // openTestSiteInPopupWindow() {
  //   this.testItOut.emit(this.intent)
  // }


  onOpenTestItOut(){
    this.intentService.openTestItOut(this.intent);
  }


  toggleIntentWebhook(intent) {
    this.logger.log('[CDS-INTENT] toggleIntentWebhook  intent ', intent)
    this.logger.log('[CDS-INTENT] toggleIntentWebhook  intent webhook_enabled ', intent.webhook_enabled)
    this.intentService.setIntentSelected(this.intent.intent_id);
    intent.webhook_enabled = !intent.webhook_enabled;
    /* // this.webHookTooltipText = "Disable webhook"
    // this.webHookTooltipText = "Enable webhook"
    // this.intentService.onUpdateIntentWithTimeout(intent);
    // */
    this.intentService.updateIntent(this.intent, null);
  }

  onDeleteIntent(intent: Intent) {
    this.deleteIntent.emit(intent);
  }

  openWebhookIntentPanel(intent: Intent){
    const webhookIntent = this.intent.intent_display_name === TYPE_INTENT_NAME.WEBHOOK ? true:false;
    if(webhookIntent){
      this.openIntentPanel(intent);
    }
  }

  openIntentPanel(intent: Intent){
    this.intentService.setIntentSelected(this.intent.intent_id);
    this.openIntent.emit(intent);
  }

  onColorIntent(intent: Intent) {
    this.intentService.setIntentSelected(this.intent.intent_id);
    this.changeColorIntent.emit(intent);
  }



  setConnectorColor(color: string){
    const nwColor = color ?? INTENT_COLORS.COLOR1;
    const opacity = 0.7;
    const intentFromId = this.intent.intent_id;
    this.connectorService.setConnectorColor(intentFromId, nwColor, opacity);
  }


  changeIntentColor(color){
    if(color){
      // const coloreValue: string = INTENT_COLORS[color as keyof typeof INTENT_COLORS];
      this.intentColor = color;
      this.intent.attributes.color = color;
      // document.documentElement.style.setProperty('--intent-color', `rgba(${this.intentColor}, 1)`);
      // const element = document.getElementById('intent-content-'+ this.intent?.intent_id);
      // if(element){
      //   element.style.setProperty('background-color', `rgba(${this.intentColor}, 0.35)`);
      // }
      this.setConnectorColor(color);
      this.intentService.updateIntent(this.intent); 
    }
   
  }
  /** ******************************
   * intent controls options: END 
   * ****************************** */
}
