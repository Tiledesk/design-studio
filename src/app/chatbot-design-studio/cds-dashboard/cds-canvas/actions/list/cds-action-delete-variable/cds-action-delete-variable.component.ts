import { Component, EventEmitter, Input, OnInit, Output, ElementRef } from '@angular/core';

//MODELS
import { ActionDeleteVariable } from 'src/app/models/action-model';

//SERVICES
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { TranslateService } from '@ngx-translate/core';

//UTILS
import { variableList } from 'src/app/chatbot-design-studio/utils-variables';

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
  variableListSystemDefined: Array<{ key: string, elements: Array<{name: string, value: string, description: string, src?: string}>}> //= variableList.systemDefined
  filteredList: Array<{name: string, value: string, category: string}> = [];

  private logger: LoggerService = LoggerInstance.getInstance();
  constructor(
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
  }

  ngOnChanges() {
    this.initialize();
  }

  private initialize() {
    // this.logger.log('action: ', variableList.userDefined);
    this.variableListUserDefined = variableList.find(el => el.key ==='userDefined').elements;
    this.variableListSystemDefined = variableList.filter(el => (el.key !== 'userDefined' && el.key !== 'globals'));
    
    if(this.variableListUserDefined){
      this.filteredList.push(...this.variableListUserDefined.map(el => ({...el, icon: 'data_object', category: this.translate.instant('CDSvariablesList.userDefined')})))
    }
    if(this.variableListSystemDefined){
      Object.values(this.variableListSystemDefined).forEach(obj => this.filteredList.push(...obj.elements.map(el => ({...el, category: this.translate.instant('CDSvariablesList.'+obj.key)}))))
    }
  }

  onChangeSelect(variableSelected: {name: string, value: string}){
    // this.logger.log('changeeeeee', variableSelected);
    this.action.variableName = variableSelected.value;
    this.updateAndSaveAction.emit()
  }

}
