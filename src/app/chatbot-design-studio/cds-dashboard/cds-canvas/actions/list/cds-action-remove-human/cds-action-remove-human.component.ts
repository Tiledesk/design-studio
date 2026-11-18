import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Subscription } from 'rxjs/internal/Subscription';
import { IntentService } from '../../../../../services/intent.service';
import { Intent } from 'src/app/models/intent-model';
import { ActionRemoveHuman } from 'src/app/models/action-model';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { TYPE_UPDATE_ACTION } from '../../../../../utils';
import { TranslateService } from '@ngx-translate/core';
import { checkConnectionStatusOfAction, updateConnector } from 'src/app/chatbot-design-studio/utils-connectors';

@Component({
  selector: 'cds-action-remove-human',
  templateUrl: './cds-action-remove-human.component.html',
  styleUrls: ['./cds-action-remove-human.component.scss']
})
export class CdsActionRemoveHumanComponent implements OnInit, OnDestroy {

  @Input() intentSelected: Intent;
  @Input() action: ActionRemoveHuman;
  @Input() previewMode: boolean = true;
  @Output() updateAndSaveAction = new EventEmitter();
  @Output() onConnectorChange = new EventEmitter<{type: 'create' | 'delete', fromId: string, toId: string}>();

  idIntentSelected: string;
  idConnectorTrue: string;
  idConnectorFalse: string;
  idConnectionTrue: string;
  idConnectionFalse: string;
  isConnectedTrue: boolean = false;
  isConnectedFalse: boolean = false;
  connector: any;

  listOfIntents: Array<{name: string, value: string, icon?: string}> = [];
  scopeOptions: Array<{name: string, value: string}> = [];

  private subscriptionChangedConnector: Subscription;
  private readonly logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private readonly intentService: IntentService,
    private readonly translate: TranslateService,
  ) { }

  ngOnInit(): void {
    this.subscriptionChangedConnector = this.intentService.isChangedConnector$.subscribe((connector: any) => {
      const connectorId = this.idIntentSelected + "/" + this.action._tdActionId;
      if (connector && connector.fromId && connector.fromId.startsWith(connectorId)) {
        this.connector = connector;
        this.updateConnector();
      }
    });
    this.initialize();
  }

  ngOnDestroy(): void {
    if (this.subscriptionChangedConnector) {
      this.subscriptionChangedConnector.unsubscribe();
    }
  }

  get selectedScopeName(): string {
    const option = this.scopeOptions.find((opt) => opt.value === this.action?.scope);
    return option ? option.name : '';
  }

  private initialize() {
    this.scopeOptions = [
      { name: this.translate.instant('CDSCanvas.RemoveHumanScopeInvited'), value: 'invited' },
      { name: this.translate.instant('CDSCanvas.RemoveHumanScopeAll'), value: 'all_humans' }
    ];
    // missing or unknown scope (e.g. imported flow): default to the safe one, saved on the next change
    if (this.action.scope !== 'invited' && this.action.scope !== 'all_humans') {
      this.action.scope = 'invited';
    }
    if (this.intentSelected) {
      this.initializeConnector();
    }
  }

  private initializeConnector() {
    this.idIntentSelected = this.intentSelected.intent_id;
    this.idConnectorTrue = this.idIntentSelected + '/' + this.action._tdActionId + '/true';
    this.idConnectorFalse = this.idIntentSelected + '/' + this.action._tdActionId + '/false';
    this.listOfIntents = this.intentService.getListOfIntents();
    this.checkConnectionStatus();
  }

  private checkConnectionStatus() {
    const resp = checkConnectionStatusOfAction(this.action, this.idConnectorTrue, this.idConnectorFalse);
    this.isConnectedTrue = resp.isConnectedTrue;
    this.isConnectedFalse = resp.isConnectedFalse;
    this.idConnectionTrue = resp.idConnectionTrue;
    this.idConnectionFalse = resp.idConnectionFalse;
  }

  private updateConnector() {
    const resp = updateConnector(this.connector, this.action, this.isConnectedTrue, this.isConnectedFalse, this.idConnectionTrue, this.idConnectionFalse);
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

  onChangeScope(item: any) {
    this.action.scope = item ? item.value : 'invited';
    this.updateAndSaveAction.emit({ type: TYPE_UPDATE_ACTION.ACTION, element: this.action });
  }

  onChangeSelect(event: {name: string, value: string}, type: 'trueIntent' | 'falseIntent') {
    if (!event) {
      return;
    }
    this.action[type] = event.value;
    const fromId = type === 'trueIntent' ? this.idConnectorTrue : this.idConnectorFalse;
    this.onConnectorChange.emit({ type: 'create', fromId: fromId, toId: this.action[type] });
    this.updateAndSaveAction.emit({ type: TYPE_UPDATE_ACTION.ACTION, element: this.action });
  }

  onResetBlockSelect(event: {name: string, value: string}, type: 'trueIntent' | 'falseIntent') {
    const fromId = type === 'trueIntent' ? this.idConnectorTrue : this.idConnectorFalse;
    this.onConnectorChange.emit({ type: 'delete', fromId: fromId, toId: this.action[type] });
    this.action[type] = null;
    this.updateAndSaveAction.emit({ type: TYPE_UPDATE_ACTION.ACTION, element: this.action });
  }
}
