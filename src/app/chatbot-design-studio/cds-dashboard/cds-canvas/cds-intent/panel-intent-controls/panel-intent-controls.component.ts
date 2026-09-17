import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { RESERVED_INTENT_NAMES } from 'src/app/chatbot-design-studio/utils';

@Component({
  selector: 'cds-panel-intent-controls',
  templateUrl: './panel-intent-controls.component.html',
  styleUrls: ['./panel-intent-controls.component.scss']
})
export class PanelIntentControlsComponent implements OnInit, OnChanges {

  @Input() isInternalIntent: boolean = false;
  @Input() display_name: string;
  @Input() deleteOptionEnabled: boolean = true;
  @Input() webhookEnabled: boolean = false;
  /** nodo terminale "Return to parent agent": mostra solo il cestino */
  @Input() isReturnStack: boolean = false;
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

  ngOnChanges(changes: SimpleChanges): void {
    // isReturnStack cambia a runtime (il blocco diventa/smette di essere una pastiglia)
    if(changes['isReturnStack'] && !changes['isReturnStack'].firstChange){
      this.initialize();
    }
  }

  initialize(){
    this.copyElementEnabled = false;
    this.showMore = true;
    this.showColor = true;
    this.showDelete = true;
    this.showCopy = true;
    this.showPlay = true;
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
      this.showMore = true;
      this.showColor = false;
      this.showDelete = false;
      this.showCopy = false;
      this.showPlay = false;
    } else if(this.isReturnStack){
      // nodo terminale a pastiglia: solo il cestino, per non affollare la pastiglia
      // (è comunque l'unica via per eliminare il blocco dal canvas)
      this.showMore = false;
      this.showColor = false;
      this.showDelete = true;
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
