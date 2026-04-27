import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { IntentService } from '../../../../../services/intent.service';
import { Intent } from 'src/app/models/intent-model';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { ActionIteration } from 'src/app/models/action-model';
import { Subscription } from 'rxjs/internal/Subscription';
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
  connector: any;
  private subscriptionChangedConnector: Subscription;

  listOfIntents: Array<{name: string, value: string, icon?:string}>;

  private logger: LoggerService = LoggerInstance.getInstance();
  
  constructor(
    private intentService: IntentService
  ) { }

  ngOnInit(): void {
    this.subscriptionChangedConnector = this.intentService.isChangedConnector$.subscribe((connector: any) => {
      let connectorId = this.idIntentSelected+"/"+this.action._tdActionId;
      if(connector.fromId.startsWith(connectorId)){
        this.connector = connector;
        this.updateConnector();
      }
    });
    this.initialize()
  }

  /** */
  ngOnDestroy() {
    if (this.subscriptionChangedConnector) {
      this.subscriptionChangedConnector.unsubscribe();
    }
  }

  private initialize() {
    if(this.intentSelected){
      this.initializeConnector();
      this.checkConnectionStatus();
    }
    this.logger.log('[ACTION-ITERATION] initialize action -->', this.action)
  }

  private initializeConnector() {
    this.idIntentSelected = this.intentSelected.intent_id;
    this.idConnectorGoTo = this.idIntentSelected+'/'+this.action._tdActionId + '/goto';
    this.idConnectorFallback = this.idIntentSelected+'/'+this.action._tdActionId + '/fallback';
    this.listOfIntents = this.intentService.getListOfIntents()
  }

  private checkConnectionStatus(){
    // Check goToIntent connection
    if(this.action.goToIntent){
      this.isConnectedGoTo = true;
      const posId = this.action.goToIntent.indexOf("#");
      if (posId !== -1) {
        const toId = this.action.goToIntent.slice(posId+1);
        this.idConnectionGoTo = this.idConnectorGoTo+"/"+toId;
      }
    } else {
      this.isConnectedGoTo = false;
      this.idConnectionGoTo = null;
    }
    
    // Check fallbackIntent connection
    if(this.action.fallbackIntent){
      this.isConnectedFallback = true;
      const posId = this.action.fallbackIntent.indexOf("#");
      if (posId !== -1) {
        const toId = this.action.fallbackIntent.slice(posId+1);
        this.idConnectionFallback = this.idConnectorFallback+"/"+toId;
      }
    } else {
      this.isConnectedFallback = false;
      this.idConnectionFallback = null;
    }
    
    this.logger.log('[ACTION-ITERATION] checkConnectionStatus:', {
      goToIntent: this.action.goToIntent,
      fallbackIntent: this.action.fallbackIntent,
      idConnectionGoTo: this.idConnectionGoTo,
      idConnectionFallback: this.idConnectionFallback,
      isConnectedGoTo: this.isConnectedGoTo,
      isConnectedFallback: this.isConnectedFallback
    });
  }

  /** */
  private updateConnector(){
    this.logger.log('[ACTION-ITERATION] updateConnector - connector:', this.connector);
    
    if (!this.connector?.fromId) {
      this.logger.log('[ACTION-ITERATION] updateConnector - no fromId, returning');
      return;
    }
    
    const segments = this.connector.fromId.split('/');
    if (segments.length < 2) {
      this.logger.log('[ACTION-ITERATION] updateConnector - invalid segments, returning');
      return;
    }
    
    const idAction = segments[1];
    if (idAction !== this.action._tdActionId) {
      this.logger.log('[ACTION-ITERATION] updateConnector - actionId mismatch, returning');
      return;
    }
    
    // Determina se è goTo (con /goto) o fallback (con /fallback)
    const isGoToSegment = this.connector.fromId.endsWith('/goto');
    const isFallbackSegment = this.connector.fromId.endsWith('/fallback');
    
    this.logger.log('[ACTION-ITERATION] updateConnector - type check:', { 
      fromId: this.connector.fromId, 
      isGoToSegment, 
      isFallbackSegment,
      deleted: this.connector.deleted,
      save: this.connector.save
    });
    
    let shouldEmit = false;
    
    // Gestione della cancellazione del connector
    if (this.connector.deleted) {
      if (isGoToSegment) {
        this.logger.log('[ACTION-ITERATION] Deleting goToIntent connector');
        this.action.goToIntent = null;
        this.isConnectedGoTo = false;
        this.idConnectionGoTo = null;
      }
      if (isFallbackSegment) {
        this.logger.log('[ACTION-ITERATION] Deleting fallbackIntent connector');
        this.action.fallbackIntent = null;
        this.isConnectedFallback = false;
        this.idConnectionFallback = null;
      }
      if (this.connector.save) {
        shouldEmit = true;
      }
    } else {
      // Aggiornamento del connector
      if (isGoToSegment) {
        this.logger.log('[ACTION-ITERATION] Updating goToIntent connector to:', this.connector.toId);
        this.action.goToIntent = '#' + this.connector.toId;
        this.isConnectedGoTo = true;
        this.idConnectionGoTo = this.connector.id;
        if (this.connector.save) {
          shouldEmit = true;
        }
      }
      if (isFallbackSegment) {
        this.logger.log('[ACTION-ITERATION] Updating fallbackIntent connector to:', this.connector.toId);
        this.action.fallbackIntent = '#' + this.connector.toId;
        this.isConnectedFallback = true;
        this.idConnectionFallback = this.connector.id;
        if (this.connector.save) {
          shouldEmit = true;
        }
      }
    }
    
    this.logger.log('[ACTION-ITERATION] updateConnector result:', { 
      goToIntent: this.action.goToIntent,
      fallbackIntent: this.action.fallbackIntent,
      shouldEmit 
    });
    
    if (shouldEmit) {
      this.updateAndSaveAction.emit({ type: TYPE_UPDATE_ACTION.CONNECTOR, element: this.connector });
    }
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

