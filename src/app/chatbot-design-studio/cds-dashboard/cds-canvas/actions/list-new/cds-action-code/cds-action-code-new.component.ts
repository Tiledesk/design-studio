import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { TYPE_UPDATE_ACTION } from 'src/app/chatbot-design-studio/utils';
import { ActionCode } from 'src/app/models/action-model';
import { Intent } from 'src/app/models/intent-model';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Component({
  selector: 'cds-action-code-new',
  templateUrl: './cds-action-code-new.component.html',
  styleUrls: ['./cds-action-code-new.component.scss']
})
export class CdsActionCodeNewComponent implements OnInit {

  @Input() intentSelected: Intent;
  @Input() action: ActionCode;
  @Input() previewMode: boolean = true;
  @Output() updateAndSaveAction = new EventEmitter();
  
  private logger: LoggerService = LoggerInstance.getInstance();
  
  constructor() { }

  ngOnInit(): void {
    this.logger.log("[ACTION CODE] action:", this.action);
  }


  onChangeTextarea(text){
    this.action.source = text;
    this.logger.log("[ACTION MAKE] this.action", this.action);
  }

  onBlur(event){
    this.updateAndSaveAction.emit();
  }

}
