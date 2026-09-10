import { ACTIONS_LIST } from '../../../../../utils-actions';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ActionAgent } from 'src/app/models/action-model';
import { Department } from 'src/app/models/department-model';
import { DashboardService } from 'src/app/services/dashboard.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Component({
  selector: 'cds-action-agent',
  templateUrl: './cds-action-agent-handoff.component.html',
  styleUrls: ['./cds-action-agent-handoff.component.scss']
})
export class CdsActionAgentHandoffComponent implements OnInit {

  @Input() action: ActionAgent;
  @Input() previewMode: boolean = true;
  @Output() updateAndSaveAction = new EventEmitter();
  
  actions = ACTIONS_LIST
  departments: Department[]
  
  
  private logger: LoggerService = LoggerInstance.getInstance();
  constructor(
    private dashboardService: DashboardService,
  ) { }

  ngOnInit(): void {
    this.departments = this.dashboardService.departments
    this.logger.log("[ACTION AGENT HANDOFF] departments: ", this.departments)
  }

  onChangeSelect(event: {name: string, value: string}) {
    this.logger.log("[ACTION REPLACE BOT] onChangeActionButton event: ", event)
    this.action.depName = event.name;
    this.updateAndSaveAction.emit()
    this.logger.log("[ACTION REPLACE BOT] action edited: ", this.action)
  }

}
