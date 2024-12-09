
import { Component, OnInit, ViewChild, Input, Output, EventEmitter, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';

import { Message, Wait, Button, MessageAttributes, Expression, Setting } from 'src/app/models/action-model';
import { TYPE_BUTTON, TYPE_UPDATE_ACTION, replaceItemInArrayForKey } from '../../../../../../utils';
import { IntentService } from '../../../../../../services/intent.service';
import { ConnectorService } from '../../../../../../services/connector.service';
import { Subscription } from 'rxjs/internal/Subscription';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Component({
  selector: 'cds-action-reply-voice-settings',
  templateUrl: './cds-action-reply-settings.component.html',
  styleUrls: ['./cds-action-reply-settings.component.scss']
})
export class CdsActionReplySettingsComponent implements OnInit {
  @ViewChild('autosize') autosize: CdkTextareaAutosize;
  
  @Output() updateAndSaveAction = new EventEmitter();
  @Output() changeActionReply = new EventEmitter();
  @Output() onConnectorChange = new EventEmitter<{type: 'create' | 'delete',  fromId: string, toId: string}>()

  @Input() idAction: string;
  @Input() response: Setting;
  @Input() index: number;
  @Input() previewMode: boolean = true;
  
  listOfIntents: Array<{name: string, value: string, icon?:string}>;

  radioOptions: Array<{name: string, value: string, disabled: boolean, checked: boolean}>= [ 
    {name: 'blind',              value: 'blind',         disabled: false, checked: false  }, 
    {name: 'consultation',       value: 'consultation',  disabled: false, checked: true   }
  ]
  // Connectors NoInput- NoMatch //
  idIntentSelected: string;
  idConnectorNoMatch: string;
  idConnectorNoInput: string;
  idConnectionNoMatch: string;
  idConnectionNoInput: string;
  isConnectedNoMatch: boolean = false;
  isConnectedNoInput: boolean = false;
  connector: any;
  // Connectors true/false
  idConnectorTrue: string;
  idConnectorFalse: string;
  idConnectionTrue: string;
  idConnectionFalse: string;
  isConnectedTrue: boolean = false;
  isConnectedFalse: boolean = false;

  private subscriptionChangedConnector: Subscription;

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
    this.idConnectorNoInput = this.idAction + '/noInput';
    this.idConnectorNoMatch = this.idAction + '/noMatch';
    this.idConnectorTrue =  this.idAction + '/true';
    this.idConnectorFalse =  this.idAction + '/false';
    this.listOfIntents = this.intentService.getListOfIntents();
    this.checkConnectionStatus();
  }

  private updateConnector(){
    try {
      const array = this.connector.fromId.split("/");
      const idButton = array[0] + '/' + array[array.length - 2];
      if(idButton === this.idAction){
        if(this.connector.deleted){
          if(array[array.length -1] === 'noInput'){
            this.response.noInputIntent = null;
            this.isConnectedNoInput = false;
            this.idConnectionNoInput = null;
          }        
          if(array[array.length -1] === 'noMatch'){
            this.response.noMatchIntent = null;
            this.isConnectedNoMatch = false;
            this.idConnectionNoMatch = null;
          }
          if(array[array.length -1] === 'true'){
            this.response.trueIntent = null;
            this.isConnectedTrue = false;
            this.idConnectionTrue = null;
          }
          if(array[array.length -1] === 'false'){
            this.response.falseIntent = null;
            this.isConnectedFalse = false;
            this.idConnectionFalse = null;
          }
          if(this.connector.save)this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.CONNECTOR, element: this.connector});
        } else { 
          // TODO: verificare quale dei due connettori è stato aggiunto (controllare il valore della action corrispondente al true/false intent)
          this.logger.debug('[ACTION REPLY SETTINGS] updateConnector', this.connector.toId, this.connector.fromId ,this.response, array[array.length-1]);
          if(array[array.length -1] === 'noInput'){
            // this.action.trueIntent = '#'+this.connector.toId;
            this.isConnectedNoInput = true;
            this.idConnectionNoInput = this.connector.fromId+"/"+this.connector.toId;
            this.response.noInputIntent = '#'+this.connector.toId;
            if(this.connector.save)this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.CONNECTOR, element: this.connector});
          }        
          if(array[array.length -1] === 'noMatch'){
            // this.action.falseIntent = '#'+this.connector.toId;
            this.isConnectedNoMatch = true;
            this.idConnectionNoMatch = this.connector.fromId+"/"+this.connector.toId;
            this.response.noMatchIntent = '#'+this.connector.toId;
            if(this.connector.save)this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.CONNECTOR, element: this.connector});
          }
          if(array[array.length -1] === 'true'){
            // this.action.falseIntent = '#'+this.connector.toId;
            this.isConnectedTrue = true;
            this.idConnectionTrue = this.connector.fromId+"/"+this.connector.toId;
            this.response.trueIntent = '#'+this.connector.toId;
            if(this.connector.save)this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.CONNECTOR, element: this.connector});
          }
          if(array[array.length -1] === 'false'){
            // this.action.falseIntent = '#'+this.connector.toId;
            this.isConnectedFalse = true;
            this.idConnectionFalse = this.connector.fromId+"/"+this.connector.toId;
            this.response.falseIntent = '#'+this.connector.toId;
            if(this.connector.save)this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.CONNECTOR, element: this.connector});
          }
        }
      }
    } catch (error) {
      this.logger.error('[ACTION REPLY SETTINGS] updateConnector error: ', error);
    }
  }

  private checkConnectionStatus(){
    if(this.response.noInputIntent){
      this.isConnectedNoInput = true;
      const posId = this.response.noInputIntent.indexOf("#");
      if (posId !== -1) {
        const toId = this.response.noInputIntent.slice(posId+1);
        this.idConnectionNoInput = this.idConnectorNoInput+"/"+toId;
      }
    } else {
      this.isConnectedNoInput = false;
      this.idConnectionNoInput = null;
    }
    if(this.response.noMatchIntent){
      this.isConnectedNoMatch = true;
      const posId = this.response.noMatchIntent.indexOf("#");
      if (posId !== -1) {
        const toId = this.response.noMatchIntent.slice(posId+1);
        this.idConnectionNoMatch = this.idConnectorNoMatch+"/"+toId;
      }
     } else {
      this.isConnectedNoMatch = false;
      this.idConnectionNoMatch = null;
     }
  }

  // PRIVATE FUNCTIONS //


  // EVENT FUNCTIONS //

  /** onClickDelayTime */
  onClickDelayTime(opened: boolean){
    // this.canShowFilter = !opened;
  }

  /** onChangeDelayTime */
  onChangeDelayTime(value:number, key: string){
    if(key==='noInputIntent'){
      this.response.noInputTimeout = value*1000;
    }else{
      this.response.incompleteSpeechTimeout = value*1000;
    }
    // this.canShowFilter = true;
    this.changeActionReply.emit();
  }

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

  onChangeToggle(event, key: string){
    this.response[key] = event
    this.changeActionReply.emit();
  }

  onSelectedAttribute(variableSelected: {name: string, value: string}){
  }

  onChangeButtonSelect(event: {label: string, category: string, value: string, disabled: boolean, checked: boolean}){
    this.radioOptions.forEach(el => { el.value ===event.value? el.checked= true: el.checked = false })
    this.response.transferType = event.value;
    this.changeActionReply.emit();
  }

  checkForVariablesInsideText(text: string){
    text.match(new RegExp(/(?<=\{\{)(.*)(?=\}\})/g, 'g')).forEach(match => {
      let createTag = '<span class="tag">' + match + '</span>'
      text = text.replace('{' + match + '}',createTag)
    });
    return text
  }

  onChangeBlockSelect(event:{name: string, value: string}, type: 'noInputIntent' | 'noMatchIntent' | 'trueIntent' | 'falseIntent') {
    if(event){
      this.response[type]=event.value
      switch(type){
        case 'noInputIntent':
          this.onConnectorChange.emit({ type: 'create', fromId: this.idConnectorNoInput, toId: this.response.noInputIntent});
          break;
        case 'noMatchIntent':
          this.onConnectorChange.emit({ type: 'create', fromId: this.idConnectorNoMatch, toId: this.response.noMatchIntent});
          break;
        case 'trueIntent':
          this.onConnectorChange.emit({ type: 'create', fromId: this.idConnectorTrue, toId: this.response.trueIntent});
          break;
        case 'falseIntent':
          this.onConnectorChange.emit({ type: 'create', fromId: this.idConnectorFalse, toId: this.response.falseIntent});
          break;
      }
      // this.changeActionReply.emit()
    }
  }

  onResetBlockSelect(event:{name: string, value: string}, type: 'noInputIntent' | 'noMatchIntent' | 'trueIntent' | 'falseIntent') {
    switch(type){
      case 'noInputIntent':
        this.onConnectorChange.emit({ type: 'delete', fromId: this.idConnectorNoInput, toId: this.response.noInputIntent});
        break;
      case 'noMatchIntent':
        this.onConnectorChange.emit({ type: 'delete', fromId: this.idConnectorNoMatch, toId: this.response.noMatchIntent});
        break;
      case 'trueIntent':
        this.onConnectorChange.emit({ type: 'delete', fromId: this.idConnectorTrue, toId: this.response.trueIntent});
        break;
      case 'falseIntent':
        this.onConnectorChange.emit({ type: 'delete', fromId: this.idConnectorFalse, toId: this.response.falseIntent});
        break;
    }
    this.response[type]=null
    // this.changeActionReply.emit()
  }
}
