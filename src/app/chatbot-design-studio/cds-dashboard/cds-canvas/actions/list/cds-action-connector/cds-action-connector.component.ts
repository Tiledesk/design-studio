import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs/internal/Subscription';

// SERVICES
import { IntentService } from '../../../../../services/intent.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

// MODELS
import { Intent } from 'src/app/models/intent-model';
import { ActionWebRequestV2 } from 'src/app/models/action-model';

// UTILS
import { TYPE_UPDATE_ACTION } from 'src/app/chatbot-design-studio/utils';
import { checkConnectionStatusOfAction, updateConnector } from 'src/app/chatbot-design-studio/utils-connectors';
import { ConnectorMeta, ConnectorFormInput, readConnectorInputs, writeConnectorInputs } from 'src/app/chatbot-design-studio/connector/connector-action-form.util';

@Component({
  selector: 'cds-action-connector',
  templateUrl: './cds-action-connector.component.html',
  styleUrls: ['./cds-action-connector.component.scss'],
})
export class CdsActionConnectorComponent implements OnInit, OnDestroy, OnChanges {
  @Input() intentSelected: Intent;
  @Input() action: ActionWebRequestV2;
  @Input() previewMode: boolean = true;
  @Output() updateAndSaveAction = new EventEmitter();
  @Output() onConnectorChange = new EventEmitter<{ type: 'create' | 'delete', fromId: string, toId: string }>();

  meta: ConnectorMeta = { name: '', inputs: [] };
  values: { [id: string]: string } = {};

  listOfIntents: Array<{ name: string, value: string, icon?: string }>;

  // Connectors
  idIntentSelected: string;
  idConnectorTrue: string;
  idConnectorFalse: string;
  idConnectionTrue: string;
  idConnectionFalse: string;
  isConnectedTrue: boolean = false;
  isConnectedFalse: boolean = false;
  connector: any;
  private subscriptionChangedConnector: Subscription;

  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(private readonly intentService: IntentService) {}

  ngOnInit(): void {
    this.logger.debug('[CDS-ACTION-CONNECTOR] ngOnInit action:', this.action);
    this.subscriptionChangedConnector = this.intentService.isChangedConnector$.subscribe((connector: any) => {
      this.logger.debug('[CDS-ACTION-CONNECTOR] isChangedConnector -->', connector);
      const connectorId = this.idIntentSelected + '/' + this.action._tdActionId;
      if (connector.fromId.startsWith(connectorId)) {
        this.connector = connector;
        this.refreshConnector();
      }
    });
    this.initialize();
  }

  ngOnDestroy(): void {
    if (this.subscriptionChangedConnector) {
      this.subscriptionChangedConnector.unsubscribe();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.initialize();
  }

  private initialize(): void {
    this.meta = (this.action as any)._tdConnectorMeta || { name: '', inputs: [] };
    this.values = readConnectorInputs(this.action);
    // Ensure every declared input has a key so ngModel binds
    this.meta.inputs.forEach(i => {
      if (this.values[i.id] === undefined) { this.values[i.id] = ''; }
    });
    if (this.intentSelected) {
      this.initializeConnector();
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
    this.isConnectedTrue   = resp.isConnectedTrue;
    this.isConnectedFalse  = resp.isConnectedFalse;
    this.idConnectionTrue  = resp.idConnectionTrue;
    this.idConnectionFalse = resp.idConnectionFalse;
  }

  private refreshConnector(): void {
    this.logger.log('[CDS-ACTION-CONNECTOR] refreshConnector');
    const resp = updateConnector(this.connector, this.action, this.isConnectedTrue, this.isConnectedFalse, this.idConnectionTrue, this.idConnectionFalse);
    if (resp) {
      this.isConnectedTrue   = resp.isConnectedTrue;
      this.isConnectedFalse  = resp.isConnectedFalse;
      this.idConnectionTrue  = resp.idConnectionTrue;
      this.idConnectionFalse = resp.idConnectionFalse;
      if (resp.emit) {
        this.updateAndSaveAction.emit({ type: TYPE_UPDATE_ACTION.CONNECTOR, element: this.connector });
      }
    }
  }

  // EVENT HANDLERS

  onInputChange(): void {
    writeConnectorInputs(this.action, this.values);
    this.save();
  }

  controlType(input: ConnectorFormInput): 'select' | 'toggle' | 'textarea' {
    if (input.options && input.options.length) { return 'select'; }
    if (input.type === 'boolean') { return 'toggle'; }
    return 'textarea';
  }

  isJsonInput(input: ConnectorFormInput): boolean {
    return input.type === 'object' || input.type === 'array';
  }

  onFieldChange(inputId: string, value: any): void {
    this.values[inputId] = (value === null || value === undefined) ? '' : String(value);
    writeConnectorInputs(this.action, this.values);
    this.save();
  }

  onFieldBlur(): void {
    writeConnectorInputs(this.action, this.values);
    this.save();
  }

  onToggle(input: ConnectorFormInput, event: any): void {
    const checked = !!(event && event.target && event.target.checked);
    this.values[input.id] = checked ? 'true' : 'false';
    writeConnectorInputs(this.action, this.values);
    this.save();
  }

  onSelectedAttribute(event: any, property: string): void {
    this.action[property] = event.value;
    this.save();
  }

  onChangeBlockSelect(event: { name: string, value: string }, type: 'trueIntent' | 'falseIntent'): void {
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
      this.save();
    }
  }

  onResetBlockSelect(event: { name: string, value: string }, type: 'trueIntent' | 'falseIntent'): void {
    switch (type) {
      case 'trueIntent':
        this.onConnectorChange.emit({ type: 'delete', fromId: this.idConnectorTrue, toId: this.action.trueIntent });
        break;
      case 'falseIntent':
        this.onConnectorChange.emit({ type: 'delete', fromId: this.idConnectorFalse, toId: this.action.falseIntent });
        break;
    }
    this.action[type] = null;
    this.save();
  }

  private save(): void {
    this.updateAndSaveAction.emit({ type: TYPE_UPDATE_ACTION.ACTION, element: this.action });
  }
}
