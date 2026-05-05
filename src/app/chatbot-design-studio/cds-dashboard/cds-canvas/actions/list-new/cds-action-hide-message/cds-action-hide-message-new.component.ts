import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ActionHideMessage } from 'src/app/models/action-model';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Component({
  selector: 'cds-action-hide-message-new',
  templateUrl: './cds-action-hide-message-new.component.html',
  styleUrls: ['./cds-action-hide-message-new.component.scss']
})
export class CdsActionHideMessageNewComponent implements OnInit {
  
  @Input() action: ActionHideMessage;
  @Input() previewMode: boolean = true;
  @Output() updateAndSaveAction = new EventEmitter();


  private logger: LoggerService = LoggerInstance.getInstance();
  
  constructor() { }

  ngOnInit(): void {
  }

  onChangeTextArea(text:string) {
    // this.logger.log('onChangeTextarea:: ', text);
    this.action.text = text;
  }

  onBlur(event){
    this.updateAndSaveAction.emit()
  }
}
