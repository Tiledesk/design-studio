import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser'
import { TYPE_MESSAGE } from 'src/app/chatbot-design-studio/utils';
import { TYPE_ACTION } from 'src/app/chatbot-design-studio/utils-actions';
import { Expression, Message, Metadata, Wait } from 'src/app/models/action-model';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Component({
  selector: 'cds-action-reply-voice-audio',
  templateUrl: './cds-action-reply-audio.component.html',
  styleUrls: ['./cds-action-reply-audio.component.scss']
})
export class CdsActionReplyAudioComponent implements OnInit {

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
  frameWidth: number | string;
  frameHeight: number | string;
  typeMessage =  TYPE_MESSAGE;
  // Textarea //
  // Delay //
  delayTime: number;
  // Filter // 
  canShowFilter: boolean = true;
  filterConditionExist: boolean = false;
  booleanOperators=[ { type: 'AND', operator: 'AND'},{ type: 'OR', operator: 'OR'},]

  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
  ) { }

  ngOnInit(): void {
    this.initialize();
  }


  private initialize(){
    this.delayTime = (this.wait && this.wait.time  || this.wait.time === 0)? (this.wait.time/1000) : 500/1000;
    if(this.response && this.response._tdJSONCondition && this.response._tdJSONCondition.conditions.length > 0){
      this.filterConditionExist = true
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
      this.response.metadata.src = text;
      // this.response.metadata.name = text;
      // this.changeActionReply.emit();
    }
  }

  onBlur(event){
    this.changeActionReply.emit();
  }

  /**onChangeMetadata */
  onChangeMetadata(metadata: Metadata){
    this.response.metadata = metadata;
    this.changeActionReply.emit();
  }
  
  /** */
  onDeletedMetadata(){
    this.response.metadata.src = '';
    this.response.metadata.name = '';
    this.changeActionReply.emit();
  }

  /** */
  onLoadPathElement(){
    //this.response.metadata.height = '1000px';
    this.changeActionReply.emit();
  }
  

}
