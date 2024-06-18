import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { IntentService } from 'src/app/chatbot-design-studio/services/intent.service';
import { ACTIONS_LIST, TYPE_UPDATE_ACTION } from 'src/app/chatbot-design-studio/utils';
import { ActionUpdateLead } from 'src/app/models/action-model';
import { Intent } from 'src/app/models/intent-model';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Component({
  selector: 'cds-action-lead-update',
  templateUrl: './cds-action-lead-update.component.html',
  styleUrls: ['./cds-action-lead-update.component.scss']
})
export class CdsActionLeadUpdateComponent implements OnInit, OnDestroy {

  @Input() previewMode: boolean = true;
  @Input() action: ActionUpdateLead;
  @Output() updateAndSaveAction = new EventEmitter();
  @Input() intentSelected: Intent;
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
 
 jsonParameters: { [ key: string]: string}; 
 

  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private intentService: IntentService
  ) { }

  ngOnInit(): void {
    console.log("[CDS-ACTION-LEAD-UPDATE] action detail: ", this.action,);
    this.subscriptionChangedConnector = this.intentService.isChangedConnector$.subscribe((connector: any) => {
      console.log('[CDS-ACTION-LEAD-UPDATE] isChangedConnector -->', connector);
      let connectorId = this.idIntentSelected+"/"+this.action._tdActionId;
      if(connector.fromId.startsWith(connectorId)){
        this.connector = connector;
        this.updateConnector();
      }
    });
    this.initialize();
  }

  ngOnDestroy() {
    if (this.subscriptionChangedConnector) {
      this.subscriptionChangedConnector.unsubscribe();
    }
  }

  private initialize(){
    // this.initializeAttributes();
    // this.jsonParameters = this.action.bodyParameters;
    console.log('[CDS-ACTION-LEAD-UPDATE] intentSelected ' , this.intentSelected)
    if(this.intentSelected){
      this.initializeConnector();
    }
  }

  initializeConnector() {
    this.idIntentSelected = this.intentSelected.intent_id;
    this.idConnectorTrue = this.idIntentSelected+'/'+this.action._tdActionId + '/true';
    this.idConnectorFalse = this.idIntentSelected+'/'+this.action._tdActionId + '/false';
    this.listOfIntents = this.intentService.getListOfIntents();
    console.log('[CDS-ACTION-LEAD-UPDATE] initializeConnector ' , this.listOfIntents)
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
          console.log('[CDS-ACTION-LEAD-UPDATE] updateConnector', this.connector.toId, this.connector.fromId ,this.action, array[array.length-1]);
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
      console.error('[CDS-ACTION-LEAD-UPDATE] updateConnector error: ', error);
    }
  }

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


  onSelectedAttribute(event, property) {
    this.logger.log("[ACTION-CAPTURE-USER-REPLY] onEditableDivTextChange event", event)
    this.logger.log("[ACTION-CAPTURE-USER-REPLY] onEditableDivTextChange property", property)
    this.action[property] = event.value;
    this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
  }

  onChangeTextarea($event: string, property: string) {
    if($event){
      console.log("[CDS-ACTION-LEAD-UPDATE] onEditableDivTextChange event", $event)
      console.log("[CDS-ACTION-LEAD-UPDATE] onEditableDivTextChange property", property)
      this.action[property] = $event
      this.updateAndSaveAction.emit();
    }
  }

  onBlur(event){
    console.log("event onBlur: ", event)
    this.updateAndSaveAction.emit();
  }

}
