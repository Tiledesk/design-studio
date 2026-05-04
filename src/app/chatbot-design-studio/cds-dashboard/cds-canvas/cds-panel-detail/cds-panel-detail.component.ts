import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Intent } from 'src/app/models/intent-model';

@Component({
  selector: 'cds-panel-detail',
  templateUrl: './cds-panel-detail.component.html',
  styleUrls: ['./cds-panel-detail.component.scss']
})
export class CdsPanelDetailComponent {
  @Input() intent: Intent;
  @Output() closePanel = new EventEmitter<void>();

  onClose() {
    this.closePanel.emit();
  }
}
