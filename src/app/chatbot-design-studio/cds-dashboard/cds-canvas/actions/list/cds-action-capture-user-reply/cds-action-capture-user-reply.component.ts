import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { IntentService } from '../../../../../services/intent.service';
import { Intent } from 'src/app/models/intent-model';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { ActionCaptureUserReply } from 'src/app/models/action-model';
import { Subscription } from 'rxjs/internal/Subscription';
import { TYPE_UPDATE_ACTION } from '../../../../../utils';

@Component({
  selector: 'cds-action-capture-user-reply',
  templateUrl: './cds-action-capture-user-reply.component.html',
  styleUrls: ['./cds-action-capture-user-reply.component.scss']
})
export class CdsActionCaptureUserReplyComponent implements OnInit {

  @Input() intentSelected: Intent;
  @Input() action: ActionCaptureUserReply;
  @Input() previewMode: boolean = true;
  @Input() project_id: string;
  @Output() updateAndSaveAction = new EventEmitter;
  @Output() onConnectorChange = new EventEmitter<{type: 'create' | 'delete',  fromId: string, toId: string}>()

  listOfIntents: Array<{name: string, value: string, icon?:string}>;

  // Connectors
  idIntentSelected: string;
  idConnector: string;
  idConnection: string;
  isConnected: boolean = false;
  connector: any;
  private subscriptionChangedConnector: Subscription;

  private logger: LoggerService = LoggerInstance.getInstance();
  constructor(
    private intentService: IntentService
  ) { }

  ngOnInit(): void {
    this.logger.debug("[ACTION-CAPTURE-USER-REPLY] action detail: ", this.action);

    this.subscriptionChangedConnector = this.intentService.isChangedConnector$.subscribe((connector: any) => {
      this.logger.debug('[ACTION-CAPTURE-USER-REPLY] isChangedConnector -->', connector);
      let connectorId = this.idIntentSelected+"/"+this.action._tdActionId;
      if(connector.fromId.startsWith(connectorId)){
        this.connector = connector;
        this.updateConnector();
      }
    });
    this.initializeConnector();
  }

  /** */
  ngOnDestroy() {
    if (this.subscriptionChangedConnector) {
      this.subscriptionChangedConnector.unsubscribe();
    }
  }

  initializeConnector() {
    this.logger.debug("Intent Selected: ", this.intentSelected);
    this.idIntentSelected = this.intentSelected.intent_id;
    this.idConnector = this.idIntentSelected+'/'+this.action._tdActionId;
    this.listOfIntents = this.intentService.getListOfIntents();
    this.checkConnectionStatus();
  }

  private checkConnectionStatus(){
    if(this.action.goToIntent){
     this.isConnected = true;
     const posId = this.action.goToIntent.indexOf("#");
      if (posId !== -1) {
        const toId = this.action.goToIntent.slice(posId+1);
        this.idConnection = this.idConnector+"/"+toId;
      }
    } else {
     this.isConnected = false;
     this.idConnection = null;
    }
  }

  private updateConnector(){
    try {
      const array = this.connector.fromId.split("/");
      const idAction= array[1];
      if(idAction === this.action._tdActionId){
        if(this.connector.deleted){ 
          // DELETE 
          this.action.goToIntent = null;
          this.isConnected = false;
          this.idConnection = null;
        } else { 
          // ADD / EDIT
          this.isConnected = true;
          this.idConnection = this.connector.fromId+"/"+this.connector.toId;
          this.action.goToIntent = "#"+this.connector.toId;
        };
        if(this.connector.save)this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.CONNECTOR, element: this.connector});
      }
    } catch (error) {
      this.logger.error('[ACTION-CAPTURE-USER-REPLY] updateConnector error: ', error);
    }
  }

  onSelectedAttribute(event, property) {
    this.logger.log("[ACTION-CAPTURE-USER-REPLY] onEditableDivTextChange event", event)
    this.logger.log("[ACTION-CAPTURE-USER-REPLY] onEditableDivTextChange property", property)
    this.action[property] = event.value;
    this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
  }

  onChangeBlockSelect(event:{name: string, value: string}, type: string) {
    if(event){
      this.action[type] = event.value;
      this.onConnectorChange.emit({ type: 'create', fromId: this.idConnector, toId: this.action.goToIntent });
      this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
    }
  }

  onResetBlockSelect(event:{name: string, value: string}, type: string) {
    this.onConnectorChange.emit({ type: 'delete', fromId: this.idConnector, toId: this.action.goToIntent });
    this.action[type] = null;
    this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
  }




}
