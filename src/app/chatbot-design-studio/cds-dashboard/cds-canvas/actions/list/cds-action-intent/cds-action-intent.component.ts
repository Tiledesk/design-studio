import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { Intent } from 'src/app/models/intent-model';
import { ActionIntentConnected  } from 'src/app/models/action-model';
import { IntentService } from '../../../../../services/intent.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { Subscription } from 'rxjs/internal/Subscription';

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
  @Output() updateAndSaveAction = new EventEmitter();
  @Output() onConnectorChange = new EventEmitter<{type: 'create' | 'delete',  fromId: string, toId: string}>()
  
  intents: Array<{name: string, value: string, icon?:string}>
  idIntentSelected: string;
  idConnector: string;
  isConnected: boolean = false;
  connector: any;
  private subscriptionChangedConnector: Subscription;

  private logger: LoggerService = LoggerInstance.getInstance();
  constructor(
    private intentService: IntentService
  ) {
    
  }


  ngOnInit(): void {
    this.logger.log("[CDS-ACTION-INTENT] elementSelected: ", this.action, this.intentSelected)
    this.subscriptionChangedConnector = this.intentService.isChangedConnector$.subscribe((connector: any) => {
      // this.logger.log('[CDS-ACTION-INTENT] - subcribe to isChangedConnector$ >>', connector);
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

  ngOnChanges(changes: SimpleChanges): void {
    console.log('[CDS-ACTION-INTENT] >> ngOnChanges', changes);
    // this.checkConnectionStatus();
  }

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
    this.logger.log('[CDS-ACTION-INTENT] - initialize - idIntentSelected ', this.idIntentSelected);
    this.logger.log('[CDS-ACTION-INTENT] - initialize - idConnector ', this.idConnector);
    // console.log('[CDS-ACTION-INTENT] - initialize - intents ', this.intents);
  }

  private updateConnector(){
    this.logger.log('[CDS-ACTION-INTENT] 1- updateConnector :: ',this.action.intentName);
    this.isConnected = this.action.intentName?true:false;
    try {
      const array = this.connector.fromId.split("/");
      const idAction= array[1];
      this.logger.log('[CDS-ACTION-INTENT] 2 - updateConnector :: ', idAction, this.action._tdActionId, this.connector);
      if(idAction === this.action._tdActionId){
        if(this.connector.deleted){
          this.logger.log('[CDS-ACTION-INTENT] 3 - PALLINO VUOTO :: ');
          // DELETE 
          this.action.intentName = null;
          this.isConnected = false;
        } else {
          // ADD / EDIT
          this.logger.log('[CDS-ACTION-INTENT] 4 - PALLINO PIENO :: ');
          this.isConnected = true;
          //if(this.action.intentName !== "#"+this.connector.toId){ 
          this.action.intentName = "#"+this.connector.toId;
          //} 
        }
        if(this.connector.save)this.updateAndSaveAction.emit(this.connector);
      }
    } catch (error) {
      this.logger.log('error: ', error);
    }
  }


  onChangeSelect(event: {name: string, value: string}){
    this.logger.log('CDS-ACTION-INTENT onChangeSelect-->', event)
    this.action.intentName = event.value;
    if(!this.action._tdActionTitle){
      this.action._tdActionTitle = this.intents.find(intent => intent.value === event.value).name;
    }
    this.onConnectorChange.emit({ type: 'create', fromId: this.idConnector, toId: this.action.intentName });
    this.updateAndSaveAction.emit(this.intentSelected);
  }

  onResetSelect(event:{name: string, value: string}) {
    this.onConnectorChange.emit({ type: 'delete', fromId: this.idConnector, toId: this.action.intentName });
    this.action.intentName = null;
    this.updateAndSaveAction.emit(this.intentSelected);
  }
  
}
