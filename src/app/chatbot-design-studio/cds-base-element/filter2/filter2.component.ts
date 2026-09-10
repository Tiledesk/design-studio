import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { SatPopover } from '@ncstate/sat-popover';
import { OPERATORS_LIST_V2, OPERATORS_LIST_REPLY_FILTER, isReplyFilterOperatorSupported } from '../../utils';
import { Condition, Expression, Operator } from 'src/app/models/action-model';
import { serializeExpression, operatorLabelKey, operandRightDisplay, ensureConditionsFromWhen } from 'src/app/chatbot-design-studio/utils-condition';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

/**
 * Filtro condizioni V2 (nuovi operatori raggruppati + stringa derivata `when`).
 * Convive con il filtro legacy `appdashboard-filter` (congelato a master):
 * i filtri esistenti restano sul legacy, ogni NUOVO filtro nasce qui e viene
 * marcato con `expression.version = 2` (discriminatore persistito).
 */
@Component({
  selector: 'appdashboard-filter2',
  templateUrl: './filter2.component.html',
  styleUrls: ['./filter2.component.scss']
})
export class CDSFilter2Component implements OnInit, OnChanges {

  @ViewChild("addConditionFilter") addConditionFilter : SatPopover;

  @Input() expression: Expression = new Expression();
  @Input() booleanOperators: {}
  @Input() previewMode: boolean = true
  @Output() onChangeExpression = new EventEmitter<Expression>()

  selectedCondition: Condition;
  selectedIndex: number;

  /** catalogo completo: serve solo per ETICHETTARE anche gli operatori non più selezionabili */
  OPERATORS_LIST = OPERATORS_LIST_V2
  /** catalogo offerto nel picker: solo gli operatori che il server valuta nei filtri reply */
  OPERATORS_LIST_PICKER = OPERATORS_LIST_REPLY_FILTER
  /** true se l'operatore di una condizione già salvata non è valutabile dal server */
  isReplyFilterOperatorSupported = isReplyFilterOperatorSupported

  logger: LoggerService = LoggerInstance.getInstance()
  constructor() { }

  ngOnInit(): void {
    this.ensureEditableExpression()
  }

  ngOnChanges(changes: SimpleChanges){
    if(changes['expression']){
      this.ensureEditableExpression()
    }
    this.logger.log('[BASE_FILTER2] expression selected-->', this.expression)
  }

  /**
   * Normalizza l'expression per l'editor: garantisce l'oggetto e l'array `conditions`
   * (il server può restituire un filtro V2 senza AST) e, per i filtri V2 salvati in
   * forma solo-`when`, ricostruisce l'AST rendendoli ri-editabili.
   */
  private ensureEditableExpression(){
    if(!this.expression){
      this.expression = new Expression()
    }
    if(!Array.isArray(this.expression.conditions)){
      this.expression.conditions = []
    }
    ensureConditionsFromWhen(this.expression)
  }

  /**
   * Rigenera la stringa `when` (campo derivato) DENTRO l'expression, dai suoi `conditions`,
   * e marca il filtro come V2 (`version = 2`). Chiamata solo sulle mutazioni: i filtri
   * legacy in sola lettura non vengono mai toccati.
   */
  private updateWhen(){
    if(this.expression){
      this.expression.version = 2;
      this.expression.when = serializeExpression(this.expression);
    }
  }

  onOpenConditionDetail(index: number){
    this.selectedCondition = this.expression.conditions[index] as Condition
    this.selectedIndex = index
  }

  onDeleteCondition(index: number, last: boolean){
    if(!last){
      this.expression.conditions.splice(index, 2)
    }else if(last){
      this.expression.conditions.splice(index-1, 2)
    }
    this.onReset()
    this.updateWhen()
    this.onChangeExpression.emit(this.expression)
  }

  onChangeOperator(event, index: number){
    (this.expression.conditions[index] as Operator).operator= event['type']
    this.logger.log('onChangeOperator expressionn', this.expression)
    this.updateWhen()
    this.onChangeExpression.emit(this.expression)
  }


  onDismiss(condition: Condition){
    this.logger.log('[BASE_FILTER2] onDismiss', condition, this.selectedCondition, this.selectedIndex,)
    if(condition){
      this.logger.log('onDismiss popover condition', condition, this.selectedCondition, this.selectedIndex, this.expression)
      //if condition already exist --> do not push new condition
      //else push new operaor and condition
      if(this.selectedCondition){
        this.expression.conditions[this.selectedIndex] = condition;
      }else {
        if(this.expression.conditions.length === 0){
          this.expression.conditions.push(condition);
        }else{
          this.expression.conditions.push(new Operator());
          this.expression.conditions.push(condition);
        }
      }
    }
    this.addConditionFilter.close();
    this.onReset()
    this.updateWhen()
    this.onChangeExpression.emit(this.expression)
  }


  onReset(){
    this.selectedCondition = null
    this.selectedIndex= null
  }

  /** Etichetta operatore robusta a formati legacy/sconosciuti (no crash). Usata nei template. */
  operatorLabel(operator: string): string {
    return operatorLabelKey(operator);
  }

  /** Lato destro (operand2) robusto a formati vecchi/nuovi (no crash). Usata nei template. */
  operandRightDisplay(condition: any): string {
    return operandRightDisplay(condition);
  }

}
