import { Injectable, OnInit } from "@angular/core";
import { ProjectService } from "../services/projects.service";
import { Project } from "../models/project-model";
import { PLAN_NAME } from "src/chat21-core/utils/constants";

@Injectable({
    providedIn: 'root'
})
export class ProjectPlanUtils {
    
    project: Project

    constructor(
        private projectService: ProjectService
    ){ 
        this.project = this.projectService.getCurrentProject()
    }

    public checkIfCanLoad(fromProjectPlan: PLAN_NAME): boolean{
        console.log('[PROJECT_PROFILE] checkIfCanLoad -->', fromProjectPlan, this.project)
        if(this.project.profile.type === 'free'){
            console.log('[PROJECT_PROFILE] USECASE: Free Plan', this.project)
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
            console.log('[PROJECT_PROFILE] USECASE: payment', this.project)
            if(this.project.profile.name === PLAN_NAME.A){
                return fromProjectPlan > PLAN_NAME.A? true: false; 
            }
       }
    }


    
}