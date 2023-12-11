import { Component, EventEmitter, OnInit, Output } from '@angular/core';

@Component({
  selector: 'cds-mouse-tips',
  templateUrl: './mouse-tips.component.html',
  styleUrls: ['./mouse-tips.component.scss']
})
export class MouseTipsComponent implements OnInit {

  @Output() close = new EventEmitter();
  
  optionSelected: 'mouse' | 'trackpad' = 'mouse'

  constructor() { }

  ngOnInit(): void {
  }

  onChangeOption(option){

  }

  onClose(){
    this.close.emit();
  }

}
