import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ActionFlowLog } from 'src/app/models/action-model';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Component({
  selector: 'cds-action-flow-log',
  templateUrl: './cds-action-flow-log.component.html',
  styleUrls: ['./cds-action-flow-log.component.scss']
})
export class CdsActionFlowLogComponent implements OnInit {

  @Input() action: ActionFlowLog;
  @Input() previewMode: boolean = true;
  @Output() updateAndSaveAction = new EventEmitter();


  private logger: LoggerService = LoggerInstance.getInstance();
  
  constructor() {
    this.logger.log('[CdsActionFlowLogComponent]:: constructor', this.action);
  }

  ngOnInit(): void {
    this.logger.log('[CdsActionFlowLogComponent]:: ngOnInit', this.action);
  }

  onChangeTextArea(text:string) {
    this.logger.log('onChangeTextarea:: ', text);
    this.action.log = text;
  }

  onBlur(event){
    this.updateAndSaveAction.emit()
  }
}
