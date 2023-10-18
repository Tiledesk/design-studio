import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ActionWhatsappAttribute } from 'src/app/models/action-model';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Component({
  selector: 'cds-action-whatsapp-attribute',
  templateUrl: './cds-action-whatsapp-attribute.component.html',
  styleUrls: ['./cds-action-whatsapp-attribute.component.scss']
})
export class CdsActionWhatsappAttributeComponent implements OnInit {

  @Input() action: ActionWhatsappAttribute;
  @Input() previewMode: boolean = true;
  @Output() updateAndSaveAction = new EventEmitter();
  
  private logger: LoggerService = LoggerInstance.getInstance();
  constructor() { }

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
