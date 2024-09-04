
import { Component, OnInit, ViewChild, Input, Output, EventEmitter } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';

import { Message, Wait, Button, MessageAttributes, Expression } from 'src/app/models/action-model';
import { TEXT_CHARS_LIMIT, TYPE_BUTTON, replaceItemInArrayForKey } from '../../../../../../../utils';
import { IntentService } from '../../../../../../../services/intent.service';
import { ConnectorService } from '../../../../../../../services/connector.service';
import { Subscription } from 'rxjs/internal/Subscription';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Component({
  selector: 'cds-action-reply-text',
  templateUrl: './cds-action-reply-text.component.html',
  styleUrls: ['./cds-action-reply-text.component.scss']
})
export class CdsActionReplyTextComponent implements OnInit {
  @ViewChild('autosize') autosize: CdkTextareaAutosize;
  
  @Output() updateAndSaveAction = new EventEmitter();
  @Output() changeActionReply = new EventEmitter();
  @Output() deleteActionReply = new EventEmitter();
  @Output() moveUpResponse = new EventEmitter();
  @Output() moveDownResponse = new EventEmitter();
  @Output() createNewButton = new EventEmitter();
  @Output() deleteButton = new EventEmitter();
  @Output() openButtonPanel = new EventEmitter();

  @Input() idAction: string;
  @Input() response: Message;
  @Input() wait: Wait;
  @Input() index: number;
  @Input() limitCharsText: number = TEXT_CHARS_LIMIT;
  @Input() previewMode: boolean = true;

  // Connector //
  idIntent: string;
  connector: any;
  private subscriptionChangedConnector: Subscription;
  // Textarea //
  // Delay //
  delayTime: number;
  // Filter // 
  canShowFilter: boolean = true;
  filterConditionExist: boolean = false;
  booleanOperators = [ { type: 'AND', operator: 'AND'},{ type: 'OR', operator: 'OR'},];
  // Buttons //
  TYPE_BUTTON = TYPE_BUTTON;
  buttons: Array<any>;


  private logger: LoggerService = LoggerInstance.getInstance();
  constructor(
    private connectorService: ConnectorService,
    private intentService: IntentService
  ) { }

  // SYSTEM FUNCTIONS //
  ngOnInit(): void {
    this.subscriptionChangedConnector = this.intentService.isChangedConnector$.subscribe((connector: any) => {
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
  //   this.logger.log('CdsActionReplyTextComponent ngOnChanges:: ', this.response);
  // }

  // PRIVATE FUNCTIONS //

  private initialize(){
    this.delayTime = (this.wait && this.wait.time  || this.wait.time === 0)? (this.wait.time/1000) : 500/1000;
    this.checkButtons();
    this.buttons = this.intentService.patchButtons(this.buttons, this.idAction);
    this.idIntent = this.idAction.split('/')[0];
    if(this.response && this.response._tdJSONCondition && this.response._tdJSONCondition.conditions.length > 0){
      this.filterConditionExist = true
    }
  }

  private checkButtons(){
    if(!this.response.attributes || !this.response.attributes.attachment){
      this.response.attributes = new MessageAttributes();
    }
    if(this.response?.attributes?.attachment?.buttons){
      this.buttons = this.response?.attributes?.attachment?.buttons;
    } else {
      this.buttons = [];
    }
  }

  // private async patchButtons(){
  //   this.logger.log('patchButtons:: ', this.response);
  //   let buttons = this.response?.attributes?.attachment?.buttons;
  //   if(!buttons)return;
  //   buttons.forEach(button => {
  //     if(!button.__uid || button.__uid === undefined){
  //       button.__uid = generateShortUID();
  //     }
  //     const idActionConnector = this.idAction+'/'+button.__uid;
  //     button.__idConnector = idActionConnector;
  //     if(button.action && button.action !== ''){
  //       button.__isConnected = true;
  //     } else {
  //       button.__isConnected = false;
  //     }
  //     this.logger.log('[cds-action-reply-text ]:: button: ', button, button.__uid);
  //     // button.__isConnected = true;
      
  //   }); 
  // }

  private updateConnector(){
    try {
      const array = this.connector.fromId.split("/");
      const idButton = array[array.length - 1];
      const idConnector = this.idAction+'/'+idButton;
      const buttonChanged = this.buttons.find(obj => obj.uid === idButton);
      
      if(idConnector === this.connector.fromId && buttonChanged){
        this.logger.log('updateConnector [CdsActionReplyTextComponent]:: buttonChanged: ', this.connector, buttonChanged, this.buttons, idButton);
        if(this.connector.deleted){
          // DELETE 
          // this.logger.log('[CdsActionReplyTextComponent] deleteConnector :: ', this.connector);
          buttonChanged.__isConnected = false;
          buttonChanged.__idConnector = this.connector.fromId;
          buttonChanged.__idConnection = null;
          buttonChanged.action = '';
          buttonChanged.type = TYPE_BUTTON.TEXT;
          if(this.connector.save)this.updateAndSaveAction.emit(this.connector);
        } else {
          // ADD / EDIT
          buttonChanged.__idConnector = this.connector.fromId;
          buttonChanged.action = buttonChanged.action? buttonChanged.action : '#' + this.connector.toId;
          buttonChanged.type = TYPE_BUTTON.ACTION;
          // this.logger.log('[CdsActionReplyTextComponent] updateConnector :: ', buttonChanged);
          if(!buttonChanged.__isConnected){
            buttonChanged.__isConnected = true;
            buttonChanged.__idConnection = this.connector.fromId+"/"+this.connector.toId;
            // if(this.connector.notify)
            // this.updateAndSaveAction.emit();
            if(this.connector.save)this.updateAndSaveAction.emit(this.connector);
            // this.changeActionReply.emit();
          } 
        }
        // this.changeActionReply.emit();
      }
    } catch (error) {
      this.logger.error('error: ', error);
    }
  }



  // EVENT FUNCTIONS //

  /** onClickDelayTime */
  onClickDelayTime(opened: boolean){
    this.canShowFilter = !opened;
  }

  /** onChangeDelayTime */
  onChangeDelayTime(value:number){
    this.delayTime = value;
    this.wait.time = value*1000;
    this.canShowFilter = true;
    this.changeActionReply.emit();
  }

  /** onChangeExpression */
  onChangeExpression(expression: Expression){
    this.response._tdJSONCondition = expression;
    this.filterConditionExist = expression && expression.conditions.length > 0? true : false;
    this.changeActionReply.emit();
  }

  /** onDeleteActionReply */
  onDeleteActionReply(){
    this.deleteActionReply.emit(this.index);
  }

  /** onMoveUpResponse */
  onMoveUpResponse(){
    this.moveUpResponse.emit(this.index);
  }

  /** onMoveDownResponse */
  onMoveDownResponse(){
    this.moveDownResponse.emit(this.index);
  }

  /** onChangeTextarea */
  onChangeTextarea(text:string) {
    if(!this.previewMode){
      this.response.text = text;
      // this.changeActionReply.emit();
    }
  }

  onBlur(event){
    this.logger.log('[ACTION REPLY TEXT] onBlur', event.target.value, this.response.text);
    // if(event.target.value !== this.response.text){
      this.changeActionReply.emit();
    // }
  }

  onSelectedAttribute(variableSelected: {name: string, value: string}){
  }

  /** onOpenButtonPanel */
  onOpenButtonPanel(button){
    this.logger.log('[ACTION REPLY TEXT] onOpenButtonPanel ', button, this.response.attributes.attachment.buttons);
    this.openButtonPanel.emit(button);
  }

  /** onButtonControl */
  onButtonControl(action: string, index: number ){
    switch(action){
      case 'delete': /** onDeleteButton */
        this.deleteButton.emit({index: index, buttons: this.buttons});
        break;
      case 'moveLeft':
        break;
      case 'moveRight':
        break;
      case 'new': /** onCreateNewButton */
        this.createNewButton.emit(this.index);
        break;
    }
  }

  /** dropButtons */
  dropButtons(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.buttons, event.previousIndex, event.currentIndex);
    this.connectorService.updateConnector(this.idIntent);
    this.changeActionReply.emit();
  }  

  checkForVariablesInsideText(text: string){
    text.match(new RegExp(/(?<=\{\{)(.*)(?=\}\})/g, 'g')).forEach(match => {
      let createTag = '<span class="tag">' + match + '</span>'
      text = text.replace('{' + match + '}',createTag)
    });
    return text
  }
}
