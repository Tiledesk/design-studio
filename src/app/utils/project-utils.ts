import { Injectable, OnInit } from "@angular/core";
import { ProjectService } from "../services/projects.service";
import { Project } from "../models/project-model";
import { PLAN_NAME } from "src/chat21-core/utils/constants";
import { LoggerService } from "src/chat21-core/providers/abstract/logger.service";
import { LoggerInstance } from "src/chat21-core/providers/logger/loggerInstance";
import { TYPE_ACTION, TYPE_ACTION_VXML } from "../chatbot-design-studio/utils-actions";

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

    public checkIfCanLoad(actionType: TYPE_ACTION | TYPE_ACTION_VXML, actionPlanAvailability: PLAN_NAME): boolean{
        
        this.logger.log('[PROJECT_PROFILE] checkIfCanLoad -->', actionPlanAvailability, this.project)
        if(this.project.profile.type === 'free'){
            this.logger.log('[PROJECT_PROFILE] USECASE: Free Plan')
            if(actionType === TYPE_ACTION.CODE){
                 // ------------------------------------------------------------------------ 
                // USECASE: Free Plan and CODE ACTION--> do not show 
                // ------------------------------------------------------------------------
                return false
            }else if(this.project.trialExpired === false){
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
            this.logger.log('[PROJECT_PROFILE] USECASE: payment', this.project)
            
            /** check if the subscription is Active or NOT */
            if(this.project.isActiveSubscription === false){
                return false
            }

            /** get che current keyName for the current project (usefull to compare later)*/
            /** before: MAKE A COMPARE BETWEEN OLD AND NEW PROJECT TYPE
             * LEGEND: 
             * - A --> D
             * - B --> E
             * - C --> F
             */
            let currentPlanNameKey: string[] = ['A']
            switch(this.project.profile.name.toUpperCase()){
                case PLAN_NAME.A.toUpperCase(): {
                    this.logger.log('case A')
                    currentPlanNameKey = Object.keys(PLAN_NAME).filter(x => PLAN_NAME[x].toUpperCase() == PLAN_NAME.D.toUpperCase());
                    break;
                }
                case PLAN_NAME.B.toUpperCase(): {
                    this.logger.log('case B')
                    currentPlanNameKey = Object.keys(PLAN_NAME).filter(x => PLAN_NAME[x].toUpperCase() == PLAN_NAME.E.toUpperCase());
                    break;
                }
                case PLAN_NAME.C.toUpperCase(): {
                    this.logger.log('case C')
                    currentPlanNameKey = Object.keys(PLAN_NAME).filter(x => PLAN_NAME[x].toUpperCase() == PLAN_NAME.F.toUpperCase());
                    break;
                }
                default: {
                    currentPlanNameKey = Object.keys(PLAN_NAME).filter(x => PLAN_NAME[x].toUpperCase() == this.project.profile.name.toUpperCase());
                    break;
                }
                    
            }
            
            /** compare enums: current action enum plan >= current prject profile enum name (UPPERCASE)  */
            if(currentPlanNameKey.length>0){
                let actionPlanNameKey: string[] = Object.keys(PLAN_NAME).filter(x => PLAN_NAME[x].toUpperCase() == actionPlanAvailability.toUpperCase());
                this.logger.log('check plan availability: currentPlanNameKey VS actionPlanNameKey -->', currentPlanNameKey[0], actionPlanNameKey[0])
                // this.logger.log('check plan availability: PLAN currentPlanNameKey VS PLAN actionPlanNameKey -->', PLAN_NAME[currentPlanNameKey[0]]> PLAN_NAME[actionPlanNameKey[0]])
                return currentPlanNameKey[0] >= actionPlanNameKey[0] ? true: false; 
            }
            
            return false
       }
    }


    public checkIfIsEnabledInProject(actionType: TYPE_ACTION | TYPE_ACTION_VXML): boolean{
        
        this.logger.log('[PROJECT_PROFILE] checkIfIsEnabledInProject -->', actionType, this.project)
        if (this.project.profile['customization'] === undefined){
            // ------------------------------------------------------------------------ 
            // USECASE: customization obj not exist
            // ------------------------------------------------------------------------
            return false
        } else if(this.project.profile['customization'] && this.project.profile['customization']['actions'] === undefined){
            // ------------------------------------------------------------------------ 
            // USECASE: customization obj exist AND customization.actions obj not exist
            // ------------------------------------------------------------------------
            return false
        } else if(this.project.profile['customization'] && this.project.profile['customization']['actions'] !== undefined){
            // ------------------------------------------------------------------------ 
            // USECASE: customization obj AND customization.actions obj exists
            // ------------------------------------------------------------------------
            if(this.project.profile['customization']['actions'][actionType]){
                return true
            }
            return false
        }


        return true
    }



    
}