import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { variableList } from '../../../../../utils';
import { ActionDeleteVariable } from 'src/app/models/action-model';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Component({
  selector: 'cds-action-delete-variable',
  templateUrl: './cds-action-delete-variable.component.html',
  styleUrls: ['./cds-action-delete-variable.component.scss']
})
export class CdsActionDeleteVariableComponent implements OnInit {

  @Input() action: ActionDeleteVariable;
  @Input() previewMode: boolean = true;
  @Output() updateAndSaveAction = new EventEmitter();
  
  variableListUserDefined: Array<{name: string, value: string}>;
  
  private logger: LoggerService = LoggerInstance.getInstance();
  
  constructor() { }

  ngOnInit(): void {
  }

  ngOnChanges() {
    this.initialize();
  }

  private initialize() {
    // this.logger.log('action: ', variableList.userDefined);
    this.variableListUserDefined = variableList.userDefined;
  }

  onChangeSelect(variableSelected: {name: string, value: string}){
    // this.logger.log('changeeeeee', variableSelected);
    this.action.variableName = variableSelected.name;
    this.updateAndSaveAction.emit()
  }

}
