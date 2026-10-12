import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Subscription } from 'rxjs/internal/Subscription';
import { IntentService } from '../../../../../services/intent.service';
import { Intent } from 'src/app/models/intent-model';
import { ActionInviteHuman } from 'src/app/models/action-model';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { TYPE_UPDATE_ACTION } from '../../../../../utils';
import { DashboardService } from 'src/app/services/dashboard.service';
import { Department } from 'src/app/models/department-model';
import { checkConnectionStatusOfAction, updateConnector } from 'src/app/chatbot-design-studio/utils-connectors';

@Component({
  selector: 'cds-action-invite-human',
  templateUrl: './cds-action-invite-human.component.html',
  styleUrls: ['./cds-action-invite-human.component.scss']
})
export class CdsActionInviteHumanComponent implements OnInit, OnDestroy {

  @Input() intentSelected: Intent;
  @Input() action: ActionInviteHuman;
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
  departments: Department[] = [];

  private subscriptionChangedConnector: Subscription;
  private readonly logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private readonly intentService: IntentService,
    private readonly dashboardService: DashboardService,
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

  get selectedDepartmentName(): string {
    const department = this.departments.find((dep) => dep._id === this.action?.departmentId);
    return department ? department.name : '';
  }

  private initialize() {
    this.departments = this.dashboardService.departments || [];
    // chatbot imported from another project: reset a department that does not exist here
    if (this.action.departmentId && this.departments.findIndex((dep) => dep._id === this.action.departmentId) === -1) {
      this.action.departmentId = null;
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

  onChangeDepartment(item: any) {
    this.action.departmentId = item ? item._id : null;
    this.updateAndSaveAction.emit({ type: TYPE_UPDATE_ACTION.ACTION, element: this.action });
  }

  onResetDepartment() {
    this.action.departmentId = null;
    this.updateAndSaveAction.emit({ type: TYPE_UPDATE_ACTION.ACTION, element: this.action });
  }

  onChangeMembers(text: string) {
    this.action.members = text;
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
