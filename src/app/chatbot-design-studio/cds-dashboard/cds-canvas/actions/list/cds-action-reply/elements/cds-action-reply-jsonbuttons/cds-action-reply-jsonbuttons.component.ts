import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

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
  
  constructor() { }

  ngOnInit(): void {
    // empty
  }

  ngAfterViewInit (): void {
    this.initialize();
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
  }

  /** onBlurJsonTextarea */
  onBlurJsonTextarea(event:any){
    if(!this.jsonBody || this.jsonBody.trim() === ''){
      this.showJsonBody = false;
    }
    const json = event.target.value;
    this.changeJsonButtons.emit(json);
  }
    
}
