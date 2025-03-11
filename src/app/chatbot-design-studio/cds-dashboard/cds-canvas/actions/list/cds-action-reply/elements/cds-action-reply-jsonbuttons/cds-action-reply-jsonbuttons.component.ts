import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Component({
  selector: 'cds-action-reply-jsonbuttons',
  templateUrl: './cds-action-reply-jsonbuttons.component.html',
  styleUrls: ['./cds-action-reply-jsonbuttons.component.scss']
})
export class CdsActionReplyJsonbuttonsComponent implements OnInit {

  showJsonBody: boolean =  false;
  jsonPlaceholder: any;
  // jsonBody: any;

  @Input() jsonBody: string;
  @Output() changeJsonButtons = new EventEmitter();
  
  private readonly logger: LoggerService = LoggerInstance.getInstance();

  constructor() { }

  ngOnInit(): void {
    this.initialize();
  }

  ngAfterViewInit (): void {
    // empty
  }

  initialize(){
    this.jsonPlaceholder = `[
        {
          "type": "action",
          "value": "operator",
          "action": "hand off",
          "alias": "handoff, human"
        },
        {
          "type": "url",
          "value": "My link",
          "link": "https://www.mylink.com",
          "target": "blank"
        },
        {
          "type": "text",
          "value": "Hello"
        }
    ]`;
    if(this.jsonBody && this.jsonBody.trim() !== ''){
      this.showJsonBody = true;
      this.jsonBody = JSON.parse(this.jsonBody);
    } else {
      this.showJsonBody = false;
      this.jsonBody = '';
    }
  }


  /** onClickJsonButtons */
  onClickJsonButtons(){
    if(!this.showJsonBody){
      this.showJsonBody = true;
    }
  }

  /** onDeleteJsonButtons */
  onDeleteJsonButtons(){
    this.showJsonBody = false;
    this.jsonBody = '';
    this.changeJsonButtons.emit();
  }

  /** onChangeJsonTextarea */
  onChangeJsonTextarea(text:string) {
    this.jsonBody = text;
    // this.changeJsonButtons.emit(text);
  }

  /** onBlurJsonTextarea */
  onBlurJsonTextarea(event:any){
    this.logger.log('[ACTION REPLY jsonbuttons] onBlurJsonTextarea ', event);
    const json = event.target?.value;
    if(!json || json.trim() === ''){
      this.showJsonBody = false;
    }
    this.changeJsonButtons.emit(json);
  }
    
}
