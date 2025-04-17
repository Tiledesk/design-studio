import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Button, Expression, MessageAttributes, Message, Wait, Metadata } from 'src/app/models/action-model';
import { TYPE_BUTTON } from '../../../../../../../utils';
import { ConnectorService } from '../../../../../../../services/connector.service';
import { IntentService } from '../../../../../../../services/intent.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { Subscription } from 'rxjs/internal/Subscription';

@Component({
  selector: 'cds-action-reply-image',
  templateUrl: './cds-action-reply-image.component.html',
  styleUrls: ['./cds-action-reply-image.component.scss']
})
export class CdsActionReplyImageComponent implements OnInit {
  
  @Output() updateAndSaveAction = new EventEmitter();
  @Output() changeActionReply = new EventEmitter();
  @Output() deleteActionReply = new EventEmitter();
  @Output() moveUpResponse = new EventEmitter();
  @Output() moveDownResponse = new EventEmitter();
  @Output() createNewButton = new EventEmitter();
  @Output() deleteButton = new EventEmitter();
  @Output() openButtonPanel = new EventEmitter();
  @Output() changeJsonButtons = new EventEmitter();
  
  @Input() idAction: string;
  @Input() response: Message;
  @Input() wait: Wait;
  @Input() index: number;
  @Input() previewMode: boolean = true
  
  idIntent: string;
  // Connector //
  connector: any;
  private subscriptionChangedConnector: Subscription;

  // Delay //
  delayTime: number;

  //Filter //
  canShowFilter: boolean = true;
  filterConditionExist: boolean = false;
  booleanOperators=[ { type: 'AND', operator: 'AND'},{ type: 'OR', operator: 'OR'},]
  
  // Buttons //
  buttons: Array<any>;
  TYPE_BUTTON = TYPE_BUTTON;

  showJsonBody: boolean =  false;
  jsonBody: string;

  
  private readonly logger: LoggerService = LoggerInstance.getInstance();

  constructor( 
    private readonly connectorService: ConnectorService,
    private readonly intentService: IntentService
  ) { }


  ngOnInit(): void {
    this.subscriptionChangedConnector = this.intentService.isChangedConnector$.subscribe((connector: any) => {
      this.logger.log('CdsActionReplyImageComponent isChangedConnector-->', connector);
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

  // PRIVATE FUNCTIONS //

  private initialize(){
    this.jsonBody = '';
    if(this.response?.attributes?.attachment?.json_buttons){
      this.jsonBody = this.response?.attributes?.attachment?.json_buttons;
      this.showJsonBody = true;
    }
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


  private updateConnector(){
    try {
      const array = this.connector.fromId.split("/");
      const idButton = array[array.length - 1];
      const idConnector = this.idAction+'/'+idButton;
      this.logger.log(' updateConnector :: connector.fromId - idConnector: ', this.connector.fromId, idConnector);
      const buttonChanged = this.buttons.find(obj => obj.uid === idButton);
      if(idConnector === this.connector.fromId && buttonChanged){
        if(this.connector.deleted){
          // DELETE 
          buttonChanged.__isConnected = false;
          buttonChanged.__idConnector = this.connector.fromId;
          buttonChanged.__idConnection = null;
          buttonChanged.action = '';
          buttonChanged.type = TYPE_BUTTON.TEXT;
          this.updateAndSaveAction.emit();
        } else {
          buttonChanged.__idConnector = this.connector.fromId;
          buttonChanged.action = buttonChanged.action? buttonChanged.action : '#' + this.connector.toId;
          buttonChanged.type = TYPE_BUTTON.ACTION;
          if(!buttonChanged.__isConnected){
            buttonChanged.__isConnected = true;
            buttonChanged.__idConnection = this.connector.fromId+"/"+this.connector.toId;
            this.updateAndSaveAction.emit();
          } 
        }
      }
    } catch (error) {
      this.logger.error('error: ', error);
    }
  }
  


  // EVENT FUNCTIONS //

  /** changeJsonButtons */
  onChangeJsonButtons(json:any){
    this.logger.log('[ACTION REPLY TEXT] onChangeJsonButtons', json);
    if(json && json.trim() !== ''){
      this.showJsonBody = true;
    } else {
      this.showJsonBody = false;
    }
    this.jsonBody = json;
    this.response.attributes.attachment.json_buttons =  json; //JSON.stringify(json);
    this.changeJsonButtons.emit( this.response);
  }

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
  
  /**onChangeMetadata */
  onChangeMetadata(metadata: Metadata){
    this.response.metadata = metadata;
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
    }
  }

  /** onOpenButtonPanel */
  onOpenButtonPanel(button){
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

  /** onBlur */
  onBlur(event){
    this.changeActionReply.emit();
  }

  // EVENT FUNCTIONS //
  /** */





  





  /** */
  onCloseImagePanel(event){
    //if(event.url){
      //this.imagePath = event.url;
      this.response.metadata.src = event.url;
    //}
    //if(event.width){
      //this.imageWidth = event.width;
      this.response.metadata.width = event.width;
    //}
    //if(event.height){
      //this.imageHeight = event.height;
      this.response.metadata.height = event.height;
    //}
    // this.logger.log('onCloseImagePanel:: ', event);
  }

  /** */
  onDeletedMetadata(event){
    this.response.metadata.src = null;
    this.changeActionReply.emit();
  }
  



  // EVENT FUNCTIONS //
  /** */
  onMoveLeftButton(fromIndex){
    let toIndex = fromIndex-1;
    if(toIndex<0){
      toIndex = 0;
    }
    this.arraymove(this.buttons, fromIndex, toIndex);
  }

  onMoveRightButton(fromIndex){
    let toIndex = fromIndex+1;
    if(toIndex>this.buttons.length-1){
      toIndex = this.buttons.length-1;
    }
    this.arraymove(this.buttons, fromIndex, toIndex);
  }

  private arraymove(buttons, fromIndex, toIndex) {
    var element = buttons[fromIndex];
    buttons.splice(fromIndex, 1);
    buttons.splice(toIndex, 0, element);
  }
}

