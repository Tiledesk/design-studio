import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { SatPopover } from '@ncstate/sat-popover';
import { OPERATORS_LIST } from 'app/chatbot-design-studio/utils';
import { Condition, Expression, Operator } from 'app/models/intent-model';
import { LoggerService } from 'app/services/logger/logger.service';

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
  
  constructor(
    public logger: LoggerService
  ) { }

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
    this.onChangeExpression.emit(this.expression)
  }

  onChangeOperator(event, index: number){
    (this.expression.conditions[index] as Operator).operator= event['type']
    this.logger.log('onChangeOperator expressionn', this.expression)
  }


  onDismiss(condition: Condition){
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
    this.onChangeExpression.emit(this.expression)
  }

}
