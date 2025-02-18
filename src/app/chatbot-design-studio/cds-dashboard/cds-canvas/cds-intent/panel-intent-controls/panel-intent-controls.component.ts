import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'cds-panel-intent-controls',
  templateUrl: './panel-intent-controls.component.html',
  styleUrls: ['./panel-intent-controls.component.scss']
})
export class PanelIntentControlsComponent implements OnInit {

  @Input() isInternalIntent: boolean = false;
  @Input() isStart: boolean = false;
  @Input() isDefaultFallback: boolean = false;
  @Input() deleteOptionEnabled: boolean = true;
  @Input() webhookEnabled: boolean = false;
  @Output() optionClicked = new EventEmitter();

  webHookTooltipText: string;
  copyElementEnabled: boolean = true;

  constructor() { }

  ngOnInit(): void {
    this.initialize();
  }

  initialize(){
    this.copyElementEnabled = false;
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
