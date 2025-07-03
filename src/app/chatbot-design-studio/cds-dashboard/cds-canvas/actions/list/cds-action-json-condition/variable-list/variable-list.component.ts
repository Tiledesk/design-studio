import { Component, Input, OnInit, Output, EventEmitter, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { DialogComponent } from '../../../../../../cds-base-element/dialog/dialog.component';

//SERVICES
import { FaqKbService } from 'src/app/services/faq-kb.service';
import { DashboardService } from 'src/app/services/dashboard.service';
//UTILS
import { BRAND_BASE_INFO } from 'src/app/chatbot-design-studio/utils-resources';
import { variableList, TYPE_CHATBOT } from 'src/app/chatbot-design-studio/utils-variables';

@Component({
  selector: 'variable-list',
  templateUrl: './variable-list.component.html',
  styleUrls: ['./variable-list.component.scss']
})
export class VariableListComponent implements OnInit {
  
  @Output() onSelected = new EventEmitter()

  type_chatbot:TYPE_CHATBOT;

  variableListUserDefined: { key: string, elements: Array<{name: string, chatbot_types: string, value: string}>} // = variableList.userDefined 
  variableListGlobals: { key: string, elements: Array<{name: string, chatbot_types: string, value: string}>}
  variableListSystemDefined: Array<{ key: string, elements: Array<{name: string, chatbot_types: string, value: string, description: string, src?: string}>}> //= variableList.systemDefined

  filteredVariableList: Array<{ key: string, elements: Array<{name: string, value: string}>}> //= []
  filteredGlobalsList: Array<{ key: string, elements: Array<{name: string, value: string}>}> //= []
  filteredIntentVariableList: Array<{ key: string, elements: Array<{name: string, value: string, description: string, src?: string}>}>
  textVariable: string = '';
  idBot: string;

  isEmpty: boolean = false
  isSearching: boolean = false

  BRAND_BASE_INFO = BRAND_BASE_INFO
  constructor(
    public dialog: MatDialog,
    private faqkbService: FaqKbService,
    private dashboardService: DashboardService
  ) { }

  ngOnInit(): void {
    this.initialize();
  }

  ngOnChanges(){
    //this.initialize();
  }

  private initialize() {
    // Ensure subtype is a valid TYPE_CHATBOT value, otherwise fallback to TYPE_CHATBOT.CHATBOT
    if (
      this.dashboardService.selectedChatbot &&
      Object.values(TYPE_CHATBOT).includes(this.dashboardService.selectedChatbot.subtype as TYPE_CHATBOT)
    ) {
      this.type_chatbot = this.dashboardService.selectedChatbot.subtype as TYPE_CHATBOT;
    } else {
      this.type_chatbot = TYPE_CHATBOT.CHATBOT;
    }
    


    this.idBot = this.dashboardService.id_faq_kb;
    this.variableListUserDefined = variableList.find(el => el.key === 'userDefined');
    if (this.variableListUserDefined && this.variableListUserDefined.elements) {
      this.variableListUserDefined.elements = this.variableListUserDefined.elements.filter(el => el.chatbot_types?.includes(this.type_chatbot));
    }
    this.variableListGlobals = variableList.find(el => el.key === 'globals');
    if (this.variableListGlobals && this.variableListGlobals.elements) {
      this.variableListGlobals.elements = this.variableListGlobals.elements.filter(el => el.chatbot_types?.includes(this.type_chatbot));
    }

    this.variableListSystemDefined = variableList
      .filter(el => (el.key !== 'userDefined' && el.key !== 'globals'))
      .map(el => ({
        ...el,
        elements: el.elements.filter(elem => elem.chatbot_types?.includes(this.type_chatbot))
      }));

    this.filteredVariableList = []
    this.filteredGlobalsList = []
    this.filteredIntentVariableList = [];
    if(this.variableListUserDefined){
      this.filteredVariableList.push(this.variableListUserDefined)
    }
    if(this.variableListGlobals){
      this.filteredGlobalsList.push(this.variableListGlobals)
    }
    variableList.filter(el => (el.key !== 'userDefined' && el.key !== 'globals')).map(el => {
      this.filteredIntentVariableList.push( { key: el.key, elements: el.elements })
    })
    // if(this.variableListSystemDefined){
    //   this.filteredIntentVariableList = this.variableListSystemDefined
    // }
  }

  openDialog() {
    var that = this;
    const dialogRef = this.dialog.open(DialogComponent, {
      panelClass: 'custom-dialog-container',
      data: {text: ''}
    });
    dialogRef.afterClosed().subscribe(result => {
      // this.logger.log(`Dialog result: ${result}`);
      if(result && result !== undefined && result !== false){
        let variable = {name: result, chatbot_types:this.type_chatbot, value: result};
        that.variableListUserDefined.elements.push(variable);
        this.saveVariables(this.variableListUserDefined.elements);
      }
    });
  }

  onVariableDelete(variableSelected: {name: string, value: string}){
    let index = this.variableListUserDefined.elements.findIndex(el => el.name === variableSelected.name)
    if(index > -1){
      this.variableListUserDefined.elements.splice(index, 1)
      this.saveVariables(this.variableListUserDefined.elements)
    }
  }

  private saveVariables(variables){
    let jsonVar = {};
    variables.forEach(element => {
      jsonVar[element.name] = element.name;
    });
    this.faqkbService.addNodeToChatbotAttributes(this.idBot, 'variables', jsonVar).subscribe((data)=> {
      if(data){
        //SUCCESS STATE
      }
    }, (error)=> {
      //FAIL STATE
    }, ()=>{
      // this.logger.debug('[RULES-ADD] faqkbService addRuleToChatbot - COMPLETE')
    })
  }

  onVariableSelected(variableSelected: {name: string, value: string}){
    this.onSelected.emit(variableSelected);
  }

  onChangeSearch(event){
    if(event && event.target){
      this.textVariable = event.target.value
    }else {
      this.textVariable = event
    }
    this.filteredVariableList = this._filter2(this.textVariable, [this.variableListUserDefined])
    this.filteredGlobalsList = this._filter2(this.textVariable, [this.variableListGlobals])
    this.filteredIntentVariableList = this._filter2(this.textVariable, this.variableListSystemDefined)

    this.isEmpty = (this.filteredIntentVariableList.every(el => el.elements.length === 0) && this.filteredVariableList[0].elements.length === 0 ) 
    this.isSearching = (this.textVariable !== '')
  }

  private _filter(value: string, array: Array<any>): Array<any> {
    const filterValue = value.toLowerCase();
    return array.filter(option => option.name.toLowerCase().includes(filterValue));
  }

  private _filter2(value: string, array: Array<{key: string, elements: Array<any>}>): Array<any> {
    const filterValue = value.toLowerCase();
    return array.map(el => { return { key: el.key, elements: el.elements.filter(option => option.name.toLowerCase().includes(filterValue))}});
  }

  onAddCustomAttribute(){
    this.openDialog();
  }

}
