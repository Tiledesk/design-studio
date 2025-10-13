import { Component, ElementRef, EventEmitter, HostListener, Input, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { firstValueFrom, Observable, Subscription } from 'rxjs';

//MODELS
import { ActionAiCondition } from 'src/app/models/action-model';
import { Intent } from 'src/app/models/intent-model';

//SERVICES
import { OpenaiService } from 'src/app/services/openai.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { MatDialog } from '@angular/material/dialog';
import { AppConfigService } from 'src/app/services/app-config';
import { IntentService } from 'src/app/chatbot-design-studio/services/intent.service';

//UTILS
import { AttributesDialogAiConditionComponent } from './attributes-dialog/attributes-dialog.component';
import { AiConditionComponent } from './ai-condition/ai-condition.component';
import { DOCS_LINK, generateShortUID, TYPE_UPDATE_ACTION } from 'src/app/chatbot-design-studio/utils';
import { variableList } from 'src/app/chatbot-design-studio/utils-variables';
import { DashboardService } from 'src/app/services/dashboard.service';
import { PLAN_NAME } from 'src/chat21-core/utils/constants';
import { TranslateService } from '@ngx-translate/core';
import { loadTokenMultiplier } from 'src/app/utils/util';
import { BRAND_BASE_INFO } from 'src/app/chatbot-design-studio/utils-resources';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { ANTHROPIC_MODEL, COHERE_MODEL, DEEPSEEK_MODEL, DEFAULT_MODEL, GOOGLE_MODEL, GROQ_MODEL, LLM_MODEL, OLLAMA_MODEL, OPENAI_MODEL, generateLlmModelsFlat } from 'src/app/chatbot-design-studio/utils-ai_models';
import { checkConnectionStatusOfAction, checkConnectionStatusByConnector, updateConnector, updateSingleConnector } from 'src/app/chatbot-design-studio/utils-connectors';
import { ProjectService } from 'src/app/services/projects.service';
import { sortAutocompleteOptions, getModelsByName, getIntegrations, setModel, initLLMModels, getIntegrationModels, LlmModel } from 'src/app/chatbot-design-studio/utils-llm-models';
import { FormatNumberPipe } from 'src/app/pipe/format-number.pipe';

@Component({
  selector: 'cds-action-ai-condition',
  templateUrl: './cds-action-ai-condition.component.html',
  styleUrls: ['./cds-action-ai-condition.component.scss']
})
export class CdsActionAiConditionComponent implements OnInit {
  
  @ViewChild('scrollMe', { static: false }) scrollContainer: ElementRef;
  
  @Input() intentSelected: Intent;
  @Input() action: ActionAiCondition;
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

  showPreview: boolean = false;
  missingVariables: boolean = true;
  showVariablesBtn: boolean = false;
  showVariablesSection: boolean = false;
  showAiError: boolean = false;
  searching: boolean = false;
  temp_variables = [];
  actionLabelModel: string = "";



  // Connectors
  idIntentSelected: string;
  listOfConnectors: any = {};

//   idConnectorTrue: Array<string> = [];
//   idConnectionTrue: Array<string> = [];
//   isConnectedTrue: Array<boolean> = [];

  idConnectorFallback: string;
  idConnectorError: string;
  idConnectionFallback: string;
  idConnectionError: string;
  isConnectedFallback: boolean = false;
  isConnectedError: boolean = false;

  connector: any;
  private subscriptionChangedConnector: Subscription;

  projectPlan: PLAN_NAME
  PLAN_NAME = PLAN_NAME
  BRAND_BASE_INFO = BRAND_BASE_INFO;
  DOCS_LINK = DOCS_LINK.GPT_TASK;

  default_model = DEFAULT_MODEL;
  llm_model = LLM_MODEL;
  llm_models_flat: Array<LlmModel>;
  llm_model_selected: LlmModel = {} as LlmModel;

  private isInitializing = {
    'llm_model': true,
    'context': true,
    'question': true
  };
  browserLang: string = 'it';

  private readonly logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private readonly dialog: MatDialog,
    private readonly openaiService: OpenaiService,
    private readonly intentService: IntentService,
    private readonly appConfigService: AppConfigService,
    private readonly translate: TranslateService,
    private readonly dashboardService: DashboardService,
    private readonly projectService: ProjectService,
    private readonly formatNumberPipe: FormatNumberPipe
  ) { }


  async ngOnInit(): Promise<void> {
    this.logger.log("[ACTION AI_CONDITION] ngOnInit action: ", this.action);
    this.project_id = this.dashboardService.projectID;
    await getIntegrationModels(this.projectService, this.dashboardService, this.logger, this.llm_model, 'ollama');
    await getIntegrationModels(this.projectService, this.dashboardService, this.logger, this.llm_model, 'vllm');

    this.llm_models = this.llm_model.filter(el => el.status === 'active');
    this.projectPlan = this.dashboardService.project.profile.name;
    this.subscriptionChangedConnector = this.intentService.isChangedConnector$.subscribe((connector: any) => {
      this.logger.debug('[ACTION AI_CONDITION] isChangedConnector -->', connector);
      //this.logger.log('[ACTION AI_CONDITION] isChangedConnector -->', connector);
      let connectorId = this.idIntentSelected+"/"+this.action._tdActionId;
      if(connector.fromId.startsWith(connectorId)){
          this.logger.log('[ACTION AI_CONDITION] connectorId -->', connectorId);
          this.connector = connector;
          if(connector.idCondition){
              this.refreshConnector(connector.fromId, connector.idCondition); 
          } else {
            this.updateConnectionFalse();
            this.updateConnectionTrue();
          }
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
    this.isInitializing = {
      'llm_model': false,
      'context': false,
      'question': false
    };
  }


  ngOnChanges(changes: SimpleChanges) {
    // empty
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

  setModel(modelName: string){
    const result = setModel(modelName, this.llm_models_flat, this.logger);
    this.llm_model_selected = result;
    this.logger.log("[ACTION AI_PROMPT] llm_model_selected: ", this.llm_model_selected);
    this.action.llm = result?.llm?result.llm:'';
    this.action.model = result?.model?result.model:'';
    this.action.modelName = result?.modelName?result.modelName:'';
    this.logger.log("[ACTION AI_PROMPT] action: ", this.action);
    this.ai_setting['max_tokens'].max = this.llm_model_selected.max_output_tokens;
    this.ai_setting['max_tokens'].min = this.llm_model_selected.min_tokens;
    if(this.action.max_tokens > this.llm_model_selected.max_output_tokens){
      this.action.max_tokens = this.llm_model_selected.max_output_tokens;
    }
    if(modelName.startsWith('gpt-5') || modelName.startsWith('Gpt-5')){
      this.action.temperature = 1
      this.ai_setting['temperature'].disabled= true
    } else {
      this.ai_setting['temperature'].disabled= false
    }
  }

  async getIntegrationByName(){
    const projectID = this.dashboardService.projectID;
    const integrationName = 'ollama';
    try {
        const response = await firstValueFrom(this.projectService.getIntegrationByName(projectID, integrationName));
        this.logger.log('[ACTION AI_CONDITION] - integration response:', response.value);
        return response;
    } catch (error) {
      this.logger.log('[ACTION AI_CONDITION] getIntegrationByName ERROR:', error);
    }
  }

  refreshConnector(idConnector, idCondition) {
     this.listOfConnectors[idCondition] = {
      idConnector: idConnector,
      idConnection: null,
      isConnected: false
    };
  }

  initializeConnector() {
    this.idIntentSelected = this.intentSelected.intent_id;
    //this.listOfConnectors = {};
    this.action.intents.forEach((element, index) => {
        this.logger.log("[ACTION AI_CONDITION] initializeConnector element: ", index, element);
        let idConnector = '';
        let idConnection = '';
        let isConnected = false;
        if(element.label){
            idConnector = this.idIntentSelected + "/" + this.action._tdActionId + "/" + element.label + "/true";
        }
        if(element.conditionIntentId){
            isConnected = true;
            let toIntentId = element.conditionIntentId.replace('#', '');
            idConnection = idConnector+"/"+toIntentId;
        }
        this.listOfConnectors[element.label] = {
            idConnector: idConnector,
            idConnection: idConnection,
            isConnected: isConnected
        }
    });
    this.idConnectorFallback = this.idIntentSelected + "/" + this.action._tdActionId + "/fallback";
    if (this.action.fallbackIntent) {
      this.isConnectedFallback = true;
      this.idConnectionFallback = "/" + this.action.fallbackIntent.replace('#', '');
    }
    this.idConnectorError = this.idIntentSelected + "/" + this.action._tdActionId + "/error";
    if (this.action.errorIntent) {
      this.isConnectedError = true;
      this.idConnectionError = "/" + this.action.errorIntent.replace('#', '');
    }
    this.listOfIntents = this.intentService.getListOfIntents();
    //this.checkConnectionStatus();
  }
  

  private updateConnectionTrue(){
    this.logger.log('[ACTION AI_CONDITION] updateConnectionTrue:', this.connector);
    const parts = this.connector.fromId.split("/");
    try {
      const idCondition = parts[parts.length - 2];
      const found = this.action.intents.find(item => item.label === idCondition);
      if (this.connector.deleted) {
        if(this.listOfConnectors[idCondition]){
          this.listOfConnectors[idCondition].idConnection =  null;
          this.listOfConnectors[idCondition].isConnected  =  false;
        }
        if(found){
          found.conditionIntentId = null;
        }
      } else {
        if(this.listOfConnectors[idCondition]){
          this.listOfConnectors[idCondition].idConnection =  this.connector.id;
          this.listOfConnectors[idCondition].isConnected  =  true;
        }
        if(found){
          found.conditionIntentId = '#'+this.connector.toId;
        }
      }
      this.updateAndSaveAction.emit({ type: TYPE_UPDATE_ACTION.CONNECTOR, element: this.connector });
    } catch (error) {
      this.logger.log('error: ', error);
    }
  }


  private updateConnectionFalse(){
    this.logger.log('[ACTION AI_CONDITION] updateConnectorFalse:', this.connector, this.connector.id, this.idConnectionFallback);
    if (this.connector.fromId === this.idConnectorFallback) {
        if (this.connector.deleted) {
            this.isConnectedFallback = false;
            this.idConnectionFallback = null;
            this.action.fallbackIntent = null;
            this.logger.log('[ACTION AI_CONDITION] deleted:');
        } else {
            this.isConnectedFallback = true;
            this.idConnectionFallback = this.connector.id;
            this.action.fallbackIntent = '#'+this.connector.toId;
            this.logger.log('[ACTION AI_CONDITION] added:');
        }
        this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
    } else if (this.connector.fromId === this.idConnectorError) {
        if (this.connector.deleted) {
            this.isConnectedError = false;
            this.idConnectionError = null;
            this.action.errorIntent = null;
            this.logger.log('[ACTION AI_CONDITION] deleted:');
        } else {
            this.isConnectedError = true;
            this.idConnectionError = this.connector.id;
            this.action.errorIntent = '#'+this.connector.toId;
            this.logger.log('[ACTION AI_CONDITION] added:');
        }
        this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
    }
  }

  private initializeAttributes() {
    let new_attributes = [];
    if (!variableList.find(el => el.key ==='userDefined').elements.some(v => v.name === 'ai_reply')) {
      new_attributes.push({ name: "ai_reply", value: "ai_reply" });
    }
    variableList.find(el => el.key ==='userDefined').elements = [...variableList.find(el => el.key ==='userDefined').elements, ...new_attributes];
    this.logger.debug("[ACTION AI_CONDITION] Initialized variableList.userDefined: ", variableList.find(el => el.key ==='userDefined'));
  }


  onChangeTextarea(event: string, labelModel: string, property: string) {
    this.logger.log("[ACTION AI_CONDITION] changeTextarea event: ", event, labelModel, property, this.isInitializing[property]);
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
    } else if (property === 'instructions'){
      this.action['instructions'] = event;
    }
  }


  onUpdateAndSaveAction(intent: any) {
    this.logger.log("[ACTION AI_CONDITION] onUpdateAndSaveAction event: ", intent);
    // cerca nell'array action.intents l'elemento con label === intent.label e sostituiscilo con intent se non lo trova aggiungilo all'array
    const found = this.action.intents.find(item => item.label === intent?.label);
    if(found){
      this.action.intents[found.index] = intent;
    } else {
      this.action.intents.push(intent);
    }
    this.updateAndSaveAction.emit();
  }

  onUpdateAndSaveConnectors(intent: any, type: 'create' | 'delete') {
    this.logger.log("[ACTION AI_CONDITION] onUpdateAndSaveConnectors event: ", intent, type);
    let toId: string;
    let fromId: string;
    try {
        //if(intent.conditionIntentId && intent.conditionIntentId !== null){
            if(type === 'delete'){
                this.listOfConnectors[intent.label].idConnection =  null;
                this.listOfConnectors[intent.label].isConnected  =  false;
                toId = null;
                fromId = this.listOfConnectors[intent.label].idConnector;
            } else if(intent.conditionIntentId && intent.conditionIntentId !== null) {
                this.listOfConnectors[intent.label].idConnection =  this.listOfConnectors[intent.label].idConnector+"/"+intent.conditionIntentId.replace('#', '');
                this.listOfConnectors[intent.label].isConnected  =  true;
                toId = intent.conditionIntentId.replace('#', '');
                fromId = this.listOfConnectors[intent.label].idConnector;
            }
        //}
        let found = this.action.intents.find(item => item.label === intent.label);
        if(found){
            found = intent;
        } 
        this.logger.log("[ACTION AI_CONDITION] onUpdateAndSaveConnectors this.action: ", this.action);
        this.onConnectorChange.emit({ type: type, fromId: fromId, toId: toId });
        this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
    } catch (error) {
        this.logger.log("[ACTION AI_CONDITION] onUpdateAndSaveConnectors error: ", error);
    }
  }

  onOptionSelected(event: any, property: string){
    this.logger.log("[ACTION AI_CONDITION] onOptionSelected event: ", event, this.action);
    this.actionLabelModel = event.label;
    this.action[property] = event.value;
    this.updateAndSaveAction.emit();
  }

  onBlur(event: string){
    this.logger.log("[ACTION AI_CONDITION] onBlur event: ", event, this.action);
    this.updateAndSaveAction.emit();
  }

  onSelectedAttribute(event, property) {
    this.logger.log("[ACTION AI_CONDITION] onEditableDivTextChange event", event)
    this.logger.log("[ACTION AI_CONDITION] onEditableDivTextChange property", property)
    this.action[property] = event.value;
    this.updateAndSaveAction.emit();
  }

  onChangeSelect(event, target) {
    this.logger.log("[ACTION AI_CONDITION] onChangeSelect event: ", event.value)
    this.logger.log("[ACTION AI_CONDITION] onChangeSelect target: ", target)
    this.action[target] = event.value;
    if (target === 'llm_model'){
      this.setModel(event.modelName);
    } 
    this.updateAndSaveAction.emit();
  }

  updateSliderValue(event, target) {
    this.logger.log("[ACTION AI_CONDITION] updateSliderValue event: ", event)
    this.logger.log("[ACTION AI_CONDITION] updateSliderValue target: ", target)
    this.action[target] = event;
    if(target === 'max_tokens'){
      if(event < this.ai_setting['max_tokens'].min){
        this.action.max_tokens = this.ai_setting['max_tokens'].min;
      } else if(event > this.ai_setting['max_tokens'].max){
        this.action.max_tokens = this.ai_setting['max_tokens'].max;
      } else {
        this.action.max_tokens = event;
      }
    }
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

  onChangeBlockSelect(event:{name: string, value: string}, type: 'errorIntent' | 'fallbackIntent' | string) {
    this.logger.log("[ACTION AI_CONDITION] onChangeBlockSelect", event, type);
    this.action[type]=event.value;
    if(event){
        switch(type){
          case 'errorIntent':
            this.onConnectorChange.emit({ type: 'create', fromId: this.idConnectorError, toId: this.action.errorIntent});
            break;
          case 'fallbackIntent':
            this.onConnectorChange.emit({ type: 'create', fromId: this.idConnectorFallback, toId: this.action.fallbackIntent});
            break;
        }
        this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
    }
  }

  onResetBlockSelect(event:{name: string, value: string}, type: 'errorIntent' | 'fallbackIntent') {
    this.action[type]=null;
    switch(type){
      case 'errorIntent':
        this.onConnectorChange.emit({ type: 'delete', fromId: this.idConnectorError, toId: this.action.errorIntent});
        break;
      case 'fallbackIntent':
        this.onConnectorChange.emit({ type: 'delete', fromId: this.idConnectorFallback, toId: this.action.fallbackIntent});
        break;
    }
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
    this.scrollToBottom();
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
      this.logger.error("[ACTION AI_CONDITION] previewPrompt error: ", err);
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
      this.logger.debug("[ACTION AI_CONDITION] preview prompt *COMPLETE*: ");
      this.searching = false;
    }});

  }


  getLlmIcon(llm: string): string {
    this.logger.log("[ACTION AI_CONDITION] getLlmIcon ******: ", llm);
    const filteredModel = this.llm_models.find((model) => model.value === llm);
    this.logger.log("[ACTION AI_CONDITION] filteredModel ******: ", filteredModel);
    return filteredModel ? filteredModel.value : '';
  }


  openAttributesDialog() {
    this.logger.log("temp_variables: ", this.temp_variables);
    const dialogRef = this.dialog.open(AttributesDialogAiConditionComponent, {
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

  /**
   * addNewCondition
   * Adds a new condition to the intents array
   */
  addNewCondition() {
    this.logger.log("[ACTION AI_CONDITION] addNewCondition", this.action.intents);

    if (!this.action.intents) {
      this.action.intents = [];
    }
    const idCondition = generateShortUID();
    this.action.intents.push({
      "label": idCondition,
      "prompt": "",
      "conditionIntentId": ''
    });
    let idConnector = `${this.idIntentSelected}/${this.action._tdActionId}/${idCondition}/true`;
    this.listOfConnectors[idCondition] = {
      idConnector: idConnector,
      idConnection: null,
      isConnected: false
    };
    //this.onConnectorChange.emit({ type: 'delete', fromId: idConnector, toId: ''});
    this.intentService.onChangedConnector({fromId: idConnector, idCondition: idCondition});
    this.logger.log("[ACTION AI_CONDITION] addNewCondition", this.listOfConnectors);
    // this.updateAndSaveAction.emit();
  }

  onDeleteCondition(intent: any) {
    this.logger.log("[ACTION AI_CONDITION] onDeleteCondition", intent);
    const label = intent.value.label;
    const foundIndex = this.action.intents.findIndex(item => item.label === label);
    if (foundIndex !== -1) {
      const intentToDelete = this.action.intents[foundIndex];
      // Remove from intents array
      this.action.intents.splice(foundIndex, 1);
      // Remove from connectors map
      if (intentToDelete.label && this.listOfConnectors[intentToDelete.label]) {
        delete this.listOfConnectors[intentToDelete.label];
      }
      this.logger.log("[ACTION AI_CONDITION] onDeleteCondition - remaining intents:", this.action.intents);
      this.logger.log("[ACTION AI_CONDITION] onDeleteCondition - remaining connectors:", this.listOfConnectors);
      this.updateAndSaveAction.emit();
    }
  }

  /**
   * Formats the slider thumb label value with "k" notation for values > 999
   * Uses the FormatNumberPipe for consistent formatting across the app
   * @param value - The numeric value to format
   * @returns Formatted string with "k" for values > 999 (rounded to integers)
   */
  formatSliderLabel = (value: number): string => {
    return this.formatNumberPipe.transform(value);
  }

}
