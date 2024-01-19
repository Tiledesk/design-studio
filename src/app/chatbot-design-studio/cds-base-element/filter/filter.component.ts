import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { SatPopover } from '@ncstate/sat-popover';
import { OPERATORS_LIST } from '../../utils';
import { Condition, Expression, Operator } from 'src/app/models/action-model';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Component({
  selector: 'appdashboard-filter',
  templateUrl: './filter.component.html',
  styleUrls: ['./filter.component.scss']
})
export class CDSFilterComponent implements OnInit {

  @ViewChild("addConditionFilter") addConditionFilter : SatPopover;

  @Input() expression: Expression = new Expression();
  @Input() booleanOperators: {}
  @Input() previewMode: boolean = true
  @Output() onChangeExpression = new EventEmitter<Expression>()

  selectedCondition: Condition;
  selectedIndex: number;

  OPERATORS_LIST = OPERATORS_LIST

  logger: LoggerService = LoggerInstance.getInstance()
  constructor() { }

  ngOnInit(): void {
    if(!this.expression){
      this.expression = new Expression()
    }
  }

  ngOnChanges(){
    this.logger.log('[BASE_FILTER] expression selected-->', this.expression)
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
    this.onChangeExpression.emit(this.expression)
  }

  onChangeOperator(event, index: number){
    (this.expression.conditions[index] as Operator).operator= event['type']
    this.logger.log('onChangeOperator expressionn', this.expression)
  }


  onDismiss(condition: Condition){
    this.logger.log('[BASE_FILTER] onDismiss', condition, this.selectedCondition, this.selectedIndex,)
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
    this.onChangeExpression.emit(this.expression)
  }


  onReset(){
    this.selectedCondition = null
    this.selectedIndex= null
  }

}
