import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { TYPE_FUNCTION_LIST_FOR_VARIABLES, TYPE_MATH_OPERATOR_LIST } from 'src/app/chatbot-design-studio/utils';
import { ActionAssignVariableV2 } from 'src/app/models/action-model';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Component({
  selector: 'cds-action-assign-variable-v2',
  templateUrl: './cds-action-assign-variable-v2.component.html',
  styleUrls: ['./cds-action-assign-variable-v2.component.scss']
})
export class CdsActionAssignVariableV2Component implements OnInit {

  @Input() action: ActionAssignVariableV2;
  @Input() previewMode: boolean = true;
  @Output() updateAndSaveAction = new EventEmitter();
  
  listOfMathOperators: Array<{ name: string, value: string, icon?: string }> = [];
  listOfFunctions: Array<{ name: string, value: string, icon?: string }> = [];


  TYPE_FUNCTION_LIST_FOR_VARIABLES = TYPE_FUNCTION_LIST_FOR_VARIABLES
  TYPE_MATH_OPERATOR_LIST = TYPE_MATH_OPERATOR_LIST

  private logger: LoggerService = LoggerInstance.getInstance();
  constructor() { }

  ngOnInit(): void {
      this.initialize();
  }

  ngOnChanges(changes: SimpleChanges): void {
      this.logger.log('[CDS-ACTION-ASSIGN-VARIABLE] action ', this.action)
      const operands = this.action.operation.operands
      const operators = this.action.operation.operators
      this.logger.log('[CDS-ACTION-ASSIGN-VARIABLE] operands ', operands)
      this.logger.log('[CDS-ACTION-ASSIGN-VARIABLE] operators ', operators)
      
      // for (let i = 0; i < operands.length; i++) {
      //     for (let key in TYPE_FUNCTION_LIST_FOR_VARIABLES) {
      //         let _function = operands[i].function
      //         // this.logger.log('[CDS-ACTION-ASSIGN-VARIABLE] operand _function (2)' , _function)
      //         // this.logger.log('[CDS-ACTION-ASSIGN-VARIABLE]  TYPE_FUNCTION_LIST_FOR_VARIABLES key ' ,TYPE_FUNCTION_LIST_FOR_VARIABLES[key])
      //         if (_function === TYPE_FUNCTION_LIST_FOR_VARIABLES[key].type) {
      //             this.logger.log('[CDS-ACTION-ASSIGN-VARIABLE] >>>>>> operand  ', operands[i])
      //             operands[i]['functionName'] = TYPE_FUNCTION_LIST_FOR_VARIABLES[key].name
      //         }
      //     }
      //     this.logger.log('[CDS-ACTION-ASSIGN-VARIABLE] operands -xx', operands[i])
      //     if (operands[i].value === '') {
      //         this.displaySetOperationPlaceholder = false
      //         this.logger.log('[CDS-ACTION-ASSIGN-VARIABLE] displaySetOperationPlaceholder -xx', this.displaySetOperationPlaceholder)
      //     }
      //     for (let j = 0; j < operators.length; j++) {
      //         // this.logger.log('[CDS-ACTION-ASSIGN-VARIABLE] operator ---xx>', operators)
      //         if (operands.length - 1) {
      //             this.logger.log('[CDS-ACTION-ASSIGN-VARIABLE] operators j -xx>', operators[j])
      //             this.logger.log('[CDS-ACTION-ASSIGN-VARIABLE] operators i -xx>', operators[i])
      //             this.logger.log('[CDS-ACTION-ASSIGN-VARIABLE] operators i  TYPE_MATH_OPERATOR[operators[i]] -xx>', TYPE_MATH_OPERATOR[operators[i]])
      //             // operands[i]['operator'] = TYPE_MATH_OPERATOR[operators[j]]
      //             for (let key in TYPE_MATH_OPERATOR_LIST) {
      //                 if (operators[i] === TYPE_MATH_OPERATOR_LIST[key].type) {
      //                     operands[i]['operator'] = TYPE_MATH_OPERATOR_LIST[key].name
      //                 }
      //             }

      //         }
      //     }
      // }

  }

  getValue(key: string, type: 'operands' | 'operators'): any{
      // return TYPE_FUNCTION_LIST_FOR_VARIABLES[key]
      if(type === 'operands'){
          return this.listOfFunctions.filter(el => el.value === key)[0]
      }
      if(type === 'operators'){
          return this.listOfMathOperators.filter(el => el.value === key)[0]
      }
      
  }

  initialize() {
      for (let key in TYPE_FUNCTION_LIST_FOR_VARIABLES) {
          this.listOfFunctions.push({ name: TYPE_FUNCTION_LIST_FOR_VARIABLES[key].name, value: TYPE_FUNCTION_LIST_FOR_VARIABLES[key].type});
      }
      for (let key in TYPE_MATH_OPERATOR_LIST) {
          this.listOfMathOperators.push({ name: TYPE_MATH_OPERATOR_LIST[key].name, value: TYPE_MATH_OPERATOR_LIST[key].type, icon:  TYPE_MATH_OPERATOR_LIST[key].src});
      }
  }

  onSelectedAttribute(variableSelected: { name: string, value: string }) {
      this.action.destination = variableSelected.value;
      this.updateAndSaveAction.emit()
  }

  onChangeOperation(event) {
      // let temp = this.action.operation;
      // this.action.operation.operators.push(TYPE_MATH_OPERATOR['addAsNumber']);
      // this.action.operation.operands.push(new Operand());
      // this.action.operation = Object.assign({}, temp);
      this.updateAndSaveAction.emit();
  }

}
