import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { LoggerService } from 'app/services/logger/logger.service';
import { ActionHideMessage } from 'app/models/intent-model';

@Component({
  selector: 'cds-action-hide-message',
  templateUrl: './cds-action-hide-message.component.html',
  styleUrls: ['./cds-action-hide-message.component.scss']
})
export class CdsActionHideMessageComponent implements OnInit {
  
  @Input() action: ActionHideMessage;
  @Input() previewMode: boolean = true;
  @Output() updateAndSaveAction = new EventEmitter();


  constructor(
    private logger: LoggerService
  ) { }

  ngOnInit(): void {
  }

  onChangeTextArea(text:string) {
    setTimeout(() => {
      // this.logger.log('onChangeTextarea:: ', text);
      this.action.text = text;
      this.updateAndSaveAction.emit()
    }, 500);
  }
}
