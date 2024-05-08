import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Field, Form, Intent } from 'src/app/models/intent-model';
import { FormModelsFactory } from './form-models-factory';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
const swal = require('sweetalert');
// import { URL_more_info_chatbot_forms } from 'app/utils/util';

export interface ModalDeleteModel {
  deleteField?: string;
  nameField?: string;
  confirmDeleteField?: string;
  cancel?: string;
}

@Component({
  selector: 'cds-form',
  templateUrl: './form.component.html',
  styleUrls: ['./form.component.scss']
})
export class CdsFormComponent implements OnInit, OnChanges {
  @ViewChild('scrollMe', { static: false }) scrollContainer: ElementRef;

  // @Output() passJsonIntentForm = new EventEmitter();
  @Input() intentForm: Form;
  @Input() intentSelected: Intent;
  @Output() updateIntentForm = new EventEmitter();

  langBot: string;
  fields = new Array() as Field[];;
  URL_to_form_more_info = "https://gethelp.tiledesk.com/articles/tiledesk-chatbot-forms/";

  // modal
  displayMODAL = false;
  translateMap: ModalDeleteModel;
  translations: any;

  selectedObjectId: string;

  // add edit form
  selectedField: Field;
  displayTilebotAddEditForm = true;
  displayAddForm = false;
  displayEditForm = false
  displayBoxNewForm = false;
  displaySettingForm = false;
  displayNewFormButton = true;
  displayCancelButton = false;
  displaySettingsButton = false;

  idForm: string = "id-form-000";
  selectedForm: Form;
  selectedFormId: number;
  modelsOfForm: Form[] = [];
  cancelCommands: string[] = [];
  cancelCommandsString: string;
  cancelReply: string;
  intentFormSize: number;

  translateparam = { selectedFormName: "", description_key: "" };

  private logger: LoggerService = LoggerInstance.getInstance();
  
  constructor(
    public translate: TranslateService,
    private route: ActivatedRoute,
  ) {
    this.langBot = this.route.snapshot.params['botlang'];
    if (!this.langBot || this.langBot === undefined) {
      this.langBot = 'en';
    }
  }

  ngOnInit(): void {
  }

  ngOnChanges() {
    this.logger.log('[FORM-COMP] (OnChanges) intentForm ', this.intentForm);
    this.initialize();
  }


  private initialize(){
    this.logger.log('[FORM-COMP] (OnInit) intentSelected ', this.intentSelected)
    this.logger.log('[FORM-COMP] (OnInit) intentForm ', this.intentForm)
    this.displayTilebotAddEditForm = true;
    this.displayAddForm = false;
    this.displayEditForm = false
    this.displayBoxNewForm = false;
    this.displaySettingForm = false;
    this.displayNewFormButton = true;
    this.displayCancelButton = false;
    this.displaySettingsButton = false;
    this.idForm = "id-form-000";
    this.modelsOfForm = [];
    this.cancelCommands = [];
    
    let modelsFactory = new FormModelsFactory()
    this.modelsOfForm = modelsFactory.getModels();
    this.selectedForm = this.modelsOfForm[0];
    this.selectedFormId = this.modelsOfForm[0].id ? this.modelsOfForm[0].id : null;
    this.logger.log('[FORM-COMP] (OnInit) selectedForm ', this.selectedForm)
    this.logger.log('[FORM-COMP] (OnInit) modelsOfForm ', this.modelsOfForm)
    this.logger.log('[FORM-COMP] (OnInit) selectedFormId ', this.selectedFormId)
    this.translateMap = {};
    this.translations = {};
    this.getCurrentTranslation();
    this.intentFormSize = Object.keys(this.intentForm).length;
    if (this.intentFormSize > 0) {
      this.displayNewFormButton = false;
      this.displaySettingsButton = true;
      if (this.intentForm && this.intentForm.fields) {
        // this.fields = this.intentForm.fields;
        this.fields = JSON.parse(JSON.stringify(this.intentForm.fields));
      }
      this.cancelCommands = this.intentForm.cancelCommands;
      this.cancelReply = this.intentForm.cancelReply;
      this.cancelCommandsString = this.cancelCommands.toString();
      this.logger.log('[FORM-COMP] (OnInit) intentFormSize ', this.intentFormSize)
      this.logger.log('[FORM-COMP] OnInit intentForm.fields ', this.fields)
      this.logger.log('[FORM-COMP] cancelCommands ', this.cancelCommands)
      this.logger.log('[FORM-COMP] cancelReply ', this.cancelReply)
      this.logger.log('[FORM-COMP] cancelCommandsString ', this.cancelCommandsString)
    }
  }

  scrollToTop(): void {
    setTimeout(() => {
      try {
        this.scrollContainer.nativeElement.scrollTop = 0;
        this.scrollContainer.nativeElement.animate({ scrollTop: 0 }, '500');
      } catch (error) {
        this.logger.log('scrollToTop ERROR: ', error);
      }
    }, 500);
  }

  scrollToBottom(): void {
    setTimeout(() => {
      try {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
        this.scrollContainer.nativeElement.animate({ scrollTop: 0 }, '500');
      } catch (error) {
        this.logger.error('scrollToBottom ERROR: ', error);
      }
    }, 500);
  }

  onChangeBlockSelect(event:{name: string, id: number}){
    this.getFieldFromId(event.id)
  }

  getFieldFromId(idForm: number) {
    this.logger.log('[FORM-COMP] getFieldFromId idForm ', idForm)
    // this.selectedForm = new FormModelsFactory().getModels()[0]
    this.selectedForm = new FormModelsFactory().getModels().find(({ id }) => id === idForm);
    this.logger.log('[FORM-COMP] getFieldFromId selectedForm ', this.selectedForm)
    // this.translateparam = { selectedFormName: this.selectedForm.name, description_key: this.selectedForm.description_key };
  }

  /** CREATE NEW FORM */
  generateJsonIntentForm() {
    this.logger.log('[FORM-COMP] generateJsonIntentForm')
    if (this.selectedFormId && !this.selectedForm) {
      this.getFieldFromId(this.selectedFormId);
    }
    this.logger.log('[FORM-COMP] selectedForm ', this.selectedForm)
    if (this.selectedForm) {
      this.selectedForm.to_JSON();
      this.intentForm = this.selectedForm;
      this.intentForm.cancelCommands = this.cancelCommands;
      this.intentForm.cancelReply = this.cancelReply;
      this.intentForm.to_JSON();
      // this.fields = JSON.parse(JSON.stringify(this.selectedForm.fields));
      this.fields = this.selectedForm.fields;
      this.intentFormSize = Object.keys(this.intentForm).length;
      this.logger.log('[FORM-COMP] generateJsonIntentForm ', this.intentForm)
    }
    this.displayCancelButton = false;
    this.displaySettingsButton = true;
    this.logger.log('[FORM-COMP] generateJsonIntentForm displaySettingsButton:', this.displaySettingsButton, ' displayCancelButton', this.displayCancelButton)
    // se sto creando un form custom che non ha campi
    if (this.fields.length === 0) {
      this.displayEditForm = false;
      this.displayAddForm = true;
      this.openAddEditForm();
    }
    this.jsonGenerator();
  }


  getCurrentTranslation() {
    let keys = [
      'Cancel',
      'CDSForm.CancelReply',
      'CDSForm.DeleteField',
      'CDSForm.ConfirmDeleteField',
      'CDSForm.DeleteForm',
      'CDSForm.ConfirmDeleteForm'
    ]
    this.translate.get(keys).subscribe(data => {
      this.translations = data
      let cancel = this.translations['Cancel'] ? this.translations['Cancel'] : 'cancel';
      this.logger.log('[FORM-COMP]  getCurrentTranslation intentForm 1', this.intentForm);
      this.intentFormSize = Object.keys(this.intentForm).length;
      if (this.intentFormSize === 0) {
        this.logger.log('[FORM-COMP] getCurrentTranslation intentForm 2', this.intentForm)
        this.cancelCommands.push(cancel);
        this.cancelReply = this.translations['CDSForm.CancelReply'] ? this.translations['CDSForm.CancelReply'] : '';
      }
      this.logger.log('[FORM-COMP] getCurrentTranslation this.cancelReply::', this.cancelReply);
      this.logger.log('[FORM-COMP] getCurrentTranslation cancel::', cancel);
      this.logger.log('[FORM-COMP] getCurrentTranslation cancelCommands::', this.cancelCommands);
    })
  }


  setCancelCommands() {
    //this.cancelCommandsString.split(",");
    this.intentForm.cancelCommands = this.cancelCommandsString
      .split(',')
      .map(element => element.trim())
      .filter(element => element !== '');
    this.jsonGenerator();
  }

  setCancelReplay() {
    this.intentForm.cancelReply = this.cancelReply;
    this.logger.log('[FORM-COMP]  setCancelReplay this.intentForm.cancelReply', this.intentForm.cancelReply)
    this.jsonGenerator();
  }

  jsonGenerator() {
    this.logger.log('[FORM-COMP] jsonGenerator this.intentForm:: ', this.intentForm);
    // this.intentSelected.form = this.intentForm;
    this.updateIntentForm.emit(this.intentForm);
    // this.logger.log('[FORM-COMP] jsonGenerator this.intentSelected:: ', this.intentSelected);
  }

  openSettingsForm() {
    this.displaySettingsButton = false;
    this.displayCancelButton = true;
    this.displaySettingForm = true;
    this.cancelCommands = this.intentForm.cancelCommands;
    this.cancelReply = this.intentForm.cancelReply;
    this.cancelCommandsString = this.cancelCommands.toString();
    this.scrollToTop();
    this.logger.log('[FORM-COMP] cancelCommands ', this.cancelCommands)
    this.logger.log('[FORM-COMP] cancelReply ', this.cancelReply)
    this.logger.log('[FORM-COMP] cancelCommandsString ', this.cancelCommandsString)

    // this.cancelCommandsString = this.cancelCommands.toString(); // this was commented - not commented in v 3.2.8
    this.logger.log('[FORM-COM]  openSettingsForm displaySettingsButton', this.displaySettingsButton)
    this.logger.log('[FORM-COM]  openSettingsForm displayCancelButton', this.displayCancelButton)
    this.logger.log('[FORM-COM]  openSettingsForm displaySettingForm', this.displaySettingForm)
    this.logger.log('[FORM-COM]  openSettingsForm cancelCommandsString', this.cancelCommandsString)
  }

  closeSettingsForm() {
    this.displaySettingsButton = true;
    this.displayCancelButton = false;
    this.displaySettingForm = false;
    this.cancelCommandsString = this.cancelCommands.toString(); // this was commented - not commented in v 3.2.8
    this.logger.log('[FORM-COM]  closeSettingsForm displaySettingsButton', this.displaySettingsButton)
    this.logger.log('[FORM-COM]  closeSettingsForm displayCancelButton', this.displayCancelButton)
    this.logger.log('[FORM-COM]  closeSettingsForm displaySettingForm', this.displaySettingForm)
    this.logger.log('[FORM-COM]  closeSettingsForm cancelCommandsString', this.cancelCommandsString)

  }

  closeGeneral() {
    // if (this.intentForm) {
    if (this.intentFormSize > 0) {
      this.displaySettingForm = false;
      this.displaySettingsButton = true;
    } else {
      this.displayBoxNewForm = false;
      this.displayNewFormButton = true;
    }
    this.displayCancelButton = false;
  }

  openDeleteFieldModal(index: string) {
    // this.logger.log('this.translations:::: ', this.translations);
    let i: number = +index;
    this.displayMODAL = true;
    this.translateMap.deleteField = this.translations['CDSForm.DeleteField'] ? this.translations['CDSForm.DeleteField'] : '';
    this.translateMap.confirmDeleteField = this.translations['CDSForm.ConfirmDeleteField'] ? this.translations['CDSForm.ConfirmDeleteField'] : '';
    this.translateMap.nameField = this.fields[i].name;
    this.selectedObjectId = index;
  }



  // presenModalDeleteForm() {
  // swal({
  //   title: "Are you sure",
  //   text: "this.youAreAboutToJoinMsg + ': ' + chatAgent",

  //   icon: "info",
  //   buttons: {
  //     cancel: "this.cancelMs"g,
  //     catch: {
  //       text: this.joinToChatMsg,
  //       value: "catch",
  //     },
  //   },

  //   // `"Cancel", ${this.goToMultilanguagePageMsg}`],
  //   dangerMode: false,
  // })
  //   .then((value) => {
  //     this.logger.log('[WS-REQUESTS-LIST][SERVED] ARE YOU SURE TO JOIN THIS CHAT ... value', value)

  //     if (value === 'catch') {
  //       this.onJoinHandled(request_id, this.currentUserID);
  //     }
  //   })
  // }


  /** Event modal confirm delete field */
  confirmDeleteModal(index: string) {
    this.logger.log('[FORM-COMP] confirmDeleteModal index ', index) 
    this.logger.log('[FORM-COMP] confirmDeleteModal this.idForm ', this.idForm) 
    if (index === this.idForm) {
    // if (index === this.selectedFormId) {

      this.deleteForm();
    } else {
      this.displayAddForm = false;
      this.displayEditForm = false;
      let i: number = +index;
      this.fields.splice(i, 1);
      if (this.fields.length === 0) {
        this.deleteForm();
      }
      this.intentForm.fields = this.fields;
      this.logger.log('confirmDeleteModal::: ', this.intentForm, this.fields);
    }
    this.jsonGenerator();
    this.displayMODAL = false;
  }


  openBoxNewFormForm() {
    // this.intentForm = null;
    // this.intentForm = new Form();
    this.fields = [];
    this.displayBoxNewForm = true;
    this.displayTilebotAddEditForm = true;
    this.displayCancelButton = true;
    this.displayNewFormButton = false;
    this.displaySettingsButton = false;
    this.displayAddForm = false;
    this.displayEditForm = false;
    this.displaySettingForm = false;
    this.intentFormSize = 0
    this.logger.log('[FORM-COM] openBoxNewFormForm - displayBoxNewForm ', this.displayBoxNewForm, 'intentForm', this.intentForm);
  }

  private deleteForm() {
    this.displayTilebotAddEditForm = false;
    this.displayNewFormButton = true;
    this.displayBoxNewForm = false;
    this.displaySettingForm = false;
    this.displayAddForm = false;
    this.displayEditForm = false
    this.displayCancelButton = false;
    this.displaySettingsButton = false;
    this.intentForm = new Form();
    // this.intentForm = null;
    this.fields = [];
    this.intentFormSize = 0;
    this.logger.log('[FORM-COM] deleteForm - displayBoxNewForm ', this.displayBoxNewForm, 'intentForm', this.intentForm);
  }


  private resetForm() {
    this.intentForm = new Form();
    this.fields = [];
    this.displayNewFormButton = false;
    this.displaySettingsButton = true;
    this.displayAddForm = false;
    this.displayEditForm = false;
    this.displayTilebotAddEditForm = false;
  }

  // -------------------------------------
  // Form Field 
  // -------------------------------------
  /** Event modal close delete field */
  closeDeleteModal(i: number) {
    this.displayMODAL = false;
  }

  /** Event add field */
  eventAddField() {
    this.displayEditForm = false;
    this.selectedField = null;
    this.displayAddForm = true;
    this.openAddEditForm();
    this.logger.log('[FORM-COMP] eventAddField displayEditForm ', this.displayEditForm)
    this.logger.log('[FORM-COMP] eventAddField selectedField ', this.selectedField)
    this.logger.log('[FORM-COMP] eventAddField displayAddForm ', this.displayAddForm)
  }

  /** Event edit field */
  eventEditField(i: number) {
    this.closeAddEditForm();
    setTimeout(() => {
      this.selectedField = this.fields[i];
      this.displayAddForm = false;
      this.displayEditForm = true;
      this.openAddEditForm();
    }, 300);
    this.logger.log('[FORM-COMP] eventEditField selectedField ', this.selectedField)
    this.logger.log('[FORM-COMP] eventEditField displayAddForm ', this.displayAddForm)
    this.logger.log('[FORM-COMP] eventEditField displayEditForm ', this.displayEditForm)
  }

  eventDropField(fields) {
    this.intentForm.fields = fields;
    this.fields = fields;
    this.updateIntentForm.emit(this.intentForm);
    //this.updateIntentForm.emit(this.intentForm);
    this.closeAddEditForm();
    this.selectedField = null;
  }


  /** Event close add/edit form accordion */
  closeAddEditForm() {
    this.displayAddForm = false;
    this.displayEditForm = false;
    this.displayTilebotAddEditForm = true;
    this.scrollToTop();
    this.logger.log('[FORM-COMP] closeAddEditForm displayAddForm ', this.displayAddForm)
    this.logger.log('[FORM-COMP] closeAddEditForm displayEditForm ', this.displayEditForm)
    this.logger.log('[FORM-COMP] closeAddEditForm displayEditForm ', this.displayTilebotAddEditForm)
  }

  /** Event SAVE field */
  saveAddEditForm(event: any) {
    const objIndex = this.fields.findIndex(obj => obj.name === event.name);
    if (objIndex === -1) {
      this.fields.push(event);
    } else {
      this.fields.splice(objIndex, 1, event);
    }
    if (this.intentForm) {
      this.intentForm.fields = this.fields;
      this.logger.log('[FORM-COMP] saveAddEditForm intentForm ', this.intentForm)
    }
    this.displayAddForm = false;
    this.displayEditForm = false;
    this.displayTilebotAddEditForm = true;
    this.jsonGenerator();
  }

  openAddEditForm() {
    this.displayTilebotAddEditForm = false;
    this.displayTilebotAddEditForm = true;
    this.scrollToBottom();
  }

  openDeleteForm() {
    this.logger.log('[FORM-COMP] openDeleteForm this.translations:::: ', this.translations);
    this.translateMap.deleteField = this.translations['CDSForm.DeleteForm'] ? this.translations['CDSForm.DeleteForm'] : '';
    this.translateMap.confirmDeleteField = this.translations['CDSForm.ConfirmDeleteForm'] ? this.translations['CDSForm.ConfirmDeleteForm'] : '';
    this.displayMODAL = true;
    this.selectedObjectId = this.idForm;
    this.logger.log('[FORM-COMP] openDeleteForm displayMODAL', this.displayMODAL)
    this.logger.log('[FORM-COMP openDeleteForm selectedObjectId', this.selectedObjectId)
  }

  goToFormMoreInfo() {
    const url = this.URL_to_form_more_info;
    window.open(url, '_blank');
  }





  /** START EVENTS */
  /** Events of FORM EDIT ADD */
  onChangedFormFields(event:any){
    try {
      const objIndex = this.fields.findIndex(obj => obj.name === event.name);
      if (objIndex === -1) {
        this.fields.push(event);
      } else {
        this.fields.splice(objIndex, 1, event);
      }
      if (this.intentForm) {
        this.intentForm.fields = this.fields;
      }
      // this.intentSelected.form = this.intentForm;
      // this.updateIntentForm.emit(this.intentForm);
      this.logger.log('[FORM-COMP] saveAddEditForm intentForm ', this.intentForm);
      this.jsonGenerator();
    } catch (error) {
      this.logger.log('[FORM-COMP] error ', error);
    }
  }


}
