import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { IntentService } from 'src/app/chatbot-design-studio/services/intent.service';
import { INTENT_COLORS } from 'src/app/chatbot-design-studio/utils';

@Component({
  selector: 'cds-color-menu',
  templateUrl: './cds-color-menu.component.html',
  styleUrls: ['./cds-color-menu.component.scss']
})

export class CdsColorMenuComponent implements OnInit {
  @Input() intentId: string;
  @Input() positions: any;
  @Output() hideColortMenu = new EventEmitter(); 

  colorKeys = Object.keys(INTENT_COLORS);
  colorValues = Object.values(INTENT_COLORS);


  constructor(
    private readonly intentService: IntentService
  ) { }

  ngOnInit(): void {
    //empty
  }


  onChangeColor(index){
    const color = this.colorKeys[index];
    console.log("COLOR: ", color);
    this.intentService.setIntentColor(color);
  }

}
