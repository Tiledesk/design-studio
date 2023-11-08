import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { variableList } from '../../utils';
import { Chatbot } from 'src/app/models/faq_kb-model';
import { FaqKbService } from 'src/app/services/faq-kb.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Component({
  selector: 'cds-secrets',
  templateUrl: './cds-secrets.component.html',
  styleUrls: ['./cds-secrets.component.scss']
})
export class CdsSecretsComponent implements OnInit {

  @Input() selectedChatbot: Chatbot;

  newSecretSectionVisible: boolean = false;
  newSecretVisible: boolean = false;
  updateSecretVisible: boolean = false;

  newSecret = {
    key: '',
    value: ''
  }
  secretForm: FormGroup;

  secretsList = [];
  updateIndex: any;
  currentValue: string;

  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private formBuilder: FormBuilder,
    private faqKbService: FaqKbService
  ) { }

  ngOnInit(): void {
    this.secretForm = this.createSecretsGroup();
  }

  ngOnChanges(): void {
    console.log("----> (onchanges) chatbot: ", this.selectedChatbot);
    if(this.selectedChatbot && this.selectedChatbot.attributes && this.selectedChatbot.attributes.secrets){
      this.selectedChatbot.attributes.secrets.sort((a, b) => {
        return a.key.toLowerCase().localeCompare(b.key.toLowerCase());;
      })
      this.secretsList = this.selectedChatbot.attributes.secrets.map(s => ({ ...s, visible: false }));;
      this.logger.debug("[CDS SECRETS] Secrets list: ", this.secretsList)
  
      console.log("----> (oninit) secrets list: ", this.secretsList[0]);
      console.log("----> (oninit) chatbot: ", this.selectedChatbot.attributes.secrets[0]);
    }
  }

  createSecretsGroup(): FormGroup {
    return this.formBuilder.group({
      key: ['', [Validators.required, Validators.pattern('([A-Za-z0-9\_]+)')]],
      // key: ['', [Validators.required, Validators.pattern('[a-zA-Z0-9_]*$')]],
      value: ['', [Validators.required]]
    })

  }

  addNewSecret() {
    this.secretsList.push(this.newSecret);
    this.saveAttributes();
    this.newSecretSectionVisible = false;
  }

  updateSecret() {
    this.saveAttributes();
    this.showUpdateSecret(null, null);
  }

  showUpdateSecret(index, secret) {
    this.updateIndex = index;
    console.log("secret: ", secret)
    if (secret) {
      this.secretForm.patchValue({ 'key': secret.key })
      this.secretForm.patchValue({ 'value': secret.value })
    }
  }

  cancelUpdateSecret(index) {
    this.updateIndex = null;
    console.log("----> (cancel) secrets list: ", this.secretsList[0]);
    console.log("----> (cancel) chatbot: ", this.selectedChatbot.attributes.secrets[0]);
    this.secretsList[index] = this.selectedChatbot.attributes.secrets[index];
    console.log("----> (cancel) secrets list: ", this.secretsList[0]);
  }

  deleteSecrect(key) {
    let index = this.secretsList.findIndex(s => s.key === key);
    this.secretsList.splice(index, 1);

    this.saveAttributes();
  }

  saveAttributes() {
    let data = this.secretsList.map(({ visible, ...keepAttrs }) => keepAttrs);

    this.faqKbService.addSecretToChatbot(this.selectedChatbot._id, data).subscribe((resp) => {
      this.newSecret = {
        key: '',
        value: ''
      }
      this.newSecretVisible = false;
      console.log("----> (cancel) secrets list: ", this.secretsList[0]);
      console.log("----> (cancel) chatbot: ", this.selectedChatbot.attributes.secrets[0]);
    }, (error) => {
      this.logger.error("[CDS SECRETS] addSecretToChatbot error: ", error);
    }, () => {
      this.logger.debug("[CDS SECRETS]  addSecretToChatbot *COMPLETE*");
    })
  }

  showHideNewSecret() {
    this.newSecretVisible = !this.newSecretVisible;
    let el = <HTMLInputElement>document.getElementById("secret-value");
    if (el) {
      if (this.newSecretVisible == true) {
        el.type = 'text';
        el.placeholder = 'value';
      } else {
        el.type = 'password';
        el.placeholder = '•••••';
      }

    }
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

  showHideNewSecretSection(visible: boolean) {
    this.newSecretSectionVisible = visible;
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
