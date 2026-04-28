import { Component, OnInit, ViewChild, Input, Output, EventEmitter } from '@angular/core';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';

import { Message, Wait, Expression } from 'src/app/models/action-model';
import { TEXT_CHARS_LIMIT } from '../../../../../../../utils';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Component({
  selector: 'cds-action-reply-url-preview',
  templateUrl: './cds-action-reply-url-preview.component.html',
  styleUrls: ['./cds-action-reply-url-preview.component.scss']
})
export class CdsActionReplyUrlPreviewComponent implements OnInit {
  @ViewChild('autosize') autosize: CdkTextareaAutosize;
  
  @Output() updateAndSaveAction = new EventEmitter();
  @Output() changeActionReply = new EventEmitter();
  @Output() deleteActionReply = new EventEmitter();
  @Output() moveUpResponse = new EventEmitter();
  @Output() moveDownResponse = new EventEmitter();

  @Input() idAction: string;
  @Input() response: Message;
  @Input() wait: Wait;
  @Input() index: number;
  @Input() limitCharsText: number = TEXT_CHARS_LIMIT;
  @Input() previewMode: boolean = true;

  // Textarea //
  // Delay //
  delayTime: number = 0;
  // Filter // 
  canShowFilter: boolean = true;
  filterConditionExist: boolean = false;
  booleanOperators = [ { type: 'AND', operator: 'AND'},{ type: 'OR', operator: 'OR'},];
  activeFocus: boolean = true;

  private readonly logger: LoggerService = LoggerInstance.getInstance();

  constructor(
  ) { }

  ngOnInit(): void {
    this.initialize();
  }

  private initialize(){
    if(this.index == 1 && (this.wait?.time == 500 || this.wait?.time == 0)) {
       this.delayTime = 0
    } else if(this.wait?.time && this.wait.time > 0){
      this.delayTime = this.wait.time/1000; 
    } else {
      this.delayTime = 500/1000;
    } 
    if(this.response?._tdJSONCondition && this.response._tdJSONCondition.conditions.length > 0){
      this.filterConditionExist = true
    }
  }

  onClickDelayTime(opened: boolean){
    this.canShowFilter = !opened;
  }

  onChangeDelayTime(value:number){
    this.delayTime = value;
    this.wait.time = value*1000;
    this.canShowFilter = true;
    this.changeActionReply.emit();
  }

  onChangeExpression(expression: Expression){
    this.response._tdJSONCondition = expression;
    this.filterConditionExist = !!(expression && expression?.conditions.length > 0);
    this.changeActionReply.emit();
  }

  onDeleteActionReply(){
    this.deleteActionReply.emit(this.index);
  }

  onMoveUpResponse(){
    this.moveUpResponse.emit(this.index);
  }

  onMoveDownResponse(){
    this.moveDownResponse.emit(this.index);
  }

  onChangeTextarea(text:string) {
    if(!this.previewMode){
      this.response.text = text;
    }
  }

  onBlur(event){
    this.logger.log('[ACTION REPLY URL_PREVIEW] onBlur', event.target.value, this.response.text);
    this.changeActionReply.emit();
  }

  onSelectedAttribute(variableSelected: {name: string, value: string}){
  }
}

