import { Component, EventEmitter, Input, OnInit, OnDestroy, Output } from '@angular/core';
import { Subscription } from 'rxjs/internal/Subscription';
import { Intent } from 'src/app/models/intent-model';
import { ActionDataTable } from 'src/app/models/action-model';
import { DataTableService } from 'src/app/services/data-table.service';
import { IntentService } from 'src/app/chatbot-design-studio/services/intent.service';
import { TYPE_UPDATE_ACTION } from 'src/app/chatbot-design-studio/utils';
import {
  DATA_TABLE_OPERATIONS,
  DATA_TABLE_OPERATORS,
  DATA_TABLE_OPERATORS_NO_VALUE,
  DATA_TABLE_MATCH
} from 'src/app/chatbot-design-studio/utils-actions';
import { checkConnectionStatusOfAction, updateConnector } from 'src/app/chatbot-design-studio/utils-connectors';
import { variableList } from 'src/app/chatbot-design-studio/utils-variables';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Component({
  selector: 'cds-action-data-table',
  templateUrl: './cds-action-data-table.component.html',
  styleUrls: ['./cds-action-data-table.component.scss']
})
export class CdsActionDataTableComponent implements OnInit, OnDestroy {

  @Input() intentSelected: Intent;
  @Input() action: ActionDataTable;
  @Input() project_id: string;
  @Input() previewMode: boolean = true;
  @Output() updateAndSaveAction = new EventEmitter();

  // dropdown data
  tables: Array<{ _id: string, name: string }> = [];
  columns: Array<{ label: string, value: string, type?: string }> = [];

  operations = DATA_TABLE_OPERATIONS;
  operators = DATA_TABLE_OPERATORS;
  matchModes = DATA_TABLE_MATCH;

  // local editable list mirrored on action.data
  dataRows: Array<{ column: string, value: string }> = [];

  // Connectors (success = true branch, else = false branch)
  idIntentSelected: string;
  idConnectorTrue: string;
  idConnectorFalse: string;
  idConnectionTrue: string;
  idConnectionFalse: string;
  isConnectedTrue: boolean = false;
  isConnectedFalse: boolean = false;
  connector: any;
  private subscriptionChangedConnector: Subscription;

  private readonly logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private readonly dataTableService: DataTableService,
    private readonly intentService: IntentService
  ) { }

  ngOnInit(): void {
    this.logger.log('[ACTION-DATA-TABLE] action: ', this.action);
    if (this.action && !this.action.conditions) { this.action.conditions = []; }
    if (this.action && !this.action.data) { this.action.data = {}; }
    this.initializeAttributes();

    this.subscriptionChangedConnector = this.intentService.isChangedConnector$.subscribe((connector: any) => {
      const connectorId = this.idIntentSelected + '/' + this.action._tdActionId;
      if (connector?.fromId?.startsWith(connectorId)) {
        this.connector = connector;
        this.updateConnector();
      }
    });
    if (this.intentSelected) {
      this.initializeConnector();
    }

    if (this.previewMode) { return; }
    this.normalizeConditions();
    this.initDataRows();
    this.loadTables();
  }

  ngOnDestroy(): void {
    if (this.subscriptionChangedConnector) {
      this.subscriptionChangedConnector.unsubscribe();
    }
  }

  /** Register the data-table specific flow variable(s) into the userDefined attribute list. */
  private initializeAttributes(): void {
    const userDefined = variableList.find(el => el.key === 'userDefined');
    if (!userDefined) { return; }
    const new_attributes = [];
    if (!userDefined.elements.some(v => v.name === 'data_table_result')) {
      new_attributes.push({ name: 'data_table_result', value: 'data_table_result' });
    }
    userDefined.elements = [ ...userDefined.elements, ...new_attributes ];
  }

  // ---------- connectors ----------
  initializeConnector(): void {
    this.idIntentSelected = this.intentSelected.intent_id;
    this.idConnectorTrue = this.idIntentSelected + '/' + this.action._tdActionId + '/true';
    this.idConnectorFalse = this.idIntentSelected + '/' + this.action._tdActionId + '/false';
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

  // ---------- loading ----------
  private loadTables(): void {
    this.dataTableService.listTables().subscribe({
      next: (res: any) => {
        this.tables = Array.isArray(res) ? res : (res?.tables || []);
        if (this.action?.tableId) {
          this.loadColumns(this.action.tableId);
        }
      },
      error: (err) => this.logger.error('[ACTION-DATA-TABLE] listTables error: ', err)
    });
  }

  private loadColumns(tableId: string): void {
    if (!tableId) { this.columns = []; return; }
    this.dataTableService.getTable(tableId).subscribe({
      next: (res: any) => {
        const schema = Array.isArray(res?.schema) ? res.schema : [];
        this.columns = schema.map((c: any) => ({
          label: c?.type ? `${c.name} (${c.type})` : c.name,
          value: c.name,
          type: c.type
        }));
      },
      error: (err) => this.logger.error('[ACTION-DATA-TABLE] getTable error: ', err)
    });
  }

  private initDataRows(): void {
    const entries = Object.entries(this.action?.data || {});
    this.dataRows = entries.map(([column, value]) => ({ column, value: value as string }));
    if (this.dataRows.length === 0) {
      this.dataRows = [{ column: '', value: '' }];
    }
  }

  // ---------- visibility helpers ----------
  // Conditions are shown for every operation except insert.
  get showConditions(): boolean {
    return ['get', 'update', 'upsert', 'delete'].includes(this.action?.operation);
  }
  get showData(): boolean {
    return ['insert', 'update', 'upsert'].includes(this.action?.operation);
  }
  // At least one condition is mandatory for update/upsert/delete; only get is optional.
  get conditionsRequired(): boolean {
    return ['update', 'upsert', 'delete'].includes(this.action?.operation);
  }
  operatorHasValue(operator: string): boolean {
    return !DATA_TABLE_OPERATORS_NO_VALUE.includes(operator);
  }

  /** Ensure at least one condition row exists when the operation requires it. */
  private ensureConditions(): void {
    if (this.conditionsRequired && (!this.action.conditions || this.action.conditions.length === 0)) {
      this.action.conditions.push({ column: '', operator: 'equal', value: '' });
    }
  }

  /** Insert has no conditions (cleared from the saved JSON); required operations keep at least one. */
  private normalizeConditions(): void {
    if (this.action.operation === 'insert') {
      this.action.conditions = [];
      return;
    }
    this.ensureConditions();
  }

  // ---------- table / operation ----------
  onChangeTable(event: any): void {
    this.action.tableId = event?._id || '';
    this.action.tableName = event?.name || '';
    this.loadColumns(this.action.tableId);
    this.save();
  }

  onChangeOperation(event: any): void {
    this.action.operation = event?.value || 'get';
    this.normalizeConditions();
    this.save();
  }

  onChangeMatch(event: any): void {
    this.action.must_match = event?.value || 'all';
    this.save();
  }

  // ---------- conditions ----------
  onAddCondition(): void {
    this.action.conditions.push({ column: '', operator: 'equal', value: '' });
  }

  onDeleteCondition(index: number): void {
    this.action.conditions.splice(index, 1);
    // keep at least one condition for operations that require it
    this.ensureConditions();
    this.save();
  }

  onChangeConditionColumn(event: any, index: number): void {
    this.action.conditions[index].column = event?.value || '';
    this.save();
  }

  onChangeConditionOperator(event: any, index: number): void {
    this.action.conditions[index].operator = event?.value || 'equal';
    if (!this.operatorHasValue(this.action.conditions[index].operator)) {
      this.action.conditions[index].value = '';
    }
    this.save();
  }

  onChangeConditionValue(text: string, index: number): void {
    this.action.conditions[index].value = text;
  }

  onBlurCondition(): void {
    this.save();
  }

  // ---------- data rows ----------
  onAddDataRow(): void {
    this.dataRows.push({ column: '', value: '' });
  }

  onDeleteDataRow(index: number): void {
    this.dataRows.splice(index, 1);
    this.syncData();
  }

  onChangeDataColumn(event: any, index: number): void {
    this.dataRows[index].column = event?.value || '';
    this.syncData();
  }

  onChangeDataValue(text: string, index: number): void {
    this.dataRows[index].value = text;
  }

  onBlurDataRow(): void {
    this.syncData();
  }

  private syncData(): void {
    const data: { [key: string]: string } = {};
    this.dataRows.forEach(r => {
      if (r.column) { data[r.column] = r.value; }
    });
    this.action.data = data;
    this.save();
  }

  // ---------- assign ----------
  onSelectedAttribute(event: any, property: 'assignResultTo' | 'assignErrorTo'): void {
    this.action[property] = event?.value || '';
    this.save();
  }

  // ---------- save ----------
  private save(): void {
    this.updateAndSaveAction.emit({ type: TYPE_UPDATE_ACTION.ACTION, element: this.action });
  }
}
