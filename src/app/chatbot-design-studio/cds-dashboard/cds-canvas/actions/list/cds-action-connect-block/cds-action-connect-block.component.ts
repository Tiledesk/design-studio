import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { IntentService } from 'src/app/chatbot-design-studio/services/intent.service';
import { TYPE_UPDATE_ACTION } from 'src/app/chatbot-design-studio/utils';
import { ACTIONS_LIST } from 'src/app/chatbot-design-studio/utils-actions';
import { ActionConnectBlock } from 'src/app/models/action-model';
import { Intent } from 'src/app/models/intent-model';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Component({
  selector: 'cds-action-connect-block',
  templateUrl: './cds-action-connect-block.component.html',
  styleUrls: ['./cds-action-connect-block.component.scss']
})
export class CdsActionConnectBlockComponent implements OnInit {

  @Input() intentSelected: Intent;
  @Input() action: ActionConnectBlock;
  @Input() previewMode: boolean = true;
  
  @Output() updateIntentFromConnectorModification = new EventEmitter();
  @Output() updateAndSaveAction = new EventEmitter();
  @Output() onConnectorChange = new EventEmitter<any>(); //{type: 'create' | 'delete',  fromId: string, toId: string}
  
  intents: Array<{name: string, value: string, icon?:string}>
  idIntentSelected: string;
  idConnector: string;
  idConnection: string;
  isConnected: boolean = false;
  connector: any;
  element: any;
  private subscriptionChangedConnector: Subscription;
  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private intentService: IntentService
  ) { }

  ngOnInit(): void {
    this.subscriptionChangedConnector = this.intentService.isChangedConnector$.subscribe((connector: any) => {
      this.logger.log('[CDS-ACTION-CONNECT-BLOCK] - subcribe to isChangedConnector$ >>', connector);
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
    this.logger.log('[CDS-ACTION-INTENT] **************************11111');
    if(this.action.intentName){
     this.isConnected = true;
     const posId = this.action.intentName.indexOf("#");
      if (posId !== -1) {
        const toId = this.action.intentName.slice(posId+1);
        this.idConnection = this.idConnector+"/"+toId;
      }
    } else {
     this.isConnected = false;
     this.idConnection = null;
    }
  }

  private initialize() {
    this.logger.log('[CDS-ACTION-INTENT] - initialize - isConnected ', this.action.intentName);
    this.idIntentSelected = this.intentSelected.intent_id;
    this.idConnector = this.idIntentSelected+'/'+this.action._tdActionId;
    this.intents = this.intentService.getListOfIntents();
    this.element = Object.values(ACTIONS_LIST).find(el => el.type === this.action._tdActionType);
    this.checkConnectionStatus();
    this.logger.log('[CDS-ACTION-INTENT] - initialize - idIntentSelected ', this.idIntentSelected);
    this.logger.log('[CDS-ACTION-INTENT] - initialize - idConnector ', this.idConnector);
    this.logger.log('[CDS-ACTION-INTENT] - initialize - intents ', this.intents);
  }

  private updateConnector(){
    this.logger.log('[CDS-ACTION-INTENT] **************************2222', this.action.intentName);
    this.isConnected = this.action.intentName?true:false;
    const array = this.connector.fromId.split("/");
    const idIntent= array[0];
    const idAction= array[1];
    if(this.idIntentSelected !== idIntent){
      return;
    }
    try {
      if(!this.action.intentName)this.isConnected = false;
      else this.isConnected = true;
      if(idAction === this.action._tdActionId ){
        this.logger.log('[CDS-ACTION-INTENT] - updateConnector :: ', idAction, this.action._tdActionId, this.connector);
        if(this.connector.deleted){
          this.action.intentName = null;
          this.isConnected = false;
          this.idConnection = null;
        } else {
          this.isConnected = true;
          this.idConnection = this.connector.fromId+"/"+this.connector.toId;
          this.action.intentName = "#"+this.connector.toId;
        }
        if(this.connector.save)
          this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.CONNECTOR, element: this.connector});
      }
    } catch (error) {
      this.logger.log('error: ', error);
    }
  }

  onChangeSelect(event: {name: string, value: string}){
    if(event){
      this.action.intentName = event.value;
      if(!this.action._tdActionTitle){
        this.action._tdActionTitle = this.intents.find(intent => intent.value === event.value).name;
      }
      let connector = { type: 'create', fromId: this.idConnector, toId: this.action.intentName };
      this.onConnectorChange.emit(connector);
      this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: JSON.parse(JSON.stringify(this.action))});
    }
  }

  onResetSelect(event:{name: string, value: string}) {
    let connector = { type: 'delete', fromId: this.idConnector, toId: this.action.intentName };
    this.action.intentName = null;
    this.onConnectorChange.emit(connector);
    this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: JSON.parse(JSON.stringify(this.action))});
  }

}
