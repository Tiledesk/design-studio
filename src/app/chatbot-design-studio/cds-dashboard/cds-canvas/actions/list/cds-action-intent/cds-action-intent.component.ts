import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { Intent } from 'src/app/models/intent-model';
import { ActionIntentConnected  } from 'src/app/models/action-model';
import { IntentService } from '../../../../../services/intent.service';
import { Subscription } from 'rxjs/internal/Subscription';
import { TYPE_UPDATE_ACTION, ACTIONS_LIST, TYPE_ACTION } from '../../../../../utils';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

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
  isConnected: boolean = false;
  connector: any;
  element: any;
  private subscriptionChangedConnector: Subscription;
  private logger: LoggerService = LoggerInstance.getInstance();

  
  constructor(
    private intentService: IntentService
  ) {
    
  }

  ngOnInit(): void {
    console.log("[CDS-ACTION-INTENT] elementSelected: ", this.action, this.intentSelected)
    this.subscriptionChangedConnector = this.intentService.isChangedConnector$.subscribe((connector: any) => {
      // console.log('[CDS-ACTION-INTENT] - subcribe to isChangedConnector$ >>', connector);
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

  // ngOnChanges(changes: SimpleChanges): void {
  //   console.log('[CDS-ACTION-INTENT] >> ngOnChanges', changes);
  //   // this.checkConnectionStatus();
  // }

  private checkConnectionStatus(){
    if(this.action.intentName){
     this.isConnected = true;
    } else {
     this.isConnected = false;
    }
  }

  private initialize() {
    this.checkConnectionStatus();
    this.idIntentSelected = this.intentSelected.intent_id;
    this.idConnector = this.idIntentSelected+'/'+this.action._tdActionId;
    this.intents = this.intentService.getListOfIntents();
    this.element = Object.values(ACTIONS_LIST).find(el => el.type === this.action._tdActionType);
    this.logger.log('[CDS-ACTION-INTENT] - initialize - idIntentSelected ', this.idIntentSelected);
    this.logger.log('[CDS-ACTION-INTENT] - initialize - idConnector ', this.idConnector);
    this.logger.log('[CDS-ACTION-INTENT] - initialize - intents ', this.intents);
  }


  private updateConnector(){
    this.isConnected = this.action.intentName?true:false;
    try {
      if(!this.action.intentName)this.isConnected = false;
      else this.isConnected = true;
      const array = this.connector.fromId.split("/");
      const idAction= array[1];
      // console.log('[CDS-ACTION-INTENT] 2 - updateConnector :: ', idAction, this.action._tdActionId, this.connector);
      if(idAction === this.action._tdActionId){
        if(this.connector.deleted){
          this.action.intentName = null;
          this.isConnected = false;
        } else {
          // console.log('[CDS-ACTION-INTENT] connettore creato - PALLINO PIENO :: ', this.connector);
          this.isConnected = true;
          this.action.intentName = "#"+this.connector.toId;
        }
        if(this.connector.save)this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.CONNECTOR, element: this.connector});
      }
    } catch (error) {
      this.logger.log('error: ', error);
    }
  }


  // onChangeConnector(){
  //   if(this.action.intentName == null){
  //     // DELETE 
  //     this.logger.log('[CDS-ACTION-INTENT] deleteConnector :: ');
  //     this.isConnected = false;
  //   } else {
  //     // ADD / EDIT
  //     console.log('[CDS-ACTION-INTENT] updateConnector :: ');
  //     this.isConnected = true;
  //   }
  // }

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
    console.log('CDS-ACTION-INTENT onResetSelect-->', event);
    let connector = { type: 'delete', fromId: this.idConnector, toId: this.action.intentName };
    this.action.intentName = null;
    this.onConnectorChange.emit(connector);
    this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: JSON.parse(JSON.stringify(this.action))});
  }
  
}
