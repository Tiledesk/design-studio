import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { variableList } from 'app/chatbot-design-studio/utils';
import { ActionDeleteVariable } from 'app/models/intent-model';
import { LoggerService } from 'app/services/logger/logger.service';

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
  
  constructor(
    private logger: LoggerService
  ) { }

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
