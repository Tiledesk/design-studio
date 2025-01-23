import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
export enum INTENT_COLORS {
  COLOR1 = 'color1',
  COLOR2 = 'color2',
  COLOR3 = 'color3',
  COLOR4 = 'color4',
  COLOR5 = 'color5',
  COLOR6 = 'color6',
}

@Component({
  selector: 'cds-color-menu',
  templateUrl: './cds-color-menu.component.html',
  styleUrls: ['./cds-color-menu.component.scss']
})

export class CdsColorMenuComponent implements OnInit {
  @Input() positions: any;
  @Output() hideColortMenu = new EventEmitter(); 

  INTENT_COLORS = INTENT_COLORS;

  constructor() { }

  ngOnInit(): void {
    // empty
  }


  onChangeColor(event:INTENT_COLORS){
    console.log("COLOR: ", event);
  }

}
