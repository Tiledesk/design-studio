import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
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
  element: any;
  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private intentService: IntentService
  ) { }

  ngOnInit(): void {
    this.initialize();
  }

  /** */
  ngOnDestroy() {
  }
 

  private initialize() {
    // // this.logger.log('[CDS-ACTION-INTENT] - initialize - isConnected ', this.action.intentName);
    this.idIntentSelected = this.intentSelected.intent_id;
    this.idConnector = this.idIntentSelected+'/'+this.action._tdActionId;
    this.intents = this.intentService.getListOfIntents();
    this.intents.sort((a, b) => a.name.localeCompare(b.name));
    this.element = Object.values(ACTIONS_LIST).find(el => el.type === this.action._tdActionType);
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
