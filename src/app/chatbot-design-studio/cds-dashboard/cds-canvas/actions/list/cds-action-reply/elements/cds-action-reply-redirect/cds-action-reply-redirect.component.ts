import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { TYPE_ACTION } from '../../../../../../../utils-actions';
import { Expression, Message, Wait, Metadata } from 'src/app/models/action-model';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Component({
  selector: 'cds-action-reply-redirect',
  templateUrl: './cds-action-reply-redirect.component.html',
  styleUrls: ['./cds-action-reply-redirect.component.scss']
})
export class CdsActionReplyRedirectComponent implements OnInit {

  @Output() changeActionReply = new EventEmitter();
  @Output() deleteActionReply = new EventEmitter();
  @Output() moveUpResponse = new EventEmitter();
  @Output() moveDownResponse = new EventEmitter();

  @Input() idAction: string;
  @Input() response: Message;
  @Input() wait: Wait;
  @Input() index: number;
  @Input() previewMode: boolean = true;

  
  // Delay //
  delayTime: number;
  // Filter // 
  canShowFilter: boolean = true;
  filterConditionExist: boolean = false;
  booleanOperators=[ { type: 'AND', operator: 'AND'},{ type: 'OR', operator: 'OR'},]
  typeActions = TYPE_ACTION;
  metadata: Metadata;

  private logger: LoggerService = LoggerInstance.getInstance();
  
  constructor() { }


  ngOnInit(): void {
    this.initialize();
  }

  private initialize(){
    this.delayTime = (this.wait && this.wait.time  || this.wait.time === 0)? (this.wait.time/1000) : 500/1000;
    try {
      this.metadata = this.response.metadata;

      if(this.response && this.response._tdJSONCondition && this.response._tdJSONCondition.conditions.length > 0){
        this.filterConditionExist = true
      }

    } catch (error) {
      this.logger.log("error ", error);
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
      this.metadata.src = text;
      // this.changeActionReply.emit();
    }
  }

  onBlur(event){
    this.changeActionReply.emit();
  }

  /** onButtonToogleChange */
  onButtonToogleChange(event){
    this.metadata.target = event.value;
    this.changeActionReply.emit();
  }

}