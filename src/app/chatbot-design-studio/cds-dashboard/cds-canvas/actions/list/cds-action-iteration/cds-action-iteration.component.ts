import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { IntentService } from '../../../../../services/intent.service';
import { Intent } from 'src/app/models/intent-model';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { ActionIteration } from 'src/app/models/action-model';
import { TYPE_UPDATE_ACTION } from '../../../../../utils';

@Component({
  selector: 'cds-action-iteration',
  templateUrl: './cds-action-iteration.component.html',
  styleUrls: ['./cds-action-iteration.component.scss']
})
export class CdsActionIterationComponent implements OnInit {

  @Input() intentSelected: Intent;
  @Input() action: ActionIteration;
  @Input() previewMode: boolean = true;
  @Input() project_id: string;
  /** V3: mostra la riga dell'uscita di fine lista (il pallino del blocco). */
  @Input() isV3: boolean = false;
  @Output() updateAndSaveAction = new EventEmitter();
  @Output() onConnectorChange = new EventEmitter<{type: 'create' | 'delete',  fromId: string, toId: string}>()

  /** CONNECTOR */
  idIntentSelected: string;
  idConnectorGoTo: string;
  idConnectorFallback: string;
  idConnectionGoTo: string;
  idConnectionFallback: string;
  isConnectedGoTo: boolean = false;
  isConnectedFallback: boolean = false;

  listOfIntents: Array<{name: string, value: string, icon?:string}>;

  private logger: LoggerService = LoggerInstance.getInstance();
  
  constructor(
    private intentService: IntentService
  ) { }

  ngOnInit(): void {
    this.initialize()
  }

  /** */
  ngOnDestroy() {
  }

  private initialize() {
    if(this.intentSelected){
      this.initializeConnector();
    }
    this.logger.log('[ACTION-ITERATION] initialize action -->', this.action)
  }

  private initializeConnector() {
    this.idIntentSelected = this.intentSelected.intent_id;
    this.idConnectorGoTo = this.idIntentSelected+'/'+this.action._tdActionId + '/goto';
    this.idConnectorFallback = this.idIntentSelected+'/'+this.action._tdActionId + '/fallback';
    this.listOfIntents = this.intentService.getListOfIntents()
  }



  onSelectedAttribute(event, property) {
    this.logger.log("[ACTION-ITERATION] onSelectedAttribute event", event)
    this.logger.log("[ACTION-ITERATION] onSelectedAttribute property", property)
    this.action[property] = event.value;
    this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
  }

  onChangeSelect(event:{name: string, value: string}, type: 'goToIntent' | 'fallbackIntent'){
    if(event){
      this.action[type]=event.value
      switch(type){
        case 'goToIntent':
          this.logger.log('[ACTION-ITERATION] onChangeSelect goToIntent - fromId:', this.idConnectorGoTo, 'toId:', this.action.goToIntent);
          this.onConnectorChange.emit({ type: 'create', fromId: this.idConnectorGoTo, toId: this.action.goToIntent})
          break;
        case 'fallbackIntent':
          this.logger.log('[ACTION-ITERATION] onChangeSelect fallbackIntent - fromId:', this.idConnectorFallback, 'toId:', this.action.fallbackIntent);
          this.onConnectorChange.emit({ type: 'create', fromId: this.idConnectorFallback, toId: this.action.fallbackIntent})
          break;
      }
      this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
    }
  }

  onResetBlockSelect(event:{name: string, value: string}, type: 'goToIntent' | 'fallbackIntent') {
    switch(type){
      case 'goToIntent':
        this.logger.log('[ACTION-ITERATION] onResetBlockSelect goToIntent - fromId:', this.idConnectorGoTo, 'toId:', this.action.goToIntent);
        this.onConnectorChange.emit({ type: 'delete', fromId: this.idConnectorGoTo, toId: this.action.goToIntent})
        break;
      case 'fallbackIntent':
        this.logger.log('[ACTION-ITERATION] onResetBlockSelect fallbackIntent - fromId:', this.idConnectorFallback, 'toId:', this.action.fallbackIntent);
        this.onConnectorChange.emit({ type: 'delete', fromId: this.idConnectorFallback, toId: this.action.fallbackIntent})
        break;
    }
    this.action[type]=null
    this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
  }

}

