import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'cds-panel-intent-controls',
  templateUrl: './panel-intent-controls.component.html',
  styleUrls: ['./panel-intent-controls.component.scss']
})
export class PanelIntentControlsComponent implements OnInit {

  @Input() isInternalIntent: boolean = false
  @Input() isStart: boolean = false
  @Input() deleteOptionEnabled: boolean = true
  @Input() webhookEnabled: boolean = false
  @Output() onOptionClicked = new EventEmitter()

  webHookTooltipText: string

  constructor() { }

  ngOnInit(): void {
  }


  onMouseOverWebhookBtn() {
    // console.log('[CDS-INTENT] onMouseOverWebhookBtn  intent ', intent)
    if (!this.webhookEnabled) {
      this.webHookTooltipText = "Enable webhook"
    } else if (this.webhookEnabled) {
      this.webHookTooltipText = "Disable webhook"
    }
    
  }

  toggleIntentWebhook(){
    this.onOptionClicked.emit('webhook')
  }

  onDeleteIntent(){
    this.onOptionClicked.emit('delete')
  }

  openTestSiteInPopupWindow(){
    this.onOptionClicked.emit('test')
  }

}
