import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { IntentService } from '../../../../../services/intent.service';
import { Intent } from 'src/app/models/intent-model';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { ActionCaptureUserReply } from 'src/app/models/action-model';

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
  isConnected: boolean = false;
  connector: any;

  private logger: LoggerService = LoggerInstance.getInstance();
  
  constructor(
    private intentService: IntentService
  ) { }

  ngOnInit(): void {
    this.logger.debug("[ACTION-CAPTURE-USER-REPLY] action detail: ", this.action);

    this.intentService.isChangedConnector$.subscribe((connector: any) => {
      this.logger.debug('[ACTION-CAPTURE-USER-REPLY] isChangedConnector -->', connector);
      this.connector = connector;
      this.updateConnector();
    });
    this.initializeConnector();
  }

  initializeConnector() {
    this.logger.debug("Intent Selected: ", this.intentSelected);
    this.idIntentSelected = this.intentSelected.intent_id;
    this.idConnector = this.idIntentSelected+'/'+this.action._tdActionId;
    this.listOfIntents = this.intentService.getListOfIntents()
  }

  private updateConnector(){
    try {
      const array = this.connector.fromId.split("/");
      const idAction= array[1];
      if(idAction === this.action._tdActionId){
        if(this.connector.deleted){ 
          // DELETE 
          this.action.goToIntent = null
          this.isConnected = false
          this.updateAndSaveAction.emit();
        } else { 
          // ADD / EDIT
          this.isConnected = true;
          if(this.action.goToIntent !== "#"+this.connector.toId){ 
            this.action.goToIntent = "#"+this.connector.toId;
            this.updateAndSaveAction.emit();
          } 
        };
      }
    } catch (error) {
      this.logger.error('[ACTION-CAPTURE-USER-REPLY] updateConnector error: ', error);
    }
  }

  onSelectedAttribute(event, property) {
    this.logger.log("[ACTION-CAPTURE-USER-REPLY] onEditableDivTextChange event", event)
    this.logger.log("[ACTION-CAPTURE-USER-REPLY] onEditableDivTextChange property", property)
    this.action[property] = event.value;
    this.updateAndSaveAction.emit();
  }

  onChangeBlockSelect(event:{name: string, value: string}, type: string) {
    if(event){
      this.action[type] = event.value;
    }
    this.onConnectorChange.emit({ type: 'create', fromId: this.idConnector, toId: this.action.goToIntent });
    this.updateAndSaveAction.emit();
  }

  onResetBlockSelect(event:{name: string, value: string}, type: string) {
    this.onConnectorChange.emit({ type: 'delete', fromId: this.idConnector, toId: this.action.goToIntent });
    this.action[type] = null;
    this.updateAndSaveAction.emit();
  }



}
