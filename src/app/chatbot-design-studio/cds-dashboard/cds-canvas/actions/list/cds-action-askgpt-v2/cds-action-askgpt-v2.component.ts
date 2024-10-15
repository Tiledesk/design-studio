import { Namespace } from './../../../../../../models/namespace-model';
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
import { TYPE_UPDATE_ACTION, TYPE_GPT_MODEL } from 'src/app/chatbot-design-studio/utils';
import { variableList } from 'src/app/chatbot-design-studio/utils-variables';
import { TranslateService } from '@ngx-translate/core';
import { loadTokenMultiplier } from 'src/app/utils/util';
import { DashboardService } from 'src/app/services/dashboard.service';
import { BRAND_BASE_INFO } from 'src/app/chatbot-design-studio/utils-resources';

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
  listOfNamespaces: Array<{name: string, value: string, icon?:string}>;

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
  ai_response: string = "";
  ai_error: string = "";

  temp_variables = [];
  autocompleteOptions: Array<string> = [];

  model_list: Array<{ name: string, value: string, multiplier: string}>;
  ai_setting: { [key: string] : {name: string,  min: number, max: number, step: number}} = {
    "max_tokens": { name: "max_tokens",  min: 10, max: 2048, step: 1},
    "temperature" : { name: "temperature", min: 0, max: 1, step: 0.05},
    "top_k": { name: "top_k", min: 1, max: 10, step: 1 }
  }

  BRAND_BASE_INFO = BRAND_BASE_INFO;
  
  private subscriptionChangedConnector: Subscription;

  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private intentService: IntentService,
    private appConfigService: AppConfigService,
    private dashboardService: DashboardService,
    private openaiService: OpenaiService,
    private translate: TranslateService,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.logger.debug("[ACTION-ASKGPTV2] action detail: ", this.action);
    this.project_id = this.dashboardService.projectID
    const ai_models = loadTokenMultiplier(this.appConfigService.getConfig().aiModels)
    this.model_list = TYPE_GPT_MODEL.filter(el => Object.keys(ai_models).includes(el.value)).map((el)=> {
      if(ai_models[el.value])
        return { ...el, multiplier: ai_models[el.value] + ' x tokens' }
      else
        return { ...el, multiplier: null }
    })
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
    this.patchActionsKey();

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

  initializeConnector() {
    this.idIntentSelected = this.intentSelected.intent_id;
    this.idConnectorTrue = this.idIntentSelected+'/'+this.action._tdActionId + '/true';
    this.idConnectorFalse = this.idIntentSelected+'/'+this.action._tdActionId + '/false';
    this.listOfIntents = this.intentService.getListOfIntents();
    this.checkConnectionStatus();
  }

  private checkConnectionStatus(){
    if(this.action.trueIntent){
      this.isConnectedTrue = true;
      const posId = this.action.trueIntent.indexOf("#");
      if (posId !== -1) {
        const toId = this.action.trueIntent.slice(posId+1);
        this.idConnectionTrue = this.idConnectorTrue+"/"+toId;
      }
    } else {
      this.isConnectedTrue = false;
      this.idConnectionTrue = null;
    }
    if(this.action.falseIntent){
      this.isConnectedFalse = true;
      const posId = this.action.falseIntent.indexOf("#");
      if (posId !== -1) {
        const toId = this.action.falseIntent.slice(posId+1);
        this.idConnectionFalse = this.idConnectorFalse+"/"+toId;
      }
     } else {
      this.isConnectedFalse = false;
      this.idConnectionFalse = null;
     }
  }

  private updateConnector(){
    try {
      const array = this.connector.fromId.split("/");
      const idAction= array[1];
      if(idAction === this.action._tdActionId){
        if(this.connector.deleted){
          if(array[array.length -1] === 'true'){
            this.action.trueIntent = null;
            this.isConnectedTrue = false;
            this.idConnectionTrue = null;
          }        
          if(array[array.length -1] === 'false'){
            this.action.falseIntent = null;
            this.isConnectedFalse = false;
            this.idConnectionFalse = null;
          }
          if(this.connector.save)this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.CONNECTOR, element: this.connector});
        } else { 
          // TODO: verificare quale dei due connettori è stato aggiunto (controllare il valore della action corrispondente al true/false intent)
          this.logger.debug('[ACTION-ASKGPTV2] updateConnector', this.connector.toId, this.connector.fromId ,this.action, array[array.length-1]);
          if(array[array.length -1] === 'true'){
            // this.action.trueIntent = '#'+this.connector.toId;
            this.isConnectedTrue = true;
            this.idConnectionTrue = this.connector.fromId+"/"+this.connector.toId;
            this.action.trueIntent = '#'+this.connector.toId;
            if(this.connector.save)this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.CONNECTOR, element: this.connector});
          }        
          if(array[array.length -1] === 'false'){
            // this.action.falseIntent = '#'+this.connector.toId;
            this.isConnectedFalse = true;
            this.idConnectionFalse = this.connector.fromId+"/"+this.connector.toId;
            this.action.falseIntent = '#'+this.connector.toId;
            if(this.connector.save)this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.CONNECTOR, element: this.connector});
          }
        }
      }
    } catch (error) {
      this.logger.error('[ACTION-ASKGPTV2] updateConnector error: ', error);
    }
  }


  private initializeAttributes() {
    let new_attributes = [];
    if (!variableList.find(el => el.key ==='userDefined').elements.some(v => v.name === 'kb_reply')) {
      new_attributes.push({ name: "kb_reply", value: "kb_reply" });
    }
    if (!variableList.find(el => el.key ==='userDefined').elements.some(v => v.name === 'kb_source')) {
      new_attributes.push({ name: "kb_source", value: "kb_source" });
    }
    variableList.find(el => el.key ==='userDefined').elements = [ ...variableList.find(el => el.key ==='userDefined').elements, ...new_attributes];
    this.logger.debug("[ACTION ASKGPTV2] Initialized variableList.userDefined: ", variableList.find(el => el.key ==='userDefined'));
  }


  private getListNamespaces(){
    this.openaiService.getAllNamespaces().subscribe((namaspaceList) => {
      this.logger.log("[ACTION-ASKGPT] getListNamespaces", namaspaceList)
      this.listOfNamespaces = namaspaceList.map((el) => { return { name: el.name, value: el.id} })
      namaspaceList.forEach(el => this.autocompleteOptions.push(el.name))
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
  }

  /** TO BE REMOVED: patch undefined action keys */
  private patchActionsKey(){
    if(!this.action.hasOwnProperty('top_k')){
      this.action.top_k = 5;
    }
    if(!this.action.hasOwnProperty('max_tokens')){
      this.action.max_tokens = 256;
    }
    if(!this.action.hasOwnProperty('temperature')){
      this.action.temperature = 0.7;
    }
  }

  onChangeTextarea($event: string, property: string) {
    this.logger.log("[ACTION-ASKGPT] onEditableDivTextChange event", $event)
    this.logger.log("[ACTION-ASKGPT] onEditableDivTextChange property", property)
    this.action[property] = $event
    // this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
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
      
      this.logger.log("[ACTION-ASKGPT] updated action", this.action);
      this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
    }
  }

  onChangeBlockSelect(event:{name: string, value: string}, type: 'trueIntent' | 'falseIntent' | 'namespace') {
    if(event){
      if (type === 'namespace') {
        if (!this.action.namespaceAsName) {
          this.action[type]=event.value
        } else {
          this.action[type] = this.listOfNamespaces.find(n => n.value === event.value).name;
        }
        this.selectedNamespace = event.value;
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
        }else if(target === 'citations'){
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
    this.logger.debug("[ACTION GPT-TASK] updateSliderValue event: ", event)
    this.logger.debug("[ACTION GPT-TASK] updateSliderValue target: ", target)
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
    let respNamespace = await this.checkNamespaceVariables()
    if (resp && respNamespace){
      this.getResponse(this.action.question, this.action.namespace);
    }else{
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
      namespace: namespace,
      advancedPrompt: this.action.advancedPrompt
    }

    if(this.action.namespaceAsName){
      data.namespace = await this.nameToId(namespace)
    }

    this.showAiError = false;
    this.searching = true;
    this.showPreview = true;

    setTimeout(() => {
      let element = document.getElementById("preview-container");
      element.classList.remove('preview-container-extended')
    }, 200)

    this.openaiService.previewAskPrompt(data).subscribe({ next: (ai_response: any)=> {
      this.searching = false;
      setTimeout(() => {
        let element = document.getElementById("preview-container");
        element.classList.add('preview-container-extended')
      }, 200)
      if(!ai_response.answer){
        this.showAiError = true;
        this.ai_error = this.translate.instant('CDSCanvas.AiNoAnswer')
        return;
      }
      this.ai_response = ai_response;
    }, error: (err)=> {
      this.searching = false;
      this.logger.error("[ACTION GPT-TASK] previewPrompt error: ", err);
      setTimeout(() => {
        let element = document.getElementById("preview-container");
        element.classList.add('preview-container-extended')
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


}
