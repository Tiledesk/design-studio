import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs/internal/Subscription';

//SERVICES
import { IntentService } from '../../../../../services/intent.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

//MODELS
import { Intent } from 'src/app/models/intent-model';
import { ActionWebRequestV2 } from 'src/app/models/action-model';

//UTILS
import { TYPE_UPDATE_ACTION, TYPE_METHOD_ATTRIBUTE, TEXT_CHARS_LIMIT } from 'src/app/chatbot-design-studio/utils';
import { variableList } from 'src/app/chatbot-design-studio/utils-variables';
import { checkConnectionStatusOfAction, updateConnector } from 'src/app/chatbot-design-studio/utils-connectors';
import { HEADER_TYPE, TYPE_METHOD_REQUEST } from 'src/app/chatbot-design-studio/utils-request';

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
  idConnectionTrue: string;
  idConnectionFalse: string;
  isConnectedTrue: boolean = false;
  isConnectedFalse: boolean = false;
  connector: any;
  private subscriptionChangedConnector: Subscription;
  
  methods: Array<{label: string, value: string}>;
  optionSelected: 'header' | 'body' = 'header'
  pattern = "^[a-zA-Z_]*[a-zA-Z_]+[a-zA-Z0-9_]*$";

  limitCharsText = TEXT_CHARS_LIMIT;
  jsonHeader: any; 
  jsonSettings: any;
  body: string = null
  jsonIsValid = true;
  errorMessage: string;
  methodSelectedHeader = true;
  methodSelectedBody = false;
  headerAttributes: any;
  autocompleteHeaderOptions: Array<{label: string, value: string}> = [];

  valueIsInvalid: boolean = false;

  // hasSelectedVariable: boolean = false;
  typeMethodAttribute = TYPE_METHOD_ATTRIBUTE;
  assignments: {} = {}

  bodyOptions: Array<{name: string, value: string, disabled: boolean, checked: boolean}>= [ 
      {name: 'none',       value: 'none',      disabled: false, checked: true  }, 
      {name: 'Json',       value: 'json',      disabled: false, checked: false },
      {name: 'form-data',  value: 'form-data', disabled: false, checked: false }
  ]
  bodyType: 'none' | 'json' | 'form-data' = 'none';

  private readonly logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private readonly intentService: IntentService
  ) { }

  // SYSTEM FUNCTIONS //
  ngOnInit(): void {
    this.logger.debug("[ACTION-WEB-REQUEST-v2] action detail: ", this.action);
    this.subscriptionChangedConnector = this.intentService.isChangedConnector$.subscribe((connector: any) => {
      this.logger.debug('[ACTION-WEB-REQUEST-v2] isChangedConnector -->', connector);
      let connectorId = this.idIntentSelected+"/"+this.action._tdActionId;
      if(connector.fromId.startsWith(connectorId)){
        this.connector = connector;
        this.updateConnector();
      }
    });
    this.initialize();
  }

  /** */
  ngOnDestroy() {
    if (this.subscriptionChangedConnector) {
      this.subscriptionChangedConnector.unsubscribe();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    // on change
    this.initialize();
    if(this.intentSelected){
      this.initializeConnector();
    }
    this.logger.log('[ACTION-WEB-REQUEST-v2] onChanges' , this.action, this.intentSelected )
    // if (this.action && this.action.assignStatusTo) {
    //   this.hasSelectedVariable = true
    // }
  }

  initializeConnector() {
    this.idIntentSelected = this.intentSelected.intent_id;
    this.idConnectorTrue = this.idIntentSelected+'/'+this.action._tdActionId + '/true';
    this.idConnectorFalse = this.idIntentSelected+'/'+this.action._tdActionId + '/false';
    this.listOfIntents = this.intentService.getListOfIntents();
    this.checkConnectionStatus();
  }

  private checkConnectionStatus(){
    const resp = checkConnectionStatusOfAction(this.action, this.idConnectorTrue, this.idConnectorFalse);
    this.isConnectedTrue    = resp.isConnectedTrue;
    this.isConnectedFalse   = resp.isConnectedFalse;
    this.idConnectionTrue   = resp.idConnectionTrue;
    this.idConnectionFalse  = resp.idConnectionFalse;
  }

  /** */
  private updateConnector(){
    this.logger.log('[ACTION WEB-REQUEST-v2] updateConnector:');
    const resp = updateConnector(this.connector, this.action, this.isConnectedTrue, this.isConnectedFalse, this.idConnectionTrue, this.idConnectionFalse);
    if(resp){
      this.isConnectedTrue    = resp.isConnectedTrue;
      this.isConnectedFalse   = resp.isConnectedFalse;
      this.idConnectionTrue   = resp.idConnectionTrue;
      this.idConnectionFalse  = resp.idConnectionFalse;
      this.logger.log('[ACTION WEB-REQUEST-v2] updateConnector:', resp);
      if (resp.emit) {
        this.updateAndSaveAction.emit({ type: TYPE_UPDATE_ACTION.CONNECTOR, element: this.connector });
      } 
    }
  }

  
  // CUSTOM FUNCTIONS //
  private initialize(){
    this.initializeAttributes();
    this.methods = Object.keys(TYPE_METHOD_REQUEST).map((key, index) => {
      return { label: key, value: key }
    })
    this.jsonHeader = this.action.headersString
    this.bodyOptions.forEach(el => { el.value ===this.action.bodyType? el.checked= true: el.checked = false })
    // this.jsonIsValid = this.isValidJson(this.action.jsonBody);



    if(this.action.jsonBody){ 
      this.body = this.checkAndSetJsonBody(this.action.jsonBody);
      // // this.body = this.action.jsonBody;
      this.body = this.formatJSON(this.body, "\t");
    }
    this.jsonSettings = { timeout: 20000}
    if(this.action.settings){
      this.jsonSettings = this.action.settings
    }
    if(!this.action.formData){
      this.action.formData = []
    }
    this.assignments = this.action.assignments
    if(this.intentSelected){
      this.initializeConnector();
    }
    this.autocompleteHeaderOptions = [];
    HEADER_TYPE.forEach(el => this.autocompleteHeaderOptions.push({label: el.label, value: el.value}))
  
  }

  private initializeAttributes() {
    let new_attributes = [];
    if (!variableList.find(el => el.key ==='userDefined').elements.some(v => v.name === 'result')) {
      new_attributes.push({ name: "result", value: "result" });
    }
    if (!variableList.find(el => el.key ==='userDefined').elements.some(v => v.name === 'status')) {
      new_attributes.push({ name: "status", value: "status" });
    }
    if (!variableList.find(el => el.key ==='userDefined').elements.some(v => v.name === 'error')) {
      new_attributes.push({ name: "error", value: "error" });
    }
    variableList.find(el => el.key ==='userDefined').elements = [ ...variableList.find(el => el.key ==='userDefined').elements, ...new_attributes];
    this.logger.debug("[ACTION-WEB-REQUEST-v2] Initialized variableList.userDefined: ", variableList.find(el => el.key ==='userDefined'));
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
    this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
  }

  onChangeButtonSelect(event: {name: string, value: string, disabled: boolean, checked: boolean}){
    this.bodyOptions.forEach(el => { el.value ===event.value? el.checked = true: el.checked = false })
    this.action.bodyType= event.value
    switch (event.value){
      case 'none':
        this.bodyType = 'none';
        this.body = JSON.stringify({})
        delete this.jsonHeader['Content-Type']
        break;
      case 'json':
        this.bodyType = 'json';
        // // this.body = this.action.jsonBody;
        this.jsonHeader['Content-Type'] = 'application/json';
        this.body = this.checkAndSetJsonBody(this.action.jsonBody);
        break;
      case 'form-data':
        this.bodyType = 'form-data';
        this.jsonHeader['Content-Type'] = 'multipart/form-data'
        break;
    }
    this.action.headersString = this.jsonHeader
    this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
  }



  checkAndSetJsonBody(jsonBody){
    this.logger.log('[ACTION-WEB-REQUEST-v2] jsonBody:: ', jsonBody);
    return jsonBody.replace(/{{(.*?)}}/g, (match, content) => {
      if (match.includes('| json') || match.includes('|json')) {
        return match;
      } else {
        return `{{ ${content.trim()} | json }}`;
      }
    });
  }




  onChangeTextarea(e, type: 'url' | 'body' | 'setting'){
    switch(type){
      case 'body': {
        this.body = e;
        // // setTimeout(() => {
          // this.jsonIsValid = this.isValidJson(this.body);
          // this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
        // }, 0);
        break;
      }
      case 'url' : {
        this.action.url = e;
        // this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
        break;
      }
      case 'setting': {
        if(isNaN(+e)){
          this.valueIsInvalid = true;
          break;
        }
        this.valueIsInvalid = false;
        this.jsonSettings.timeout = +e;
        this.action['settings'] = this.jsonSettings;
        break;
      }
    }
  }

  onBlur(event){
    this.action.jsonBody = this.checkAndSetJsonBody(this.body);
    this.body = this.action.jsonBody;
    this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
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
    this.logger.log('onChangeAttributes');
    this.action.headersString = attributes;
    this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
  }

  onChangeAttributesResponse(attributes:{[key: string]: string }){
    this.action.assignments = attributes ;
    this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
  }

  onFormDataChanged(event){
    this.logger.log('[ACTION-WEB-REQUEST-v2] onFormDataChanged --> ', event)
    this.action.formData= event
    this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
  }

  onSelectedAttribute(event, property) {
    this.logger.log("[ACTION-WEB-REQUEST-v2] onEditableDivTextChange event", event)
    this.logger.log("[ACTION-WEB-REQUEST-v2] onEditableDivTextChange property", property)
    this.action[property] = event.value;
    this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
  }

  onChangeBlockSelect(event:{name: string, value: string}, type: 'trueIntent' | 'falseIntent') {
    if(event){
      this.action[type]=event.value
      switch(type){
        case 'trueIntent':
          this.onConnectorChange.emit({ type: 'create', fromId: this.idConnectorTrue, toId: this.action.trueIntent})
          break;
        case 'falseIntent':
          this.onConnectorChange.emit({ type: 'create', fromId: this.idConnectorFalse, toId: this.action.falseIntent})
          break;
      }
      this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
    }
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
    this.action[type] = null;
    this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
  }
}
