import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser'
import { Expression, Message, Wait } from 'app/models/intent-model';
import { TYPE_ACTION, TYPE_MESSAGE, MESSAGE_METADTA_WIDTH, MESSAGE_METADTA_HEIGHT } from 'app/chatbot-design-studio/utils';
import { LoggerService } from 'app/services/logger/logger.service';

@Component({
  selector: 'cds-action-reply-frame',
  templateUrl: './cds-action-reply-frame.component.html',
  styleUrls: ['./cds-action-reply-frame.component.scss']
})
export class CdsActionReplyFrameComponent implements OnInit {

  @Output() changeActionReply = new EventEmitter();
  @Output() deleteActionReply = new EventEmitter();
  @Output() moveUpResponse = new EventEmitter();
  @Output() moveDownResponse = new EventEmitter();

  @Input() idAction: string;
  @Input() response: Message;
  @Input() wait: Wait;
  @Input() index: number;
  @Input() previewMode: boolean = true;

  // frame //
  typeActions = TYPE_ACTION;
  framePath: any;
  frameWidth: number | string;
  frameHeight: number | string;
  typeMessage =  TYPE_MESSAGE;
  // Textarea //
  // Delay //
  delayTime: number;
  // Filter // 
  canShowFilter: boolean = true;
  booleanOperators=[ { type: 'AND', operator: 'AND'},{ type: 'OR', operator: 'OR'},]


  constructor(
    private logger: LoggerService,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    this.initialize();
  }


  private initialize(){
    this.delayTime = this.wait.time? (this.wait.time/1000) : 500;
    this.frameWidth = this.response.metadata.width?this.response.metadata.width:MESSAGE_METADTA_WIDTH;
    this.frameHeight = this.response.metadata.height?this.response.metadata.height:MESSAGE_METADTA_HEIGHT;
    if(this.response.metadata.src){
      this.framePath = this.sanitizer.bypassSecurityTrustResourceUrl(this.response.metadata.src?this.response.metadata.src:null);
    }     
  }



  // EVENT FUNCTIONS //
  /** */
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
      this.changeActionReply.emit();
    }
  }

  
  
  /** */
  onCloseFramePanel(event){
    //if(event.url){
      this.framePath = event.url;
      this.response.metadata.src = event.url;
    //}
    //if(event.width){
      this.frameWidth = event.width;
      this.response.metadata.width = event.width;
    //}
    //if(event.height){
      this.frameHeight = event.height;
      this.response.metadata.height = event.height;
    //}
    // console.log('onCloseframePanel:: ', event);
  }

  /** */
  onDeletePathElement(){
    this.framePath = null;
    this.response.metadata.src = '';
    this.changeActionReply.emit();
  }

  /** */
  onLoadPathElement(){
    try {
      this.framePath = this.sanitizer.bypassSecurityTrustResourceUrl(this.response.metadata.src);
      console.log('responseeeeeeeee', this.response, this.framePath)
      this.changeActionReply.emit();
    } catch (error) {
      this.logger.log('onAddNewResponse ERROR', error);
    }
  }

}
