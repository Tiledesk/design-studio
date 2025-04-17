import { Intent } from 'src/app/models/intent-model';
import { ActionGPTAssistant } from './../../../../../../models/action-model';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { IntentService } from 'src/app/chatbot-design-studio/services/intent.service';
import { variableList } from 'src/app/chatbot-design-studio/utils-variables';
import { TYPE_UPDATE_ACTION } from 'src/app/chatbot-design-studio/utils';
import { checkConnectionStatusOfAction, updateConnector } from 'src/app/chatbot-design-studio/utils-connectors';

@Component({
  selector: 'cds-action-gpt-assistant',
  templateUrl: './cds-action-gpt-assistant.component.html',
  styleUrls: ['./cds-action-gpt-assistant.component.scss']
})
export class CdsActionGptAssistantComponent implements OnInit {

  @Input() intentSelected: Intent;
  @Input() action: ActionGPTAssistant;
  @Input() project_id: string; 
  @Input() previewMode: boolean = true;
  @Output() updateAndSaveAction = new EventEmitter;
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
  
  private logger: LoggerService = LoggerInstance.getInstance();
  constructor(
    private intentService: IntentService,
  ) { }

  ngOnInit(): void {
    this.logger.debug("[ACTION GPT-ASSISTANT] ngOnInit action: ", this.action);
    this.subscriptionChangedConnector = this.intentService.isChangedConnector$.subscribe((connector: any) => {
      this.logger.debug('[ACTION GPT-ASSISTANT] isChangedConnector -->', connector);
      let connectorId = this.idIntentSelected+"/"+this.action._tdActionId;
      if(connector.fromId.startsWith(connectorId)){
        this.connector = connector;
        this.updateConnector();
      }
    });
    if(this.intentSelected){
      this.initializeConnector();
    }
    this.initializeAttributes();
  }

  ngOnDestroy() {
    if (this.subscriptionChangedConnector) {
      this.subscriptionChangedConnector.unsubscribe();
    }
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
    this.logger.log('[ACTION-GPT-ASSISTANT] updateConnector:');
    const resp = updateConnector(this.connector, this.action, this.isConnectedTrue, this.isConnectedFalse, this.idConnectionTrue, this.idConnectionFalse);
    if(resp){
      this.isConnectedTrue    = resp.isConnectedTrue;
      this.isConnectedFalse   = resp.isConnectedFalse;
      this.idConnectionTrue   = resp.idConnectionTrue;
      this.idConnectionFalse  = resp.idConnectionFalse;
      this.logger.log('[ACTION-GPT-ASSISTANT] updateConnector:', resp);
      if (resp.emit) {
        this.updateAndSaveAction.emit({ type: TYPE_UPDATE_ACTION.CONNECTOR, element: this.connector });
      } 
    }
  }


  private initializeAttributes() {
    let new_attributes = [];
    if (!variableList.find(el => el.key ==='userDefined').elements.some(v => v.name === 'firstThread')) {
      new_attributes.push({ name: "firstThread", value: "firstThread" });
    }
    if (!variableList.find(el => el.key ==='userDefined').elements.some(v => v.name === 'assistantReply')) {
      new_attributes.push({ name: "assistantReply", value: "assistantReply" });
    }
    if (!variableList.find(el => el.key ==='userDefined').elements.some(v => v.name === 'assistantError')) {
      new_attributes.push({ name: "assistantError", value: "assistantError" });
    }
    variableList.find(el => el.key ==='userDefined').elements = [...variableList.find(el => el.key ==='userDefined').elements, ...new_attributes];
    this.logger.debug("[ACTION GPT-ASSISTANT] Initialized variableList.userDefined: ", variableList.find(el => el.key ==='userDefined'));
  }

  onChangeTextarea($event: string, property: string) {
    this.logger.debug("[ACTION GPT-ASSISTANT] changeTextarea event: ", $event);
    this.logger.debug("[ACTION GPT-ASSISTANT] changeTextarea propery: ", property);
    this.action[property] = $event;
    // this.checkVariables();
    // this.updateAndSaveAction.emit();
  }

  onSelectedAttribute(event, property) {
    this.logger.log("[ACTION GPT-ASSISTANT] onEditableDivTextChange event", event)
    this.logger.log("[ACTION GPT-ASSISTANT] onEditableDivTextChange property", property)
    this.action[property] = event.value;
    this.logger.log("[ACTION GPT-ASSISTANT] Action updated: ", this.action);
    this.updateAndSaveAction.emit();
  }

  onBlur(event){
    this.updateAndSaveAction.emit();
  }

  onChangeSelect(event, target) {
    this.logger.debug("[ACTION GPT-ASSISTANT] onChangeSelect event: ", event.value)
    this.logger.debug("[ACTION GPT-ASSISTANT] onChangeSelect target: ", target)
    this.action[target] = event.value;
    this.updateAndSaveAction.emit();
  }

  onChangeBlockSelect(event:{name: string, value: string}, type: 'trueIntent' | 'falseIntent') {
    if(event){
      this.action[type]=event.value
      switch(type){
        case 'trueIntent':
          this.onConnectorChange.emit({ type: 'create', fromId: this.idConnectorTrue, toId: this.action.trueIntent});
          break;
        case 'falseIntent':
          this.onConnectorChange.emit({ type: 'create', fromId: this.idConnectorFalse, toId: this.action.falseIntent});
          break;
      }
      this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
    }
  }

  onResetBlockSelect(event:{name: string, value: string}, type: 'trueIntent' | 'falseIntent') {
    switch(type){
      case 'trueIntent':
        this.onConnectorChange.emit({ type: 'delete', fromId: this.idConnectorTrue, toId: this.action.trueIntent});
        break;
      case 'falseIntent':
        this.onConnectorChange.emit({ type: 'delete', fromId: this.idConnectorFalse, toId: this.action.falseIntent});
        break;
    }
    this.action[type]=null
    this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
  }

}
