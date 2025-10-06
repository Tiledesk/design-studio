import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Subscription } from 'rxjs/internal/Subscription';
import { MatDialog } from '@angular/material/dialog';
import { ActionAskGPTV2 } from 'src/app/models/action-model';

//MODELS
import { Intent } from 'src/app/models/intent-model';

//SERVICES
import { IntentService } from 'src/app/chatbot-design-studio/services/intent.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { AppConfigService } from 'src/app/services/app-config';
import { OpenaiService } from 'src/app/services/openai.service';

//UTILS
import { AttributesDialogComponent } from '../cds-action-gpt-task/attributes-dialog/attributes-dialog.component';
import { DOCS_LINK, TYPE_UPDATE_ACTION, TYPE_GPT_MODEL } from 'src/app/chatbot-design-studio/utils';
import { variableList } from 'src/app/chatbot-design-studio/utils-variables';
import { TranslateService } from '@ngx-translate/core';
import { loadTokenMultiplier } from 'src/app/utils/util';
import { DashboardService } from 'src/app/services/dashboard.service';
import { BRAND_BASE_INFO } from 'src/app/chatbot-design-studio/utils-resources';
import { checkConnectionStatusOfAction, updateConnector } from 'src/app/chatbot-design-studio/utils-connectors';
import { ANTHROPIC_MODEL, COHERE_MODEL, DEEPSEEK_MODEL, GOOGLE_MODEL, GROQ_MODEL, LLM_MODEL, OLLAMA_MODEL, OPENAI_MODEL, generateLlmModelsFlat } from 'src/app/chatbot-design-studio/utils-ai_models';
import { firstValueFrom } from 'rxjs';
import { ProjectService } from 'src/app/services/projects.service';
import { sortAutocompleteOptions, getModelsByName, getIntegrations, setModel, initLLMModels } from 'src/app/chatbot-design-studio/utils-llm-models';


@Component({
  selector: 'cds-action-askgpt-v2',
  templateUrl: './cds-action-askgpt-v2.component.html',
  styleUrls: ['./cds-action-askgpt-v2.component.scss']
})
export class CdsActionAskgptV2Component implements OnInit {

  @Input() intentSelected: Intent;
  @Input() action: ActionAskGPTV2;
  @Input() previewMode: boolean = true;
  @Output() updateAndSaveAction = new EventEmitter;
  @Output() onConnectorChange = new EventEmitter<{type: 'create' | 'delete',  fromId: string, toId: string}>()

  listOfIntents: Array<{name: string, value: string, icon?:string}>;
  listOfNamespaces: Array<{name: string, value: string, icon?:string, hybrid:boolean}>;

  project_id: string;
  selectedNamespace: string;
  //selectedNamespace: any;

  // Connectors
  idIntentSelected: string;
  idConnectorTrue: string;
  idConnectorFalse: string;
  idConnectionTrue: string;
  idConnectionFalse: string;
  isConnectedTrue: boolean = false;
  isConnectedFalse: boolean = false;
  connector: any;

  showPreview: boolean = false;
  showAiError: boolean = false;
  searching: boolean = false;
  // ai_response: string = "";
  ai_error: string = "";
  preview_response: any;
  chunks: Array<any> = [];

  temp_variables = [];
  autocompleteOptions: Array<{label: string, value: string}> = [];

  model_list: Array<{ name: string, value: string, multiplier: string}>;
  ai_setting: { [key: string] : {name: string,  min: number, max: number, step: number}} = {
    "max_tokens": { name: "max_tokens",  min: 10, max: 8192, step: 1},
    "temperature" : { name: "temperature", min: 0, max: 1, step: 0.05},
    "chunk_limit": { name: "chunk_limit", min: 1, max: 40, step: 1 },
    "search_type": { name: "search_type", min: 0, max: 1, step: 0.05 }
  }
  IS_VISIBLE_ALPHA_SLIDER = false;

  BRAND_BASE_INFO = BRAND_BASE_INFO;
  DOCS_LINK = DOCS_LINK.ASKGPTV2;


  llm_model = LLM_MODEL;
  llm_models_flat: Array<{ labelModel: string, llm: string, model: string, description: string, src: string, status: "active" | "inactive", configured: boolean, multiplier?: string }> = [];
  autocompleteOptionsFlat: Array<{label: string, value: string}> = [];
  multiplier: string;
  selectedModelConfigured: boolean = true;
  labelModel: string = "";
  private isInitializing = {
    'llm_model': true,
    'context': true,
    'question': true
  };

  
  private subscriptionChangedConnector: Subscription;
  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private intentService: IntentService,
    private appConfigService: AppConfigService,
    private dashboardService: DashboardService,
    private openaiService: OpenaiService,
    private translate: TranslateService,
    private dialog: MatDialog,
    private readonly projectService: ProjectService
  ) { }

  async ngOnInit(): Promise<void> {
    this.logger.log("[ACTION-ASKGPTV2] action detail: ", this.action);
    this.project_id = this.dashboardService.projectID
    const ai_models = loadTokenMultiplier(this.appConfigService.getConfig().aiModels);
    this.model_list = TYPE_GPT_MODEL.filter(el => Object.keys(ai_models).includes(el.value)).map((el)=> {
      if(ai_models[el.value])
        return { ...el, multiplier: ai_models[el.value] + ' x tokens' }
      else
        return { ...el, multiplier: null }
    })

    this.llm_models_flat = generateLlmModelsFlat();
    this.llm_models_flat.forEach(model => {
      if (ai_models[model.model]) {
        model.multiplier = ai_models[model.model].toString();
      }
    });
    this.logger.log("[ACTION-ASKGPTV2] model_list: ", this.llm_models_flat, ai_models);

    this.subscriptionChangedConnector = this.intentService.isChangedConnector$.subscribe((connector: any) => {
      this.logger.debug('[ACTION-ASKGPTV2] isChangedConnector -->', connector);
      this.connector = connector;
      this.updateConnector();
    });
    if(this.intentSelected){
      this.initializeConnector();
    }
    this.initializeAttributes();
    if (!this.action.preview) {
      this.action.preview = []; // per retrocompatibilità
    }
    this.getListNamespaces();
    // this.patchActionsKey();
    await this.initialize();
  }

  ngOnDestroy() {
    if (this.subscriptionChangedConnector) {
      this.subscriptionChangedConnector.unsubscribe();
    }
  }

  // onDetailModeLoad() {
  //   //this.getKnowledgeBaseSettings();
  //   this.initializeAttributes();
  // }

  private async initialize(){
    await this.initLLMModels();
    this.labelModel = this.action['labelModel']?this.action['labelModel']:'';
    this.multiplier = this.llm_models_flat.find(el => el.labelModel === this.labelModel)?.multiplier;
    this.logger.log("[ACTION ASKGPTV2] 0 initialize llm_options_models: ", this.action, this.labelModel);
    this.setModel(this.labelModel);
  }


  async initLLMModels(){
    const result = await initLLMModels({
      projectService: this.projectService,
      dashboardService: this.dashboardService,
      appConfigService: this.appConfigService,
      logger: this.logger,
      action: this.action,
      llm_model: this.llm_model,
      componentName: 'ACTION ASKGPTV2'
    });
    
    this.llm_models_flat = result.llm_models_flat;
    this.autocompleteOptions = result.autocompleteOptions;
    this.autocompleteOptionsFlat = result.autocompleteOptionsFlat;
    this.multiplier = result.multiplier;
    // Note: askgpt-v2 uses labelModel instead of actionLabelModel
  }




  setModel(labelModel: string){
    const result = setModel(labelModel, this.llm_models_flat, this.logger);
    this.selectedModelConfigured = result.selectedModelConfigured;
    this.action.llm = result.action.llm;
    this.action.model = result.action.model;
    this.action.labelModel = result.action.labelModel;
    this.labelModel = result.labelModel;
    this.multiplier = result.multiplier;
    this.logger.log("[ACTION ASKGPTV2] action: ", this.action);
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

  /** */
  private updateConnector(){
    this.logger.log('[ACTION-ASKGPTV2] updateConnector:');
    const resp = updateConnector(this.connector, this.action, this.isConnectedTrue, this.isConnectedFalse, this.idConnectionTrue, this.idConnectionFalse);
    if(resp){
      this.isConnectedTrue    = resp.isConnectedTrue;
      this.isConnectedFalse   = resp.isConnectedFalse;
      this.idConnectionTrue   = resp.idConnectionTrue;
      this.idConnectionFalse  = resp.idConnectionFalse;
      this.logger.log('[ACTION-ASKGPTV2] updateConnector:', resp);
      if (resp.emit) {
        this.updateAndSaveAction.emit({ type: TYPE_UPDATE_ACTION.CONNECTOR, element: this.connector });
      } 
    }
  }

  // private updateConnector(){
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
  //         this.logger.debug('[ACTION-ASKGPTV2] updateConnector', this.connector.toId, this.connector.fromId ,this.action, array[array.length-1]);
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
  //     this.logger.error('[ACTION-ASKGPTV2] updateConnector error: ', error);
  //   }
  // }


  private initializeAttributes() {
    let new_attributes = [];
    if (!variableList.find(el => el.key ==='userDefined').elements.some(v => v.name === 'kb_reply')) {
      new_attributes.push({ name: "kb_reply", value: "kb_reply" });
    }
    if (!variableList.find(el => el.key ==='userDefined').elements.some(v => v.name === 'kb_source')) {
      new_attributes.push({ name: "kb_source", value: "kb_source" });
    }
    if (!variableList.find(el => el.key ==='userDefined').elements.some(v => v.name === 'kb_chunks')) {
      new_attributes.push({ name: "kb_chunks", value: "kb_chunks" });
    }
    variableList.find(el => el.key ==='userDefined').elements = [ ...variableList.find(el => el.key ==='userDefined').elements, ...new_attributes];
    this.logger.debug("[ACTION-ASKGPTV2] Initialized variableList.userDefined: ", variableList.find(el => el.key ==='userDefined'));
  }


  private getListNamespaces(){
    this.openaiService.getAllNamespaces().subscribe((namaspaceList) => {
      this.logger.log("[ACTION-ASKGPTV2] getListNamespaces", namaspaceList)
      this.listOfNamespaces = namaspaceList.map((el) => { return { name: el.name, value: el.id, hybrid: el.hybrid? el.hybrid:false } })
      namaspaceList.forEach(el => this.autocompleteOptions.push({label: el.name, value: el.name}))
      this.initializeNamespaceSelector();
    })
  }

  async initializeNamespaceSelector() {
    if (!this.action.namespaceAsName) {
      if (!this.action.namespace) {
        this.action.namespace = this.project_id;
        return;
      }
    } else {
      if (!this.action.namespace) {
        this.action.namespace = await this.idToName(this.project_id);
      }
    }
    this.selectKB(this.action.namespace);
  }

  selectKB(namespace){
    const result = this.listOfNamespaces.find(el => el.value === namespace);
    this.logger.log("[ACTION-ASKGPTV2] selectKB", namespace, result)
    this.IS_VISIBLE_ALPHA_SLIDER = result.hybrid
  }

  /** TO BE REMOVED: patch undefined action keys */
  // private patchActionsKey(){
  //   if(!this.action.hasOwnProperty('top_k')){
  //     this.action.top_k = 5;
  //   }
  //   if(!this.action.hasOwnProperty('max_tokens')){
  //     this.action.max_tokens = 256;
  //   }
  //   if(!this.action.hasOwnProperty('temperature')){
  //     this.action.temperature = 0.7;
  //   }
  // }

  onChangeTextarea(event: string, property: string) {
    this.logger.log("[ACTION-ASKGPTV2] onEditableDivTextChange event", event)
    this.logger.log("[ACTION-ASKGPTV2] onEditableDivTextChange property", property)
    if (this.isInitializing[property]) {
      this.isInitializing[property] = false;
      return;
    }
    if (property === 'llm_model'){
       // se event non corrisponde a nessun valore di autocompleteOptionsFlat ed è diverso da '' o null allora non fare nulla
      if(!this.autocompleteOptionsFlat.find(el => el.value === event) && event !== '' && event !== null) {
        return;
      }
      this.action['labelModel'] = event;
      this.labelModel = event;
      this.setModel(event);
    } else {
      this.action[property] = event;
    }
  }
  
  onBlur(event){
    this.updateAndSaveAction.emit();
  }

  onSelectedAttribute(variableSelected: { name: string, value: string }, key) {
    this.action[key] = variableSelected.value;
    this.updateAndSaveAction.emit()
}
  
  onChangeSelect(event, target) {
    if (event.clickEvent === 'footer') {
      // this.openAddKbDialog();  moved in knowledge base settings
    } else {
      this.logger.log("event: ", event);
      this.action.model = event.value;
      
      this.logger.log("[ACTION-ASKGPTV2] updated action", this.action);
      this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
    }
  }

  onChangeBlockSelect(event:{name: string, value: string}, type: 'trueIntent' | 'falseIntent' | 'namespace') {
    if(event){
      if (type === 'namespace') {
        this.logger.log("[ACTION-ASKGPTV2] onChangeBlockSelect ",event );
        if (!this.action.namespaceAsName) {
          this.action[type]=event.value
        } else {
          this.action[type] = this.listOfNamespaces.find(n => n.value === event.value).name;
        }
        this.selectedNamespace = event.value;
        this.selectKB(this.selectedNamespace);
      } else {
        this.action[type]=event.value
      }
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

  onResetBlockSelect(event:{name: string, value: string}, type: 'trueIntent' | 'falseIntent' | 'namespace') {
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
  
  onChangeAttributes(attributes:any, type:'trueIntent' | 'falseIntent'){
    this.logger.log("type: ", type)
    this.logger.log("attributes: ", attributes)
    if (type === 'trueIntent') {
      this.action.trueIntentAttributes = attributes;
    }
    if (type === 'falseIntent') {
      this.action.falseIntentAttributes = attributes;
    }
    this.logger.log("action updated: ", this.action)
  }

  async onChangeCheckbox(event, target){
    try {
        this.action[target] = !this.action[target];
        if (target === "namespaceAsName") {
          if (this.action[target]) {
            if (this.action.namespace) {
              this.action.namespace = await this.idToName(this.action.namespace);
            }
          } else {
            this.action.namespace = await this.nameToId(this.action.namespace);
          }
        } else if(target === 'citations'){
          if (this.action[target]) {
            this.ai_setting['max_tokens'].min=1024;
            this.action.max_tokens = 1024
          }else{
            this.ai_setting['max_tokens'].min=10;
            this.action.max_tokens = 256
          }
        }
        this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});

    } catch (error) {
      this.logger.log("Error: ", error);
    }
  }

  updateSliderValue(event, target) {
    this.logger.debug("[ACTION-ASKGPTV2] updateSliderValue event: ", event)
    this.logger.debug("[ACTION-ASKGPTV2] updateSliderValue target: ", target)
    this.action[target] = event;
    this.updateAndSaveAction.emit();
  }

  goToKNB(){
    let url = this.appConfigService.getConfig().dashboardBaseUrl + '#/project/' + this.project_id +'/knowledge-bases'
    window.open(url, '_blank')
  }

  async execPreview() {
    //this.scrollToBottom();
    this.temp_variables = [];
    let resp = await this.checkVariables();
    this.logger.log("[ACTION-ASKGPTV2] execPreview: ", resp);

    let respNamespace = await this.checkNamespaceVariables()
    if (resp && respNamespace){
      this.getResponse(this.action.question, this.action.namespace);
    } else{
      this.openAttributesDialog();
    }
  }

  checkVariables() {
    return new Promise((resolve) => {
      let regex: RegExp = /{{[^{}]*}}/g;
      let string = this.action.question;
      let matches = string.match(regex);
      if (!matches || matches.length == 0) {
        resolve(true);
      } else {
        matches.forEach((m) => {
          let name = m.slice(2, m.length - 2);
          let attr = this.action.preview.find(v => v.name === name);
          const index = this.temp_variables.findIndex((e) => e.name === name);
          if(index> -1 ){ //key already exist: do not add it again
            return;
          }
          if (attr && attr.value) {
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

  checkNamespaceVariables() {
    return new Promise((resolve) => {
      let regex: RegExp = /{{[^{}]*}}/g;
      let string = this.action.namespace;
      let matches = string.match(regex);

      if (!matches || matches.length == 0) {
        resolve(true);

      } else {

        matches.forEach((m) => {
          let name = m.slice(2, m.length - 2);
          let attr = this.action.preview.find(v => v.name === name);

          const index = this.temp_variables.findIndex((e) => e.name === name);
          if(index> -1 ){ //key already exist: do not add it again
            return;
          }

          if (attr && attr.value) {
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

  async getResponse(question, namespace) {
    this.logger.log("getResponse called...")

    let data = {
      question: question,
      system_context: this.action.context,
      model: this.action.model,
      max_tokens: this.action.max_tokens,
      temperature: this.action.temperature,
      top_k: this.action.top_k,
      alpha: this.action.alpha,
      namespace: namespace,
      advancedPrompt: this.action.advancedPrompt,
      chunks_only: this.action?.chunks_only
    }
    // if(this.action?.chunks_only && this.action?.chunks_only === true){
    //   data['search_type'] = 'chunks';
    // }
    if(this.action.namespaceAsName){
      data.namespace = await this.nameToId(namespace)
    }
    this.showAiError = false;
    this.searching = true;
    this.showPreview = true;

    setTimeout(() => {
      let element = document.getElementById("preview-container");
      element?.classList.remove('preview-container-extended')
    }, 200)

    this.openaiService.previewAskPrompt(data).subscribe({ next: (preview_response: any)=> {
      this.searching = false;
      setTimeout(() => {
        let element = document.getElementById("preview-container");
        element.classList.add('preview-container-extended')
      }, 200)

      this.logger.log("[ACTION GPT-TASK] previewPrompt ai_response: ", preview_response, preview_response.chunks);

      this.preview_response = preview_response;

      if(!preview_response.answer){
        this.showAiError = true;
        this.ai_error = this.translate.instant('CDSCanvas.AiNoAnswer')
        // return;
      }
      
      if(preview_response.chunks){
        this.chunks = preview_response.chunks;
      } else if(preview_response.content_chunks){
        this.chunks = preview_response.content_chunks;
      }
      
      //this.ai_response = preview_response.answer;

    }, error: (err)=> {
      this.searching = false;
      this.logger.error("[ACTION GPT-TASK] previewPrompt error: ", err);
      setTimeout(() => {
        let element = document.getElementById("preview-container");
        element?.classList.add('preview-container-extended')
      }, 200)
      this.showAiError = true;
      this.ai_error = this.translate.instant('CDSCanvas.AiError')
      if(err.error.error_code === 13001){
        this.ai_error = this.translate.instant('CDSCanvas.AiQuotaExceeded')
        return;
      }
    }, complete: ()=> {
      this.logger.debug("[ACTION GPT-TASK] preview prompt *COMPLETE*: ");
      this.searching = false;
    }});
  }

  openAttributesDialog() {
    this.logger.log("temp_variables: ", this.temp_variables);
    const dialogRef = this.dialog.open(AttributesDialogComponent, {
      panelClass: 'custom-setattribute-dialog-container',
      data: { attributes: this.temp_variables, question: this.action.question, namespace: this.action.namespace }
    });
    dialogRef.afterClosed().subscribe(result => {
      this.logger.log("AttributesDialogComponent result: ", result);
      if (result !== false) {
        this.getResponse(result.question, result.namespace);
        this.saveAttributes(result.attributes);
      }
    });
  }

  saveAttributes(attributes) {
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

  async idToName(id: string): Promise<any> {
    return new Promise((resolve) => {
      let name = this.listOfNamespaces.find(n => n.value === id).name;
      resolve(name)
    })
  }

  async nameToId(name: string): Promise<any> {
    return new Promise((resolve) => {
      let selected = this.listOfNamespaces.find(n => n.name === name);
      if(selected){
        resolve(selected.value)
      }
      resolve(this.project_id)
    })
  }


  goToIntegrations(){
    let url = this.appConfigService.getConfig().dashboardBaseUrl + '#/project/' + this.project_id +'/integrations'
    window.open(url, '_blank')
  }
}
