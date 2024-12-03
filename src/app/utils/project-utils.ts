import { filter } from 'rxjs';
import { ACTIONS_LIST, ACTION_CATEGORY, TYPE_ACTION_CATEGORY, getKeyByValue } from 'src/app/chatbot-design-studio/utils-actions';
import { Injectable, OnInit } from "@angular/core";
import { ProjectService } from "../services/projects.service";
import { Project } from "../models/project-model";
import { PLAN_NAME } from "src/chat21-core/utils/constants";
import { LoggerService } from "src/chat21-core/providers/abstract/logger.service";
import { LoggerInstance } from "src/chat21-core/providers/logger/loggerInstance";
import { TYPE_ACTION, TYPE_ACTION_VXML } from "../chatbot-design-studio/utils-actions";
import { AppConfigService } from '../services/app-config';
import { variableList } from '../chatbot-design-studio/utils-variables';

@Injectable({
    providedIn: 'root'
})
export class ProjectPlanUtils {
    
    project: Project

    private logger: LoggerService = LoggerInstance.getInstance()
    constructor(
        private projectService: ProjectService,
        private appConfigService: AppConfigService
    ){ 
        this.project = this.projectService.getCurrentProject();
        this.checkIfKBSCanLoad();
        this.checkIfActionCategoryIsInProject(TYPE_ACTION_CATEGORY.VOICE);
        this.checkIfActionCategoryIsInProject(TYPE_ACTION_CATEGORY['VOICE-TWILIO']);
        this.checkActionCanShow(TYPE_ACTION.CONNECT_BLOCK)
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

    public checkIfActionCategoryIsInProject(actionType: TYPE_ACTION_CATEGORY){
        
        let categoryKey = getKeyByValue(actionType, TYPE_ACTION_CATEGORY).toLowerCase();
        this.logger.log('[PROJECT_PROFILE] checkIfActionCategoryIsInProject -->', actionType, categoryKey, this.project)
        if (this.project.profile['customization'] === undefined){
            // ------------------------------------------------------------------------ 
            // USECASE: customization obj not exist
            // ------------------------------------------------------------------------
            this.hideActionType(actionType);
            return;
        } else if(this.project.profile['customization'] && this.project.profile['customization'][categoryKey] === undefined){
            // ------------------------------------------------------------------------ 
            // USECASE: customization obj exist AND customization.[actionType] obj not exist
            // ------------------------------------------------------------------------
            this.hideActionType(actionType);
            return;
        } else if(this.project.profile['customization'] && this.project.profile['customization'][categoryKey] !== undefined){
            // ------------------------------------------------------------------------ 
            // USECASE: customization obj AND customization.[actionType] obj exists
            // ------------------------------------------------------------------------
            if(this.project.profile['customization'][categoryKey]===false){
                this.hideActionType(actionType);
                return true
            }
            return;
        }


        return true
    }


    public checkIfKBSCanLoad(){
        this.logger.log('[PROJECT_PROFILE] checkIfCategoryCanLoad -->', this.project);

        // --1: check into env
        let public_Key = this.appConfigService.getConfig().t2y12PruGU9wUtEGzBJfolMIgK;
        let keys = public_Key.split("-");
        this.logger.log('[PROJECT_PROFILE] checkIfCategoryCanLoad keys -->', keys);
        if (public_Key.includes("KNB") === true) {
            keys.forEach(key => {
                // this.logger.log('NavbarComponent public_Key key', key)
                if (key.includes("KNB")) {
                    // this.logger.log('PUBLIC-KEY (TRY_ON_WA) - key', key);
                    let tow = key.split(":");
                    // this.logger.log('PUBLIC-KEY (TRY_ON_WA) - mt key&value', mt);
                    if (tow[1] === "F") {
                        this.hideActionType(TYPE_ACTION_CATEGORY.AI)
                        return;
                    }
                }
            });
    
        }else {
            this.logger.log('[PROJECT_PROFILE] keys KNB not exist', keys);
            this.hideActionType(TYPE_ACTION_CATEGORY.AI)
            return;
        }


        // --2: check into PROJECT PROFILE
        // --2.1: customization obj
        // --2.2: quotes obj
        if (this.project.profile['customization'] === undefined){
            // ------------------------------------------------------------------------ 
            // USECASE: customization obj not exist
            // ------------------------------------------------------------------------
            return;
        }else if(this.project.profile['customization'] && this.project.profile['customization']['knowledgeBases'] === undefined){
            // ------------------------------------------------------------------------ 
            // USECASE: customization obj exist AND customization.knowledgeBases obj not exist
            // ------------------------------------------------------------------------
            return;
        }else if(this.project.profile['customization'] && this.project.profile['customization']['knowledgeBases'] !== undefined){
            // ------------------------------------------------------------------------ 
            // USECASE: customization obj AND customization.knowledgeBases obj exists with FALSE value
            // ------------------------------------------------------------------------
            if(this.project.profile['customization']['knowledgeBases'] === false){
                this.hideActionType(TYPE_ACTION_CATEGORY.AI)
            }else if(this.project.profile['customization']['knowledgeBases']){
                // ------------------------------------------------------------------------ 
                // USECASE: customization obj AND customization.knowledgeBases obj exists with TRUE value
                // ------------------------------------------------------------------------
                if(this.project.profile['quotes'] && this.project.profile['quotes']['kbs']){
                    this.project.profile['quotes']['kbs'] === 0?  this.hideActionType(TYPE_ACTION_CATEGORY.AI): null;
                }
            }
            return;
        }
    }

    /** hide action by 
     *  1. CATEGORY TYPE
     *  2. ACTION LIST
     *  3. ATTRIBUTE LIST ASSOCIATED WITH
     */
    private hideActionType(actionType: TYPE_ACTION_CATEGORY){
        this.logger.log('[PROJECT_PROFILE] hideActionType', actionType);
        
        //MANAGE ACTION CATEGORIES
        let index = ACTION_CATEGORY.findIndex(el => el.type === getKeyByValue(actionType, TYPE_ACTION_CATEGORY));
        if(index > -1){
            ACTION_CATEGORY.splice(index,1)
        }
        
        //MANAGE ACTION LIST
        Object.values(ACTIONS_LIST).filter(el => el.category == actionType).map( el => el.status = 'inactive')


        //MANAGE VOICE ATTRIBUTES LIST
        if(actionType === TYPE_ACTION_CATEGORY.VOICE){
            let index = variableList.findIndex(el => el.key === 'voiceFlow')
            if(index > -1){
                variableList.splice(index,1)
            }
        }


    }

    /** CHECK IF ACTION IS IN 'customization' 
     * IF NOT: 
     *  --- remove action type from list 
     */
    private checkActionCanShow(action: TYPE_ACTION | TYPE_ACTION_VXML){
        let status = this.checkIfIsEnabledInProject(action)
        if(!status){
            Object.values(ACTIONS_LIST).filter(el => el.type == action).map( el => el.status = 'inactive')
        }
    }

}