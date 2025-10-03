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
import { ANTHROPIC_MODEL, COHERE_MODEL, DEEPSEEK_MODEL, GOOGLE_MODEL, GROQ_MODEL, LLM_MODEL, OLLAMA_MODEL, OPENAI_MODEL, generateLlmModels2 } from 'src/app/chatbot-design-studio/utils-ai_models';
import { checkConnectionStatusOfAction, updateConnector } from 'src/app/chatbot-design-studio/utils-connectors';
import { ProjectService } from 'src/app/services/projects.service';

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
  ai_setting: { [key: string] : {name: string,  min: number, max: number, step: number, disabled: boolean}} = {
    "max_tokens": { name: "max_tokens",  min: 10, max: 8192, step: 1, disabled: false},
    "temperature" : { name: "temperature", min: 0, max: 1, step: 0.05, disabled: false},
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
  private isInitializing = {
    'llm_model': true,
    'context': true,
    'question': true
  };
  labelModel: string = "";


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

  projectPlan: PLAN_NAME
  PLAN_NAME = PLAN_NAME
  BRAND_BASE_INFO = BRAND_BASE_INFO;
  DOCS_LINK = DOCS_LINK.GPT_TASK;
  llm_model = LLM_MODEL;
  autocompleteOptions: Array<{label: string, value: string}> = [];

  llm_models_2: Array<{ labelModel: string, llm: string, model: string, description: string, src: string, status: "active" | "inactive", configured: boolean, multiplier?: string }> = [];
  autocompleteOptions_2: Array<{label: string, value: string}> = [];
  multiplier: string;

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
    const ai_models = loadTokenMultiplier(this.appConfigService.getConfig().aiModels);
    
    this.getOllamaModels();

    this.llm_models_2 = generateLlmModels2();
    this.llm_models_2.forEach(model => {
      if (ai_models[model.model]) {
        model.multiplier = ai_models[model.model].toString();
      }
    });
    this.logger.log("[ACTION AI_PROMPT] model_list: ", this.llm_models_2, ai_models);
    // this.llm_models_2 = this.llm_models_2.map((el) => {
    //   const model = Object.values(ai_models).find((m: any) => (m as any)?.name === el.labelModel);
    //   return { ...el, multiplier: model && (model as any).multiplier !== undefined ? (model as any).multiplier : null };
    // });

    this.logger.log("[ACTION AI_PROMPT] HO AGGIORNATO  model_list: ", this.llm_models_2);

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
    this.multiplier = this.llm_models_2.find(el => el.labelModel === this.labelModel)?.multiplier;
    this.labelModel = this.action['labelModel']?this.action['labelModel']:'';
    this.logger.log("[ACTION AI_PROMPT] 0 initialize llm_options_models: ", this.action, this.labelModel);
    this.setModel(this.labelModel);
    const foundLLM = this.llm_models.find(el => el.value === this.action.llm);
    this.llm_options_models = foundLLM ? foundLLM.models.filter(el => el.status === 'active') : [];
  }


  async getOllamaModels(){
    this.llm_model.forEach(async (model) => {
      if (model.value === "ollama") {
        const NEW_MODELS = await this.getIntegrationByName();
        if(NEW_MODELS?.value?.models){
          this.logger.log('[ACTION AI_PROMPT] - NEW_MODELS:', NEW_MODELS.value.models);
          const models = NEW_MODELS?.value?.models.map(item => ({
            name: item,
            value: item
          }));
          model.models = models;
        }
      }
    });
  }

  async getIntegrationByName(){
    const projectID = this.dashboardService.projectID;
    const integrationName = 'ollama';
    try {
        const response = await firstValueFrom(this.projectService.getIntegrationByName(projectID, integrationName));
        this.logger.log('[ACTION AI_PROMPT] - integration response:', response.value);
        return response;
    } catch (error) {
      this.logger.log('[ACTION AI_PROMPT] getIntegrationByName ERROR:', error);
    }
  }


  async getIntegrations(){
    const projectID = this.dashboardService.projectID;
    try {
        const response = await firstValueFrom(this.projectService.getIntegrations(projectID));
        this.logger.log('[ACTION AI_PROMPT] - integrations response:', response.value);
        return response;
    } catch (error) {
      this.logger.log('[ACTION AI_PROMPT] getIntegrations ERROR:', error);
    }
  }

  async initLLMModels(){
    const INTEGRATIONS = await this.getIntegrations();
    this.logger.log('[ACTION AI_PROMPT] 1 - integrations:', INTEGRATIONS);
    if(INTEGRATIONS){
      INTEGRATIONS.forEach((el: any) => {
        this.logger.log('[ACTION AI_PROMPT] 1 - integration:', el.name, el.value.apikey);
        if(el.name && el.value?.apikey){
          this.llm_models_2.forEach(model => {
            if(model.llm === el.name || model.llm.toLowerCase() === 'openai' || model.llm.toLowerCase() === 'ollama') {
              model.configured = true;
            }
          });
        }
      });
    }
    this.logger.log('[ACTION AI_PROMPT] - this.llm_models_2:', this.llm_models_2);
    this.autocompleteOptions = [];
    this.logger.log('[ACTION AI_PROMPT] initLLMModels',this.action.llm);
    this.actionLabelModel =  '';
    this.multiplier = null;
    /** SET GPT MODELS */
    const ai_models = loadTokenMultiplier(this.appConfigService.getConfig().aiModels)
    OPENAI_MODEL.forEach(el => {
      if (ai_models[el.value]) {
        el.additionalText = `${ai_models[el.value]} x tokens`;
        el.status = 'active';
      } else {
        el.additionalText = null;
        el.status = 'inactive';
      }
    });

    // Assegna i moltiplicatori ai modelli in llm_models_2
    this.llm_models_2.forEach(model => {
      if (ai_models[model.model]) {
        model.multiplier = ai_models[model.model].toString();
      }
    });
    if(this.action.llm){
      const filteredModels = this.getModelsByName(this.action.llm).filter(el => el.status === 'active');
      filteredModels.forEach(el => this.autocompleteOptions.push({label: el.name, value: el.value}));
      this.logger.log('[ACTION AI_PROMPT] filteredModels',filteredModels);
    }
    this.autocompleteOptions_2 = [];
    this.llm_models_2.forEach(el => this.autocompleteOptions_2.push({label: el.labelModel, value: el.labelModel}));
    this.sortAutocompleteOptions2();
    // this.actionLabelModel = this.action['labelModel'];
    this.logger.log('[ACTION AI_PROMPT] autocompleteOptions_2',this.autocompleteOptions_2);
  }

  getModelsByName(value: string): Array<{ name: string, value: string, description:string, status: "active" | "inactive"}> {
    const model = this.llm_model.find((model) => model.value === value);
    return model?.models || [];
  }

  sortAutocompleteOptions2(): void {
    this.autocompleteOptions_2.sort((a, b) => {
      // Trova il modello corrispondente in llm_models_2 per entrambi gli elementi
      const modelA = this.llm_models_2.find(el => el.labelModel === a.value);
      const modelB = this.llm_models_2.find(el => el.labelModel === b.value);
      // Se entrambi sono OpenAI, ordina alfabeticamente
      if (modelA?.llm?.toLowerCase() === 'openai' && modelB?.llm?.toLowerCase() === 'openai') {
        return a.label.localeCompare(b.label);
      }
      // Se solo A è OpenAI, A viene prima
      if (modelA?.llm?.toLowerCase() === 'openai' && modelB?.llm?.toLowerCase() !== 'openai') {
        return -1;
      }
      // Se solo B è OpenAI, B viene prima
      if (modelA?.llm?.toLowerCase() !== 'openai' && modelB?.llm?.toLowerCase() === 'openai') {
        return 1;
      }
      // Se nessuno dei due è OpenAI, ordina alfabeticamente
      return a.label.localeCompare(b.label);
    });
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

  // private updateConnector2(){
  //   try {
  //     const array = this.connector.fromId.split("/");
  //     const idAction= array[1];
  //     if(idAction === this.action._tdActionId){
  //       if(this.connector.deleted){
  //         if(array[array.length -1] === 'true'){
  //           this.action.trueIntent = null;
  //           this.isConnectedTrue = false;
  //           this.idConnectionTrue = null;
  //         }        
  //         if(array[array.length -1] === 'false'){
  //           this.action.falseIntent = null;
  //           this.isConnectedFalse = false;
  //           this.idConnectionFalse = null;
  //         }
  //         if(this.connector.save)this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.CONNECTOR, element: this.connector});
  //       } else { 
  //         // TODO: verificare quale dei due connettori è stato aggiunto (controllare il valore della action corrispondente al true/false intent)
  //         this.logger.debug('[ACTION AI_PROMPT] updateConnector', this.connector.toId, this.connector.fromId ,this.action, array[array.length-1]);
  //         if(array[array.length -1] === 'true'){
  //           // this.action.trueIntent = '#'+this.connector.toId;
  //           this.isConnectedTrue = true;
  //           this.idConnectionTrue = this.connector.fromId+"/"+this.connector.toId;
  //           this.action.trueIntent = '#'+this.connector.toId;
  //           if(this.connector.save)this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.CONNECTOR, element: this.connector});
  //         }        
  //         if(array[array.length -1] === 'false'){
  //           // this.action.falseIntent = '#'+this.connector.toId;
  //           this.isConnectedFalse = true;
  //           this.idConnectionFalse = this.connector.fromId+"/"+this.connector.toId;
  //           this.action.falseIntent = '#'+this.connector.toId;
  //           if(this.connector.save)this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.CONNECTOR, element: this.connector});
  //         }
  //       }
  //     }
  //   } catch (error) {
  //     this.logger.error('[ACTION AI_PROMPT] updateConnector error: ', error);
  //   }
  // }


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
    } else if (property === 'llm_model'){
       // se event non corrisponde a nessun valore di autocompleteOptions_2 ed è diverso da '' o null allora non fare nulla
      if(!this.autocompleteOptions_2.find(el => el.value === event) && event !== '' && event !== null) {
        return;
      }
      this.action['labelModel'] = event;
      this.labelModel = event;
      this.actionLabelModel = event;
      this.setModel(event);
    }
  }





  onOptionSelected(event: any, property: string){
    this.logger.log("[ACTION AI_PROMPT] onOptionSelected event: ", event, this.action);
    this.actionLabelModel = event.label;
    this.labelModel = event.label;
    if(property === 'llm_model'){
      this.setModel(event.label);
    } else if (property === 'model'){
      // this.actionLabelModel = event.label;
      this.action[property] = event.value;
    }
    this.updateAndSaveAction.emit();
  }

setModel(labelModel: string){
  this.logger.log("[ACTION AI_PROMPT] 2 setModel labelModel: ", labelModel);
  const model = this.llm_models_2.find(m => m.labelModel === labelModel);
  this.logger.log("[ACTION AI_PROMPT] 2 setModel model: ", model);
  if(model){
    this.selectedModelConfigured = model.configured;
    this.action.llm = model.llm;
    this.action.model = model.model;
    this.action.labelModel = model.labelModel;
    this.labelModel = model.labelModel;
    this.multiplier = model.multiplier;
    this.logger.log("[ACTION AI_PROMPT] 2 action: ", this.action);
    /** MANAGE GPT-5 MODELS */
    if(model.model.startsWith('gpt-5')){
      this.action.temperature = 1;
      this.ai_setting['temperature'].disabled= true
    }else{
      this.ai_setting['temperature'].disabled= false
    }
  }
  else {
    this.action.llm = '';
    this.action.model = '';
    this.action.labelModel = '';
    this.labelModel = '';
    this.multiplier = null;
  }
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
    if(target === 'llm'){
      const foundLLM = this.llm_models.find(el => el.value === event.value);
      this.llm_options_models = foundLLM ? foundLLM.models.filter(el => el.status === 'active') : [];
      this.action.model= null;
      // this.initLLMModels();
    }
    else if(target === 'llm2'){
      let llm = event.llm;
      let model = event.model;
      this.action.llm = llm;
      this.action.model = model;
      this.action.labelModel = event.labelModel;
      
      // Update selectedModelConfigured based on the selected model
      const selectedModel = this.llm_models_2.find(m => m.labelModel === event.labelModel);
      this.selectedModelConfigured = selectedModel ? selectedModel.configured : true;
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
