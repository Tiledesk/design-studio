/* 
  ============================================================================
  COMPONENT: cds-intent.component.ts
  ============================================================================
  
  PURPOSE:
  Renders an intent block in the chatbot design studio canvas with:
  - Drag-and-drop functionality for actions
  - Connector management (incoming/outgoing)
  - Intent controls (webhook, color, delete, test, copy, open)
  - Action management (add, edit, delete, reorder)
  - Performance optimizations (IntersectionObserver, precomputed values)
  
  ORGANIZATION:
  1. Imports
  2. Enums
  3. Component Decorator
  4. Component Class:
     - Inputs/Outputs
     - ViewChild
     - Properties (grouped by category)
     - Constructor
     - Lifecycle Hooks
     - Subscriptions
     - Event Handlers
     - Action Management
     - Intent Management
     - Connector Management
     - Drag & Drop
     - Utilities
     - Performance Optimizations
  ============================================================================
*/

// ============================================================================
// IMPORTS
// ============================================================================
import { 
  Component, 
  OnInit, 
  OnDestroy, 
  OnChanges, 
  SimpleChanges,
  Input, 
  Output, 
  EventEmitter, 
  ViewChild, 
  ElementRef 
} from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { 
  CdkDragDrop, 
  CdkDrag, 
  CdkDragMove, 
  CdkDropList, 
  moveItemInArray 
} from '@angular/cdk/drag-drop';

// Models
import { Form, Intent } from 'src/app/models/intent-model';
import { Action, ActionIntentConnected } from 'src/app/models/action-model';

// Services
import { IntentService } from '../../../services/intent.service';
import { ConnectorService } from '../../../services/connector.service';
import { StageService } from '../../../services/stage.service';
import { ControllerService } from '../../../services/controller.service';
import { AppConfigService } from 'src/app/services/app-config';
import { DashboardService } from 'src/app/services/dashboard.service';
import { WebhookService } from 'src/app/chatbot-design-studio/services/webhook-service.service';
import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

// Utils
import { 
  TYPE_ACTION, 
  TYPE_ACTION_VXML, 
  ACTIONS_LIST, 
  TYPE_CHATBOT 
} from 'src/app/chatbot-design-studio/utils-actions';
import { 
  INTENT_COLORS, 
  TYPE_INTENT_NAME, 
  HAS_SELECTED_TYPE,
  replaceItemInArrayForKey, 
  checkInternalIntent, 
  UNTITLED_BLOCK_PREFIX, 
  DATE_NEW_CHATBOT, 
  rgbaToRgbOnWhite 
} from 'src/app/chatbot-design-studio/utils';
import { firstValueFrom } from 'rxjs';

// ============================================================================
// COMPONENT
// ============================================================================
@Component({
  selector: 'cds-intent',
  templateUrl: './cds-intent.component.html',
  styleUrls: ['./cds-intent.component.scss']
})
export class CdsIntentComponent implements OnInit, OnChanges, OnDestroy {

  // ============================================================================
  // INPUTS
  // ============================================================================
  @Input() intent: Intent;
  @Input() hideActionPlaceholderOfActionPanel: boolean;
  @Input() chatbotSubtype: string;
  @Input() IS_OPEN_PANEL_INTENT_DETAIL: boolean;
  
  // ============================================================================
  // OUTPUTS
  // ============================================================================
  @Output() componentRendered = new EventEmitter<string>();
  @Output() questionSelected = new EventEmitter<string>();
  @Output() answerSelected = new EventEmitter<void>();
  @Output() formSelected = new EventEmitter<Form>();
  @Output() actionSelected = new EventEmitter<{ action: Action; index: number; maxLength: number }>();
  @Output() actionDeleted = new EventEmitter<void>();
  @Output() showPanelActions = new EventEmitter<any>();
  @Output() deleteIntent = new EventEmitter<Intent>();
  @Output() openIntent = new EventEmitter<Intent>();
  @Output() changeColorIntent = new EventEmitter<Intent>();

  // ============================================================================
  // VIEW CHILD
  // ============================================================================
  @ViewChild('resizeElement', { static: false }) resizeElement: ElementRef;
  @ViewChild('openActionMenuBtn', { static: false }) openActionMenuBtnRef: ElementRef;

  // ============================================================================
  // PRIVATE PROPERTIES
  // ============================================================================
  private readonly logger: LoggerService = LoggerInstance.getInstance();
  private readonly subscriptions: Array<{ key: string; value: Subscription }> = [];
  private readonly unsubscribe$ = new Subject<void>();
  private intersectionObserver: IntersectionObserver | null = null;
  private isElementInViewport: boolean = true;
  private mouseDownX: number = 0;
  private mouseDownY: number = 0;
  private hasMouseMoved: boolean = false;
  private readonly MOUSE_MOVE_THRESHOLD: number = 5;
  private showIntentControlsTimeout: any = null;

  // ============================================================================
  // PUBLIC PROPERTIES - State
  // ============================================================================
  alphaConnectors: number;
  connectorsIn: any[];
  connector: any = null; // Used by action components (reply, reply-v2, random-reply)
  connectorChanged: any = null; // Used by action components (online-agents, open-hours)
  formSize: number = 0;
  questionCount: number = 0;
  listOfActions: Action[];
  elementTypeSelected: HAS_SELECTED_TYPE;
  isOpen: boolean = true;
  positionMenu: any;
  isStart: boolean = false;
  isDefaultFallback: boolean = false;
  startAction: Action;
  isDragging: boolean = false;
  actionDragPlaceholderWidth: number;
  hideActionDragPlaceholder: boolean;
  newActionCreated: Action;
  dragDisabled: boolean = true;
  connectorIsOverAnIntent: boolean = false;
  webHookTooltipText: string;
  isInternalIntent: boolean = false;
  actionIntent: ActionIntentConnected;
  isActionIntent: boolean = false;
  isAgentsAvailable: boolean = false;
  showIntentOptions: boolean = true;
  webhookUrl: string;
  serverBaseURL: string;
  chatbot_id: string;
  isUntitledBlock: boolean = false;
  isNewChatbot: boolean = false;
  intentColor: string = INTENT_COLORS.COLOR1;
  showIntentControls: boolean = false; // Controls visibility of intent controls with hover delay

  // ============================================================================
  // PUBLIC PROPERTIES - Template Exports
  // ============================================================================
  readonly HAS_SELECTED_TYPE = HAS_SELECTED_TYPE;
  readonly TYPE_ACTION = TYPE_ACTION;
  readonly TYPE_ACTION_VXML = TYPE_ACTION_VXML;
  readonly ACTIONS_LIST = ACTIONS_LIST;

  // ============================================================================
  // COMPUTED PROPERTIES (Getters for Template Optimization)
  // ============================================================================
  
  get intentContentId(): string {
    return this.intent?.intent_id ? `intent-content-${this.intent.intent_id}` : '';
  }

  get blockHeaderId(): string {
    return this.intent?.intent_id ? `block-header-${this.intent.intent_id}` : '';
  }

  get backgroundColor(): string {
    const color = this.intent?.attributes?.color || INTENT_COLORS.COLOR1;
    return rgbaToRgbOnWhite(color, 0.35, 'rgb');
  }

  get outlineColor(): string {
    const color = this.intent?.attributes?.color || INTENT_COLORS.COLOR1;
    return `rgb(${color})`;
  }

  get isIntentSelected(): boolean {
    return this.intentService.intentSelectedID === this.intent?.intent_id && 
           this.intentService.intentActive;
  }

  get intentBackgroundColor(): string {
    return this.backgroundColor;
  }

  get intentOutline(): string {
    return this.isIntentSelected ? `2px solid ${this.outlineColor}` : 'none';
  }

  get isEmptyActions(): boolean {
    return !this.listOfActions || this.listOfActions.length === 0;
  }

  get hasActions(): boolean {
    return this.listOfActions && this.listOfActions.length > 0;
  }

  get showAddActionButton(): boolean {
    return !this.isStart && this.hasActions && !this.isNewChatbot;
  }

  // ============================================================================
  // CONSTRUCTOR
  // ============================================================================
  constructor(
    public readonly intentService: IntentService,
    public readonly appConfigService: AppConfigService,
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

  // ============================================================================
  // LIFECYCLE HOOKS
  // ============================================================================

  async ngOnInit(): Promise<void> {
      this.logger.log('[CDS-INTENT] ngOnInit-->', this.intent, this.questionCount);
    
    // Initialize intent type flags
    if (this.chatbotSubtype !== TYPE_CHATBOT.CHATBOT) {
        this.showIntentOptions = false;
      } 
    
    if (this.intent.intent_display_name === TYPE_INTENT_NAME.DEFAULT_FALLBACK) {
        this.isDefaultFallback = true;
      }
    
    if (this.intent.intent_display_name === TYPE_INTENT_NAME.START || 
        this.intent.intent_display_name === TYPE_INTENT_NAME.WEBHOOK) {
        this.isStart = true;
      if (this.intent.actions.length === 0) {
        const action = new Action();
        action._tdActionType = "intent";
          this.intent.actions.push(action);
        }
        this.showIntentOptions = false;
        this.startAction = this.intent.actions[0];
    } else {
        this.setIntentSelected();
      }

    // Webhook initialization
    if (this.intent.intent_display_name === TYPE_INTENT_NAME.WEBHOOK) {
      this.serverBaseURL = this.appConfigService.getConfig().apiUrl;
      this.chatbot_id = this.dashboardService.id_faq_kb;
      this.webhookUrl = await this.getWebhook();
      if (!this.webhookUrl) {
        this.webhookUrl = await this.createWebhook(this.intent);
      }
    }

    // Delayed action intent setup
      setTimeout(() => {
        this.setActionIntent();
      }, 100); 

    // Initialize component state
    this.isInternalIntent = checkInternalIntent(this.intent);
      this.updateIsUntitledBlock();
      this.updateShowIntentOptions();
      this.checkIfNewChatbot();
      this.addEventListener();
      this.setIntentAttributes();
      
    // Load connectors
      this.loadConnectorsIn();
      this.initConnectorsInSubscription();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Fixed bug: empty intent's action placeholder remains visible if action is dragged from left panel
    this.logger.log('[CDS-INTENT] hideActionPlaceholderOfActionPanel (dragged from sx panel)', 
                    this.hideActionPlaceholderOfActionPanel);
    
    const addActionPlaceholderEl = document.querySelector('.add--action-placeholder');
    if (addActionPlaceholderEl instanceof HTMLElement) {
      if (this.hideActionPlaceholderOfActionPanel === false) {
        addActionPlaceholderEl.style.opacity = '0';
      } else if (this.hideActionPlaceholderOfActionPanel === true) {
        addActionPlaceholderEl.style.opacity = '1';
      }
    }
    
    this.setAgentsAvailable();
    
    if (changes['intent'] && !changes['intent'].firstChange) {
      this.updateIsUntitledBlock();
    }
  }

  ngAfterViewInit(): void {
    this.logger.log("[CDS-INTENT] •••• ngAfterViewInit ••••");
    
    // Setup ResizeObserver for connector updates with debounce
    let resizeDebounceTimeout: any = null;
    const resizeObserver = new ResizeObserver(entries => {
      // Debounce resize events to avoid excessive connector updates
      clearTimeout(resizeDebounceTimeout);
      resizeDebounceTimeout = setTimeout(() => {
        for (const entry of entries) {
          const nuovaAltezza = entry.contentRect.height;
          this.logger.log('[CDS-INTENT] ngAfterViewInit Nuova altezza del div:', nuovaAltezza);
          if (!this.isDragging) {
            this.connectorService.updateConnector(this.intent.intent_id);
          }
        }
      }, 150); // Debounce: wait 150ms after last resize event
    });
    
    const elementoDom = this.resizeElement.nativeElement;
    if (elementoDom) {
      resizeObserver.observe(elementoDom);
    }
    
    // Setup IntersectionObserver for performance optimization
    this.setupIntersectionObserver();
    
    setTimeout(() => {
      this.componentRendered.emit(this.intent.intent_id);
    }, 0);
    
    this.setIntentAttributes();
  }

  ngOnDestroy(): void {
    // Cleanup IntersectionObserver
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }
    
    // Cleanup intent controls visibility timeout
    if (this.showIntentControlsTimeout) {
      clearTimeout(this.showIntentControlsTimeout);
      this.showIntentControlsTimeout = null;
    }
    
    this.unsubscribe();
  }

  // ============================================================================
  // SUBSCRIPTIONS
  // ============================================================================

  private initSubscriptions(): void {
    this.subscribeToIntentUpdates();
    this.subscribeToLiveActiveIntent();
    this.subscribeToAlphaConnectors();
    this.subscribeToIntentColor();
  }

  private subscribeToIntentUpdates(): void {
    const subscriptionKey = 'behaviorIntent';
    if (this.subscriptions.find(item => item.key === subscriptionKey)) {
      return;
    }

    const subscription = this.intentService.behaviorIntent
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(intent => {
        if (intent && this.intent && intent.intent_id === this.intent.intent_id) {
          this.logger.log("[CDS-INTENT] sto modificando l'intent: ", this.intent, " con : ", intent);
          this.intent = intent;
    this.setAgentsAvailable();
      this.updateIsUntitledBlock();
          
          if (intent['attributesChanged']) {
            this.logger.log("[CDS-INTENT] ho solo cambiato la posizione sullo stage");
            delete intent['attributesChanged'];
          } else {
            this.logger.log("[CDS-INTENT] aggiorno le actions dell'intent");
            this.listOfActions = this.intent.actions;
            this.setActionIntent();
          }

          // Update questions
          if (this.intent.question) {
            const question_segment = this.intent.question.split(/\r?\n/).filter(element => element);
            this.questionCount = question_segment.length;
          } else {
            this.questionCount = 0;
          }

          // Update form
          if (this.intent?.form && (this.intent.form !== null)) {
            this.formSize = Object.keys(this.intent.form).length;
    } else {
            this.formSize = 0;
          }

          this.updateShowIntentOptions();
        }
      });
    
    this.subscriptions.push({ key: subscriptionKey, value: subscription });
  }

  private subscribeToLiveActiveIntent(): void {
    const subscriptionKey = 'intentLiveActive';
    if (this.subscriptions.find(item => item.key === subscriptionKey)) {
      return;
    }

    const subscription = this.intentService.liveActiveIntent
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(data => {
        if (data) {
          const intent = data.intent;
          const logAnimationType = data.logAnimationType;
          const scale = data.scale;
          
          if (intent && intent.intent_id !== this.intent?.intent_id && 
              this.intent?.intent_display_name === TYPE_CHATBOT.WEBHOOK) {
            this.removeCssClassIntentActive('live-start-intent', 
              `#intent-content-${this.intent.intent_id}`);
          } else if (!intent && this.intent?.intent_display_name === TYPE_CHATBOT.WEBHOOK) {
            const stageElement = document.getElementById(this.intent.intent_id);
            this.addCssClassIntentActive('live-start-intent', 
              `#intent-content-${this.intent.intent_id}`);
            this.stageService.centerStageOnTopPosition(this.intent.id_faq_kb, stageElement, scale);
          } else if (!intent || intent.intent_id !== this.intent?.intent_id) {
            setTimeout(() => {
              this.removeCssClassIntentActive('live-active-intent-pulse', 
                `#intent-content-${this.intent.intent_id}`);
            }, 500);
          } else if (intent && this.intent && intent.intent_id === this.intent?.intent_id) {
            this.removeCssClassIntentActive('live-active-intent-pulse', 
              `#intent-content-${this.intent.intent_id}`);
            setTimeout(() => {
              this.addCssClassIntentActive('live-active-intent-pulse', 
                `#intent-content-${intent.intent_id}`);
              const stageElement = document.getElementById(intent.intent_id);
              if (logAnimationType) {
                this.stageService.centerStageOnTopPosition(this.intent.id_faq_kb, stageElement, scale);
              }
            }, 500);
          }
    } else {
          if (this.intent?.intent_display_name === TYPE_CHATBOT.WEBHOOK) {
            this.removeCssClassIntentActive('live-start-intent', 
              `#intent-content-${this.intent.intent_id}`);
          }
          this.removeCssClassIntentActive('live-active-intent-pulse', 
            `#intent-content-${this.intent?.intent_id}`);
        }
      });
    
    this.subscriptions.push({ key: subscriptionKey, value: subscription });
  }

  private subscribeToAlphaConnectors(): void {
    const subscriptionKey = 'alphaConnectors';
    if (this.subscriptions.find(item => item.key === subscriptionKey)) {
      return;
    }

    const subscription = this.stageService.alphaConnectors$.subscribe(value => {
      this.alphaConnectors = value;
      if (this.intent?.intent_id) {
        this.loadConnectorsIn();
      }
    });
    
    this.subscriptions.push({ key: subscriptionKey, value: subscription });
  }

  private subscribeToIntentColor(): void {
    const subscriptionKey = 'changeIntentColor';
    if (this.subscriptions.find(item => item.key === subscriptionKey)) {
      return;
    }

    const subscription = this.intentService.behaviorIntentColor
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(resp => {
        if (resp.intentId && resp.intentId === this.intent?.intent_id && resp.color) {
          this.changeIntentColor(resp.color);
        }
      });
    
    this.subscriptions.push({ key: subscriptionKey, value: subscription });
  }

  private unsubscribe(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  // ============================================================================
  // EVENT LISTENERS
  // ============================================================================

  private addEventListener(): void {
    document.addEventListener("connector-release-on-intent", 
      (e: CustomEvent) => this.onConnectorRelease(e), true);
    document.addEventListener("connector-moved-over-intent", 
      (e: CustomEvent) => this.onConnectorMovedOver(e), true);
    document.addEventListener("connector-moved-out-of-intent", 
      (e: CustomEvent) => this.onConnectorMovedOut(e), true);
  }

  private onConnectorRelease(e: CustomEvent): void {
        if (e.detail.toId === this.intent.intent_id) {
          const intentContentEl = document.querySelector(`#intent-content-${e.detail.toId}`);
          if (intentContentEl instanceof HTMLElement) {
        this.logger.log('[CDS-INTENT] Connector released on intent - intentContentEl', intentContentEl);
        intentContentEl.classList.remove("outline-border");
        intentContentEl.classList.add("ripple-effect");
            setTimeout(() => {
          intentContentEl.classList.remove("ripple-effect");
            }, 2000);
          }
        }
  }

  private onConnectorMovedOver(e: CustomEvent): void {
        if (e.detail?.toId === this.intent.intent_id) {
          this.connectorIsOverAnIntent = true;
      this.logger.log('[CDS-INTENT] Connector Moved over intent connectorIsOverAnIntent', 
                      this.connectorIsOverAnIntent);
          const intentContentEl = document.querySelector(`#intent-content-${e.detail.toId}`);
          if (intentContentEl instanceof HTMLElement) {
        this.logger.log('[CDS-INTENT] Connector Moved over intent - intentContentEl', intentContentEl);
            intentContentEl.classList.add("outline-border");
          }
        }
  }

  private onConnectorMovedOut(e: CustomEvent): void {
        if (e.detail?.toId === this.intent.intent_id) {
          const intentContentEl = document.querySelector(`#intent-content-${e.detail.toId}`);
          if (intentContentEl instanceof HTMLElement) {
        this.logger.log('[CDS-INTENT] Connector Moved out of intent - intentContentEl', intentContentEl);
        intentContentEl.classList.remove("outline-border");
          }
        }
        this.connectorIsOverAnIntent = false;
  }

  // ============================================================================
  // ACTION MANAGEMENT
  // ============================================================================

  onSelectAction(action: Action, index: number, idAction: string): void {
    this.logger.log('[CDS-INTENT] onActionSelected action: ', action);
    this.logger.log('[CDS-INTENT] onActionSelected index: ', index);
    this.logger.log('[CDS-INTENT] onActionSelected idAction: ', idAction);
    this.elementTypeSelected = idAction as HAS_SELECTED_TYPE;
    this.intentService.selectAction(this.intent.intent_id, idAction);
    this.actionSelected.emit({ 
      action: action, 
      index: index, 
      maxLength: this.listOfActions.length 
    });
  }

  onClickControl(event: 'copy' | 'delete' | 'edit', action: Action, index: number): void {
    this.logger.log('[CDS-INTENT] onClickControl', event, action);
    
    if (event === 'edit') {
      this.onSelectAction(action, index, action._tdActionId);
    } else if (event === 'delete') {
      this.intent.attributes.connectors = 
        this.intentService.deleteIntentAttributesConnectorByAction(action._tdActionId, this.intent);
      this.intentService.selectAction(this.intent.intent_id, action._tdActionId);
      this.intentService.deleteSelectedAction();
    } else if (event === 'copy') {
      this.copyAction(action);
    }
  }

  onKeydown(event: KeyboardEvent): void {
    this.logger.log('[CDS-INTENT] onKeydown: ', event);
    if (event.key === 'Backspace' || event.key === 'Escape' || event.key === 'Canc') {
      this.intentService.deleteSelectedAction();
    }
  }

  public async onUpdateAndSaveAction(action: Action): Promise<void> {
    if (action?._tdActionId) {
      this.intent.actions = replaceItemInArrayForKey('_tdActionId', this.intent.actions, action);
    }
    this.logger.log('[CDS-INTENT] onUpdateAndSaveAction:::: ', action, this.intent, this.intent.actions);
    this.intentService.updateIntent(this.intent);
  }

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
    
    const data = { 
      'x': buttonXposition, 
      'y': buttonYposition, 
      'intent': intent, 
      'addAction': true 
    };
    
    this.intentService.setIntentSelected(this.intent.intent_id);
    this.showPanelActions.emit(data);
  }

  // ============================================================================
  // INTENT MANAGEMENT
  // ============================================================================

  onSelectQuestion(elementSelected: HAS_SELECTED_TYPE): void {
    this.logger.log('[CDS-INTENT] onSelectQuestion-->', elementSelected, this.intent.question);
    this.elementTypeSelected = elementSelected;
    this.intentService.setIntentSelected(this.intent.intent_id);
    this.questionSelected.emit(this.intent.question);
  }

  onSelectForm(elementSelected: HAS_SELECTED_TYPE): void {
    this.elementTypeSelected = elementSelected;
    this.intentService.setIntentSelected(this.intent.intent_id);
    
    if (this.intent && !this.intent.form) {
      this.intent.form = new Form();
    }
    
    this.formSelected.emit(this.intent.form);
  }

  onOptionClicked(event: 'webhook' | 'color' | 'delete' | 'test' | 'copy' | 'open'): void {
    switch (event) {
      case 'webhook':
        this.toggleIntentWebhook(this.intent);
        break;
      case 'color':
        this.onColorIntent(this.intent);
        break;
      case 'delete':
        this.onDeleteIntent(this.intent);
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

  onOpenIntentPanel(intent: Intent): void {
    this.logger.log('[CDS-INTENT] onOpenIntentPanel > intent', this.intent, " con : ", intent);
    // Only open panel if there was no mouse movement (single click, not drag)
    if (!this.hasMouseMoved && !intent['attributesChanged'] && 
        this.isStart && !this.IS_OPEN_PANEL_INTENT_DETAIL) {
      this.openIntentPanel(intent);
    }
  }

  onIntentMouseDown(event: MouseEvent): void {
    this.hasMouseMoved = false;
  }

  onIntentMouseMove(event: MouseEvent): void {
    this.hasMouseMoved = true;
  }

  /**
   * Show intent controls on hover with 200ms delay
   */
  onIntentMouseEnter(): void {
    // Clear any existing timeout
    if (this.showIntentControlsTimeout) {
      clearTimeout(this.showIntentControlsTimeout);
    }
    
    // Show after 200ms delay
    this.showIntentControlsTimeout = setTimeout(() => {
      this.showIntentControls = true;
      this.showIntentControlsTimeout = null;
    }, 200);
  }

  /**
   * Hide intent controls immediately on mouse leave
   */
  onIntentMouseLeave(): void {
    // Clear timeout if mouse leaves before delay completes
    if (this.showIntentControlsTimeout) {
      clearTimeout(this.showIntentControlsTimeout);
      this.showIntentControlsTimeout = null;
    }
    
    this.showIntentControls = false;
  }

  private openIntentPanel(intent: Intent): void {
    this.intentService.setIntentSelected(this.intent.intent_id);
    this.openIntent.emit(intent);
  }

  private openWebhookIntentPanel(intent: Intent): void {
    const webhookIntent = this.intent.intent_display_name === TYPE_INTENT_NAME.WEBHOOK;
    if (webhookIntent) {
      this.openIntentPanel(intent);
    }
  }

  onColorIntent(intent: Intent): void {
    this.intentService.setIntentSelected(this.intent.intent_id);
    this.changeColorIntent.emit(intent);
  }

  onDeleteIntent(intent: Intent): void {
    this.deleteIntent.emit(intent);
  }

  private toggleIntentWebhook(intent: Intent): void {
    this.logger.log('[CDS-INTENT] toggleIntentWebhook intent ', intent);
    this.logger.log('[CDS-INTENT] toggleIntentWebhook intent webhook_enabled ', intent.webhook_enabled);
    this.intentService.setIntentSelected(this.intent.intent_id);
    intent.webhook_enabled = !intent.webhook_enabled;
    this.intentService.updateIntent(this.intent, null);
  }

  onOpenTestItOut(): void {
    this.intentService.openTestItOut(this.intent);
  }

  private copyIntent(): void {
    const intent = JSON.parse(JSON.stringify(this.intent));
    const element = {
      element: intent, 
      type: 'INTENT', 
      chatbot: this.intent.id_faq_kb, 
      intentId: this.intent.intent_id
    };
    const data = this.intentService.copyElement(element);
    this.appStorageService.setItem(data.key, data.data);
  }

  private copyAction(action: Action): void {
    const actionCopy = JSON.parse(JSON.stringify(action));
    const element = {
      element: actionCopy, 
      type: 'ACTION', 
      chatbot: this.intent.id_faq_kb, 
      intentId: this.intent.intent_id
    };
    const data = this.intentService.copyElement(element);
    this.appStorageService.setItem(data.key, data.data);
  }

  changeIntentColor(color: string): void {
    if (color) {
      this.intentColor = color;
      this.intent.attributes.color = color;
      this.setConnectorColor(color);
      this.intentService.updateIntent(this.intent);
    }
  }

  private setConnectorColor(color: string): void {
    const nwColor = color ?? INTENT_COLORS.COLOR1;
    const opacity = 0.7;
    const intentFromId = this.intent.intent_id;
    this.connectorService.setConnectorColor(intentFromId, nwColor, opacity);
  }

  // ============================================================================
  // CONNECTOR MANAGEMENT
  // ============================================================================

  private loadConnectorsIn(): void {
    if (!this.intent?.intent_id) {
      this.logger.warn('[CONNECTORS] Intent non disponibile per caricare connettori');
      return;
    }

    const connectors = this.connectorService.getConnectorsInByIntent(this.intent.intent_id);
    this.connectorsIn = [...connectors];
    this.logger.log(`[CONNECTORS] Connettori in ingresso caricati per blocco ${this.intent.intent_id}: totale ${connectors.length} connettori`);
  }

  private initConnectorsInSubscription(): void {
    if (!this.intent?.intent_id) {
      this.logger.warn('[CONNECTORS] Intent non disponibile per inizializzare subscription connettori');
      return;
    }

    const keyConnectorsIn = 'connectorsIn';
    if (this.subscriptions.find(item => item.key === keyConnectorsIn)) {
      this.logger.log(`[CONNECTORS] Subscription già esistente per blocco ${this.intent.intent_id}`);
      return;
    }

    this.logger.log(`[CONNECTORS] Mi sottoscrivo agli aggiornamenti connettori per blocco ${this.intent.intent_id}`);
    const sub = this.connectorService.getConnectorsInObservable(this.intent.intent_id)
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(connectors => {
        this.updateConnectorsIn(connectors);
      });
    
    this.subscriptions.push({ key: keyConnectorsIn, value: sub });
    this.logger.log(`[CONNECTORS] Subscription attiva per blocco ${this.intent.intent_id}`);
  }

  private updateConnectorsIn(connectors: any[]): void {
    this.connectorsIn = [...connectors];
    this.logger.log(`[CONNECTORS] Aggiorno il numero dei connettori in ingresso per blocco ${this.intent.intent_id}: totale ${connectors.length} connettori`);
  }

  onShowConnectorsIn(): void {
    // Implementation if needed
  }

  onHideConnectorsIn(): void {
    // Implementation if needed
  }

  // ============================================================================
  // DRAG & DROP
  // ============================================================================

  public onDragMove(event: CdkDragMove): void {
    const element = document.getElementById('customDragPreview');
    if (element) {
      const xPos = event.pointerPosition.x - 122;
      const yPos = event.pointerPosition.y - 20;
      element.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
    }
}

  onDragStarted(event: any, previousIntentId: string, index: number): void {
    this.controllerService.closeActionDetailPanel();
    this.logger.log('[CDS-INTENT] onDragStarted event ', event, 'previousIntentId ', previousIntentId);
    this.logger.log('[CDS-INTENT] onDragStarted index ', index);
    this.intentService.setPreviousIntentId(previousIntentId);
    this.isDragging = true;
    this.logger.log('[CDS-INTENT] isDragging - onDragStarted', this.isDragging);
    
    // Bug fix: When an action is dragged, the "drag placeholder" moves up and changes size to full width
    const actionDragPlaceholder = document.querySelector('.action-drag-placeholder');
    const addActionPlaceholderEl = document.querySelector('.add--action-placeholder');

    this.logger.log('[CDS-INTENT] onDragStarted actionDragPlaceholder', actionDragPlaceholder);
    this.logger.log('[CDS-INTENT] onDragStarted addActionPlaceholderEl ', addActionPlaceholderEl);
    
    const myObserver = new ResizeObserver(entries => {
      entries.forEach(entry => {
        this.actionDragPlaceholderWidth = entry.contentRect.width;
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
        } else {
          this.hideActionDragPlaceholder = true;
          this.logger.log('[CDS-INTENT] Hide action drag placeholder', this.hideActionDragPlaceholder);
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

  onDragEnded(event: any, index: number): void {
    this.logger.log('[CDS-INTENT] onDragEnded: ', event, this.intent.intent_id);
    this.isDragging = false;
    this.connectorService.updateConnector(this.intent.intent_id);
  }

  canEnterDropList(intent: Intent): (item: CdkDrag<any>) => boolean {
    return (item: CdkDrag<any>) => {
      // Se il chatbot è nuovo, disabilita il drop se c'è già un'action nell'intent
      if (this.isNewChatbot && this.intent.actions && this.intent.actions.length > 0) {
        return false;
      }
      return true;
    };
  }

  async onDropAction(event: CdkDragDrop<string[]>): Promise<void> {
    this.logger.log('[CDS-INTENT] onDropAction: ', event, this.intent.actions);
    
    // Se il chatbot è nuovo, impedisce il drop se c'è già un'action nell'intent
    if (this.isNewChatbot && this.intent.actions && this.intent.actions.length > 0) {
      this.logger.log('[CDS-INTENT] onDropAction: impedito drop - chatbot nuovo e c\'è già un\'action nell\'intent');
      return;
    }
    
    this.controllerService.closeAllPanels();
    this.intentService.setIntentSelected(this.intent.intent_id);
    
    if (event.previousContainer === event.container) {
      // Moving action in the same intent
      moveItemInArray(this.intent.actions, event.previousIndex, event.currentIndex);
      this.intentService.updateIntent(this.intent, null);
    } else {
      try {
        const action: any = event.previousContainer.data[event.previousIndex];
        if (event.previousContainer.data.length > 0) {
          if (action._tdActionType) {
            // Moving action from another intent
            this.logger.log("[CDS-INTENT] onDropAction sposto la action tra 2 intent differenti");
            this.intentService.moveActionBetweenDifferentIntents(event, action, this.intent.intent_id);
            this.intentService.updateIntent(this.intent, null);
            this.connectorService.updateConnectorsOfBlock(this.intent.intent_id);
          } else if (action.value?.type) {
            // Moving new action in intent from panel elements
            this.logger.log("[CDS-INTENT] onDropAction aggiungo una nuova action all'intent da panel elements - action ", 
                          this.newActionCreated);
            this.intentService.moveNewActionIntoIntent(event.currentIndex, action, this.intent.intent_id);
          }
        }
      } catch (error) {
        console.error(error);
      }
    }
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  isNoFeaturedAction(action: Action): boolean {
    return action._tdActionType !== TYPE_ACTION.REPLY && 
           action._tdActionType !== TYPE_ACTION_VXML.DTMF_FORM && 
           action._tdActionType !== TYPE_ACTION_VXML.BLIND_TRANSFER;
  }

  isActionSelected(actionId: string): boolean {
    return this.intentService.actionSelectedID === actionId;
  }

  getActionOutline(action: Action): string {
    return this.isActionSelected(action._tdActionId) 
      ? `2px solid ${this.outlineColor}` 
      : 'none';
  }

  shouldShowActionArrow(index: number): boolean {
    return this.listOfActions && (this.listOfActions.length - 1) > index;
  }

  getActionArrowId(index: number): string {
    return `action-arrow-${index}`;
  }

  trackByActionId(index: number, action: Action): string {
    return action._tdActionId || `action-${index}`;
  }

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

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private setAgentsAvailable(): void {
    if (this.intent.agents_available != false) {
      this.intent.agents_available = true;
      this.isAgentsAvailable = true;
    } else {
      this.isAgentsAvailable = false;
    }
  }

  private updateIsUntitledBlock(): void {
    this.isUntitledBlock = this.intent?.intent_display_name?.startsWith(UNTITLED_BLOCK_PREFIX) ?? false;
  }

  private updateShowIntentOptions(): void {
    // Non modificare showIntentOptions se è già stato impostato a false per altri motivi
    if (this.showIntentOptions === false) {
      return;
    }
    // Imposta a false se questionCount e formSize sono entrambi 0
    if (this.questionCount === 0 && this.formSize === 0) {
      this.showIntentOptions = false;
    } else {
      this.showIntentOptions = true;
    }
  }

  private checkIfNewChatbot(): void {
    const cutoffDate = DATE_NEW_CHATBOT;
    const chatbot = this.dashboardService.selectedChatbot;
    this.logger.log('[CDS-INTENT] checkIfNewChatbot: ', chatbot.createdAt);

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

  private setIntentAttributes(): void {
    if (!this.intent?.attributes) {
      this.intent['attributes'] = {};
    }
    if (this.intent.attributes.color && this.intent.attributes.color !== undefined) {
      this.intentColor = this.intent.attributes.color;
    } else {
      this.intentColor = INTENT_COLORS.COLOR1;
      this.intent.attributes.color = INTENT_COLORS.COLOR1;
    }
  }

  private setIntentSelected(): void {
    this.listOfActions = null;
    this.formSize = 0;
    this.questionCount = 0;
    
    try {
      if (this.intent) {
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
      
      this.updateShowIntentOptions();
    } catch (error) {
      this.logger.error("error: ", error);
    }
  }

  private patchAttributesPosition(): void {
    if (!this.intent?.attributes) {
      this.intent['attributes'] = {};
    }
    if (!this.intent.attributes.position) {
      this.intent.attributes['position'] = { 'x': 0, 'y': 0 };
    }
  }

  private setActionIntent(): void {
    try {
      let connectorID = '';
      let fromId: string;
      let toId: string;
      
      if (this.intent.attributes.nextBlockAction) {
        this.actionIntent = this.intent.attributes.nextBlockAction;
        fromId = this.actionIntent._tdActionId 
          ? `${this.intent.intent_id}/${this.actionIntent._tdActionId}` 
          : null;
        toId = this.actionIntent.intentName 
          ? this.actionIntent.intentName.replace("#", "") 
          : null;
      } else {
        this.actionIntent = this.intentService.createNewAction(TYPE_ACTION.INTENT);
        this.intent.attributes.nextBlockAction = this.actionIntent;
      }
      
      this.logger.log('[CDS-INTENT] actionIntent :: ', this.actionIntent);
      this.isActionIntent = this.intent.actions.some(obj => obj._tdActionType === TYPE_ACTION.INTENT);
      
      if (this.isActionIntent) {
        this.actionIntent = null;
        if (fromId && toId && fromId !== '' && toId !== '') {
          connectorID = `${fromId}/${toId}`;
          this.connectorService.deleteConnector(this.intent, connectorID);
        }
      } else if (fromId && toId && fromId !== '' && toId !== '') {
        if (this.stageService.loaded === true) {
          this.connectorService.createConnectorFromId(fromId, toId);
        }
      }
    } catch (error) {
      this.logger.log('[CDS-INTENT] error: ', error);
    }
  }

  private addCssClassIntentActive(className: string, componentID: string): void {
    this.logger.log("[CDS-INTENT] addCssClassIntentActive: ", className, componentID);
    const element = this.elemenRef.nativeElement.querySelector(componentID);
    if (element) {
      element.classList.add(className);
    }
  }

  private removeCssClassIntentActive(className: string, componentID: string): void {
    const element = this.elemenRef.nativeElement.querySelector(componentID);
    this.logger.log('[CDS-INTENT] removeCssClassIntentActive: ', className, componentID);
    if (element && element.classList.contains(className)) {
      element.classList.remove(className);
    }
  }

  // ============================================================================
  // WEBHOOK MANAGEMENT
  // ============================================================================

  private async getWebhook(): Promise<string | null> {
    try {
      const resp: any = await firstValueFrom(this.webhookService.getWebhook(this.chatbot_id));
      this.logger.log("[cds-header] getWebhook : ", resp);
      return resp?.webhook_id ? `${this.serverBaseURL}webhook/${resp.webhook_id}` : null;
    } catch (error) {
      this.logger.log("[cds-header] error getWebhook: ", error);
      return null;
    }
  }

  private async createWebhook(intent: Intent): Promise<string | null> {
    this.logger.log("[cds-intent] createWebhook : ", this.chatbot_id, intent.intent_id);
    const copilot = this.chatbotSubtype === TYPE_CHATBOT.COPILOT;
    try {
      const resp: any = await firstValueFrom(
        this.webhookService.createWebhook(this.chatbot_id, intent.intent_id, true, copilot)
      );
      this.logger.log("[cds-intent] createWebhook : ", resp);
      return resp?.webhook_id ? `${this.serverBaseURL}webhook/${resp.webhook_id}` : null;
    } catch (error) {
      this.logger.log("[cds-intent] error createWebhook: ", error);
      return null;
    }
  }

  // ============================================================================
  // PERFORMANCE OPTIMIZATIONS
  // ============================================================================

  /**
   * Setup IntersectionObserver to pause conic-gradient animation
   * when element is out of viewport for better performance
   */
  private setupIntersectionObserver(): void {
    if (!this.resizeElement?.nativeElement) {
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      this.logger.log('[CDS-INTENT] IntersectionObserver not supported, skipping animation optimization');
      return;
    }

    const element = this.resizeElement.nativeElement;
    const intentContentId = `#intent-content-${this.intent?.intent_id}`;
    const intentElement = element.querySelector(intentContentId) as HTMLElement;

    if (!intentElement) {
      return;
    }

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const isIntersecting = entry.isIntersecting;
          
          if (isIntersecting !== this.isElementInViewport) {
            this.isElementInViewport = isIntersecting;
            
            // Add/remove class to pause animation when out of viewport
            // This affects both .live-active-intent (conic-gradient) and .live-start-intent (pulse)
            if (isIntersecting) {
              intentElement.classList.remove('out-of-viewport');
              this.logger.log('[CDS-INTENT] Element entered viewport, resuming animations');
            } else {
              intentElement.classList.add('out-of-viewport');
              this.logger.log('[CDS-INTENT] Element left viewport, pausing animations');
            }
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '50px'
      }
    );

    this.intersectionObserver.observe(intentElement);
    this.logger.log('[CDS-INTENT] IntersectionObserver setup completed for intent:', this.intent?.intent_id);
  }
}
