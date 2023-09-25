import { DepartmentService } from 'app/services/department.service';
import { ActionChangeDepartment } from 'app/models/intent-model';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Department } from 'app/models/department-model';
import { LoggerService } from 'app/services/logger/logger.service';

@Component({
  selector: 'cds-action-change-department',
  templateUrl: './cds-action-change-department.component.html',
  styleUrls: ['./cds-action-change-department.component.scss']
})
export class CdsActionChangeDepartmentComponent implements OnInit {

  @Input() action: ActionChangeDepartment;
  @Input() previewMode: boolean = true;
  @Output() updateAndSaveAction = new EventEmitter();
  
  deps_name_list: Array<{name: string, value: string, icon?:string}>;
  dep_selected: Department;

  constructor(
    private departmentService: DepartmentService,
    private logger: LoggerService,
    ) { }

  ngOnInit(): void {
    this.logger.log("[ACTION CHANGE DEPARTMENT] action: ", this.action)
    this.getAllDepartments();
  }

  getAllDepartments() {
    this.departmentService.getDeptsByProjectId().subscribe((deps) => {
      this.logger.log("[ACTION CHANGE DEPARTMENT] deps: ", deps);
      this.deps_name_list = deps.map(a => ({ name: a.name, value: a.name }));
    }, (error) => {
      this.logger.error("[ACTION CHANGE DEPARTMENT] error get deps: ", error);
    }, () => {
      this.logger.log("[ACTION CHANGE DEPARTMENT] get all deps completed.");
    })
  }

  onChangeSelect(event: {name: string, value: string}) {
    //this.logger.log("[ACTION REPLACE BOT] onChangeActionButton event: ", event)
    this.action.depName = event.value;
    this.updateAndSaveAction.emit()
    this.logger.log("[ACTION REPLACE BOT] action edited: ", this.action)
  }


}
