import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser'
import { Expression, Message, Wait } from 'src/app/models/action-model';
import { TYPE_ACTION, TYPE_MESSAGE, MESSAGE_METADTA_WIDTH, MESSAGE_METADTA_HEIGHT } from '../../../../../../../utils';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

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
    this.delayTime = this.wait.time? (this.wait.time/1000) : 500;
    if(this.response && this.response._tdJSONCondition && this.response._tdJSONCondition.conditions.length > 0){
      this.filterConditionExist = true
    }
  }



  // EVENT FUNCTIONS //
  /** */
  onClickDelayTime(opened: boolean){
    this.canShowFilter = !opened;
  }

  onClickHeightIframe(opened: boolean){
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
    this.changeActionReply.emit();
  }
  
  /** */
  onDeletedMetadata(){
    this.response.metadata.src = '';
    this.changeActionReply.emit();
  }

  /** */
  onLoadPathElement(){
    this.response.metadata.height = '1000px';
    this.changeActionReply.emit();
  }

}
