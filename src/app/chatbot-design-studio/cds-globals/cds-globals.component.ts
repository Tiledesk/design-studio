import { Global } from '../../models/global-model';
import { Component, HostListener, Input, OnInit, Renderer2 } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { variableList } from '../utils-variables';
import { Chatbot } from 'src/app/models/faq_kb-model';
import { FaqKbService } from 'src/app/services/faq-kb.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { MEDIA } from '../utils-resources';
import { DashboardService } from 'src/app/services/dashboard.service';

@Component({
  selector: 'cds-globals',
  templateUrl: './cds-globals.component.html',
  styleUrls: ['./cds-globals.component.scss']
})
export class CdsGlobalsComponent implements OnInit {

  selectedChatbot: Chatbot;

  
  newGlobal: Global = { key: '', value: '' }
  
  list = [];
  updateIndex: any;
  currentValue: string;

  IS_OPEN_PANEL_GLOBAL_DETAIL: boolean = false;
  showWelcome: boolean = true;
  selectedGlobal: Global

  MEDIA = MEDIA
  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private faqKbService: FaqKbService,
    private dashboardService: DashboardService
  ) { }

  ngOnInit(): void {
    this.selectedChatbot = this.dashboardService.selectedChatbot
    this.initialize()
  }

  ngOnChanges(): void {
    this.logger.log("[CDS-GLOBALS] ngOnChanges -- selectedChatbot::", this.selectedChatbot);
    this.initialize()
  }

  initialize(){
    if(this.selectedChatbot && this.selectedChatbot.attributes && this.selectedChatbot.attributes.globals){
      this.selectedChatbot.attributes.globals.sort((a, b) => {
        return a.key.toLowerCase().localeCompare(b.key.toLowerCase());;
      })
      this.list = this.selectedChatbot.attributes.globals.map(s => ({ ...s, visible: false }));
      this.logger.debug("[CDS-GLOBALS] globals list: ", this.list)
      if(this.list.length > 0){
        this.showWelcome = false
      }
    }
  }

  showUpdateSecret(index, global) {
    this.updateIndex = index;
    if (global) {
      this.IS_OPEN_PANEL_GLOBAL_DETAIL = true
      this.selectedGlobal = global
    }
  }

  deleteElement(key) {
    let index = this.list.findIndex(s => s.key === key);
    this.list.splice(index, 1);
    this.saveAttributes();

    if(this.list.length === 0 ){
      this.showWelcome = true
    }else{
      this.showWelcome = false
    }
  }

  saveAttributes() {
    let data = this.list.map(({ visible, ...keepAttrs }) => keepAttrs);

    this.faqKbService.addNodeToChatbotAttributes(this.selectedChatbot._id, 'globals', data).subscribe((resp) => {
      this.newGlobal = {
        key: '',
        value: ''
      }
      this.selectedChatbot.attributes= {
        globals: data
      }
      
      //Update local list (for variable-list component)
      variableList.find(el => el.key ==='globals').elements = this.selectedChatbot.attributes.globals.map(({
        key: name,
        ...rest
      }) => ({
        name,
        value: name
      }))
    }, (error) => {
      this.logger.error("[CDS-GLOBALS ] addSecretToChatbot error: ", error);
    }, () => {
      this.logger.debug("[CDS-GLOBALS]  addSecretToChatbot *COMPLETE*");
    })
  }

  copyToClipboard(value) {
    navigator.clipboard.writeText(value)
  }

  addNew(event){
    this.IS_OPEN_PANEL_GLOBAL_DETAIL = true
    this.selectedGlobal = null
  }

  onGlobalChange(event: {type: 'add' | 'edit' | 'delete' | 'return', element: Global | null }){
    this.logger.log('[CDS-GLOBALS ] onGlobalChange -->', event, this.updateIndex)
    switch(event.type){
      case 'add':
        this.list.push(event.element)
        break;
      case 'edit':
        this.list[this.updateIndex] = event.element
        break;
      case 'delete':
        this.list.splice(this.updateIndex, 1);
        break;
      case 'return':
        break;
    }

    this.saveAttributes();
    this.updateIndex = null;

    if(this.list.length === 0 ){
      this.showWelcome = true
    }else{
      this.showWelcome = false
    }

    this.IS_OPEN_PANEL_GLOBAL_DETAIL = false
  }

  // -------------------------------------------------------
  // @ Close WHEN THE GLOBAL SECTION IS CLICKED 
  // - detail gloal panel
  // -------------------------------------------------------
  @HostListener('document:click', ['$event'])
  documentClick(event: any): void {
    this.logger.log('[CDS GLOBALS] DOCUMENT CLICK event: ', event);
    if (event.target.id.startsWith("cds-globals") || event.target.className.startsWith("cds-ss-main-content")) {
      this.IS_OPEN_PANEL_GLOBAL_DETAIL = false
    }
  }

  // private initializeAttributes() {
  //   let new_attributes = [];
  //   if (!variableList.userDefined.some(v => v.name === 'kb_reply')) {
  //     new_attributes.push({ name: "kb_reply", value: "kb_reply" });
  //   }
  //   if (!variableList.userDefined.some(v => v.name === 'kb_source')) {
  //     new_attributes.push({ name: "kb_source", value: "kb_source" });
  //   }
  //   variableList.userDefined = [...variableList.userDefined, ...new_attributes];
  //   this.logger.debug("[CDS SECRETS] Initialized variableList.userDefined: ", variableList.userDefined);
  // }


  // showHideUpdateSecret(secret) {
  //   let target = "update-secret-" + secret.key;
  //   let el = <HTMLInputElement>document.getElementById(target);
  //   let span_target = "span-icon-" + secret.key;

  //   let el_icon = <HTMLSpanElement>document.getElementById(span_target);
  

  //   this.updateSecretVisible = !this.updateSecretVisible;
  //   if (el) {
  //     if (this.updateSecretVisible == true) {
  //       el.value = secret.value;
  //       el.style.fontSize = "16px";
  //       el_icon.textContent = 'visibility_off';
  //     } else {
  //       el.value = '•••••••••••••••';
  //       el.style.fontSize = "24px";
  //       el_icon.textContent = 'visibility';
  //     }
  //   }
  //   // let el = <HTMLInputElement>document.getElementById("update-secret-value");
  //   // if (el) {
  //   //   if (this.updateSecretVisible == true) {
  //   //     el.type = 'text';
  //   //     el.placeholder = 'value';
  //   //   } else {
  //   //     el.type = 'password';
  //   //     el.placeholder = '•••••';
  //   //   }
  //   // }
  // }



}
