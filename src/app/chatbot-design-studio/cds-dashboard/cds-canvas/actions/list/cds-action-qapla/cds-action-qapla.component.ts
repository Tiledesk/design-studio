import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ActionQapla } from 'src/app/models/action-model';
import { Intent } from 'src/app/models/intent-model';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { variableList } from '../../../../../utils';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { Project } from 'src/app/models/project-model';
import { DashboardService } from 'src/app/services/dashboard.service';
import { AppConfigService } from 'src/app/services/app-config';

@Component({
  selector: 'cds-action-qapla',
  templateUrl: './cds-action-qapla.component.html',
  styleUrls: ['./cds-action-qapla.component.scss']
})
export class CdsActionQaplaComponent implements OnInit {

  @Input() intentSelected: Intent;
  @Input() action: ActionQapla;
  @Input() previewMode: boolean = true;
  @Output() updateAndSaveAction = new EventEmitter;

  project: Project;
  action_locked: boolean = false;

  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private dashboardService: DashboardService,
    private appConfigService: AppConfigService,
  ) { }

  ngOnInit(): void {
    console.log("[ACTION QAPLA] action:", this.action);
    this.initializeAttributes();
    this.project = this.dashboardService.project;
    console.log("this.project: ", this.project);
    this.availabilityCheck();
  }

  availabilityCheck() {
    console.log("availabilityCheck profile plan: ", this.project.profile)
    // if (this.project.profile.name !== 'Scale' && this.project.profile.name !== 'Plus') {
    //   console.log("availabilityCheck BLOCK ACTION!!");
    //   this.action_locked = true;
    // }
  }
  
  private initializeAttributes() {
    let new_attributes = [];
    if (!variableList.userDefined.some(v => v.name === 'qapla_status')) {
      new_attributes.push({ name: "qapla_status", value: "qapla_status" });
    }
    if (!variableList.userDefined.some(v => v.name === 'qapla_result')) {
      new_attributes.push({ name: "qapla_result", value: "qapla_result" });
    }
    if (!variableList.userDefined.some(v => v.name === 'qapla_error')) {
      new_attributes.push({ name: "qapla_error", value: "qapla_error" });
    }
    variableList.userDefined = [...variableList.userDefined, ...new_attributes];
    this.logger.debug("[ACTION GPT-TASK] Initialized variableList.userDefined: ", variableList.userDefined);
  }

  changeTextarea($event: string, property: string) {
    this.logger.debug("[ACTION QAPLA] changeTextarea event: ", $event);
    this.logger.debug("[ACTION QAPLA] changeTextarea propery: ", property);
    this.action[property] = $event;
    console.log("[ACTION QAPLA] Action updated: ", this.action);
    // this.updateAndSaveAction.emit();  
  }

  onSelectedAttribute(event, property) {
    this.logger.log("[ACTION QAPLA] onEditableDivTextChange event", event)
    this.logger.log("[ACTION QAPLA] onEditableDivTextChange property", property)
    this.action[property] = event.value;
    console.log("[ACTION QAPLA] Action updated: ", this.action);
    this.updateAndSaveAction.emit();
  }

  goToPricing() {
    let dashbordBaseUrl = this.appConfigService.getConfig().dashboardBaseUrl + '#/project/'+ this.dashboardService.projectID + '/pricing'
    window.open(dashbordBaseUrl, '_self')
    //this.hideShowWidget('show');
  }
  
  onBlur(event){
    this.updateAndSaveAction.emit();
  }
}
