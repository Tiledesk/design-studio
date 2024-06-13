import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser'
import { Expression, Message, Wait } from 'src/app/models/action-model';
import { TYPE_MESSAGE } from '../../../../../../../utils';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { TYPE_ACTION } from 'src/app/chatbot-design-studio/utils-actions';

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
  isOpenDelaySlider: boolean = false;
  isOpenFilter: boolean = false;
  isOpenHeightSlider: boolean = false;
  heightIframe: any;

  canShowHeight: boolean = true;
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
    if (typeof this.response?.metadata?.height === 'string') {
      this.heightIframe = parseFloat(this.response.metadata.height);
    } else {
      this.heightIframe = this.response?.metadata?.height;
    }
  }



  // EVENT FUNCTIONS //
  /** */
  onClickDelayTime(opened: boolean){
    this.isOpenDelaySlider = !this.isOpenDelaySlider;
    // this.canShowFilter = !opened;
  }

  onClickHeightIframe(opened: boolean){
    this.isOpenHeightSlider = !this.isOpenHeightSlider;
    this.canShowHeight = !this.canShowHeight;
  }


  /** onChangeDelayTime */
  onChangeDelayTime(value:number){
    this.delayTime = value;
    this.wait.time = value*1000;
    this.isOpenDelaySlider = false;
    // this.canShowFilter = true;
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
    //this.response.metadata.height = '1000px';
    this.changeActionReply.emit();
  }

  /** */
  onChangeHeightIframe(height){
    this.isOpenHeightSlider = false;
    this.response.metadata.height = height+'px';
    this.changeActionReply.emit();
  }
  

}
