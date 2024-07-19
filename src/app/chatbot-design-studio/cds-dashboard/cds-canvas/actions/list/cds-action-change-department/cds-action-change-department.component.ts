import { DepartmentService } from 'src/app/services/department.service';
import { ActionChangeDepartment } from 'src/app/models/action-model';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Department } from 'src/app/models/department-model';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { DashboardService } from 'src/app/services/dashboard.service';

@Component({
  selector: 'cds-action-change-department',
  templateUrl: './cds-action-change-department.component.html',
  styleUrls: ['./cds-action-change-department.component.scss']
})
export class CdsActionChangeDepartmentComponent implements OnInit {

  @Input() action: ActionChangeDepartment;
  @Input() previewMode: boolean = true;
  @Output() updateAndSaveAction = new EventEmitter();
  
  departments: Department[]

  private logger: LoggerService = LoggerInstance.getInstance();
  constructor(
    private dashboardService: DashboardService,
    ) { }

  ngOnInit(): void {
    this.logger.log("[ACTION CHANGE DEPARTMENT] action: ", this.action)
    
    this.departments = this.dashboardService.departments
    this.logger.log("[ACTION CHANGE DEPARTMENT] action: ", this.departments)
    //FIX: if chatbot is imported from other env/project --> reset selectedDepartmentId 
    if(this.action.depName){
      let actionDepIndex = this.departments.findIndex(dep => dep.name === this.action.depName)
      this.logger.log("[ACTION CHANGE DEPARTMENT] actionDepIndex: ", actionDepIndex)
      if(actionDepIndex === -1){
        this.action.depName = null;
      }
    }
  }


  onChangeSelect(event: {name: string, value: string}) {
    this.logger.log("[ACTION REPLACE BOT] onChangeActionButton event: ", event)
    this.action.depName = event.name;
    this.updateAndSaveAction.emit()
    this.logger.log("[ACTION REPLACE BOT] action edited: ", this.action)
  }


}