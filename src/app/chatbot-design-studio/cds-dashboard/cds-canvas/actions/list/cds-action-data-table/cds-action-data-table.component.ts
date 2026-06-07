import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Intent } from 'src/app/models/intent-model';
import { ActionDataTable } from 'src/app/models/action-model';
import { DataTableService } from 'src/app/services/data-table.service';
import { TYPE_UPDATE_ACTION } from 'src/app/chatbot-design-studio/utils';
import {
  DATA_TABLE_OPERATIONS,
  DATA_TABLE_OPERATORS,
  DATA_TABLE_OPERATORS_NO_VALUE,
  DATA_TABLE_MATCH
} from 'src/app/chatbot-design-studio/utils-actions';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Component({
  selector: 'cds-action-data-table',
  templateUrl: './cds-action-data-table.component.html',
  styleUrls: ['./cds-action-data-table.component.scss']
})
export class CdsActionDataTableComponent implements OnInit {

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

  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private readonly dataTableService: DataTableService
  ) { }

  ngOnInit(): void {
    this.logger.log('[ACTION-DATA-TABLE] action: ', this.action);
    if (this.action && !this.action.conditions) { this.action.conditions = []; }
    if (this.action && !this.action.data) { this.action.data = {}; }
    if (this.previewMode) { return; }
    this.initDataRows();
    this.loadTables();
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
  get showConditions(): boolean {
    return ['get', 'update', 'upsert', 'delete'].includes(this.action?.operation);
  }
  get showData(): boolean {
    return ['insert', 'update', 'upsert'].includes(this.action?.operation);
  }
  get showIdRow(): boolean {
    return ['update', 'upsert', 'delete'].includes(this.action?.operation);
  }
  get showMulti(): boolean {
    return this.action?.operation === 'upsert';
  }
  operatorHasValue(operator: string): boolean {
    return !DATA_TABLE_OPERATORS_NO_VALUE.includes(operator);
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

  // ---------- id_row / multi / assign ----------
  onChangeIdRow(text: string): void {
    this.action.id_row = text;
  }

  onBlurIdRow(): void {
    this.save();
  }

  onChangeMulti(checked: boolean): void {
    this.action.multi = checked;
    this.save();
  }

  onSelectedAttribute(event: any, property: 'assignResultTo' | 'assignErrorTo'): void {
    this.action[property] = event?.value || '';
    this.save();
  }

  // ---------- save ----------
  private save(): void {
    this.updateAndSaveAction.emit({ type: TYPE_UPDATE_ACTION.ACTION, element: this.action });
  }
}
