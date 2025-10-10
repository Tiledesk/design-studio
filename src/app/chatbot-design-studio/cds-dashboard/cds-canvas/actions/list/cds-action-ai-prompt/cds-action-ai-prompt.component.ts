import { Component, ElementRef, EventEmitter, HostListener, Input, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { firstValueFrom, Observable, Subscription } from 'rxjs';

//MODELS
import { ActionAiPrompt } from 'src/app/models/action-model';
import { Intent } from 'src/app/models/intent-model';

//SERVICES
import { OpenaiService } from 'src/app/services/openai.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { MatDialog } from '@angular/material/dialog';
import { AppConfigService } from 'src/app/services/app-config';
import { IntentService } from 'src/app/chatbot-design-studio/services/intent.service';

//UTILS
import { AttributesDialogAiPromptComponent } from './attributes-dialog/attributes-dialog.component';
import { DOCS_LINK, TYPE_GPT_MODEL, TYPE_UPDATE_ACTION } from 'src/app/chatbot-design-studio/utils';
import { variableList } from 'src/app/chatbot-design-studio/utils-variables';
import { DashboardService } from 'src/app/services/dashboard.service';
import { PLAN_NAME } from 'src/chat21-core/utils/constants';
import { TranslateService } from '@ngx-translate/core';
import { loadTokenMultiplier } from 'src/app/utils/util';
import { BRAND_BASE_INFO } from 'src/app/chatbot-design-studio/utils-resources';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { ANTHROPIC_MODEL, COHERE_MODEL, DEEPSEEK_MODEL, DEFAULT_MODEL, GOOGLE_MODEL, GROQ_MODEL, LLM_MODEL, OLLAMA_MODEL, OPENAI_MODEL, generateLlmModelsFlat } from 'src/app/chatbot-design-studio/utils-ai_models';
import { checkConnectionStatusOfAction, updateConnector } from 'src/app/chatbot-design-studio/utils-connectors';
import { ProjectService } from 'src/app/services/projects.service';
import { sortAutocompleteOptions, getModelsByName, getIntegrations, setModel, initLLMModels, getIntegrationModels, LlmModel } from 'src/app/chatbot-design-studio/utils-llm-models';

@Component({
  selector: 'cds-action-ai-prompt',
  templateUrl: './cds-action-ai-prompt.component.html',
  styleUrls: ['./cds-action-ai-prompt.component.scss']
})
export class CdsActionAiPromptComponent implements OnInit {
  
  @ViewChild('scrollMe', { static: false }) scrollContainer: ElementRef;
  
  @Input() intentSelected: Intent;
  @Input() action: ActionAiPrompt;
  @Input() project_id: string; 
  @Input() previewMode: boolean = true;
  @Output() updateAndSaveAction = new EventEmitter;
  @Output() onConnectorChange = new EventEmitter<{type: 'create' | 'delete',  fromId: string, toId: string}>()
  
  listOfIntents: Array<{name: string, value: string, icon?:string}>;

  panelOpenState = false;
  llm_models: Array<{ name: string, value: string, src: string, models: Array<{ name: string, value: string, status: "active" | "inactive" }> }> = [];
  llm_options_models: Array<{ name: string, value: string, status: "active" | "inactive" }> = [];
  ai_setting: { [key: string] : {name: string,  min: number, max: number, step: number}} = {
    "max_tokens": { name: "max_tokens",  min: 10, max: 8192, step: 1},
    "temperature" : { name: "temperature", min: 0, max: 1, step: 0.05}
  }
  ai_response: string = "";
  ai_error: string = "Oops! Something went wrong. Check your GPT Key or retry in a few moment."
  // ai_error: string = "Oops! Something went wrong."

  showPreview: boolean = false;
  missingVariables: boolean = true;
  showVariablesBtn: boolean = false;
  showVariablesSection: boolean = false;
  showAiError: boolean = false;
  searching: boolean = false;
  temp_variables = [];
  actionLabelModel: string = "";
  selectedModelConfigured: boolean = true;


  default_model = DEFAULT_MODEL;
  llm_model = LLM_MODEL;
  llm_models_flat: Array<LlmModel>;
  llm_model_selected: LlmModel = {} as LlmModel;

  private isInitializing = {
    'llm_model': true,
    'context': true,
    'question': true
  };


  // Connectors
  idIntentSelected: string;
  idConnectorTrue: string;
  idConnectorFalse: string;
  idConnectionTrue: string;
  idConnectionFalse: string;
  isConnectedTrue: boolean = false;
  isConnectedFalse: boolean = false;
  connector: any;
  private subscriptionChangedConnector: Subscription;

  projectPlan: PLAN_NAME;
  PLAN_NAME = PLAN_NAME;
  BRAND_BASE_INFO = BRAND_BASE_INFO;
  DOCS_LINK = DOCS_LINK.GPT_TASK;
  private readonly logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private readonly dialog: MatDialog,
    private readonly openaiService: OpenaiService,
    private readonly intentService: IntentService,
    private readonly appConfigService: AppConfigService,
    private readonly translate: TranslateService,
    private readonly dashboardService: DashboardService,
    private readonly projectService: ProjectService
  ) { }


  async ngOnInit(): Promise<void> {
    this.logger.log("[ACTION AI_PROMPT] ngOnInit action: ", this.action);

    this.project_id = this.dashboardService.projectID;
    // const ai_models = loadTokenMultiplier(this.appConfigService.getConfig().aiModels);
    await getIntegrationModels(this.projectService, this.dashboardService, this.logger, this.llm_model, 'ollama');
    await getIntegrationModels(this.projectService, this.dashboardService, this.logger, this.llm_model, 'vllm');

    this.llm_models = this.llm_model.filter(el => el.status === 'active');
    this.projectPlan = this.dashboardService.project.profile.name
    this.subscriptionChangedConnector = this.intentService.isChangedConnector$.subscribe((connector: any) => {
      this.logger.debug('[ACTION AI_PROMPT] isChangedConnector -->', connector);
      let connectorId = this.idIntentSelected+"/"+this.action._tdActionId;
      if(connector.fromId.startsWith(connectorId)){
        this.connector = connector;
        this.updateConnector();
      }
    });
    if(this.intentSelected){
      this.initializeConnector();
    }
    this.initializeAttributes();
    if (!this.action.preview) {
      this.action.preview = [];
    }
    await this.initialize();
    
    // Fine dell'inizializzazione - reset di tutti i flag
    this.isInitializing = {
      'llm_model': false,
      'context': false,
      'question': false
    };
  }

  ngOnChanges(changes: SimpleChanges) {
    // // empty
  }

  ngOnDestroy() {
    if (this.subscriptionChangedConnector) {
      this.subscriptionChangedConnector.unsubscribe();
    }
  }


  private async initialize(){
    await this.initLLMModels();
    this.setModel(this.action.modelName?this.action.modelName:this.default_model.name);
    this.logger.log("[ACTION AI_PROMPT] initialize llm_options_models: ", this.action);
  }


  async initLLMModels(){
    const result = await initLLMModels({
      projectService: this.projectService,
      dashboardService: this.dashboardService,
      appConfigService: this.appConfigService,
      logger: this.logger,
      componentName: 'ACTION AI_PROMPT'
    });
    this.llm_models_flat = result;
  }





  initializeConnector() {
    this.idIntentSelected = this.intentSelected.intent_id;
    this.idConnectorTrue = this.idIntentSelected+'/'+this.action._tdActionId + '/true';
    this.idConnectorFalse = this.idIntentSelected+'/'+this.action._tdActionId + '/false';
    this.listOfIntents = this.intentService.getListOfIntents();
    this.checkConnectionStatus();
  }
  
  private checkConnectionStatus(){
    const resp = checkConnectionStatusOfAction(this.action, this.idConnectorTrue, this.idConnectorFalse);
    this.isConnectedTrue    = resp.isConnectedTrue;
    this.isConnectedFalse   = resp.isConnectedFalse;
    this.idConnectionTrue   = resp.idConnectionTrue;
    this.idConnectionFalse  = resp.idConnectionFalse;
  }

  private updateConnector(){
    this.logger.log('[ACTION AI_PROMPT] updateConnector:');
    const resp = updateConnector(this.connector, this.action, this.isConnectedTrue, this.isConnectedFalse, this.idConnectionTrue, this.idConnectionFalse);
    if(resp){
      this.isConnectedTrue    = resp.isConnectedTrue;
      this.isConnectedFalse   = resp.isConnectedFalse;
      this.idConnectionTrue   = resp.idConnectionTrue;
      this.idConnectionFalse  = resp.idConnectionFalse;
      this.logger.log('[ACTION AI_PROMPT] updateConnector:', resp);
      if (resp.emit) {
        this.updateAndSaveAction.emit({ type: TYPE_UPDATE_ACTION.CONNECTOR, element: this.connector });
      } 
    }
  }


  private initializeAttributes() {
    let new_attributes = [];
    if (!variableList.find(el => el.key ==='userDefined').elements.some(v => v.name === 'ai_reply')) {
      new_attributes.push({ name: "ai_reply", value: "ai_reply" });
    }
    variableList.find(el => el.key ==='userDefined').elements = [...variableList.find(el => el.key ==='userDefined').elements, ...new_attributes];
    this.logger.debug("[ACTION AI_PROMPT] Initialized variableList.userDefined: ", variableList.find(el => el.key ==='userDefined'));
  }


  onChangeTextarea(event: string, labelModel: string, property: string) {
    this.logger.log("[ACTION AI_PROMPT] changeTextarea event: ", event, labelModel, property, this.isInitializing[property]);
    // Ignora le chiamate durante l'inizializzazione per questa proprietà specifica
    if (this.isInitializing[property]) {
      this.isInitializing[property] = false;
      return;
    }
    if(property === 'model'){
      this.action['labelModel'] = event;
    } else if (property === 'question'){
      this.action['question'] = event;
    } else if (property === 'context'){
      this.action['context'] = event;
    } 
  }


setModel(modelName: string){
  const result = setModel(modelName, this.llm_models_flat, this.logger);
  this.llm_model_selected = result;
  this.logger.log("[ACTION AI_PROMPT] llm_model_selected: ", this.llm_model_selected);
  this.action.llm = result?.llm?result.llm:'';
  this.action.model = result?.model?result.model:'';
  this.action.modelName = result?.modelName?result.modelName:'';
  this.logger.log("[ACTION AI_PROMPT] action: ", this.action);
}


  onBlur(event: string){
    this.logger.log("[ACTION AI_PROMPT] onBlur event: ", event, this.action);
    this.updateAndSaveAction.emit();
  }

  onSelectedAttribute(event, property) {
    this.logger.log("[ACTION AI_PROMPT] onEditableDivTextChange event", event)
    this.logger.log("[ACTION AI_PROMPT] onEditableDivTextChange property", property)
    this.action[property] = event.value;
    this.updateAndSaveAction.emit();
  }

  onChangeSelect(event, target) {
    this.logger.log("[ACTION AI_PROMPT] onChangeSelect event: ", event)
    this.logger.log("[ACTION AI_PROMPT] onChangeSelect target: ", target)
    this.action[target] = event.value;
    // if(target === 'llm'){
    //   const foundLLM = this.llm_models.find(el => el.value === event.value);
    //   this.llm_options_models = foundLLM ? foundLLM.models.filter(el => el.status === 'active') : [];
    //   this.action.model= null;
    //   // this.initLLMModels();
    // }
    // else if(target === 'llm2'){
    //   let llm = event.llm;
    //   let model = event.model;
    //   this.action.llm = llm;
    //   this.action.model = model;
    //   // this.action.labelModel = event.labelModel;
      
    //   // Update selectedModelConfigured based on the selected model
    //   const selectedModel = this.llm_models_flat.find(m => m.modelName === event.labelModel);
    //   this.selectedModelConfigured = selectedModel ? selectedModel.configured : true;
    // }

    if (target === 'llm_model'){
      this.setModel(event.modelName);
    } 

    this.updateAndSaveAction.emit();
  }

  updateSliderValue(event, target) {
    this.logger.log("[ACTION AI_PROMPT] updateSliderValue event: ", event)
    this.logger.log("[ACTION AI_PROMPT] updateSliderValue target: ", target)
    this.action[target] = event;
    this.updateAndSaveAction.emit();
  }

  onChangeCheckbox(event: MatCheckboxChange, target){
    try {
      this.action[target] = event.checked;
      this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
    } catch (error) {
      this.logger.log("Error: ", error);
    }
  }

  onChangeBlockSelect(event:{name: string, value: string}, type: 'trueIntent' | 'falseIntent') {
    if(event){
      this.action[type]=event.value
      switch(type){
        case 'trueIntent':
          this.onConnectorChange.emit({ type: 'create', fromId: this.idConnectorTrue, toId: this.action.trueIntent});
          break;
        case 'falseIntent':
          this.onConnectorChange.emit({ type: 'create', fromId: this.idConnectorFalse, toId: this.action.falseIntent});
          break;
      }
      this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
    }
  }

  onResetBlockSelect(event:{name: string, value: string}, type: 'trueIntent' | 'falseIntent') {
    switch(type){
      case 'trueIntent':
        this.onConnectorChange.emit({ type: 'delete', fromId: this.idConnectorTrue, toId: this.action.trueIntent});
        break;
      case 'falseIntent':
        this.onConnectorChange.emit({ type: 'delete', fromId: this.idConnectorFalse, toId: this.action.falseIntent});
        break;
    }
    this.action[type]=null
    this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
  }

  scrollToBottom(): void {
    setTimeout(() => {
      try {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
        this.scrollContainer.nativeElement.animate({ scrollTop: 0 }, '500');
      } catch (error) {
        this.logger.log('scrollToBottom ERROR: ', error);
      }
    }, 300);
  }

  execPreview() {
    // this.scrollToBottom();
    this.checkVariables().then((resp) => {

      if (resp === true) {
        this.getResponse(this.action.question);

      } else {
        this.openAttributesDialog();
      }

    })
  }

  checkVariables() {
    return new Promise((resolve, reject) => {
      let regex: RegExp = /{{[^{}]*}}/g;
      let string = this.action.question;
      let matches = string.match(regex);
      let response: boolean = true;

      if (!matches || matches.length == 0) {
        resolve(true);

      } else {

        this.temp_variables = [];
        matches.forEach((m) => {
          let name = m.slice(2, m.length - 2);
          let attr = this.action.preview.find(v => v.name === name);

          if (attr?.value) {
            this.temp_variables.push({ name: name, value: attr.value });
          } else if (attr && !attr.value) {
            this.temp_variables.push({ name: name, value: null });

          } else {
            this.temp_variables.push({ name: name, value: null });
            this.action.preview.push({ name: name, value: null });
          }
        })
        resolve(false);
      }
    })
  }

  getResponse(question) {
    this.logger.log("getResponse called...")

    let data = {
      question: question,
      context: this.action.context,
      llm: this.action.llm,
      model: this.action.model,
      max_tokens: this.action.max_tokens,
      temperature: this.action.temperature,
    }

    this.showAiError = false;
    this.searching = true;
    this.showPreview = true;

    setTimeout(() => {
      let element = document.getElementById("preview-container");
      element.classList.remove('preview-container-extended')
    }, 200)

    this.openaiService.previewLLMPrompt(data).subscribe({ next: (ai_response: any) => {
      this.searching = false;
      setTimeout(() => {
        let element = document.getElementById("preview-container");
        element.classList.add('preview-container-extended')
      }, 200)
      this.ai_response = ai_response;
    }, error: (err) => {
      this.searching = false;
      this.logger.error("[ACTION AI_PROMPT] previewPrompt error: ", err);
      setTimeout(() => {
        let element = document.getElementById("preview-container");
        element.classList.add('preview-container-extended')
      }, 200)
      this.showAiError = true;
      if(err.error.error_code === 13001){
        this.ai_error = this.translate.instant('CDSCanvas.AiQuotaExceeded')
        return;
      }
      this.ai_error = this.translate.instant('CDSCanvas.AiError')
    }, complete: () => {
      this.logger.debug("[ACTION AI_PROMPT] preview prompt *COMPLETE*: ");
      this.searching = false;
    }});

  }


  getLlmIcon(llm: string): string {
    this.logger.log("[ACTION AI_PROMPT] getLlmIcon ******: ", llm);
    const filteredModel = this.llm_models.find((model) => model.value === llm);
    this.logger.log("[ACTION AI_PROMPT] filteredModel ******: ", filteredModel);
    return filteredModel ? filteredModel.value : '';
  }


  // getResponsePreview() {

  //   this.showPreview = true;
  //   this.showAiError = false;

  //   this.checkVariables().then((resp) => {

  //     if (resp === false) {
  //       this.missingVariables = true;

  //     } else {
  //       let temp_question = this.action.question;
  //       this.temp_variables.forEach((tv) => {
  //         let old_value = "{{" + tv.name + "}}";
  //         temp_question = temp_question.replace(old_value, tv.value);
  //       })

  //       this.searching = true;
  //       this.missingVariables = false;

  //       setTimeout(() => {
  //         let element = document.getElementById("preview-container");
  //         element.classList.remove('preview-container-extended')
  //       }, 200)

  //       let data = {
  //         question: temp_question,
  //         context: this.action.context,
  //         model: this.action.model,
  //         max_tokens: this.action.max_tokens,
  //         temperature: this.action.temperature
  //       }

  //       this.openaiService.previewPrompt(data).subscribe((ai_response: any) => {
  //         this.searching = false;
  //         setTimeout(() => {
  //           let element = document.getElementById("preview-container");
  //           element.classList.add('preview-container-extended')
  //         }, 200)
  //         this.ai_response = ai_response;
  //       }, (error) => {
  //         this.logger.error("[ACTION GPT-TASK] previewPrompt error: ", error);
  //         setTimeout(() => {
  //           let element = document.getElementById("preview-container");
  //           element.classList.add('preview-container-extended')
  //         }, 200)
  //         this.showAiError = true;
  //         this.searching = false;
  //       }, () => {
  //         this.logger.error("[ACTION GPT-TASK] preview prompt *COMPLETE*: ");
  //         this.searching = false;
  //       })
  //     }
  //   })
  // }

  // _checkVariables() {
  //   return new Promise((resolve, reject) => {
  //     let regex: RegExp = /{{[^{}]*}}/g;
  //     let string = this.action.question;
  //     let matches = string.match(regex);
  //     let response: boolean = true;

  //     if (!matches || matches.length == 0) {
  //       this.showVariablesBtn = false;
  //       resolve(response);
  //     }

  //     if (matches.length > 0) {
  //       if (!this.action.preview) {
  //         this.action.preview = [];
  //       }
  //       this.showVariablesBtn = true;
  //       this.temp_variables = [];

  //       matches.forEach((m) => {
  //         let name = m.slice(2, m.length - 2);
  //         let attr = this.action.preview.find(v => v.name === name);
  //         if (attr && attr.value) {
  //           this.temp_variables.push({ name: name, value: attr.value });
  //         } else if (attr && !attr.value) {
  //           response = false;
  //           this.temp_variables.push({ name: name, value: null });
  //         } else {
  //           response = false;
  //           this.temp_variables.push({ name: name, value: null });
  //           this.action.preview.push({ name: name, value: null });
  //         }
  //       })
  //       this.logger.log("temp_variables: ", this.temp_variables)
  //       resolve(response);
  //     }

  //   })
  // }

  // showHideVariablesSection() {
  //   this.showVariablesSection = !this.showVariablesSection;
  //   if (this.showVariablesSection == false) {
  //     this.getResponsePreview();
  //   }
  // }

  // onChangeVar(event, name) {
  //   let index = this.action.preview.findIndex(v => v.name === name);
  //   if (index != -1) {
  //     this.action.preview[index].value = event;
  //   }
  //   this.updateAndSaveAction.emit();
  // }

  // closePreview() {
  //   let element = document.getElementById("preview-container");
  //   element.classList.remove('preview-container-extended')

  //   this.showPreview = false;
  //   this.searching = false;
  // }

  openAttributesDialog() {
    this.logger.log("temp_variables: ", this.temp_variables);
    const dialogRef = this.dialog.open(AttributesDialogAiPromptComponent, {
      panelClass: 'custom-setattribute-dialog-container',
      data: { attributes: this.temp_variables, question: this.action.question }
    });
    dialogRef.afterClosed().subscribe(result => {
      this.logger.log("AttributesDialogComponent result: ", result);
      if (result !== false) {
        this.getResponse(result.question);
        this.saveAttributes(result.attributes);
      }
    });
  }

  saveAttributes(attributes) {
    this.logger.log("attributes: ", attributes);
    attributes.forEach(a => {
      let index = this.action.preview.findIndex(v => v.name === a.name)
      if (index != -1) {
        this.action.preview[index].value = a.value;
      } else {
        this.action.preview.push({ name: a.name, value: a.value })
      }
      this.updateAndSaveAction.emit();
    })
  }

  goToIntegrations(){
    let url = this.appConfigService.getConfig().dashboardBaseUrl + '#/project/' + this.project_id +'/integrations'
    window.open(url, '_blank')
  }

}
