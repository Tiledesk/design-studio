import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ActionWhatsappAttribute } from 'app/models/intent-model';
import { LoggerService } from 'app/services/logger/logger.service';

@Component({
  selector: 'cds-action-whatsapp-attribute',
  templateUrl: './cds-action-whatsapp-attribute.component.html',
  styleUrls: ['./cds-action-whatsapp-attribute.component.scss']
})
export class CdsActionWhatsappAttributeComponent implements OnInit {

  @Input() action: ActionWhatsappAttribute;
  @Input() previewMode: boolean = true;
  @Output() updateAndSaveAction = new EventEmitter();
  
  constructor(
    private logger: LoggerService
  ) { }

  ngOnInit(): void {
    this.logger.log("action: ", this.action);
    this.logger.debug("action.attribute: ", this.action.attributeName);
  }

  onSelectedAttribute(event) {
    this.action.attributeName = event.value;
    this.logger.debug("onSelectedAttribute event: ", this.action);
    this.updateAndSaveAction.emit()
  }

}
