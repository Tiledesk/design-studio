import { Injectable } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';

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

  // --- State reattivo ---
  private _selectedChatbot$ = new BehaviorSubject<Chatbot | null>(null);
  private _project$ = new BehaviorSubject<Project | null>(null);
  private _defaultDepartment$ = new BehaviorSubject<Department | null>(null);

  /** Observable pubblici (per future migrazioni a state reattivo) */
  selectedChatbot$ = this._selectedChatbot$.asObservable();
  project$ = this._project$.asObservable();
  defaultDepartment$ = this._defaultDepartment$.asObservable();

  /** Getter/Setter compatibili con il codice esistente */
  get selectedChatbot(): Chatbot | null {
    return this._selectedChatbot$.getValue();
  }
  set selectedChatbot(value: Chatbot | null) {
    this._selectedChatbot$.next(value);
  }

  translateparamBotName: any;

  get project(): Project | null {
    return this._project$.getValue();
  }
  set project(value: Project | null) {
    this._project$.next(value);
  }

  projectID: string;

  departments: Department[]

  get defaultDepartment(): Department | null {
    return this._defaultDepartment$.getValue();
  }
  set defaultDepartment(value: Department | null) {
    this._defaultDepartment$.next(value);
  }

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
  /**
   * Versione "pura": restituisce l'Observable del chatbot per un dato botId,
   * senza modificare lo stato interno né fare side-effect.
   * Utile per usi reattivi (es. nel facade o in altri componenti).
   * Nota: FaqKb è il tipo base, ma viene trattato come Chatbot nel codice esistente.
   */
  loadBot$(botId: string): Observable<any> {
    this.logger.log('[CDS DSHBRD] - LOAD BOT BY ID -', botId);
    return this.faqKbService.getBotById(botId);
  }

  /**
   * Applica i side-effect necessari dopo il caricamento del chatbot
   * (aggiorna stato interno, variableList, ecc.)
   */
  applyBotSideEffects(chatbot: Chatbot): void {
    this.selectedChatbot = chatbot;
    this.translateparamBotName = { bot_name: this.selectedChatbot.name };
    variableList.find(el => el.key === 'userDefined').elements = [];
    if (this.selectedChatbot && this.selectedChatbot.attributes && this.selectedChatbot.attributes.variables) {
      variableList.find(el => el.key === 'userDefined').elements = convertJsonToArray(this.selectedChatbot.attributes.variables);
    }
    if (this.selectedChatbot && this.selectedChatbot.attributes && this.selectedChatbot.attributes.globals) {
      variableList.find(el => el.key === 'globals').elements = this.selectedChatbot.attributes.globals.map(({
        key: name,
        ...rest
      }) => ({
        name,
        value: name
      }));
    }
  }

  async getBotById(): Promise<boolean> {
    this.logger.log('[CDS DSHBRD] - GET BOT BY ID RES - chatbot', this.id_faq_kb);
    return new Promise((resolve, reject) => {
      this.loadBot$(this.id_faq_kb).subscribe({
        next: (chatbot: Chatbot) => {
          this.logger.log('[CDS DSHBRD] - GET BOT BY ID RES - chatbot', chatbot);
          if (chatbot) {
            this.applyBotSideEffects(chatbot);
            resolve(true);
          }
        },
        error: (error) => {
          this.logger.error('[ DSHBRD-SERVICE ] getBotById ERROR: ', error);
          this.router.navigate([`project/unauthorized`]);
          reject(false);
        },
        complete: () => {
          this.logger.log('COMPLETE ');
          resolve(true);
        }
      });
    });
  }

  // ----------------------------------------------------------
  // Get current project
  // ----------------------------------------------------------
  /**
   * Versione \"pura\": restituisce l'Observable del progetto per un dato projectId,
   * senza modificare lo stato interno né fare side-effect (es. redirect).
   * Utile per usi reattivi (es. nel facade o in altri componenti).
   */
  loadProject$(projectId: string): Observable<Project> {
    this.logger.log('[CDS DSHBRD] - LOAD PROJECT BY ID -', projectId);
    return this.projectService.getProjectById(projectId);
  }

  async getCurrentProject(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.loadProject$(this.projectID).subscribe({
        next: (project: Project) => {
          if (project) {
            this.project = project;
            this.projectID = project._id;
            resolve(true);
          }
        },
        error: (error) => {
          this.logger.error(' [ DSHBRD-SERVICE ] getCurrentProject ERROR: ', error);
          reject(false);
        },
        complete: () => {
          this.logger.log('COMPLETE ');
        }
      });
    });
  }


  // ----------------------------------------------------------
  // Get depts
  // ----------------------------------------------------------
  /**
   * Versione "pura": restituisce l'Observable dei dipartimenti,
   * senza modificare lo stato interno né fare side-effect.
   * Utile per usi reattivi (es. nel facade o in altri componenti).
   */
  loadDepartments$(): Observable<Department[]> {
    this.logger.log('[CDS DSHBRD] - LOAD DEPARTMENTS');
    return this.departmentService.getDeptsByProjectId();
  }

  /**
   * Applica i side-effect necessari dopo il caricamento dei dipartimenti
   * (aggiorna stato interno, trova defaultDepartment, ecc.)
   */
  applyDepartmentsSideEffects(departments: Department[]): void {
    this.departments = departments;
    departments.forEach((dept: any) => {
      if (dept.default === true) {
        this.defaultDepartment = dept;
        return;
      }
    });
  }

  getDeptsByProjectId(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.loadDepartments$().subscribe({
        next: (departments: any) => {
          this.logger.log('[CDS DSHBRD] - DEPT GET DEPTS ', departments);
          if (departments) {
            this.applyDepartmentsSideEffects(departments);
            resolve(true);
          }
        },
        error: (error) => {
          this.logger.error('[CDS DSHBRD] - DEPT - GET DEPTS  - ERROR', error);
          reject(false);
        },
        complete: () => {
          this.logger.log('[CDS DSHBRD] - DEPT - GET DEPTS - COMPLETE');
          resolve(true);
        }
      });
    });
  }

}
