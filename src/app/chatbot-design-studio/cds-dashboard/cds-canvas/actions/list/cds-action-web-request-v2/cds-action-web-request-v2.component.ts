import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { ActionWebRequest, ActionWebRequestV2, Intent } from 'app/models/intent-model';
import { LoggerService } from 'app/services/logger/logger.service';
import { TYPE_METHOD_ATTRIBUTE, TYPE_METHOD_REQUEST, TEXT_CHARS_LIMIT, variableList } from 'app/chatbot-design-studio/utils';
import { IntentService } from 'app/chatbot-design-studio/services/intent.service';

@Component({
  selector: 'cds-action-web-request-v2',
  templateUrl: './cds-action-web-request-v2.component.html',
  styleUrls: ['./cds-action-web-request-v2.component.scss']
})
export class CdsActionWebRequestV2Component implements OnInit {

  @Input() intentSelected: Intent;
  @Input() action: ActionWebRequestV2;
  @Input() previewMode: boolean = true;
  @Output() updateAndSaveAction = new EventEmitter();
  @Output() onConnectorChange = new EventEmitter<{type: 'create' | 'delete',  fromId: string, toId: string}>()
  
  listOfIntents: Array<{name: string, value: string, icon?:string}>;

  // Connectors
  idIntentSelected: string;
  idConnectorTrue: string;
  idConnectorFalse: string;
  isConnectedTrue: boolean = false;
  isConnectedFalse: boolean = false;
  connector: any;
  
  methods: Array<{label: string, value: string}>;
  optionSelected: 'header' | 'body' = 'header'
  pattern = "^[a-zA-Z_]*[a-zA-Z_]+[a-zA-Z0-9_]*$";

  limitCharsText = TEXT_CHARS_LIMIT;
  jsonHeader: any; 
  body: string = null
  jsonIsValid = true;
  errorMessage: string;
  methodSelectedHeader = true;
  methodSelectedBody = false;
  headerAttributes: any;

  // hasSelectedVariable: boolean = false;
  typeMethodAttribute = TYPE_METHOD_ATTRIBUTE;
  assignments: {} = {}

  bodyOptions: Array<{label: string, value: string, disabled: boolean, checked: boolean}>= [ {label: 'none', value: 'none', disabled: false, checked: true}, {label: 'Json', value: 'json', disabled: false, checked: false}]
  
  constructor(
    private logger: LoggerService,
    private intentService: IntentService
  ) { }

  // SYSTEM FUNCTIONS //
  ngOnInit(): void {
    this.logger.debug("[ACTION-ASKGPT] action detail: ", this.action);

    this.intentService.isChangedConnector$.subscribe((connector: any) => {
      this.logger.debug('[ACTION-ASKGPT] isChangedConnector -->', connector);
      this.connector = connector;
      this.updateConnector();
    });

    this.initializeAttributes();
  }

  ngOnChanges(changes: SimpleChanges) {
    // on change
    this.initialize();
    if(this.intentSelected){
      this.initializeConnector();
    }
    console.log('[ACTION-WEB-REQUEST-v2] onChanges' , this.action, this.intentSelected )
    // if (this.action && this.action.assignStatusTo) {
    //   this.hasSelectedVariable = true
    // }
  }

  initializeConnector() {
    this.idIntentSelected = this.intentSelected.intent_id;
    this.idConnectorTrue = this.idIntentSelected+'/'+this.action._tdActionId + '/true';
    this.idConnectorFalse = this.idIntentSelected+'/'+this.action._tdActionId + '/false';

    this.listOfIntents = this.intentService.getListOfIntents()
  }

  private updateConnector(){
    try {
      const array = this.connector.fromId.split("/");
      const idAction= array[1];
      if(idAction === this.action._tdActionId){
        if(this.connector.deleted){ 
          //TODO: verificare quale dei due connettori è stato eliminato e impostare isConnected a false
          // DELETE 
          if(array[array.length -1] === 'true'){
            this.action.trueIntent = null
            this.isConnectedTrue = false
          }        
          if(array[array.length -1] === 'false'){
            this.action.falseIntent = null
            this.isConnectedFalse = false;
          }
          this.updateAndSaveAction.emit();
        } else { //TODO: verificare quale dei due connettori è stato aggiunto (controllare il valore della action corrispondente al true/false intent)
          // ADD / EDIT
          this.logger.debug('[ACTION-ASKGPT] updateConnector', this.connector.toId, this.connector.fromId ,this.action, array[array.length-1]);
          if(array[array.length -1] === 'true'){
            this.isConnectedTrue = true;
            if(this.action.trueIntent !== '#'+this.connector.toId){
              this.action.trueIntent = '#'+this.connector.toId;
              this.updateAndSaveAction.emit();
            } 
          }        
          if(array[array.length -1] === 'false'){
            this.isConnectedFalse = true;
            if(this.action.falseIntent !== '#'+this.connector.toId){
              this.action.falseIntent = '#'+this.connector.toId;
              this.updateAndSaveAction.emit();
            } 
          }
        }

      }
    } catch (error) {
      this.logger.error('[ACTION-ASKGPT] updateConnector error: ', error);
    }
  }

  
  // CUSTOM FUNCTIONS //
  private initialize(){
    this.methods = Object.keys(TYPE_METHOD_REQUEST).map((key, index) => {
      return { label: key, value: key }
    })
    this.jsonHeader = this.action.headersString;
    this.jsonIsValid = this.isValidJson(this.action.body);
    if(this.jsonIsValid && this.action.body){
      this.body = this.action.body;
      this.body = this.formatJSON(this.body, "\t");
    }
    this.assignments = this.action.assignments
  }

  private initializeAttributes() {
    let new_attributes = [];
    if (!variableList.userDefined.some(v => v.name === 'result')) {
      new_attributes.push({ name: "result", value: "result" });
    }
    if (!variableList.userDefined.some(v => v.name === 'status')) {
      new_attributes.push({ name: "status", value: "status" });
    }
    if (!variableList.userDefined.some(v => v.name === 'error')) {
      new_attributes.push({ name: "error", value: "error" });
    }
    variableList.userDefined = [ ...variableList.userDefined, ...new_attributes];
    this.logger.debug("[ACTION ASKGPT] Initialized variableList.userDefined: ", variableList.userDefined);
  }


  private formatJSON(input, indent) {
    if (input.length == 0) {
      return '';
    }
    else {
      try {
        var parsedData = JSON.parse(input);
        return JSON.stringify(parsedData, null, indent);
      } catch (e) {
        return input;
      }
    }
  }

  private isValidJson(json) {
    try {
      JSON.parse(json);
      this.errorMessage = null;
      return true;
    } catch (e) {
      this.errorMessage = e;
      return false;
    }
  }


  // EVENT FUNCTIONS //
  onChangeMethodButton(e: {label: string, value: string}){
    this.action.method = e.value;
    this.updateAndSaveAction.emit()
  }

  onChangeButtonSelect(event: {label: string, value: string, disabled: boolean, checked: boolean}){
    this.bodyOptions.forEach(el => { el.value ===event.value? el.checked= true: el.checked = false })
    switch (event.value){
      case 'none':
        this.body = null
        break;
      case 'json':
        this.body = JSON.stringify({})
    }
    console.log('onChangeButtonSelect-->', event, this.body)
  }

  onChangeTextarea(e, type: 'url' | 'body'){
   console.log('onChangeTextarea:', e, type );
    switch(type){
      case 'body': {
        this.body = e;
        this.action.body = this.body;
        setTimeout(() => {
          this.jsonIsValid = this.isValidJson(this.body);
          this.updateAndSaveAction.emit()
        }, 500);
        break;
      }
      case 'url' : {
        this.action.url = e
        this.updateAndSaveAction.emit()
      }
    }

  }

  onChangeOption(event: 'header'|'body'){
    switch(event){
      case 'header':
        this.jsonHeader = this.action.headersString;
        break;
      case 'body':
        break;
    }
  }

  onChangeAttributes(attributes:any){
    // console.log('onChangeAttributes');
    this.action.headersString = attributes;
    this.updateAndSaveAction.emit()
    // this.jsonHeader = attributes;
  }

  onChangeAttributesResponse(attributes:{[key: string]: string }){
    this.action.assignments = attributes ;
    this.updateAndSaveAction.emit()
  }

  onSelectedAttribute(event, property) {
    this.logger.log("[ACTION-WEB-REQUEST-v2] onEditableDivTextChange event", event)
    this.logger.log("[ACTION-WEB-REQUEST-v2] onEditableDivTextChange property", property)
    this.action[property] = event.value;
    this.updateAndSaveAction.emit();
  }

  onChangeBlockSelect(event:{name: string, value: string}, type: 'trueIntent' | 'falseIntent') {
    if(event){
      this.action[type]=event.value
    }

    switch(type){
      case 'trueIntent':
        this.onConnectorChange.emit({ type: 'create', fromId: this.idConnectorTrue, toId: this.action.trueIntent})
        break;
      case 'falseIntent':
        this.onConnectorChange.emit({ type: 'create', fromId: this.idConnectorFalse, toId: this.action.falseIntent})
        break;
    }
    this.updateAndSaveAction.emit();
  }

  onResetBlockSelect(event:{name: string, value: string}, type: 'trueIntent' | 'falseIntent') {
    switch(type){
      case 'trueIntent':
        this.onConnectorChange.emit({ type: 'delete', fromId: this.idConnectorTrue, toId: this.action.trueIntent})
        break;
      case 'falseIntent':
        this.onConnectorChange.emit({ type: 'delete', fromId: this.idConnectorFalse, toId: this.action.falseIntent})
        break;
    }
    this.action[type]=null
    this.updateAndSaveAction.emit();
  }

}
