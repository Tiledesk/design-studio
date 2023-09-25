import { Component, Input, OnInit, Output, EventEmitter, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { TemplateDetailComponent } from '../../../../../../../bots/templates/template-detail/template-detail.component';
import { DialogComponent } from 'app/chatbot-design-studio/cds-base-element/dialog/dialog.component';
import { variableList } from 'app/chatbot-design-studio/utils';
import { FaqKbService } from 'app/services/faq-kb.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'variable-list',
  templateUrl: './variable-list.component.html',
  styleUrls: ['./variable-list.component.scss']
})
export class VariableListComponent implements OnInit {
  
  @Output() onSelected = new EventEmitter()

  variableListUserDefined: Array<{name: string, value: string}> // = variableList.userDefined 
  variableListSystemDefined: Array<{name: string, value: string, src?: string}> //= variableList.systemDefined
  
  filteredVariableList: Array<{name: string, value: string}> //= []
  filteredIntentVariableList: Array<{name: string, value: string, src?: string}>
  textVariable: string = '';
  idBot: string;

  constructor(
    public dialog: MatDialog,
    private faqkbService: FaqKbService,
    private route: ActivatedRoute,
  ) { }

  ngOnInit(): void {
    this.initialize();
  }

  ngOnChanges(){
    //this.initialize();
  }

  private initialize(){
    this.getIdBot();
    this.variableListUserDefined = variableList.userDefined;
    this.variableListSystemDefined = variableList.systemDefined;
    this.filteredVariableList = [];
    this.filteredIntentVariableList = [];
    if(this.variableListUserDefined){
      this.filteredVariableList = this.variableListUserDefined
    }
    if(this.variableListSystemDefined){
      this.filteredIntentVariableList = this.variableListSystemDefined
    }
    //this.logger.log('variable-list initialize:: ', variableList.userDefined);
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
        let variable = {name: result, value: result};
        that.variableListUserDefined.push(variable);
        this.saveVariables(this.variableListUserDefined);
      }
    });
  }

  private getIdBot(){
    this.route.params.subscribe((params) => {
      this.idBot = params.faqkbid;

    });
  }

  private saveVariables(variables){
    let jsonVar = {};
    variables.forEach(element => {
      jsonVar[element.name] = element.name;
    });
    // console.log('jsonVar: ', jsonVar);
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
    this.filteredVariableList = this._filter(this.textVariable, this.variableListUserDefined)
    this.filteredIntentVariableList = this._filter(this.textVariable, this.variableListSystemDefined)
  }

  private _filter(value: string, array: Array<any>): Array<any> {
    const filterValue = value.toLowerCase();
    return array.filter(option => option.name.toLowerCase().includes(filterValue));
  }

  onAddCustomAttribute(){
    this.openDialog();
  }

}
