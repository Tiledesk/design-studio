
import { Component, OnInit, ViewChild, Input, Output, EventEmitter } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';

import { Message, Wait, Button, MessageAttributes, Expression, Setting } from 'src/app/models/action-model';
import { TYPE_BUTTON, TYPE_UPDATE_ACTION, replaceItemInArrayForKey } from '../../../../../../../utils';
import { IntentService } from '../../../../../../../services/intent.service';
import { ConnectorService } from '../../../../../../../services/connector.service';
import { Subscription } from 'rxjs/internal/Subscription';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Component({
  selector: 'cds-action-reply-settings',
  templateUrl: './cds-action-reply-settings.component.html',
  styleUrls: ['./cds-action-reply-settings.component.scss']
})
export class CdsActionReplySettingsComponent implements OnInit {
  @ViewChild('autosize') autosize: CdkTextareaAutosize;
  
  @Output() updateAndSaveAction = new EventEmitter();
  @Output() changeActionReply = new EventEmitter();

  @Input() idAction: string;
  @Input() response: Setting;
  @Input() wait: Wait;
  @Input() index: number;
  @Input() previewMode: boolean = true;
  
  listOfIntents: Array<{name: string, value: string, icon?:string}>;

  // Connectors //
  idIntentSelected: string;
  idConnectorNoMatch: string;
  idConnectorNoInput: string;
  idConnectionNoMatch: string;
  idConnectionNoInput: string;
  isConnectedNoMatch: boolean = false;
  isConnectedNoInput: boolean = false;
  connector: any;
  private subscriptionChangedConnector: Subscription;

  // Delay //
  delayTime: number;


  private logger: LoggerService = LoggerInstance.getInstance();
  constructor(
    private connectorService: ConnectorService,
    private intentService: IntentService
  ) { }

  // SYSTEM FUNCTIONS //
  ngOnInit(): void {
    this.logger.debug("[ACTION REPLY SETTINGS] action detail: ", this.response);
    this.subscriptionChangedConnector = this.intentService.isChangedConnector$.subscribe((connector: any) => {
      this.logger.debug('[ACTION REPLY SETTINGS] isChangedConnector -->', connector);
      let connectorId = this.idAction;
      if(connector.fromId.startsWith(connectorId)){
        this.connector = connector;
        this.updateConnector();
      }
    });
    this.initializeConnector();

    this.initialize();
  }

  /** */
  ngOnDestroy() {
    if (this.subscriptionChangedConnector) {
      this.subscriptionChangedConnector.unsubscribe();
    }
  }
  
  // ngOnChanges(changes: SimpleChanges): void {
  //   this.logger.log('CdsActionReplyTextComponent ngOnChanges:: ', this.response);
  // }

  initializeConnector() {
    this.idIntentSelected = this.idAction.split('/')[0];
    this.idConnectorNoInput = this.idAction + '/no_input';
    this.idConnectorNoMatch = this.idAction + '/no_match';
    this.listOfIntents = this.intentService.getListOfIntents();
    this.checkConnectionStatus();
  }

  private updateConnector(){
    try {
      const array = this.connector.fromId.split("/");
      const idButton = array[0] + '/' + array[array.length - 2];
      if(idButton === this.idAction){
        if(this.connector.deleted){
          if(array[array.length -1] === 'no_input'){
            this.response.no_match = null;
            this.isConnectedNoInput = false;
            this.idConnectionNoInput = null;
          }        
          if(array[array.length -1] === 'no_match'){
            this.response.no_match = null;
            this.isConnectedNoMatch = false;
            this.idConnectionNoMatch = null;
          }
          if(this.connector.save)this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.CONNECTOR, element: this.connector});
        } else { 
          // TODO: verificare quale dei due connettori è stato aggiunto (controllare il valore della action corrispondente al true/false intent)
          this.logger.debug('[ACTION REPLY SETTINGS] updateConnector', this.connector.toId, this.connector.fromId ,this.response, array[array.length-1]);
          if(array[array.length -1] === 'no_input'){
            // this.action.trueIntent = '#'+this.connector.toId;
            this.isConnectedNoInput = true;
            this.idConnectionNoInput = this.connector.fromId+"/"+this.connector.toId;
            this.response.no_input = '#'+this.connector.toId;
            if(this.connector.save)this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.CONNECTOR, element: this.connector});
          }        
          if(array[array.length -1] === 'no_match'){
            // this.action.falseIntent = '#'+this.connector.toId;
            this.isConnectedNoMatch = true;
            this.idConnectionNoMatch = this.connector.fromId+"/"+this.connector.toId;
            this.response.no_match = '#'+this.connector.toId;
            if(this.connector.save)this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.CONNECTOR, element: this.connector});
          }
        }
      }
    } catch (error) {
      this.logger.error('[ACTION REPLY SETTINGS] updateConnector error: ', error);
    }
  }

  private checkConnectionStatus(){
    if(this.response.no_input){
      this.isConnectedNoInput = true;
      const posId = this.response.no_input.indexOf("#");
      if (posId !== -1) {
        const toId = this.response.no_input.slice(posId+1);
        this.idConnectionNoInput = this.idConnectorNoInput+"/"+toId;
      }
    } else {
      this.isConnectedNoInput = false;
      this.idConnectionNoInput = null;
    }
    if(this.response.no_match){
      this.isConnectedNoMatch = true;
      const posId = this.response.no_match.indexOf("#");
      if (posId !== -1) {
        const toId = this.response.no_match.slice(posId+1);
        this.idConnectionNoMatch = this.idConnectorNoMatch+"/"+toId;
      }
     } else {
      this.isConnectedNoMatch = false;
      this.idConnectionNoMatch = null;
     }
  }

  // PRIVATE FUNCTIONS //

  private initialize(){
    this.delayTime = (this.wait && this.wait.time)? (this.wait.time/1000) : 500;
  }


  // EVENT FUNCTIONS //

  /** onChangeTextarea */
  onChangeTextarea(text:string, key: string) {
    if(!this.previewMode){
      this.response[key] = text;
      // this.changeActionReply.emit();
    }
  }

  onBlur(event){
    this.logger.log('[ACTION REPLY SETTINGS] onBlur', event.target.value, this.response);
    // if(event.target.value !== this.response.text){
      this.changeActionReply.emit();
    // }
  }

  onChangeToggle(event){
    this.response.bargein = event
    this.changeActionReply.emit();
  }

  onSelectedAttribute(variableSelected: {name: string, value: string}){
  }

  checkForVariablesInsideText(text: string){
    text.match(new RegExp(/(?<=\{\{)(.*)(?=\}\})/g, 'g')).forEach(match => {
      let createTag = '<span class="tag">' + match + '</span>'
      text = text.replace('{' + match + '}',createTag)
    });
    return text
  }
}
