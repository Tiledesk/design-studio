
import { Component, OnInit, ViewChild, Input, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';

import { Message, Wait, Button, MessageAttributes, Expression, Setting, ActionReplyV2 } from 'src/app/models/action-model';
import { TYPE_BUTTON, TYPE_COMMAND, TYPE_UPDATE_ACTION, replaceItemInArrayForKey } from '../../../../../../../utils';
import { IntentService } from '../../../../../../../services/intent.service';
import { ConnectorService } from '../../../../../../../services/connector.service';
import { Subscription } from 'rxjs/internal/Subscription';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { secondsToDhms } from 'src/app/utils/util';
import { Observable } from 'rxjs';

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
  @Input() action: ActionReplyV2;
  @Input() index: number;
  @Input() previewMode: boolean = true;
  @Input() handleActionChanges: Observable<ActionReplyV2>
  @Output() onConnectorChange = new EventEmitter<{type: 'create' | 'delete',  fromId: string, toId: string}>()

  listOfIntents: Array<{name: string, value: string, icon?:string}>;

  // Connectors //
  idIntentSelected: string;
  idConnectorNoMatch: string;
  idConnectorNoInput: string;
  idConnectionNoMatch: string;
  idConnectionNoInput: string;
  isConnectedNoMatch: boolean = false;
  isConnectedNoInput: boolean = false;
  isConnectorInputDisabled: boolean = false;
  isConnectorMatchDisabled: boolean = false;
  connector: any;
  private subscriptionChangedConnector: Subscription;


  private logger: LoggerService = LoggerInstance.getInstance();
  constructor(
    private connectorService: ConnectorService,
    private intentService: IntentService
  ) { }

  // SYSTEM FUNCTIONS //
  ngOnInit(): void {
    this.logger.debug("[ACTION REPLY SETTINGS] action detail: ", this.action);
    this.subscriptionChangedConnector = this.intentService.isChangedConnector$.subscribe((connector: any) => {
      this.logger.debug('[ACTION REPLY SETTINGS] isChangedConnector -->', connector);
      let connectorId = this.idAction;
      if(connector.fromId.startsWith(connectorId)){
        this.connector = connector;
        this.updateConnector();
      }
    });
    this.initializeConnector();

    this.handleActionChanges.subscribe(()=> this.checkButtonsInCommands())
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
    this.listOfIntents = this.intentService.getListOfIntents();
    this.checkConnectionStatus();
    this.checkButtonsInCommands();
  }

  private updateConnector(){
    try {
      const array = this.connector.fromId.split("/");
      const idButton = array[0] + '/' + array[array.length - 2];
      if(idButton === this.idAction){
        if(this.connector.deleted){
          if(array[array.length -1] === 'noInput'){
            this.action.noInputIntent = null;
            this.isConnectedNoInput = false;
            this.idConnectionNoInput = null;
          }        
          if(array[array.length -1] === 'noMatch'){
            this.action.noMatchIntent = null;
            this.isConnectedNoMatch = false;
            this.idConnectionNoMatch = null;
          }
          if(this.connector.save)this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.CONNECTOR, element: this.connector});
        } else { 
          // TODO: verificare quale dei due connettori è stato aggiunto (controllare il valore della action corrispondente al true/false intent)
          this.logger.debug('[ACTION REPLY SETTINGS] updateConnector', this.connector.toId, this.connector.fromId ,this.action, array[array.length-1]);
          if(array[array.length -1] === 'noInput'){
            // this.action.trueIntent = '#'+this.connector.toId;
            this.isConnectedNoInput = true;
            this.idConnectionNoInput = this.connector.fromId+"/"+this.connector.toId;
            this.action.noInputIntent = '#'+this.connector.toId;
            if(this.connector.save)this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.CONNECTOR, element: this.connector});
          }        
          if(array[array.length -1] === 'noMatch'){
            // this.action.falseIntent = '#'+this.connector.toId;
            this.isConnectedNoMatch = true;
            this.idConnectionNoMatch = this.connector.fromId+"/"+this.connector.toId;
            this.action.noMatchIntent = '#'+this.connector.toId;
            if(this.connector.save)this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.CONNECTOR, element: this.connector});
          }
        }
      }
    } catch (error) {
      this.logger.error('[ACTION REPLY SETTINGS] updateConnector error: ', error);
    }
  }

  private checkConnectionStatus(){
    if(this.action.noInputIntent){
      this.isConnectedNoInput = true;
      const posId = this.action.noInputIntent.indexOf("#");
      if (posId !== -1) {
        const toId = this.action.noInputIntent.slice(posId+1);
        this.idConnectionNoInput = this.idConnectorNoInput+"/"+toId;
      }
    } else {
      this.isConnectedNoInput = false;
      this.idConnectionNoInput = null;
    }
    if(this.action.noMatchIntent){
      this.isConnectedNoMatch = true;
      const posId = this.action.noMatchIntent.indexOf("#");
      if (posId !== -1) {
        const toId = this.action.noMatchIntent.slice(posId+1);
        this.idConnectionNoMatch = this.idConnectorNoMatch+"/"+toId;
      }
     } else {
      this.isConnectedNoMatch = false;
      this.idConnectionNoMatch = null;
     }
  }


  formatLabel(value: number): string {

    const d = secondsToDhms(value).getDays();
    const h = secondsToDhms(value).getHours();
    const m = secondsToDhms(value).getMinutes();

    let number = value
    let unit = 's' 
    if(d > 0){
      number = d;
      unit = 'd'
    } else if(h > 0){
      number = h;
      unit = 'h'
    }else if( m> 0){
      number = m;
      unit = 'm'
    }
    return number + unit
    // return `${value}`+ 's';
  }

  // PRIVATE FUNCTIONS //
  private checkButtonsInCommands(){
    let commands = this.action.attributes.commands
    if(commands && commands.length > 0){
      let messages = commands.filter(command => command.type === TYPE_COMMAND.MESSAGE)
      messages.forEach(el => {
        if(!el || !el.message || !el.message.attributes){
          this.isConnectorInputDisabled = true;
          this.isConnectorMatchDisabled = true;
          return;
        }
        if(el.message.attributes.attachment && el.message.attributes.attachment.buttons && el.message.attributes.attachment.buttons.length > 0){
          this.isConnectorInputDisabled = false;
          this.isConnectorMatchDisabled = false;
          return;
          
        }else{
          //CASE: no buttons in message element
          this.isConnectorInputDisabled = true;
          this.isConnectorMatchDisabled = true;
          return;
        }
      })
    }
  }

  // EVENT FUNCTIONS //

  /** onClickDelayTime */
  onClickDelayTime(opened: boolean){
    // this.canShowFilter = !opened;
  }

  /** onChangeDelayTime */
  onChangeDelayTime(value:number){
    this.action.noInputTimeout = value*1000;
    // this.canShowFilter = true;
    this.changeActionReply.emit();
  }

  /** onChangeTextarea */
  onChangeTextarea(text:string, key: string) {
    if(!this.previewMode){
      this.action[key] = text;
      // this.changeActionReply.emit();
    }
  }

  onBlur(event){
    this.logger.log('[ACTION REPLY SETTINGS] onBlur', event.target.value, this.action);
    // if(event.target.value !== this.response.text){
      this.changeActionReply.emit();
    // }
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

  onChangeBlockSelect(event:{name: string, value: string}, type: 'noInputIntent' | 'noMatchIntent') {
    if(event){
      this.action[type]=event.value
      switch(type){
        case 'noInputIntent':
          this.onConnectorChange.emit({ type: 'create', fromId: this.idConnectorNoInput, toId: this.action.noInputIntent});
          break;
        case 'noMatchIntent':
          this.onConnectorChange.emit({ type: 'create', fromId: this.idConnectorNoMatch, toId: this.action.noMatchIntent});
          break;
      }
      // this.changeActionReply.emit()
    }
  }

  onResetBlockSelect(event:{name: string, value: string}, type: 'noInputIntent' | 'noMatchIntent') {
    switch(type){
      case 'noInputIntent':
        this.onConnectorChange.emit({ type: 'delete', fromId: this.idConnectorNoInput, toId: this.action.noInputIntent});
        break;
      case 'noMatchIntent':
        this.onConnectorChange.emit({ type: 'delete', fromId: this.idConnectorNoMatch, toId: this.action.noMatchIntent});
        break;
    }
    this.action[type]=null
    // this.changeActionReply.emit()
  }
}
