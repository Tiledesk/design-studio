import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs';
import { IntentService } from 'src/app/chatbot-design-studio/services/intent.service';
import { TEXT_CHARS_LIMIT, TYPE_METHOD_ATTRIBUTE, TYPE_UPDATE_ACTION } from 'src/app/chatbot-design-studio/utils';
import { TYPE_METHOD_REQUEST, HEADER_TYPE, RESPONSE_STATUS_TYPE } from 'src/app/chatbot-design-studio/utils-request';
import { ActionWebRespose } from 'src/app/models/action-model';
import { Intent } from 'src/app/models/intent-model';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Component({
  selector: 'cds-action-web-response',
  templateUrl: './cds-action-web-response.component.html',
  styleUrls: ['./cds-action-web-response.component.scss']
})
export class CdsActionWebResponseComponent implements OnInit {

  @Input() intentSelected: Intent;
  @Input() action: ActionWebRespose;
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
  optionSelected: 'header' | 'body' = 'body'
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
  autocompleteStatusOptions: Array<{label: string, value: string}> = [];

  valueIsInvalid: boolean = false;
  // hasSelectedVariable: boolean = false;
  typeMethodAttribute = TYPE_METHOD_ATTRIBUTE;
  type
  assignments: {} = {}

  bodyOptions: Array<{name: string, value: string, disabled: boolean, checked: boolean}>= [ 
      {name: 'none',       value: 'none',      disabled: false, checked: true  }, 
      {name: 'json',       value: 'json',      disabled: false, checked: false }
  ]
  
  private logger: LoggerService = LoggerInstance.getInstance();
  constructor(
    private intentService: IntentService
  ) { }

  // SYSTEM FUNCTIONS //
  ngOnInit(): void {
    this.logger.debug("[ACTION-WEB-RESPONSE] action detail: ", this.action);
  }

  /** */
  ngOnDestroy() {
    if (this.subscriptionChangedConnector) {
      this.subscriptionChangedConnector.unsubscribe();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    this.logger.log('[ACTION-WEB-RESPONSE] onChanges' , this.action, this.intentSelected )
    this.initialize();
    // if (this.action && this.action.assignStatusTo) {
    //   this.hasSelectedVariable = true
    // }
  }

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




  
  // CUSTOM FUNCTIONS //
  private initialize(){
    this.methods = Object.keys(TYPE_METHOD_REQUEST).map((key, index) => {
      return { label: key, value: key }
    })
    this.jsonHeader = this.action.headersString
    this.bodyOptions.forEach(el => { el.value ===this.action.bodyType? el.checked= true: el.checked = false })
    // this.jsonIsValid = this.isValidJson(this.action.jsonBody);
    if(this.action.payload){
      this.body = this.action.payload;
      this.body = this.formatJSON(this.body, "\t");
    }
    this.jsonSettings = { timeout: 20000}
    
    this.assignments = this.action.assignments
    this.autocompleteHeaderOptions = [];
    HEADER_TYPE.forEach(el => this.autocompleteHeaderOptions.push({label: el.label, value: el.value}))
    RESPONSE_STATUS_TYPE.forEach(el => this.autocompleteStatusOptions.push({label: el.label, value: el.value}))
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
  onChangeButtonSelect(event: {name: string, value: string, disabled: boolean, checked: boolean}){
    this.bodyOptions.forEach(el => { el.value ===event.value? el.checked= true: el.checked = false })
    this.action.bodyType= event.value
    switch (event.value){
      case 'none':
        this.body = JSON.stringify({})
        delete this.jsonHeader['Content-Type']
        break;
      case 'json':
        this.body = this.action.payload
        this.jsonHeader['Content-Type'] = 'application/json'
        break;
    }
    this.action.headersString = this.jsonHeader
    this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
  }

  onChangeTextarea(e, type: string){
    switch(type){
      case 'body': {
        this.body = e;
        this.action.payload = this.body;
        
        // setTimeout(() => {
          // this.jsonIsValid = this.isValidJson(this.body);
          // this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
        // }, 0);
        break;
      }
      default: {
        this.action[type]=e
      }
    }
  }

  onBlur(event){
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

  onSelectedAttribute(event, property) {
    this.logger.log("[ACTION-WEB-RESPONSE] onEditableDivTextChange event", event)
    this.logger.log("[ACTION-WEB-RESPONSE] onEditableDivTextChange property", property)
    this.action[property] = event.value;
    this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
  }

}
