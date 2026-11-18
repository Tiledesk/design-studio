import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { Intent } from 'src/app/models/intent-model';
import { ActionIntentConnected  } from 'src/app/models/action-model';
import { IntentService } from '../../../../../services/intent.service';
import { TYPE_UPDATE_ACTION } from '../../../../../utils';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { ACTIONS_LIST } from 'src/app/chatbot-design-studio/utils-actions';
import { checkConnectionStatusByConnector, updateSingleConnector } from 'src/app/chatbot-design-studio/utils-connectors';

@Component({
  selector: 'cds-action-intent',
  templateUrl: './cds-action-intent.component.html',
  styleUrls: ['./cds-action-intent.component.scss']
})
export class CdsActionIntentComponent implements OnInit {

  @Input() intentSelected: Intent;
  @Input() isStart: boolean;
  @Input() action: ActionIntentConnected;
  @Input() previewMode: boolean = true;
  @Input() isLast: boolean = false;
  
  @Output() updateIntentFromConnectorModification = new EventEmitter();
  @Output() updateAndSaveAction = new EventEmitter();
  @Output() onConnectorChange = new EventEmitter<any>(); //{type: 'create' | 'delete',  fromId: string, toId: string}
  
  intents: Array<{name: string, value: string, icon?:string}>
  idIntentSelected: string;
  idConnector: string;
  idConnection: string;
  isConnected: boolean = false;
  element: any;
  private logger: LoggerService = LoggerInstance.getInstance();

  
  constructor(
    private intentService: IntentService
  ) {}

  ngOnInit(): void {
    this.initialize();
  }


  /** */
  ngOnDestroy() {
  }

 

  /** */
  // private updateSingleConnector(){
  //   if(!this.action.intentName)this.isConnected = false;
  //   else this.isConnected = true;
  //   this.isConnected = this.action.intentName?true:false;
    
  //   this.logger.log('[ACTION-INTENT] updateSingleConnector:');
  //   const resp = updateSingleConnector(this.connector, this.action, this.isConnected, this.idConnection);
  //   if(resp){
  //     this.isConnected  = resp.isConnected;
  //     this.idConnection = resp.idConnection;
  //     this.action       = resp.action;
  //     this.logger.log('[ACTION-INTENT] updateSingleConnector:', resp);
  //     if (resp.emit) {
  //       this.updateAndSaveAction.emit({ type: TYPE_UPDATE_ACTION.CONNECTOR, element: this.connector });
  //     } 
  //   }
  // }

  private initialize() {
    // //this.logger.log('[CDS-ACTION-INTENT] - initialize - isConnected ', this.action.intentName);
    // if(!this.action){
    //   this.logger.log('[CDS-ACTION-INTENT] - ERROR ACTION ', this.intentSelected);
    // }
    this.idIntentSelected = this.intentSelected.intent_id;
    this.idConnector = this.idIntentSelected+'/'+this.action._tdActionId;
    this.intents = this.intentService.getListOfIntents();
    this.intents.sort((a, b) => a.name.localeCompare(b.name));
    this.element = Object.values(ACTIONS_LIST).find(el => el.type === this.action._tdActionType);
    // this.logger.log('[CDS-ACTION-INTENT] - initialize - element ', this.element);
    this.logger.log('[CDS-ACTION-INTENT] - initialize - idIntentSelected ', this.idIntentSelected);
    this.logger.log('[CDS-ACTION-INTENT] - initialize - idConnector ', this.idConnector);
    this.logger.log('[CDS-ACTION-INTENT] - initialize - intents ', this.intents);
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
