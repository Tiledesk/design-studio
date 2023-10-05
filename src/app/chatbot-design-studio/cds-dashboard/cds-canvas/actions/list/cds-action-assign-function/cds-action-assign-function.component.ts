import { ActionAssignFunction } from '../../../../../../models/action-model';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { TYPE_FUNCTION_LIST_FOR_FUNCTIONS } from '../../../../../utils';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Component({
  selector: 'cds-action-assign-function',
  templateUrl: './cds-action-assign-function.component.html',
  styleUrls: ['./cds-action-assign-function.component.scss']
})
export class CdsActionAssignFunctionComponent implements OnInit {
  
  @Input() action: ActionAssignFunction;
  @Output() updateAndSaveAction = new EventEmitter();
  
  listOfFunctions: Array<{name: string, value: string, icon?:string}> = [];
  openSlectFunction: boolean = true;

  private logger: LoggerService = LoggerInstance.getInstance();

  constructor() { }

  ngOnInit(): void {
    // this.logger.log('-------> action:: ', this.action);
    this.initialize();
  }

  ngOnChanges() {
  }

  private initialize() {
    for (let key in TYPE_FUNCTION_LIST_FOR_FUNCTIONS) {
      this.listOfFunctions.push({name: TYPE_FUNCTION_LIST_FOR_FUNCTIONS[key].name, value: TYPE_FUNCTION_LIST_FOR_FUNCTIONS[key].type});
    }
  }

  onSelectedFunction(event: any) {
    // this.logger.log("onSelectedFunction::: ", event);
    this.action.functionName = event.value;
    this.updateAndSaveAction.emit()
  }

  onSelectedAttribute(event: any){
    // this.logger.log("onSelectedAttribute::: ", event);
    this.action.assignTo = event.name;
    this.updateAndSaveAction.emit()
  }
  
}

