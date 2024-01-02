import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { variableList } from '../utils';
import { Chatbot } from 'src/app/models/faq_kb-model';
import { FaqKbService } from 'src/app/services/faq-kb.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Component({
  selector: 'cds-globals',
  templateUrl: './cds-globals.component.html',
  styleUrls: ['./cds-globals.component.scss']
})
export class CdsGlobalsComponent implements OnInit {

  @Input() selectedChatbot: Chatbot;

  newSectionVisible: boolean = false;
  updateSecretVisible: boolean = false;

  newGlobal = {
    key: '',
    value: ''
  }
  globalForm: FormGroup;

  list = [];
  updateIndex: any;
  currentValue: string;
  showWelcome: boolean = true;

  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private formBuilder: FormBuilder,
    private faqKbService: FaqKbService
  ) { }

  ngOnInit(): void {
    this.globalForm = this.createSecretsGroup();
  }

  ngOnChanges(): void {
    this.logger.log("[CDS-GLOBALS] ngOnChanges -- selectedChatbot::", this.selectedChatbot);
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

  createSecretsGroup(): FormGroup {
    return this.formBuilder.group({
      key: ['', [Validators.required, Validators.pattern('([A-Za-z0-9\_]+)')]],
      // key: ['', [Validators.required, Validators.pattern('[a-zA-Z0-9_]*$')]],
      value: ['', [Validators.required]]
    })

  }

  onSubmitForm() {
    console.log('[CDS-GLOBALS] onSubmitForm:', this.globalForm)
    if(this.globalForm.valid){
      this.list.push(this.globalForm.value);
      this.saveAttributes();
      this.newSectionVisible = false
    }
  }

  updateSecret(index) {
    console.log('[CDS-GLOBALS] updateSecret:', this.globalForm)
    if(this.globalForm.valid){
      this.list[index] = this.globalForm.value
      this.saveAttributes();
      this.updateIndex = null;
    }
  }

  showUpdateSecret(index, global) {
    this.updateIndex = index;
    if (global) {
      this.globalForm.patchValue({ 'key': global.key, 'value': global.value })
    }
    this.newSectionVisible = false
  }

  cancelUpdateSecret(index) {
    this.updateIndex = null;
    this.list[index] = this.selectedChatbot.attributes.globals[index];
  }

  deleteElement(key) {
    this.newSectionVisible = false;
    let index = this.list.findIndex(s => s.key === key);
    this.list.splice(index, 1);

    this.saveAttributes();
  }

  saveAttributes() {
    let data = this.list.map(({ visible, ...keepAttrs }) => keepAttrs);

    this.faqKbService.addNodeToChatbotAttributes(this.selectedChatbot._id, 'globals', data).subscribe((resp) => {
      this.newGlobal = {
        key: '',
        value: ''
      }
      this.globalForm.reset();
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

  showHideUpdateSecret(secret) {
    secret.visible = !secret.visible;
  }

  showHideSecret(secret) {
    secret.visible = !secret.visible;
  }

  copyToClipboard(value) {
    navigator.clipboard.writeText(value)
  }

  showHideNewSection(visible: boolean) {
    this.showUpdateSecret(null, null);
    this.newSectionVisible = visible;
  }

  addNew(event){
    if(this.list.length === 0 ){
      this.showWelcome = false
      this.showHideNewSection(true)
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
  //   console.log("showHideUpdateSecret with key: ", secret.key);
  //   let target = "update-secret-" + secret.key;
  //   console.log("target: ", target);

  //   let el = <HTMLInputElement>document.getElementById(target);
  //   console.log("el: ", el);

  //   let span_target = "span-icon-" + secret.key;

  //   let el_icon = <HTMLSpanElement>document.getElementById(span_target);
  //   console.log("el_icon: ", el_icon);


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
