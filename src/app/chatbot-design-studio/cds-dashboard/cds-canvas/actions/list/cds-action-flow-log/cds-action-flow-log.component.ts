import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { LOG_LEVELS } from 'src/app/chatbot-design-studio/utils';
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

  LOG_LEVELS = LOG_LEVELS;
  selectedLogLevel: string = LOG_LEVELS.NATIVE;
  logLevelsArray = Object.entries(LOG_LEVELS).map(([key, value]) => ({ key, value }));
  filteredLogs: Array<any> = [];

  private logger: LoggerService = LoggerInstance.getInstance();
  
  constructor() {
    this.logger.log('[CdsActionFlowLogComponent]:: constructor', this.action);
  }

  ngOnInit(): void {
    this.selectedLogLevel = this.action.level;
    this.logger.log('[CdsActionFlowLogComponent]:: ngOnInit', this.action);
  }

  onChangeTextArea(text:string) {
    this.logger.log('[CdsActionFlowLogComponent]:: onChangeTextarea ', text);
    this.action.log = text;
  }

  onBlur(event){
    this.updateAndSaveAction.emit();
  }

  onLogLevelChange(event: any) {
    this.selectedLogLevel = event.value;
    this.action.level = event.value;
    this.logger.log('[CdsActionFlowLogComponent] onLogLevelChange:', event);
    this.updateAndSaveAction.emit();
  }

  
}
