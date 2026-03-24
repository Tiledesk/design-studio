import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { RESERVED_INTENT_NAMES } from 'src/app/chatbot-design-studio/utils';

@Component({
  selector: 'cds-panel-intent-controls',
  templateUrl: './panel-intent-controls.component.html',
  styleUrls: ['./panel-intent-controls.component.scss'],
})
export class PanelIntentControlsComponent implements OnInit {
  @Input() isInternalIntent = false;
  @Input() display_name: string;
  @Input() deleteOptionEnabled = true;
  @Input() webhookEnabled = false;
  @Output() optionClicked = new EventEmitter<string>();

  showMore = true;
  showColor = true;
  showDelete = true;
  showCopy = true;
  showPlay = true;
  isStart = false;

  private copyElementEnabled = true;

  constructor() {}

  ngOnInit(): void {
    this.initialize();
  }

  /**
   * Emette l'evento 'color' per aprire il selettore colore intent.
   */
  onColorIntent(): void {
    this.optionClicked.emit('color');
  }

  /**
   * Emette l'evento 'delete' per eliminare l'intent.
   */
  onDeleteIntent(): void {
    this.optionClicked.emit('delete');
  }

  /**
   * Emette l'evento 'test' per aprire il test in popup.
   */
  openTestSiteInPopupWindow(): void {
    this.optionClicked.emit('test');
  }

  /**
   * Emette l'evento 'copy' per duplicare l'intent.
   */
  onCopyIntent(): void {
    this.optionClicked.emit('copy');
  }

  /**
   * Emette l'evento 'open' per aprire il pannello intent.
   */
  onOpenIntentPanel(): void {
    this.optionClicked.emit('open');
  }

  /**
   * Inizializza i flag di visibilità dei pulsanti in base al tipo di intent (START, DEFAULT_FALLBACK, WEBHOOK).
   */
  private initialize(): void {
    this.copyElementEnabled = false;
    if (this.display_name === RESERVED_INTENT_NAMES.START) {
      this.showMore = true;
      this.showColor = false;
      this.showDelete = false;
      this.showCopy = false;
      this.showPlay = false;
      this.isStart = true;
    } else if (
      this.display_name === RESERVED_INTENT_NAMES.DEFAULT_FALLBACK
    ) {
      this.showMore = true;
      this.showColor = true;
      this.showDelete = false;
      this.showCopy = false;
      this.showPlay = true;
    } else if (this.display_name === RESERVED_INTENT_NAMES.WEBHOOK) {
      this.showMore = true;
      this.showColor = false;
      this.showDelete = false;
      this.showCopy = false;
      this.showPlay = false;
    }
  }
}
