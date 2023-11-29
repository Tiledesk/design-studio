import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { Intent } from 'src/app/models/intent-model';
import { ActionWebRequest, ActionWebRequestV2 } from 'src/app/models/action-model';
import { TYPE_UPDATE_ACTION, TYPE_METHOD_ATTRIBUTE, TYPE_METHOD_REQUEST, TEXT_CHARS_LIMIT, variableList } from '../../../../../utils';
import { IntentService } from '../../../../../services/intent.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { Subscription } from 'rxjs/internal/Subscription';

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
  
  private logger: LoggerService = LoggerInstance.getInstance();
  constructor(
    private intentService: IntentService
  ) { }

  // SYSTEM FUNCTIONS //
  ngOnInit(): void {
    this.logger.debug("[ACTION-WEB-REQUEST-v2] action detail: ", this.action);
    this.subscriptionChangedConnector = this.intentService.isChangedConnector$.subscribe((connector: any) => {
      this.logger.debug('[ACTION-WEB-REQUEST-v2] isChangedConnector -->', connector);
      this.connector = connector;
      this.updateConnector();
    });
    this.initialize();
  }

  /** */
  ngOnDestroy() {
    if (this.subscriptionChangedConnector) {
      this.subscriptionChangedConnector.unsubscribe();
    }
  }

  // ngOnChanges(changes: SimpleChanges) {
  //   // on change
  //   this.initialize();
  //   if(this.intentSelected){
  //     this.initializeConnector();
  //   }
  //   console.log('[ACTION-WEB-REQUEST-v2] onChanges' , this.action, this.intentSelected )
  //   // if (this.action && this.action.assignStatusTo) {
  //   //   this.hasSelectedVariable = true
  //   // }
  // }

  // private checkConnectionStatus(){
  //   if(this.action.trueIntent){
  //    this.isConnectedTrue = true;
  //   } else {
  //    this.isConnectedTrue = false;
  //   }
  //   if(this.action.falseIntent){
  //     this.isConnectedFalse = true;
  //    } else {
  //     this.isConnectedFalse = false;
  //    }
  // }

  private checkConnectionStatus(){
    if(this.action.trueIntent){
      this.isConnectedTrue = true;
      const posId = this.action.trueIntent.indexOf("#");
      if (posId !== -1) {
        const toId = this.action.trueIntent.slice(posId+1);
        this.idConnectionTrue = this.idConnectorTrue+"/"+toId;
      }
    } else {
     this.isConnectedTrue = false;
     this.idConnectionTrue = null;
    }
    if(this.action.falseIntent){
      this.isConnectedFalse = true;
      const posId = this.action.falseIntent.indexOf("#");
      if (posId !== -1) {
        const toId = this.action.falseIntent.slice(posId+1);
        this.idConnectionFalse = this.idConnectorFalse+"/"+toId;
      }
     } else {
      this.isConnectedFalse = false;
      this.idConnectionFalse = null;
     }
  }

  initializeConnector() {
    this.idIntentSelected = this.intentSelected.intent_id;
    this.idConnectorTrue = this.idIntentSelected+'/'+this.action._tdActionId + '/true';
    this.idConnectorFalse = this.idIntentSelected+'/'+this.action._tdActionId + '/false';
    this.listOfIntents = this.intentService.getListOfIntents();
    this.checkConnectionStatus();
  }

  private updateConnector(){
    try {
      const array = this.connector.fromId.split("/");
      const idAction= array[1];
      if(idAction === this.action._tdActionId){
        if(this.connector.deleted){
          if(array[array.length -1] === 'true'){
            this.action.trueIntent = null;
            this.isConnectedTrue = false;
            this.idConnectionTrue = null;
          }        
          if(array[array.length -1] === 'false'){
            this.action.falseIntent = null;
            this.isConnectedFalse = false;
            this.idConnectionFalse = null;
          }
          if(this.connector.save)this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.CONNECTOR, element: this.connector});
        } else { 
          this.logger.debug('[ACTION-WEB-REQUEST-v2] updateConnector', this.connector.toId, this.connector.fromId ,this.action, array[array.length-1]);
          if(array[array.length -1] === 'true'){
            this.isConnectedTrue = true;
            this.idConnectionTrue = this.connector.fromId+"/"+this.connector.toId;
            this.action.trueIntent = '#'+this.connector.toId;
            if(this.connector.save)this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.CONNECTOR, element: this.connector});
          }        
          if(array[array.length -1] === 'false'){
            this.isConnectedFalse = true;
            this.idConnectionFalse = this.connector.fromId+"/"+this.connector.toId;
            this.action.falseIntent = '#'+this.connector.toId;
            if(this.connector.save)this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.CONNECTOR, element: this.connector});
          }
        }
      }
    } catch (error) {
      this.logger.error('[ACTION-ASKGPT] updateConnector error: ', error);
    }
  }

  
  // CUSTOM FUNCTIONS //
  private initialize(){
    this.initializeAttributes();
    this.methods = Object.keys(TYPE_METHOD_REQUEST).map((key, index) => {
      return { label: key, value: key }
    })
    this.jsonHeader = this.action.headersString;
    this.bodyOptions.forEach(el => { el.value ===this.action.bodyType? el.checked= true: el.checked = false })
    this.jsonIsValid = this.isValidJson(this.action.jsonBody);
    if(this.jsonIsValid && this.action.jsonBody){
      this.body = this.action.jsonBody;
      this.body = this.formatJSON(this.body, "\t");
    }
    this.assignments = this.action.assignments
    if(this.intentSelected){
      this.initializeConnector();
    }
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

  onChangeButtonSelect(event: {label: string, value: string, disabled: boolean, checked: boolean}){
    this.bodyOptions.forEach(el => { el.value ===event.value? el.checked= true: el.checked = false })
    this.action.bodyType= event.value
    switch (event.value){
      case 'none':
        this.body = JSON.stringify({})
        break;
      case 'json':
        this.body = this.action.jsonBody
    }
  }

  onChangeTextarea(e, type: 'url' | 'body'){
    switch(type){
      case 'body': {
        this.body = e;
        this.action.jsonBody = this.body;
        setTimeout(() => {
          this.jsonIsValid = this.isValidJson(this.body);
          this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
        }, 500);
        break;
      }
      case 'url' : {
        this.action.url = e;
        this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
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
    // this.logger.log('onChangeAttributes');
    this.action.headersString = attributes;
    this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
  }

  onChangeAttributesResponse(attributes:{[key: string]: string }){
    this.action.assignments = attributes ;
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
