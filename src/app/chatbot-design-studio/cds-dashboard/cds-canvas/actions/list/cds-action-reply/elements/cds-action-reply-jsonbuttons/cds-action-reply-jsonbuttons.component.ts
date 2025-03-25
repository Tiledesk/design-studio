import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

import { LIST_JSON_MODEL_REPLY_V1, LIST_JSON_MODEL_REPLY_V2, JSON_MODEL_PLACEHOLDER } from 'src/app/chatbot-design-studio/utils-jsonbuttons';
import { IntentService } from 'src/app/chatbot-design-studio/services/intent.service';
import { TYPE_ACTION } from 'src/app/chatbot-design-studio/utils-actions';
import { DOCS_LINK } from 'src/app/chatbot-design-studio/utils';

@Component({
  selector: 'cds-action-reply-jsonbuttons',
  templateUrl: './cds-action-reply-jsonbuttons.component.html',
  styleUrls: ['./cds-action-reply-jsonbuttons.component.scss']
})
export class CdsActionReplyJsonbuttonsComponent implements OnInit {
  @Input() jsonBody: string;
  @Output() changeJsonButtons = new EventEmitter();

  showJsonButton: boolean =  false;
  showJsonBody: boolean =  false;
  jsonPlaceholder: string = JSON_MODEL_PLACEHOLDER;
  listType: any = {};
  link: any;
  // exampleSelected: null;
  
  private readonly logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private readonly intentService: IntentService,
    // private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.initialize();
  }

  ngAfterViewInit (): void {
    // // this.cdr.detectChanges();
  }

  initialize(){
    this.listType = LIST_JSON_MODEL_REPLY_V1; 
    if(this.intentService.selectedAction._tdActionType !== TYPE_ACTION.REPLY){
      this.listType = LIST_JSON_MODEL_REPLY_V2; 
    };
    if(this.jsonBody && this.jsonBody.trim() !== ''){
      this.showJsonBody = true;
      this.showJsonButton = true;
    } else {
      this.jsonBody = '';
      this.showJsonBody = false;
      this.showJsonButton = false;
    }
    this.link = DOCS_LINK.JSON_BUTTONS;
  }


  // ACTIONS //

  /** onDeleteJsonButtons */
  onChangeJsonButtonsType(event){
    this.jsonBody = event['value']?event['value']:'';
    this.showJsonBody = true;
    this.showJsonButton = false;
    this.changeJsonButtons.emit(this.jsonBody);
  }

  /** onDeleteJsonButtons */
  onResetJsonButtonsType(event){
    this.logger.log('[ACTION REPLY jsonbuttons] onResetJsonButtonsType ', this.jsonBody);
    this.changeJsonButtons.emit(this.jsonBody);
  }

  /** onClickJsonButtons */
  onClickJsonButtons(){
    if(!this.showJsonBody){
      this.showJsonBody = true;
      this.showJsonButton = true;
    }
  }

  /** onDeleteJsonButtons */
  onDeleteJsonButtons(){
    this.jsonBody = '';
    this.showJsonBody = false;
    this.showJsonButton = false;
    this.changeJsonButtons.emit();
  }

  /** onChangeJsonTextarea */
  onChangeJsonTextarea(text:string) {
    if(!text || text.trim() === ''){
      this.showJsonButton = true;
    } else {
      this.jsonBody = text;
      this.showJsonButton = false;
    }
    // // this.changeJsonButtons.emit(text);
  }

  /** onBlurJsonTextarea */
  onBlurJsonTextarea(event:any){
    this.logger.log('[ACTION REPLY jsonbuttons] onBlurJsonTextarea ', event);
    const json = event.target?.value;
    this.changeJsonButtons.emit(json);
  }
    
}
