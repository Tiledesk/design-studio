import { Component, Input, OnInit, EventEmitter, Output, SimpleChanges } from '@angular/core';
import { TYPE_BUTTON } from '../../../../../../../utils';

@Component({
  selector: 'cds-action-reply-button',
  templateUrl: './cds-action-reply-button.component.html',
  styleUrls: ['./cds-action-reply-button.component.scss']
})
export class CdsActionReplyButtonComponent implements OnInit {

  @Input() button: any
  @Input() previewMode: boolean = true;
  @Output() onButtonControl = new EventEmitter()
  
  TYPE_BUTTON = TYPE_BUTTON

  constructor() { }

  ngOnInit(): void {
    // empty
  }

  onDeleteButton(){
    this.onButtonControl.emit('delete')
  }
  onMoveLeftButton(){
    this.onButtonControl.emit('moveLeft')
  }
  onMoveRightButton(){
    this.onButtonControl.emit('moveRight')
  }

}
