import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { Intent } from 'src/app/models/intent-model';
import { AppConfigService } from 'src/app/services/app-config';
import { DashboardService } from 'src/app/services/dashboard.service';
import { IntentService } from 'src/app/chatbot-design-studio/services/intent.service';
import { ConnectorService } from 'src/app/chatbot-design-studio/services/connector.service';
import { StageService } from 'src/app/chatbot-design-studio/services/stage.service';
import { WebhookService } from 'src/app/chatbot-design-studio/services/webhook-service.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { ProjectPlanUtils } from 'src/app/utils/project-utils';
import { TiledeskAuthService } from 'src/chat21-core/providers/tiledesk/tiledesk-auth.service';
import { PLAN_NAME } from 'src/chat21-core/utils/constants';
import { RESERVED_INTENT_NAMES, INTENT_ELEMENT, INTENT_COLORS, STAGE_SETTINGS, TYPE_INTENT_ELEMENT } from 'src/app/chatbot-design-studio/utils';
import { ACTIONS_LIST, TYPE_ACTION, TYPE_ACTION_VXML, TYPE_CHATBOT } from 'src/app/chatbot-design-studio/utils-actions';
import { PanelIntentHeaderComponent } from '../cds-intent/panel-intent-header/panel-intent-header.component';

const swal = require('sweetalert');

@Component({
  selector: 'cds-panel-detail',
  templateUrl: './cds-panel-detail.component.html',
  styleUrls: ['./cds-panel-detail.component.scss']
})
export class CdsPanelDetailComponent implements OnInit, OnChanges, OnDestroy {
  @Input() intent: Intent;
  @Input() project_id: string;
  @Output() closePanel = new EventEmitter<void>();
  @Output() savePanelIntentDetail = new EventEmitter();

  @ViewChild(PanelIntentHeaderComponent) panelIntentHeader: PanelIntentHeaderComponent;

  maximize = false;
  settingsOpen = true;
  isStart = false;
  isWebhook = false;

  listOfIntents: Array<{ name: string; value: string; icon?: string }> = [];
  selectedNextIntent: string | null = null;

  serverBaseURL: string;
  chatbot_id: string;
  chatbotSubtype: string;
  webhookUrl = '';
  webhookUrlDev = '';
  messageText = '';

  // action detail
  typeIntentElement = TYPE_INTENT_ELEMENT;
  TYPE_ACTION = TYPE_ACTION;
  TYPE_ACTION_VXML = TYPE_ACTION_VXML;
  elementSelected: any;
  elementIntentSelectedType: string;
  canShowActionByPlan: { plan: PLAN_NAME; enabled: boolean } = { plan: PLAN_NAME.A, enabled: true };

  private subscriptionIntent: Subscription;
  private readonly logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private readonly intentService: IntentService,
    private readonly connectorService: ConnectorService,
    private readonly stageService: StageService,
    private readonly webhookService: WebhookService,
    private readonly appConfigService: AppConfigService,
    private readonly dashboardService: DashboardService,
    private readonly translate: TranslateService,
    private readonly projectPlanUtils: ProjectPlanUtils,
    private readonly tiledeskAuthService: TiledeskAuthService
  ) {}

  ngOnInit(): void {
    this.maximize = this.stageService.getMaximize();
    this.initialize();
    this.initSubscriptions();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['intent'] && !changes['intent'].firstChange) {
      this.initialize();
      setTimeout(() => this.panelIntentHeader?.focusInput(), 300);
    }
  }

  ngOnDestroy(): void {
    this.subscriptionIntent?.unsubscribe();
  }

  get intentColor(): string {
    return this.intent?.attributes?.color ?? INTENT_COLORS.COLOR1;
  }

  get firstActionElement(): any {
    const type = this.intent?.actions?.[0]?._tdActionType;
    if (!type) { return null; }
    if (type === 'form' || type === 'question' || type === 'answer') {
      return Object.values(INTENT_ELEMENT).find((el: any) => el.type === type) ?? null;
    }
    if (type === 'jsoncondition') {
      return 'noelse' in (this.intent.actions[0] as any)
        ? ACTIONS_LIST.CONDITION
        : ACTIONS_LIST.JSON_CONDITION;
    }
    return Object.values(ACTIONS_LIST).find((el: any) => el.type === type) ?? null;
  }

  private initialize(): void {
    this.isStart = false;
    this.isWebhook = false;
    this.webhookUrl = '';
    this.webhookUrlDev = '';
    this.selectedNextIntent = null;
    this.listOfIntents = [];
    this.elementSelected = null;
    this.elementIntentSelectedType = null;

    if (!this.intent) { return; }

    if (this.intent.intent_display_name === RESERVED_INTENT_NAMES.START) {
      this.isStart = true;
      if (this.intent.agents_available !== false) { this.intent.agents_available = true; }
    } else if (this.intent.intent_display_name === RESERVED_INTENT_NAMES.WEBHOOK) {
      this.initializeWebhook();
    }

    if (!this.isStart && !this.isWebhook) {
      this.initializeConnectorSelect();
    }

    // Initialize action detail
    if (this.intent.actions?.length > 0) {
      this.elementSelected = this.intent.actions[0];
      this.elementIntentSelectedType = TYPE_INTENT_ELEMENT.ACTION;
      this.checkActionAvailability();
    }
  }

  private initializeWebhook(): void {
    this.isWebhook = true;
    this.serverBaseURL = this.appConfigService.getConfig().apiUrl;
    this.chatbot_id = this.dashboardService.id_faq_kb;
    this.chatbotSubtype = this.dashboardService.selectedChatbot?.subtype ?? TYPE_CHATBOT.CHATBOT;
    this.getWebhook();
  }

  private initializeConnectorSelect(): void {
    this.listOfIntents = this.intentService.getListOfIntents().filter(intent => {
      const intentId = intent.value.replace('#', '');
      return intentId !== this.intent.intent_id &&
             intent.name !== RESERVED_INTENT_NAMES.START &&
             intent.name !== RESERVED_INTENT_NAMES.WEBHOOK;
    });
    this.listOfIntents.sort((a, b) => a.name.localeCompare(b.name));
    if (this.intent.attributes?.nextBlockAction?.intentName) {
      this.selectedNextIntent = this.intent.attributes.nextBlockAction.intentName;
    }
  }

  private initSubscriptions(): void {
    this.subscriptionIntent = this.intentService.behaviorIntent.subscribe((int: Intent) => {
      const intent = this.intentService.listOfIntents.find(obj => obj.intent_id === int.intent_id);
      if (!intent || !this.intent) { return; }
      if (intent.intent_id === this.intent.intent_id) {
        if (this.elementIntentSelectedType === TYPE_INTENT_ELEMENT.ACTION && this.elementSelected) {
          const updated = intent.actions.find(a => a._tdActionId === this.elementSelected._tdActionId);
          if (updated) { this.elementSelected = updated; }
        }
      } else {
        this.closePanel.emit();
      }
    });
  }

  private checkActionAvailability(): void {
    if (!this.elementSelected?._tdActionType) { return; }
    const action = Object.values(ACTIONS_LIST).find(el => el.type === this.elementSelected._tdActionType);
    if (action?.plan) {
      this.canShowActionByPlan = {
        plan: action.plan,
        enabled: this.projectPlanUtils.checkIfCanLoad(action.type, action.plan)
      };
    }
    if (action?.type === TYPE_ACTION.CODE) {
      this.canShowActionByPlan = {
        plan: action.plan,
        enabled: this.projectPlanUtils.checkIfIsEnabledInProject(action.type)
      };
    }
  }

  onToggleMaximize(): void {
    this.maximize = !this.maximize;
    this.stageService.saveSettings(this.dashboardService.id_faq_kb, STAGE_SETTINGS.Maximize, this.maximize);
  }

  onAgentsAvailableChange(checked: boolean): void {
    this.intent.agents_available = checked;
    this.onSaveIntent();
  }

  onSaveIntent(event?: any): void {
    if (this.elementIntentSelectedType === TYPE_INTENT_ELEMENT.ACTION && this.elementSelected) {
      const index = this.intent.actions.findIndex(a => a._tdActionId === this.elementSelected._tdActionId);
      if (index >= 0) { this.intent.actions[index] = this.elementSelected; }
    }
    this.savePanelIntentDetail.emit(this.intent);
  }

  onChangeNextIntentSelect(event: { name: string; value: string }): void {
    if (!event?.value) { return; }
    if (!this.intent.attributes) { this.intent.attributes = {}; }
    if (!this.intent.attributes.nextBlockAction) {
      this.intent.attributes.nextBlockAction = this.intentService.createNewAction(TYPE_ACTION.INTENT);
    }
    this.intent.attributes.nextBlockAction.intentName = event.value;
    this.selectedNextIntent = event.value;
    const fromId = `${this.intent.intent_id}/${this.intent.attributes.nextBlockAction._tdActionId}`;
    const toId = event.value.replace('#', '');
    if (this.stageService.loaded) {
      this.connectorService.createConnectorFromId(fromId, toId, true);
    }
    this.onSaveIntent();
  }

  onResetNextIntentSelect(_event: any): void {
    if (this.intent.attributes?.nextBlockAction) {
      const fromId = `${this.intent.intent_id}/${this.intent.attributes.nextBlockAction._tdActionId}`;
      const toId = this.intent.attributes.nextBlockAction.intentName?.replace('#', '');
      if (toId) {
        this.connectorService.deleteConnector(this.intent, `${fromId}/${toId}`);
      }
      this.intent.attributes.nextBlockAction.intentName = null;
      this.selectedNextIntent = null;
      this.onSaveIntent();
    }
  }

  onConnectorChange(type: 'create' | 'delete', idConnector: string, toIntentId: string): void {
    this.connectorService.updateConnectorAttributes(idConnector, null);
    switch (type) {
      case 'create': {
        let toId = toIntentId;
        if (toIntentId.includes('#')) {
          toId = toIntentId.split('#')[1];
          if (toIntentId.includes('{')) {
            toId = toIntentId.split('#')[1].split('{')[0];
          }
        }
        this.connectorService.deleteConnectorWithIDStartingWith(idConnector, false, true);
        this.connectorService.createNewConnector(idConnector, toId);
        break;
      }
      case 'delete':
        this.connectorService.deleteConnectorWithIDStartingWith(idConnector, false, true);
        break;
    }
  }

  getWebhook(): void {
    this.webhookService.getWebhook(this.chatbot_id).subscribe({
      next: (resp: any) => {
        this.webhookUrl = this.serverBaseURL + 'webhook/' + resp.webhook_id;
        this.webhookUrlDev = this.webhookUrl + '/dev';
      },
      error: (err) => this.logger.error('[CdsPanelDetailComponent] getWebhook error:', err)
    });
  }

  newWebhook(): void {
    if (this.webhookUrl?.trim()) {
      this.onRegenerateWebhook();
    } else {
      this.createWebhook();
    }
  }

  createWebhook(): void {
    const copilot = this.chatbotSubtype === TYPE_CHATBOT.COPILOT;
    this.webhookService.createWebhook(this.chatbot_id, this.intent.intent_id, true, copilot).subscribe({
      next: (resp: any) => {
        this.webhookUrl = this.serverBaseURL + 'webhook/' + resp.webhook_id;
        this.webhookUrlDev = this.webhookUrl + '/dev';
      },
      error: (err) => this.logger.error('[CdsPanelDetailComponent] createWebhook error:', err)
    });
  }

  onRegenerateWebhook(): void {
    swal({
      title: 'Are you sure',
      text: 'If you regenerate the webhook url, the previous url will no longer be available',
      icon: 'warning',
      buttons: ['Cancel', 'Regenerate'],
      dangerMode: false,
    }).then((resp: boolean) => {
      if (resp) { this.regenerateWebhook(); }
    });
  }

  regenerateWebhook(): void {
    this.webhookService.regenerateWebhook(this.chatbot_id).subscribe({
      next: (resp: any) => {
        this.webhookUrl = this.serverBaseURL + 'webhook/' + resp.webhook_id;
        this.webhookUrlDev = this.webhookUrl + '/dev';
        this.showMessage('Webhook successfully regenerated!');
      },
      error: (err) => {
        this.showMessage('Error regenerating webhook: ' + JSON.stringify(err));
        this.logger.error('[CdsPanelDetailComponent] regenerateWebhook error:', err);
      }
    });
  }

  async onCopyToClipboard(value: string): Promise<void> {
    if (navigator?.clipboard) {
      try {
        await navigator.clipboard.writeText(value);
        this.showMessage(this.translate.instant('Copied') + '!');
      } catch (err) {
        this.logger.error('[CdsPanelDetailComponent] clipboard error:', err);
      }
    }
  }

  goToContactSales(): void {
    const user = this.tiledeskAuthService.getCurrentUser();
    window.open(`mailto:sales@tiledesk.com?subject=Upgrade to Tiledesk ${this.canShowActionByPlan.plan}`);
    try {
      (window as any)['analytics'].track(`Contact us to upgrade plan to ${this.canShowActionByPlan.plan}`, {
        email: user.email,
        action: this.elementSelected
      }, { context: { groupId: this.dashboardService.projectID } });
    } catch (err) {
      this.logger.error('track contact us to upgrade plan error', err);
    }
  }

  private showMessage(msg: string): void {
    this.messageText = msg;
    setTimeout(() => { this.messageText = ''; }, 5000);
  }
}
