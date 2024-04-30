import { map } from 'rxjs/operators';
import { Injectable } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

// SERVICES //
import { FaqKbService } from 'src/app/services/faq-kb.service';
import { DepartmentService } from 'src/app/services/department.service';
import { ProjectService } from 'src/app/services/projects.service';

// MODEL //
import { Project } from 'src/app/models/project-model';
import { Chatbot } from 'src/app/models/faq_kb-model';
import { Department } from 'src/app/models/department-model';
// UTILS //
import { convertJsonToArray } from 'src/app/chatbot-design-studio/utils';
import { variableList } from 'src/app/chatbot-design-studio/utils-variables';

import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';



@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  id_faq_kb: string;
  id_faq: string;
  botType: string;
  intent_id: string;

  selectedChatbot: Chatbot;
  translateparamBotName: any;

  project: Project;
  projectID: string;

  departments: Department[]
  defaultDepartment: Department;

  private logger: LoggerService = LoggerInstance.getInstance();
  
  constructor(
    // private route: ActivatedRoute,
    private router: Router,
    private projectService: ProjectService,
    private faqKbService: FaqKbService,
    private departmentService: DepartmentService,
  ) { 
  }

  /** GET TRANSLATIONS */
  async getTranslations(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      // this.translateCreateFaqSuccessMsg();
      // this.translateCreateFaqErrorMsg();
      // this.translateUpdateFaqSuccessMsg();
      // this.translateUpdateFaqErrorMsg();
      // this.translateWarningMsg();
      // this.translateAreYouSure();
      // this.translateErrorDeleting();
      // this.translateDone();
      // this.translateErrorOccurredDeletingAnswer();
      // this.translateAnswerSuccessfullyDeleted();
      resolve(true);
    });
  }


  setParams(params){
    this.id_faq_kb = params.faqkbid;
    this.id_faq = params.faqid;
    this.botType = params.bottype;
    this.intent_id = params.intent_id;
    this.projectID = params.projectid
  }
  // // ----------------------------------------------------------
  // // GET FROM ROUTE PARAMS (PASSED FROM FAQ COMPONENT):
  // // THE FAQ ID - WHEN THE CALLBACK IS COMPLETED RUN GET-FAQ-BY-ID THAT RETURN THE OBJECT FAQ
  // // AND THE FAQ KB ID (THEN USED IN THE GOBACK)
  // // ----------------------------------------------------------


  // ----------------------------------------------------------
  // Get bot by id
  // ----------------------------------------------------------
  async getBotById(): Promise<boolean> {
    this.logger.log('[CDS DSHBRD] - GET BOT BY ID RES - chatbot', this.id_faq_kb);
    return new Promise((resolve, reject) => {
      this.faqKbService.getBotById(this.id_faq_kb).subscribe({ next: (chatbot: Chatbot) => {
          this.logger.log('[CDS DSHBRD] - GET BOT BY ID RES - chatbot', chatbot);
          if (chatbot) {
            this.selectedChatbot = chatbot;
            this.translateparamBotName = { bot_name: this.selectedChatbot.name }
            variableList.find(el => el.key ==='userDefined').elements = [];
            if (this.selectedChatbot && this.selectedChatbot.attributes && this.selectedChatbot.attributes.variables) {
              variableList.find(el => el.key ==='userDefined').elements = convertJsonToArray(this.selectedChatbot.attributes.variables);
            }
            if (this.selectedChatbot && this.selectedChatbot.attributes && this.selectedChatbot.attributes.globals) {
              variableList.find(el => el.key ==='globals').elements = this.selectedChatbot.attributes.globals.map(({
                key: name,
                ...rest
              }) => ({
                name,
                value: name
              }))
            }
            resolve(true);
          }
        }, error: (error) => {
          this.logger.error('[ DSHBRD-SERVICE ] getBotById ERROR: ', error);
          this.router.navigate([`project/unauthorized`]);
          reject(false);
          //redirect t ounauth
          //resolve(true)
        }, complete: () => {
          this.logger.log('COMPLETE ');
          resolve(true);
        }
      })
    });
  }

  // ----------------------------------------------------------
  // Get current project
  // ----------------------------------------------------------
  async getCurrentProject(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.projectService.getProjectById(this.projectID).subscribe({ next: (project: Project)=>{
        if (project) {
          this.project = project;
          this.projectID = project._id;
          resolve(true);
        }
      }, error: (error)=>{
        this.logger.error(' [ DSHBRD-SERVICE ] getCurrentProject ERROR: ', error);
        reject(false);
      }, complete: ()=> {
        this.logger.log('COMPLETE ');
        resolve(true);
      }})
    });
  }


  // ----------------------------------------------------------
  // Get depts
  // ----------------------------------------------------------
  getDeptsByProjectId(): Promise<boolean>{
   return new Promise((resolve, reject)=>{
    this.departmentService.getDeptsByProjectId().subscribe({ next: (departments: any) => {
      this.logger.log('[CDS DSHBRD] - DEPT GET DEPTS ', departments);
      if (departments) {
        this.departments = departments
        departments.forEach((dept: any) => {
          // this.logger.log('[CDS DSHBRD] - DEPT', dept);
          if (dept.default === true) {
            this.defaultDepartment = dept;
            return
          }
        })
        resolve(true);
      }
    }, error: (error) => {
      this.logger.error('[CDS DSHBRD] - DEPT - GET DEPTS  - ERROR', error);
      reject(false);
    }, complete: () => {
      this.logger.log('[CDS DSHBRD] - DEPT - GET DEPTS - COMPLETE');
      resolve(true);
    }});

   })
  }

}
