import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ActionKBContent } from 'src/app/models/action-model';
import { AppConfigService } from 'src/app/services/app-config';
import { DOCS_LINK, TYPE_UPDATE_ACTION, TYPE_GPT_MODEL } from 'src/app/chatbot-design-studio/utils';

import { DashboardService } from 'src/app/services/dashboard.service';
import { OpenaiService } from 'src/app/services/openai.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { BRAND_BASE_INFO } from 'src/app/chatbot-design-studio/utils-resources';

@Component({
  selector: 'cds-action-add-kb-content',
  templateUrl: './cds-action-add-kb-content.component.html',
  styleUrls: ['./cds-action-add-kb-content.component.scss']
})
export class CdsActionAddKbContentComponent implements OnInit {

  @Input() action: ActionKBContent;
  @Input() previewMode: boolean = true;
  @Output() updateAndSaveAction = new EventEmitter();

  project_id: string;
  selectedNamespace: string;
  listOfNamespaces: Array<{name: string, displayName: string, kbTypeLabel: string, value: string, icon?:string, hybrid?: boolean}>;
  autocompleteOptions: Array<{label: string, value: string}> = [];
  

  BRAND_BASE_INFO = BRAND_BASE_INFO;
  DOCS_LINK = DOCS_LINK.ADD_TO_KB;

  private logger: LoggerService = LoggerInstance.getInstance();
    
  constructor(
    private openaiService: OpenaiService,
    private dashboardService: DashboardService,
    private appConfigService: AppConfigService
  ) { }

  ngOnInit(): void {
    this.project_id = this.dashboardService.projectID
    this.getListNamespaces();
  }

  onChangeTextarea($event: string, property: string) {
    this.logger.log("[ACTION-ADD_KBCONTENT] onEditableDivTextChange event", $event);
    this.logger.log("[ACTION-ADD_KBCONTENT] onEditableDivTextChange property", property);
    this.action[property] = $event;
    // this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
  }


  private getListNamespaces(){
    this.openaiService.getAllNamespaces().subscribe((namaspaceList) => {
      this.logger.log("[ACTION-ASKGPTV2] getListNamespaces", namaspaceList)
      this.listOfNamespaces = namaspaceList.map((el) => {
        const isHybrid = (el as any).hybrid ? (el as any).hybrid : false;
        const kbTypeLabel = isHybrid ? 'Hybrid' : 'Semantic';
        return { name: el.name, displayName: el.name, kbTypeLabel, value: el.id, hybrid: isHybrid };
      })
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
      this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
    }
  }
  
  onResetBlockSelect(event:{name: string, value: string}, type: 'trueIntent' | 'falseIntent' | 'namespace') {
    this.action[type]=null
    this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
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
      }
      this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
    } catch (error) {
      this.logger.log("Error: ", error);
    }
  }


  onBlur(event, property){
    if(property == 'source'){
      this.action.content = this.action.name?  this.action.name + '\n'+this.action[property] : this.action[property];
    } else if(property == 'namespace'){
      this.action.namespace = event.target.value;
    }
    this.updateAndSaveAction.emit()
  }
 
  goToKNB(){
    let url = this.appConfigService.getConfig().dashboardBaseUrl + '#/project/' + this.project_id +'/integrations?name='
    window.open(url, '_blank');
  }


}
