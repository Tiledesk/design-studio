import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Subscription, firstValueFrom } from 'rxjs';
import { IntentService } from 'src/app/chatbot-design-studio/services/intent.service';
import { TYPE_METHOD_ATTRIBUTE, TYPE_UPDATE_ACTION } from 'src/app/chatbot-design-studio/utils';
import { checkConnectionStatusOfAction, updateConnector } from 'src/app/chatbot-design-studio/utils-connectors';
import { variableList } from 'src/app/chatbot-design-studio/utils-variables';
import { ActionSubAgent } from 'src/app/models/action-model';
import { Intent } from 'src/app/models/intent-model';
import { FaqKbService } from 'src/app/services/faq-kb.service';
import { FaqService } from 'src/app/services/faq.service';
import { DashboardService } from 'src/app/services/dashboard.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Component({
  selector: 'cds-action-sub-agent',
  templateUrl: './cds-action-sub-agent.component.html',
  styleUrls: ['./cds-action-sub-agent.component.scss']
})
export class CdsActionSubAgentComponent implements OnInit, OnDestroy {

  @Input() intentSelected: Intent;
  @Input() action: ActionSubAgent;
  @Input() previewMode: boolean = true;
  @Output() updateAndSaveAction = new EventEmitter();
  @Output() onConnectorChange = new EventEmitter<{type: 'create' | 'delete', fromId: string, toId: string}>();

  chatbots_name_list: Array<{name: string, value: string, id: string, slug: string, name2: string, icon?: string}> = [];
  autocompleteOptionsBlockName: Array<{label: string, value: string}> = [];
  listOfIntents: Array<{name: string, value: string, icon?: string}>;
  modeOptions = [
    { name: 'CDSCanvas.SubAgentFireAndContinue', value: 'fire_and_continue' },
    { name: 'CDSCanvas.SubAgentWaitForResult', value: 'wait_result' },
  ];

  idIntentSelected: string;
  idConnectorTrue: string;
  idConnectorFalse: string;
  idConnectionTrue: string;
  idConnectionFalse: string;
  isConnectedTrue: boolean = false;
  isConnectedFalse: boolean = false;

  jsonParameters: string;
  typeMethodAttribute = TYPE_METHOD_ATTRIBUTE;
  connector: any;
  private subscriptionChangedConnector: Subscription;
  private readonly logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private readonly chatbotService: FaqKbService,
    private readonly faqService: FaqService,
    private readonly intentService: IntentService,
    private readonly dashboardService: DashboardService,
  ) { }

  ngOnInit(): void {
    this.subscriptionChangedConnector = this.intentService.isChangedConnector$.subscribe((connector: any) => {
      this.connector = connector;
      this.updateConnector();
    });
    this.initialize();
  }

  ngOnDestroy(): void {
    if (this.subscriptionChangedConnector) {
      this.subscriptionChangedConnector.unsubscribe();
    }
  }

  private async initialize(): Promise<void> {
    if (this.action && !this.action.assignResultTo) {
      this.action.assignResultTo = 'subagent_result';
    }
    this.initializeAttributes();
    this.jsonParameters = this.action.input as unknown as string;
    // Connettori inizializzati PRIMA della chiamata async: gli id/stato devono essere pronti
    // al primo render, altrimenti il canvas disegna le linee prima che gli anchor esistano
    // (lo stato "connesso" si aggiorna via ngOnChanges, ma la linea non viene tracciata).
    if (this.intentSelected) {
      this.initializeConnector();
    }
    await this.getAllBots();
    if (this.action?.subagent_id) {
      this.getAllFaqById(this.action.subagent_id);
    }
  }

  /** Registra le variabili di sistema del sub-agent (una sola volta) nella lista userDefined. */
  private initializeAttributes(): void {
    const userDefined = variableList.find(el => el.key === 'userDefined');
    if (!userDefined) return;
    const systemNames = ['subagent_status', 'subagent_error', 'subagent_result', 'subAgentRunId'];
    const toAdd = systemNames
      .filter(name => !userDefined.elements.some(v => v.name === name))
      .map(name => ({ name, value: name }));
    if (toAdd.length) {
      userDefined.elements = [...userDefined.elements, ...toAdd];
    }
  }

  private initializeConnector(): void {
    this.idIntentSelected = this.intentSelected.intent_id;
    this.idConnectorTrue = this.idIntentSelected + '/' + this.action._tdActionId + '/true';
    this.idConnectorFalse = this.idIntentSelected + '/' + this.action._tdActionId + '/false';
    this.listOfIntents = this.intentService.getListOfIntents();
    this.checkConnectionStatus();
  }

  private checkConnectionStatus(): void {
    const resp = checkConnectionStatusOfAction(this.action, this.idConnectorTrue, this.idConnectorFalse);
    this.isConnectedTrue = resp.isConnectedTrue;
    this.isConnectedFalse = resp.isConnectedFalse;
    this.idConnectionTrue = resp.idConnectionTrue;
    this.idConnectionFalse = resp.idConnectionFalse;
  }

  private updateConnector(): void {
    const resp = updateConnector(
      this.connector,
      this.action,
      this.isConnectedTrue,
      this.isConnectedFalse,
      this.idConnectionTrue,
      this.idConnectionFalse
    );
    if (resp) {
      this.isConnectedTrue = resp.isConnectedTrue;
      this.isConnectedFalse = resp.isConnectedFalse;
      this.idConnectionTrue = resp.idConnectionTrue;
      this.idConnectionFalse = resp.idConnectionFalse;
      if (resp.emit) {
        this.updateAndSaveAction.emit({ type: TYPE_UPDATE_ACTION.CONNECTOR, element: this.connector });
      }
    }
  }

  get showBranching(): boolean {
    return this.action?.mode === 'wait_result' || this.action?.awaitWebhookPublish === true;
  }

  /**
   * Popola la select "Choose an Agent" con i SUBAGENT collegati al chatbot corrente
   * (endpoint dedicato: /faq_kb/{id}/subagents).
   */
  private async getAllBots(): Promise<void> {
    try {
      const faqKbId = this.dashboardService.id_faq_kb;
      const res: any = await firstValueFrom(this.chatbotService.getSubagentsByFaqKbId(faqKbId));
      const subagents: any[] = Array.isArray(res) ? res : (res?.subagents || res?.data || []);
      this.chatbots_name_list = subagents.map((a: any) => {
        const name2 = a.slug ? `${a.name} (${a.slug})` : a.name;
        return { name: a.name, value: a.name, slug: a.slug, id: a._id, name2, icon: 'smart_toy' };
      });
    } catch (error) {
      this.logger.error('[ACTION-SUB-AGENT] error get subagents: ', error);
    }
  }

  getAllFaqById(chatbotId: string): void {
    this.faqService.getAllFaqByFaqKbId(chatbotId).subscribe({
      next: (faqs) => {
        this.autocompleteOptionsBlockName = faqs.map((faq) => ({
          label: faq.intent_display_name,
          value: '#' + faq.intent_id
        }));
      },
      error: (error) => {
        this.logger.error('[ACTION-SUB-AGENT] error get blocks: ', error);
      }
    });
  }

  onChangeSelect(event: {name: string, value: string, id: string}): void {
    this.action.subagent_id = event.id;
    this.action.intentName = '';
    this.getAllFaqById(event.id);
    this.updateAndSaveAction.emit({ type: TYPE_UPDATE_ACTION.ACTION, element: this.action });
  }

  onChangeBlockSelect(event: {name: string, value: string}): void {
    if (event) {
      this.action.intentName = event.value;
      this.updateAndSaveAction.emit({ type: TYPE_UPDATE_ACTION.ACTION, element: this.action });
    }
  }

  onChangeModeSelect(event: {name: string, value: string}): void {
    if (event) {
      this.action.mode = event.value as ActionSubAgent['mode'];
      this.updateAndSaveAction.emit({ type: TYPE_UPDATE_ACTION.ACTION, element: this.action });
    }
  }

  onChangeAttributes(attributes: any): void {
    this.action.input = attributes;
    this.updateAndSaveAction.emit({ type: TYPE_UPDATE_ACTION.ACTION, element: this.action });
  }

  onSelectedAttribute(event, property: string): void {
    this.action[property] = event.value;
    this.updateAndSaveAction.emit({ type: TYPE_UPDATE_ACTION.ACTION, element: this.action });
  }

  onChangeBlockSelectIntent(event: {name: string, value: string}, type: 'trueIntent' | 'falseIntent'): void {
    if (event) {
      this.action[type] = event.value;
      switch (type) {
        case 'trueIntent':
          this.onConnectorChange.emit({ type: 'create', fromId: this.idConnectorTrue, toId: this.action.trueIntent });
          break;
        case 'falseIntent':
          this.onConnectorChange.emit({ type: 'create', fromId: this.idConnectorFalse, toId: this.action.falseIntent });
          break;
      }
      this.updateAndSaveAction.emit({ type: TYPE_UPDATE_ACTION.ACTION, element: this.action });
    }
  }

  onResetBlockSelectIntent(event: {name: string, value: string}, type: 'trueIntent' | 'falseIntent'): void {
    switch (type) {
      case 'trueIntent':
        this.onConnectorChange.emit({ type: 'delete', fromId: this.idConnectorTrue, toId: this.action.trueIntent });
        break;
      case 'falseIntent':
        this.onConnectorChange.emit({ type: 'delete', fromId: this.idConnectorFalse, toId: this.action.falseIntent });
        break;
    }
    this.action[type] = null;
    this.updateAndSaveAction.emit({ type: TYPE_UPDATE_ACTION.ACTION, element: this.action });
  }

  onResetSelect(_event, key: 'subagent_id' | 'intentName'): void {
    switch (key) {
      case 'subagent_id':
        this.action.subagent_id = null;
        this.action.intentName = null;
        this.autocompleteOptionsBlockName = [];
        break;
      case 'intentName':
        this.action.intentName = null;
        break;
    }
    this.updateAndSaveAction.emit({ type: TYPE_UPDATE_ACTION.ACTION, element: this.action });
  }

  onChangeCheckbox(_event, target: 'awaitWebhookPublish'): void {
    this.action[target] = !this.action[target];
    this.updateAndSaveAction.emit({ type: TYPE_UPDATE_ACTION.ACTION, element: this.action });
  }

  onBlur(): void {
    this.updateAndSaveAction.emit();
  }

  getSelectedBotName(): string {
    return this.chatbots_name_list.find(el => el.id === this.action?.subagent_id)?.name;
  }

  getSelectedBlockName(): string {
    return this.autocompleteOptionsBlockName.find(el => el.value === this.action?.intentName)?.label;
  }
}
