import { Injectable } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

// SERVICES //
import { FaqKbService } from 'src/app/services/faq-kb.service';
import { DepartmentService } from 'src/app/services/department.service';

// MODEL //
import { Project } from 'src/app/models/project-model';
import { Chatbot } from 'src/app/models/faq_kb-model';

// UTILS //
import { variableList, convertJsonToArray } from 'src/app/chatbot-design-studio/utils';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { ProjectService } from 'src/app/services/projects.service';

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

  isChromeVerGreaterThan100: boolean;
  defaultDepartmentId: string;

  private logger: LoggerService = LoggerInstance.getInstance();
  
  constructor(
    private route: ActivatedRoute,
    private projectService: ProjectService,
    private faqKbService: FaqKbService,
    private departmentService: DepartmentService,
  ) { }

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
  }
  // // ----------------------------------------------------------
  // // GET FROM ROUTE PARAMS (PASSED FROM FAQ COMPONENT):
  // // THE FAQ ID - WHEN THE CALLBACK IS COMPLETED RUN GET-FAQ-BY-ID THAT RETURN THE OBJECT FAQ
  // // AND THE FAQ KB ID (THEN USED IN THE GOBACK)
  // // ----------------------------------------------------------

  async getUrlParams(): Promise<boolean> {
    
    return new Promise((resolve, reject) => {
      this.route.params.subscribe({ next: (params) => {
          console.log('paramssssss', params)
          this.id_faq_kb = params['faqkbid'];
          this.id_faq = params['faqid'];
          this.botType = params['bottype'];
          this.intent_id = params['intent_id'];
          this.logger.log('[CDS DSHBRD] getUrlParams  PARAMS', params);
          this.logger.log('[CDS DSHBRD] getUrlParams  BOT ID ', this.id_faq_kb);
          this.logger.log('[CDS DSHBRD] getUrlParams  FAQ ID ', this.id_faq);
          this.logger.log('[CDS DSHBRD] getUrlParams  FAQ ID ', this.intent_id);
          console.log('[CDS DSHBRD] getUrlParams', params);
          resolve(true);
        }, error: (error) => {
          this.logger.error('ERROR: ', error);
          console.log('ERROR', error);
          reject(false);
        }, complete: () => {
          console.log('COMPLETE');
        }
      });
    });
  }


  // ----------------------------------------------------------
  // Get bot by id
  // ----------------------------------------------------------
  async getBotById(): Promise<boolean> {
    console.log('[CDS DSHBRD] - GET BOT BY ID RES - chatbot', this.id_faq_kb);
    return new Promise((resolve, reject) => {
      this.faqKbService.getBotById(this.id_faq_kb).subscribe({ next: (chatbot: Chatbot) => {
          console.log('[CDS DSHBRD] - GET BOT BY ID RES - chatbot', chatbot);
          if (chatbot) {
            this.selectedChatbot = chatbot;
            this.translateparamBotName = { bot_name: this.selectedChatbot.name }
            if (this.selectedChatbot && this.selectedChatbot.attributes && this.selectedChatbot.attributes.variables) {
              variableList.userDefined = convertJsonToArray(this.selectedChatbot.attributes.variables);
            } else {
              variableList.userDefined = [];
            }
            resolve(true);
          }
        }, error: (error) => {
          this.logger.error('ERROR: ', error);
          reject(false);
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
        this.logger.error('ERROR: ', error);
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
  getDeptsByProjectId(){
   return this.departmentService.getDeptsByProjectId().subscribe({ next: (departments: any) => {
      this.logger.log('[CDS DSHBRD] - DEPT GET DEPTS ', departments);
      if (departments) {
        departments.forEach((dept: any) => {
          // this.logger.log('[CDS DSHBRD] - DEPT', dept);
          if (dept.default === true) {
            this.defaultDepartmentId = dept._id;
            return this.defaultDepartmentId;
          }
        })
      }
      return false;
    }, error: (error) => {
      this.logger.error('[CDS DSHBRD] - DEPT - GET DEPTS  - ERROR', error);
      return false;
    }, complete: () => {
      this.logger.log('[CDS DSHBRD] - DEPT - GET DEPTS - COMPLETE');
    }
   });
  }

}
