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
import { ANTHROPIC_MODEL, COHERE_MODEL, DEEPSEEK_MODEL, GOOGLE_MODEL, GROQ_MODEL, LLM_MODEL, OLLAMA_MODEL } from 'src/app/chatbot-design-studio/utils-ai_models';
import { checkConnectionStatusOfAction, checkConnectionStatusByConnector, updateConnector, updateSingleConnector } from 'src/app/chatbot-design-studio/utils-connectors';
import { ProjectService } from 'src/app/services/projects.service';

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
  ai_setting: { [key: string] : {name: string,  min: number, max: number, step: number}} = {
    "max_tokens": { name: "max_tokens",  min: 10, max: 8192, step: 1},
    "temperature" : { name: "temperature", min: 0, max: 1, step: 0.05}
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
  llm_model = LLM_MODEL;

  autocompleteOptions: Array<{label: string, value: string}> = [];
  
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


  ngOnInit(): void {
    this.logger.log("[ACTION AI_CONDITION] ngOnInit action: ", this.action);
    this.getOllamaModels();
    this.logger.log("[ACTION AI_CONDITION] HO AGGIORNATO  llm_model: ", this.llm_model);
    this.llm_models = this.llm_model.filter(el => el.status === 'active');
    this.projectPlan = this.dashboardService.project.profile.name
    this.subscriptionChangedConnector = this.intentService.isChangedConnector$.subscribe((connector: any) => {
        this.logger.log('[ACTION AI_CONDITION] isChangedConnector -->', connector);
        let connectorId = this.idIntentSelected+"/"+this.action._tdActionId;
        this.logger.log('[ACTION AI_CONDITION] connectorId -->', connectorId);
        if(connector.fromId.startsWith(connectorId)){
            this.connector = connector;
            this.updateConnectionFalse();
            this.updateConnectionTrue();
        }
    });
    if(this.intentSelected){
      this.initializeConnector();
    }
    this.initializeAttributes();
    if (!this.action.preview) {
      this.action.preview = [];
    }
    this.initialize();
  }


  ngOnChanges(changes: SimpleChanges) {
    // // empty
  }

  ngOnDestroy() {
    if (this.subscriptionChangedConnector) {
      this.subscriptionChangedConnector.unsubscribe();
    }
  }

  private initialize(){
    if(this.action.llm){
      this.initLLMModels();
      this.actionLabelModel = this.action['labelModel']?this.action['labelModel']:'';
      this.actionLabelModel = this.action['labelModel']?this.action['labelModel']:'';
      this.llm_options_models = this.llm_models.find(el => el.value === this.action.llm).models.filter(el => el.status === 'active')
    }
    //this.checkConnectionStatus();
  }

//   private checkConnectionStatus(){
//     const resp = checkConnectionStatusByConnector(this.action.falseIntent, this.idConnectorFalse);
//     this.isConnectedFalse   = resp.isConnected;
//     this.idConnectionFalse  = resp.idConnection;
//     this.logger.log('[ACTION AI_CONDITION] - FALSE checkConnectionStatusByConnector:', resp);

//     this.action.intents.forEach(element => {
//       const resp = checkConnectionStatusByConnector(element.intentId, element.idConnector);
//       this.listOfConnectors[element.label].isConnected = resp.isConnected;
//       this.listOfConnectors[element.label].idConnection = resp.idConnection;
//       this.logger.log('[ACTION AI_CONDITION] - TRUE checkConnectionStatusByConnector:', resp);
//     });
//   }

  async getOllamaModels(){
    this.llm_model.forEach(async (model) => {
      if (model.value === "ollama") {
        const NEW_MODELS = await this.getIntegrationByName();
        if(NEW_MODELS?.value?.models){
          this.logger.log('[ACTION AI_CONDITION] - NEW_MODELS:', NEW_MODELS.value.models);
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
        this.logger.log('[ACTION AI_CONDITION] - integration response:', response.value);
        return response;
    } catch (error) {
      this.logger.log('[ACTION AI_CONDITION] getIntegrationByName ERROR:', error);
    }
  }


  initLLMModels(){
    this.autocompleteOptions = [];
    this.logger.log('[ACTION AI_CONDITION] initLLMModels',this.action.llm);
    this.actionLabelModel =  '';
    this.actionLabelModel =  '';
    if(this.action.llm){
      const filteredModels = this.getModelsByName(this.action.llm).filter(el => el.status === 'active');
      filteredModels.forEach(el => this.autocompleteOptions.push({label: el.name, value: el.value}));
      this.logger.log('[ACTION AI_CONDITION] filteredModels',filteredModels);
    }
    // this.actionLabelModel = this.action['labelModel'];
  }

  getModelsByName(value: string): Array<{ name: string, value: string, description:string, status: "active" | "inactive"}> {
    const model = this.llm_model.find((model) => model.value === value);
    return model.models;
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

        //if (resp.emit) {
            this.updateAndSaveAction.emit({ type: TYPE_UPDATE_ACTION.CONNECTOR, element: this.connector });
        //} 
        //this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
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
    this.logger.log("[ACTION AI_CONDITION] changeTextarea event: ", event, property);
    // this.logger.debug("[ACTION AI_CONDITION] changeTextarea propery: ", property);
    //this.action[property] = event;
    if(property === 'model'){
      this.action['labelModel'] = labelModel;
    } else if (property === 'question'){
      this.action['question'] = event;
    } else if (property === 'context'){
      this.action['context'] = event;
    }
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
    if(target === 'llm'){
      this.llm_options_models = this.llm_models.find(el => el.value === event.value).models.filter(el => el.status === 'active')
      this.action.model= null;
      this.initLLMModels();
    }
    this.updateAndSaveAction.emit();
  }

  updateSliderValue(event, target) {
    this.logger.log("[ACTION AI_CONDITION] updateSliderValue event: ", event)
    this.logger.log("[ACTION AI_CONDITION] updateSliderValue target: ", target)
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
   * addNewIntent
   * Adds a new intent to the intents array
   */
  addNewIntent() {
    this.logger.log("[ACTION AI_CONDITION] addNewIntent", this.action.intents);
    if (!this.action.intents) {
      this.action.intents = [];
    }
    // Add a new intent with default values
    const idCondition = generateShortUID();
    this.action.intents.push({
      "label": idCondition,
      "prompt": "",
      "conditionIntentId": ""
    });
    this.listOfConnectors[idCondition] = {
      idConnector: this.idIntentSelected + "/" + this.action._tdActionId + "/" + idCondition + "/true",
      idConnection: null,
      isConnected: false
    };
    this.logger.log("[ACTION AI_CONDITION] addNewIntent", this.listOfConnectors);
    this.updateAndSaveAction.emit();
  }

  

}
