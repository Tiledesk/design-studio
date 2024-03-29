import { Component, Input, OnInit, EventEmitter, Output, SimpleChanges } from '@angular/core';
import { TYPE_BUTTON } from '../../../../../../utils';

@Component({
  selector: 'cds-action-reply-voice-button',
  templateUrl: './cds-action-reply-button.component.html',
  styleUrls: ['./cds-action-reply-button.component.scss']
})
export class CdsActionReplyVoiceButtonComponent implements OnInit {

  @Input() button: any
  @Input() previewMode: boolean = true;
  @Output() blur = new EventEmitter();
  @Output() onChange = new EventEmitter<string>();
  @Output() onButtonControl = new EventEmitter()
  
  TYPE_BUTTON = TYPE_BUTTON

  disabled: boolean = true

  constructor() { }

  ngOnInit(): void {
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

  onEditButton(){
    this.disabled = false
  }

  onChangeText(text){
    this.onChange.emit(this.button)
  }

  onBlur(event){
    this.disabled = true
    // this.blur.emit(event);
  }

  

}
