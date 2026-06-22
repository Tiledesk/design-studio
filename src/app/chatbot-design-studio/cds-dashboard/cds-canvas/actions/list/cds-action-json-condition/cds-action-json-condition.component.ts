import { Component, EventEmitter, Input, OnInit, OnDestroy, Output, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs/internal/Subscription';
import { SatPopover } from '@ncstate/sat-popover';
import { IntentService } from '../../../../../services/intent.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { Intent } from 'src/app/models/intent-model';
import { ActionJsonCondition, Expression, Operator } from 'src/app/models/action-model';
import { TYPE_UPDATE_ACTION, OPERATORS_LIST, OperatorValidator } from '../../../../../utils';
import { checkConnectionStatusOfAction, updateConnector } from 'src/app/chatbot-design-studio/utils-connectors';
import { serializeConditionToWhen, normalizeLegacyOperator, operatorLabelKey, operandRightDisplay } from 'src/app/chatbot-design-studio/utils-condition';

/** Componente per l’azione condizione JSON: gruppi di condizioni, connector true/false, intent. */
@Component({
  selector: 'cds-action-json-condition',
  templateUrl: './cds-action-json-condition.component.html',
  styleUrls: ['./cds-action-json-condition.component.scss']
})
export class CdsActionJsonConditionComponent implements OnInit, OnDestroy {

  @ViewChild('addFilter', { static: false }) myPopover: SatPopover;

  @Input() intentSelected: Intent;
  @Input() action: ActionJsonCondition;
  @Input() previewMode: boolean = true;
  @Output() updateAndSaveAction = new EventEmitter();
  @Output() onConnectorChange = new EventEmitter<{ type: 'create' | 'delete'; fromId: string; toId: string }>();

  actionJsonConditionFormGroup: FormGroup;
  trueIntentAttributes: string = '';
  falseIntentAttributes: string = '';
  booleanOperators = [{ type: 'AND', operator: 'AND' }, { type: 'OR', operator: 'OR' }];
  OPERATORS_LIST = OPERATORS_LIST;

  idIntentSelected: string;
  idConnectorTrue: string;
  idConnectorFalse: string;
  idConnectionTrue: string;
  idConnectionFalse: string;
  isConnectedTrue: boolean = false;
  isConnectedFalse: boolean = false;
  connector: any;
  listOfIntents: Array<{ name: string; value: string; icon?: string }>;

  private subscriptionChangedConnector: Subscription;
  private subscriptionFormChanges: Subscription;
  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private formBuilder: FormBuilder,
    private intentService: IntentService
  ) { }

  /** Inizializza subscription e form alla creazione del componente. */
  ngOnInit(): void {
    this.subscriptionChangedConnector = this.intentService.isChangedConnector$.subscribe((connector: any) => {
      this.logger.log('CdsActionJsonConditionComponent isChangedConnector-->', connector);
      const connectorId = this.idIntentSelected + '/' + this.action._tdActionId;
      if (connector.fromId.startsWith(connectorId)) {
        this.connector = connector;
        this.updateConnector();
      }
    });
    this.initialize();
  }

  /** Disattiva le subscription per evitare memory leak. */
  ngOnDestroy(): void {
    if (this.subscriptionChangedConnector) {
      this.subscriptionChangedConnector.unsubscribe();
    }
    if (this.subscriptionFormChanges) {
      this.subscriptionFormChanges.unsubscribe();
    }
  }

  /** Imposta id connector, lista intent ordinata e stato connessioni. */
  private initializeConnector(): void {
    this.idIntentSelected = this.intentSelected.intent_id;
    this.idConnectorTrue = this.idIntentSelected + '/' + this.action._tdActionId + '/true';
    this.idConnectorFalse = this.idIntentSelected + '/' + this.action._tdActionId + '/false';
    this.listOfIntents = this.intentService.getListOfIntents();
    if (this.listOfIntents?.length) {
      this.listOfIntents = [...this.listOfIntents].sort((a, b) => a.name.localeCompare(b.name));
    }
    this.checkConnectionStatus();
  }

  /** Aggiorna stato connessioni true/false dal modello action. */
  private checkConnectionStatus(): void {
    const resp = checkConnectionStatusOfAction(this.action, this.idConnectorTrue, this.idConnectorFalse);
    this.isConnectedTrue = resp.isConnectedTrue;
    this.isConnectedFalse = resp.isConnectedFalse;
    this.idConnectionTrue = resp.idConnectionTrue;
    this.idConnectionFalse = resp.idConnectionFalse;
  }

  /** Applica aggiornamento connector e, se richiesto, emette salvataggio. */
  private updateConnector(): void {
    this.logger.log('[ACTION-JSON-CONDITION] updateConnector:');
    const resp = updateConnector(this.connector, this.action, this.isConnectedTrue, this.isConnectedFalse, this.idConnectionTrue, this.idConnectionFalse);
    if (resp) {
      this.isConnectedTrue = resp.isConnectedTrue;
      this.isConnectedFalse = resp.isConnectedFalse;
      this.idConnectionTrue = resp.idConnectionTrue;
      this.idConnectionFalse = resp.idConnectionFalse;
      this.logger.log('[ACTION-JSON-CONDITION] updateConnector:', resp);
      if (resp.emit) {
        this.updateAndSaveAction.emit({ type: TYPE_UPDATE_ACTION.CONNECTOR, element: this.connector });
      }
    }
  }

  /** Imposta form, subscription valueChanges, attributi e connector (se intentSelected). */
  private initialize(): void {
    this.actionJsonConditionFormGroup = this.buildForm();
    this.subscriptionFormChanges = this.actionJsonConditionFormGroup.valueChanges.subscribe(form => {
      this.logger.log('[ACTION-JSON-CONDITION] form valueChanges-->', form);
      if (form && (form.trueIntent !== '' || form.falseIntent !== '' || form.stopOnConditionMet !== '')) {
        this.action.trueIntent = this.actionJsonConditionFormGroup.value.trueIntent;
        this.action.falseIntent = this.actionJsonConditionFormGroup.value.falseIntent;
        this.action.stopOnConditionMet = this.actionJsonConditionFormGroup.value.stopOnConditionMet;
      }
    });
    this.trueIntentAttributes = this.action.trueIntentAttributes ?? '';
    this.falseIntentAttributes = this.action.falseIntentAttributes ?? '';
    if (this.intentSelected) {
      this.initializeConnector();
    }
    if (this.action) {
        this.migrateLegacyOperators(); // retrocompat: normalizza gli operatori legacy sull'AST in apertura
      this.setFormValue();
      this.updateWhen(); // popola `when` anche per le action già salvate (vecchio formato senza `when`)
    }
  }

  /**
   * Etichetta sicura per un operatore. Tollera operatori vecchi/nuovi/sconosciuti (es. action
   * json condition di versione diversa) senza mai crashare: se l'operatore non è in OPERATORS_LIST
   * ritorna la chiave grezza (la pipe translate la mostra invariata).
   */
  operatorLabel(operator: string): string {
    if (!operator) return '';
    return OPERATORS_LIST[operator]?.name || operator;
  }

  /**
   * Valore destro della condizione, tollerante al modello VECCHIO (operand2 = stringa) e a quello
   * NUOVO (operand2 = { type, value, name }). Non crasha mai su shape inattesi.
   */
  operandRightDisplay(condition: any): string {
    const o2 = condition?.operand2;
    if (o2 === null || o2 === undefined) return '';
    if (typeof o2 !== 'object') return String(o2);            // modello vecchio: stringa/numero
    if (o2.type === 'var') return o2.name ?? o2.value ?? '';  // riferimento a variabile
    return o2.value ?? o2.name ?? '';                         // const o shape sconosciuto
  }
  
  // buildForm(): FormGroup{
  //   return this.formBuilder.group({
  //     trueIntent: ['', Validators.required],
  //     falseIntent: ['', Validators.required],
  //     stopOnConditionMet: [false, Validators.required],
  //     // groups: this.formBuilder.array([
  //     //   this.createExpressionGroup(),
  //     //   // this.createOperatorGroup()
  //     // ]) 
  //   })
  // }

  /** Rigenera l'unica stringa `when` (campo derivato, root azione) da tutto l'AST `groups`. Retrocompatibile: non tocca `groups`. */
  private updateWhen(): void {
    if (this.action) {
      this.action.when = serializeConditionToWhen(this.action.groups);
    }
  }

    /**
     * Retrocompat: normalizza gli operatori legacy (es. *IgnoreCase) su tutto l'AST `groups`,
     * così UI/preview e `when` sono coerenti e la conversione case-sensitive è esplicita
     * (non silenziosa al primo salvataggio). Solo in memoria: viene persistito al primo save.
     */
    private migrateLegacyOperators(){
      if(!this.action || !Array.isArray(this.action.groups)) return;
      this.action.groups.forEach((node: any) => {
        if(node && node.type === 'expression' && Array.isArray(node.conditions)){
          node.conditions.forEach((c: any) => {
            if(c && c.type === 'condition' && c.operator){
              c.operator = normalizeLegacyOperator(c.operator);
            }
          });
        }
      });
    }

  /** Sincronizza i valori del form con l’oggetto action. */
  private setFormValue(): void {
    this.actionJsonConditionFormGroup.patchValue({
      trueIntent: this.action.trueIntent,
      falseIntent: this.action.falseIntent,
      stopOnConditionMet: this.action.stopOnConditionMet
    });
  }

  /** Crea il FormGroup del form (trueIntent, falseIntent, stopOnConditionMet). */
  private buildForm(): FormGroup {
    return this.formBuilder.group({
      trueIntent: ['', Validators.required],
      falseIntent: ['', Validators.required],
      stopOnConditionMet: [false, Validators.required]
    });
  }

  /** Crea un FormGroup per un gruppo di condizioni (usato da createExpressionGroup). */
  private createExpressionGroup(): FormGroup {
    return this.formBuilder.group({
      type: ['expression', Validators.required],
      conditions: this.formBuilder.array([])
    });
  }

  /** Crea un FormGroup per una singola condizione (operandi e operatore). */
  private createConditionGroup(): FormGroup {
    return this.formBuilder.group({
      type: ['condition', Validators.required],
      operand1: ['', Validators.required],
      operator: ['', Validators.required, OperatorValidator],
      operand2: ['', Validators.required]
    });
  }

  /** Crea un FormGroup per l’operatore logico tra condizioni (AND/OR). */
  private createOperatorGroup(): FormGroup {
    return this.formBuilder.group({
      type: ['operator', Validators.required],
      operator: ['', Validators.required]
    });
  }

  /** Aggiunge un nuovo gruppo di condizioni (operator + expression). */
  onClickAddGroup(): void {
    this.action.groups.push(new Operator());
    this.action.groups.push(new Expression());
    this.logger.log('onClickAddGroup-->', this.action);
    this.updateWhen();
    this.updateAndSaveAction.emit({ type: TYPE_UPDATE_ACTION.ACTION, element: this.action });
  }

  /** Rimuove un gruppo di condizioni in base all’indice. */
  onDeleteGroup(index: number, last: boolean): void {
    this.logger.log('onDeleteGroup', index, last, this.action.groups);
    if (!last) {
      this.action.groups.splice(index, 2);
    } else if (last) {
      this.action.groups.splice(index - 1, 2);
    }
    if (this.action.groups.length === 0) {
      this.action.groups.push(new Expression());
    }
    this.updateWhen();
    this.updateAndSaveAction.emit({ type: TYPE_UPDATE_ACTION.ACTION, element: this.action });
  }

  /** Cambia l’operatore logico (AND/OR) di un gruppo e salva. */
  onChangeOperator(event: any, index: number): void {
    (this.action.groups[index] as Operator).operator = event['type'];
    this.logger.log('onChangeOperator actionsss', this.action, this.actionJsonConditionFormGroup);
    this.updateWhen();
    this.updateAndSaveAction.emit({ type: TYPE_UPDATE_ACTION.ACTION, element: this.action });
  }

  /** Imposta trueIntent/falseIntent dal select, notifica create connector e salva. */
  onChangeForm(event: { name: string; value: string }, type: 'trueIntent' | 'falseIntent'): void {
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

  /** Resetta la selezione del blocco (trueIntent/falseIntent) e notifica delete connector. */
  onResetBlockSelect(event: { name: string; value: string }, type: 'trueIntent' | 'falseIntent'): void {
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

  /** Chiamato quando cambia l’expression da base-filter; rigenera `when` ed emette salvataggio. */
  onChangeExpression(event: any): void {
    this.logger.log('onChangeExpression actionsss', this.action, event);
    this.updateWhen();
    this.updateAndSaveAction.emit({ type: TYPE_UPDATE_ACTION.ACTION, element: this.action });
  }

  /** Aggiorna gli attributi (trueIntentAttributes / falseIntentAttributes) e salva. */
  onChangeAttributes(attributes: any, type: 'trueIntent' | 'falseIntent'): void {
    if (type === 'trueIntent') {
      this.action.trueIntentAttributes = attributes;
    }
    if (type === 'falseIntent') {
      this.action.falseIntentAttributes = attributes;
    }
    this.updateAndSaveAction.emit({ type: TYPE_UPDATE_ACTION.ACTION, element: this.action });
  }

  /** Inverte il flag stopOnConditionMet e salva. */
  onStopConditionMeet(): void {
    try {
      this.action.stopOnConditionMet = !this.action.stopOnConditionMet;
      this.updateAndSaveAction.emit({ type: TYPE_UPDATE_ACTION.ACTION, element: this.action });
    } catch (error) {
      this.logger.log('Error: ', error);
    }
  }

  trackByGroupIndex(index: number): number {
    return index;
  }

  trackByConditionIndex(index: number): number {
    return index;
  }

  getOperatorName(operatorKey: string): string {
    return this.OPERATORS_LIST[operatorKey]?.name ?? '';
  }

  get hasEmptyConditions(): boolean {
    const g = this.action?.groups;
    const first = g?.[0] as Expression | undefined;
    return !!(g?.length && first?.conditions && first.conditions.length === 0);
  }

  get hasConditions(): boolean {
    const g = this.action?.groups;
    const first = g?.[0] as Expression | undefined;
    return !!(g?.length && first?.conditions && first.conditions.length > 0);
  }

  get showElse(): boolean {
    return !(this.action as ActionJsonCondition & { noelse?: boolean })?.noelse;
  }
}
