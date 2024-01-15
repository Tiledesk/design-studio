import { Injectable, OnInit } from "@angular/core";
import { ProjectService } from "../services/projects.service";
import { Project } from "../models/project-model";
import { PLAN_NAME } from "src/chat21-core/utils/constants";
import { LoggerService } from "src/chat21-core/providers/abstract/logger.service";
import { LoggerInstance } from "src/chat21-core/providers/logger/loggerInstance";

@Injectable({
    providedIn: 'root'
})
export class ProjectPlanUtils {
    
    project: Project

    private logger: LoggerService = LoggerInstance.getInstance()
    constructor(
        private projectService: ProjectService
    ){ 
        this.project = this.projectService.getCurrentProject()
    }

    public checkIfCanLoad(actionPlanAvailability: PLAN_NAME): boolean{
        
        this.logger.log('[PROJECT_PROFILE] checkIfCanLoad -->', actionPlanAvailability, this.project)
        if(this.project.profile.type === 'free'){
            this.logger.log('[PROJECT_PROFILE] USECASE: Free Plan')
            if(this.project.trialExpired === false){
                // ------------------------------------------------------------------------ 
                // USECASE: Free Plan (TRIAL ACTIVE i.e. Scale trial)
                // ------------------------------------------------------------------------
                return true
            }else {
                // ------------------------------------------------------------------------
                // USECASE: Free Plan (TRIAL EXPIRED)
                // ------------------------------------------------------------------------
                return false
            }
       }else if(this.project.profile.type === 'payment'){
            // ------------------------------------------------------------------------ 
            // USECASE: PAYMENT Plan (TRIAL ACTIVE i.e. Scale trial)
            // ------------------------------------------------------------------------
            console.log('[PROJECT_PROFILE] USECASE: payment', this.project)
            /** get che current keyName for the current project (usefull to compare later)*/
            let currentPlanNameKey = Object.keys(PLAN_NAME).filter(x => PLAN_NAME[x].toUpperCase() == this.project.profile.name.toUpperCase());
            console.log('[PROJECT_PROFILE] currentPlanNameKey from list -->', currentPlanNameKey)
            /** compare enums: current action enum plan >= current prject profile enum name (UPPERCASE)  */
            if(currentPlanNameKey.length>0){
                return actionPlanAvailability >= PLAN_NAME[currentPlanNameKey[0]]? true: false; 
            }
            return false
       }
    }


    
}