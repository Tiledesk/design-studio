import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'cds-mouse-tips',
  templateUrl: './mouse-tips.component.html',
  styleUrls: ['./mouse-tips.component.scss']
})
export class MouseTipsComponent implements OnInit {

  optionSelected: 'mouse' | 'trackpad' = 'mouse'

  constructor() { }

  ngOnInit(): void {
  }

  onChangeOption(option){
    
  }

}
