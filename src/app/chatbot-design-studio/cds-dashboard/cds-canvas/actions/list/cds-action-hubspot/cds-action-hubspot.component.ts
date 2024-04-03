import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs/internal/Subscription';

//SERVICES
import { Intent } from 'src/app/models/intent-model';
import { ActionHubspot } from 'src/app/models/action-model';
import { IntentService } from '../../../../../services/intent.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { AppConfigService } from 'src/app/services/app-config';

//UTILS
import { TYPE_UPDATE_ACTION, TYPE_METHOD_ATTRIBUTE, TEXT_CHARS_LIMIT } from 'src/app/chatbot-design-studio/utils';
import { variableList } from 'src/app/chatbot-design-studio/utils-variables';

@Component({
  selector: 'cds-action-hubspot',
  templateUrl: './cds-action-hubspot.component.html',
  styleUrls: ['./cds-action-hubspot.component.scss']
})
export class CdsActionHubspotComponent implements OnInit {

  @Input() intentSelected: Intent;
  @Input() action: ActionHubspot;
  @Input() project_id: string;
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
  private subscriptionChangedConnector: Subscription;
  
  pattern = "^[a-zA-Z_]*[a-zA-Z_]+[a-zA-Z0-9_]*$";

  limitCharsText = TEXT_CHARS_LIMIT;
  jsonParameters: { [key: string]: string}; 
  errorMessage: string;

  typeMethodAttribute = TYPE_METHOD_ATTRIBUTE;
  assignments: {} = {}

  
  private logger: LoggerService = LoggerInstance.getInstance();
  constructor(
    private intentService: IntentService,
    private appConfigService: AppConfigService,
  ) { }

  // SYSTEM FUNCTIONS //
  ngOnInit(): void {
    this.logger.debug("[ACTION-HUBSPOT] action detail: ", this.action);
    this.subscriptionChangedConnector = this.intentService.isChangedConnector$.subscribe((connector: any) => {
      this.logger.debug('[ACTION-HUBSPOT] isChangedConnector -->', connector);
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


  private checkConnectionStatus(){
    if(this.action.trueIntent){
     this.isConnectedTrue = true;
    } else {
     this.isConnectedTrue = false;
    }
    if(this.action.falseIntent){
      this.isConnectedFalse = true;
     } else {
      this.isConnectedFalse = false;
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
            this.action.trueIntent = null
            this.isConnectedTrue = false
          }        
          if(array[array.length -1] === 'false'){
            this.action.falseIntent = null
            this.isConnectedFalse = false;
          }
          if(this.connector.save)this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.CONNECTOR, element: this.connector});
        } else { 
          this.logger.debug('[ACTION-HUBSPOT] updateConnector', this.connector.toId, this.connector.fromId ,this.action, array[array.length-1]);
          if(array[array.length -1] === 'true'){
            this.isConnectedTrue = true;
            this.action.trueIntent = '#'+this.connector.toId;
            if(this.connector.save)this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.CONNECTOR, element: this.connector});
          }        
          if(array[array.length -1] === 'false'){
            this.isConnectedFalse = true;
            if(this.action.falseIntent !== '#'+this.connector.toId){
              this.action.falseIntent = '#'+this.connector.toId;
              if(this.connector.save)this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.CONNECTOR, element: this.connector});
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
    this.initializeAttributes();
    this.jsonParameters = this.action.bodyParameters;
    if(this.intentSelected){
      this.initializeConnector();
    }
  }

  private initializeAttributes() {
    let new_attributes = [];
    if (!variableList.find(el => el.key ==='userDefined').elements.some(v => v.name === 'hubspot_status')) {
      new_attributes.push({ name: "hubspot_status", value: "hubspot_status" });
    }
    if (!variableList.find(el => el.key ==='userDefined').elements.some(v => v.name === 'hubspot_error')) {
      new_attributes.push({ name: "hubspot_error", value: "hubspot_error" });
    }
    variableList.find(el => el.key ==='userDefined').elements = [ ...variableList.find(el => el.key ==='userDefined').elements, ...new_attributes];
    this.logger.debug("[ACTION-HUBSPOT] Initialized variableList.userDefined: ", variableList.find(el => el.key ==='userDefined').elements);
  }




  // EVENT FUNCTIONS //
  onChangeTextarea(e, type: string){
    switch(type){
      case 'token' : {
        this.action.token = e;
        this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
        this.logger.log("[ACTION-HUBSPOT] this.action", this.action);
      }
    }
  }


  onChangeAttributes(attributes:any){
    this.logger.log('[ACTION-HUBSPOT]onChangeAttributes ',attributes);
    this.action.bodyParameters = attributes;
    this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
  }

  onSelectedAttribute(event, property) {
    this.logger.log("[ACTION-HUBSPOT] onEditableDivTextChange event", event)
    this.logger.log("[ACTION-HUBSPOT] onEditableDivTextChange property", property)
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

  goToIntegration(){
    let url = this.appConfigService.getConfig().dashboardBaseUrl + '#/project/' + this.project_id +'/integrations?name=' + this.action._tdActionType
    window.open(url, '_blank')
  }
}