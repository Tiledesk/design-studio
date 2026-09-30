import { Component, Input, OnInit, Output, EventEmitter, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs/internal/Subscription';

import { TYPE_UPDATE_ACTION } from '../../../../../utils';
import { Intent } from 'src/app/models/intent-model';
import { ActionJsonConditionMulti, ConditionCase } from 'src/app/models/action-model';
import { IntentService } from '../../../../../services/intent.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { checkGenericConnectionStatusOfAction } from 'src/app/chatbot-design-studio/utils-connectors';
import { ensureCaseConditionsFromWhen, operatorLabelKey, operandRightDisplay } from 'src/app/chatbot-design-studio/utils-condition';

/**
 * Condition a piu' uscite: N casi valutati in ordine, il primo vero porta il flusso al suo
 * blocco. Ogni caso e' un'`Expression` -- la stessa forma di un gruppo della condition V2 --
 * quindi l'editor di gruppo (`base-filter2`) si riusa senza modifiche.
 *
 * Il connettore di un caso e' ancorato a `_tdCaseId`: NON all'indice (riordinare sposterebbe
 * i collegamenti) e NON alla label (rinominarla li staccherebbe).
 */
@Component({
  selector: 'cds-action-json-condition-multi',
  templateUrl: './cds-action-json-condition-multi.component.html',
  styleUrls: ['./cds-action-json-condition-multi.component.scss']
})
export class CdsActionJsonConditionMultiComponent implements OnInit, OnDestroy {

  @Input() intentSelected: Intent;
  @Input() action: ActionJsonConditionMulti;
  @Input() previewMode: boolean = true;
  @Output() updateAndSaveAction = new EventEmitter();
  @Output() onConnectorChange = new EventEmitter<{type: 'create' | 'delete', fromId: string, toId: string}>();

  booleanOperators = [{ type: 'AND', operator: 'AND' }, { type: 'OR', operator: 'OR' }];

  idIntentSelected: string;
  /** Stato del connettore di ogni caso, indicizzato per `_tdCaseId`. */
  listOfConnectors: { [caseId: string]: { idConnector: string, idConnection: string, isConnected: boolean } } = {};
  idConnectorElse: string;
  idConnectionElse: string;
  isConnectedElse: boolean = false;

  listOfIntents: Array<{ name: string, value: string, icon?: string }> = [];
  /** Card aperta nel pannello: una sola per volta, cosi' con sei casi si resta navigabili. */
  openCaseId: string = null;

  private connector: any;
  private subscriptionChangedConnector: Subscription;
  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(private intentService: IntentService) { }

  ngOnInit(): void {
    this.subscriptionChangedConnector = this.intentService.isChangedConnector$.subscribe((connector: any) => {
      const prefix = this.idIntentSelected + '/' + this.action._tdActionId;
      if (connector && connector.fromId && connector.fromId.startsWith(prefix)) {
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

  private initialize(): void {
    if (!this.action) return;
    if (!Array.isArray(this.action.cases)) this.action.cases = [];
    // Salvata in forma solo-`when`: ricostruisce l'AST di ogni caso per renderlo ri-editabile.
    ensureCaseConditionsFromWhen(this.action);
    this.action.cases.forEach(branch => {
      if (!branch._tdCaseId) branch._tdCaseId = this.newCaseId();
    });
    if (this.intentSelected) {
      this.initializeConnector();
    }
    // La prima card aperta: quella su cui si sta lavorando appena si entra.
    if (!this.previewMode && this.action.cases.length > 0) {
      this.openCaseId = this.action.cases[0]._tdCaseId;
    }
  }

  private initializeConnector(): void {
    this.idIntentSelected = this.intentSelected.intent_id;
    this.listOfConnectors = {};
    this.action.cases.forEach(branch => this.refreshCaseConnector(branch));
    this.idConnectorElse = this.idIntentSelected + '/' + this.action._tdActionId + '/else';
    const resp = checkGenericConnectionStatusOfAction(this.action.elseIntent, this.idConnectorElse);
    this.isConnectedElse = resp.isConnected;
    this.idConnectionElse = resp.idConnection;
    this.listOfIntents = this.intentService.getListOfIntents() || [];
    this.listOfIntents.sort((a, b) => a.name.localeCompare(b.name));
  }

  private refreshCaseConnector(branch: ConditionCase): void {
    const idConnector = this.caseConnectorId(branch);
    const resp = checkGenericConnectionStatusOfAction(branch.intent, idConnector);
    this.listOfConnectors[branch._tdCaseId] = {
      idConnector: idConnector,
      idConnection: resp.idConnection,
      isConnected: resp.isConnected
    };
  }

  private caseConnectorId(branch: ConditionCase): string {
    return this.idIntentSelected + '/' + this.action._tdActionId + '/case/' + branch._tdCaseId;
  }

  /**
   * Un connettore tirato o cancellato sul canvas. La coda dell'id dice a quale uscita
   * appartiene: `…/case/<caseId>` oppure `…/else`.
   */
  private updateConnector(): void {
    const segments = (this.connector.fromId || '').split('/');
    const last = segments[segments.length - 1];
    const isCase = segments[segments.length - 2] === 'case';

    if (isCase) {
      const branch = this.action.cases.find(c => c._tdCaseId === last);
      if (!branch) return;
      if (this.connector.deleted) {
        branch.intent = null;
        this.listOfConnectors[last] = { idConnector: this.caseConnectorId(branch), idConnection: null, isConnected: false };
      } else {
        branch.intent = '#' + this.connector.toId;
        this.listOfConnectors[last] = { idConnector: this.caseConnectorId(branch), idConnection: this.connector.id, isConnected: true };
      }
    } else if (last === 'else') {
      if (this.connector.deleted) {
        this.action.elseIntent = null;
        this.idConnectionElse = null;
        this.isConnectedElse = false;
      } else {
        this.action.elseIntent = '#' + this.connector.toId;
        this.idConnectionElse = this.connector.id;
        this.isConnectedElse = true;
      }
    } else {
      return;
    }

    if (this.connector.save) {
      this.updateAndSaveAction.emit({ type: TYPE_UPDATE_ACTION.CONNECTOR, element: this.connector });
    }
  }

  private newCaseId(): string {
    return new ConditionCase()._tdCaseId;
  }

  private save(): void {
    this.updateAndSaveAction.emit({ type: TYPE_UPDATE_ACTION.ACTION, element: this.action });
  }

  /* ------------------------------------------------------------------ casi */

  onAddCase(): void {
    const branch = new ConditionCase();
    this.action.cases.push(branch);
    if (this.idIntentSelected) this.refreshCaseConnector(branch);
    this.openCaseId = branch._tdCaseId;
    this.save();
  }

  onDeleteCase(index: number): void {
    const branch = this.action.cases[index];
    if (!branch) return;
    if (branch.intent) {
      this.onConnectorChange.emit({ type: 'delete', fromId: this.caseConnectorId(branch), toId: branch.intent });
    }
    delete this.listOfConnectors[branch._tdCaseId];
    this.action.cases.splice(index, 1);
    if (this.openCaseId === branch._tdCaseId) this.openCaseId = null;
    this.save();
  }

  /**
   * Sposta un caso su o giu'. L'ordine e' semantica, non estetica: il primo caso vero vince,
   * quindi spostare un ramo cambia quali rami sotto di lui sono ancora raggiungibili.
   */
  onMoveCase(index: number, direction: -1 | 1): void {
    const target = index + direction;
    if (target < 0 || target >= this.action.cases.length) return;
    const moved = this.action.cases.splice(index, 1)[0];
    this.action.cases.splice(target, 0, moved);
    this.save();
  }

  onToggleCase(branch: ConditionCase): void {
    this.openCaseId = this.openCaseId === branch._tdCaseId ? null : branch._tdCaseId;
  }

  isOpen(branch: ConditionCase): boolean {
    return this.openCaseId === branch._tdCaseId;
  }

  /**
   * L'editor di gruppo tiene gia' `when` allineato alle condizioni, compreso l'azzeramento
   * quando si toglie l'ultima: qui basta salvare.
   */
  onChangeExpression(_expression: any): void {
    this.save();
  }

  onChangeCaseIntent(event: { name: string, value: string }, branch: ConditionCase): void {
    if (!event) return;
    branch.intent = event.value;
    this.onConnectorChange.emit({ type: 'create', fromId: this.caseConnectorId(branch), toId: branch.intent });
    this.refreshCaseConnector(branch);
    this.save();
  }

  onResetCaseIntent(_event: any, branch: ConditionCase): void {
    this.onConnectorChange.emit({ type: 'delete', fromId: this.caseConnectorId(branch), toId: branch.intent });
    branch.intent = null;
    this.refreshCaseConnector(branch);
    this.save();
  }

  onChangeElseIntent(event: { name: string, value: string }): void {
    if (!event) return;
    this.action.elseIntent = event.value;
    this.onConnectorChange.emit({ type: 'create', fromId: this.idConnectorElse, toId: this.action.elseIntent });
    this.save();
  }

  onResetElseIntent(_event: any): void {
    this.onConnectorChange.emit({ type: 'delete', fromId: this.idConnectorElse, toId: this.action.elseIntent });
    this.action.elseIntent = null;
    this.save();
  }

  /* ------------------------------------------------------- lettura a colpo d'occhio */

  /** Prima condizione del caso, per il riepilogo di una riga (preview e card chiusa). */
  firstCondition(branch: ConditionCase): any {
    const conditions = (branch && branch.conditions) || [];
    return conditions.find((c: any) => c && c.type === 'condition') || null;
  }

  /** Quante condizioni oltre alla prima: diventano un `+n`, cosi' il blocco non cresce. */
  extraConditionsCount(branch: ConditionCase): number {
    const conditions = (branch && branch.conditions) || [];
    const count = conditions.filter((c: any) => c && c.type === 'condition').length;
    return count > 1 ? count - 1 : 0;
  }

  /** Un caso senza condizioni non scatta mai: va detto, non lasciato indovinare. */
  isCaseEmpty(branch: ConditionCase): boolean {
    return this.extraConditionsCount(branch) === 0 && !this.firstCondition(branch);
  }

  caseLabel(branch: ConditionCase, index: number): string {
    return branch.label && branch.label.trim() !== '' ? branch.label : String(index + 1);
  }

  operatorLabel(operator: string): string {
    return operatorLabelKey(operator);
  }

  operandRightDisplay(condition: any): string {
    return operandRightDisplay(condition);
  }

  trackByCaseId(_index: number, branch: ConditionCase): string {
    return branch._tdCaseId;
  }

}
