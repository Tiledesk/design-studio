import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { RESERVED_INTENT_NAMES } from 'src/app/chatbot-design-studio/utils';

@Component({
  selector: 'cds-panel-intent-controls',
  templateUrl: './panel-intent-controls.component.html',
  styleUrls: ['./panel-intent-controls.component.scss']
})
export class PanelIntentControlsComponent implements OnInit {

  @Input() isInternalIntent: boolean = false;
  @Input() display_name: string;
  @Input() deleteOptionEnabled: boolean = true;
  @Input() webhookEnabled: boolean = false;
  @Output() optionClicked = new EventEmitter();

  webHookTooltipText: string;
  copyElementEnabled: boolean = true;

  showMore:   boolean   = true;
  showColor:  boolean   = true;
  showDelete: boolean   = true;
  showCopy:   boolean   = true;
  showPlay:   boolean   = true;
  isStart:    boolean   = false;

  constructor() { }

  ngOnInit(): void {
    this.initialize();
  }

  initialize(){
    this.copyElementEnabled = false;
    if(this.display_name === RESERVED_INTENT_NAMES.START){
      this.showMore = true;
      this.showColor = false;
      this.showDelete = false;
      this.showCopy = false;
      this.showPlay = false;
      this.isStart = true
    } else if(this.display_name === RESERVED_INTENT_NAMES.DEFAULT_FALLBACK){
      this.showMore = true;
      this.showColor = true;
      this.showDelete = false;
      this.showCopy = false;
      this.showPlay = true;
    } else if(this.display_name === RESERVED_INTENT_NAMES.WEBHOOK){
      this.showMore = false;
      this.showColor = false;
      this.showDelete = false;
      this.showCopy = false;
      this.showPlay = false;
    }
  }

  onMouseOverWebhookBtn() {
    if (!this.webhookEnabled) {
      this.webHookTooltipText = "Enable webhook";
    } else if (this.webhookEnabled) {
      this.webHookTooltipText = "Disable webhook";
    }
  }

  toggleIntentWebhook(){
    this.optionClicked.emit('webhook');
  }

  onColorIntent(){
    this.optionClicked.emit('color');
  }

  onDeleteIntent(){
    this.optionClicked.emit('delete');
  }

  openTestSiteInPopupWindow(){
    this.optionClicked.emit('test');
  }

  onCopyIntent(){
    this.optionClicked.emit('copy');
  }

  onOpenIntentPanel(){
    this.optionClicked.emit('open')
  }

}
