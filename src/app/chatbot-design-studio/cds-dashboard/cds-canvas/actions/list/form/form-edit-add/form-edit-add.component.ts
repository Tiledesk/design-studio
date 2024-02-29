import { Component, OnInit, Output, Input, EventEmitter, OnChanges } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { TranslateService } from '@ngx-translate/core';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

export enum TYPE_FIELD {
  CUSTOM = 'CUSTOM',
  TEXT = 'TEXT',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE'
}

export enum TYPE_REGEX {
  nameRGEX = '/^[a-zA-Z0-9_]{1,}$/',

  customRGEX = '^.{1,}$',
  textRGEX = '^.{1,}$',
  // phoneRGEX = "/^((?:\\+|00)[17](?: |\\-)?|(?:\\+|00)[1-9]\\d{0,2}(?: |\\-)?|(?:\\+|00)1\\-\\d{3}(?: |\\-)?)?(0\\d|\\([0-9]{3}\\)|[1-9]{0,3})(?:((?: |\\-)[0-9]{2}){4}|((?:[0-9]{2}){4})|((?: |\\-)[0-9]{3}(?: |\\-)[0-9]{4})|([0-9]{7}))$/",
  phoneRGEX = '^.{1,}$',
  emailRGEX = "^(?=.{1,254}$)(?=.{1,64}@)[-!#$%&'*+/0-9=?A-Z^_`a-z{|}~]+(.[-!#$%&'*+/0-9=?A-Z^_`a-z{|}~]+)*@[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?(.[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$"
}

@Component({
  selector: 'appdashboard-form-edit-add',
  templateUrl: './form-edit-add.component.html',
  styleUrls: ['./form-edit-add.component.scss']
})
export class FormEditAddComponent implements OnInit, OnChanges {
  @Output() closeAddEditForm = new EventEmitter();
  @Output() saveAddEditForm = new EventEmitter();
  // @Output() editFormFields = new EventEmitter();

  @Output() scrollToBottom = new EventEmitter();
  @Output() changedFormFields = new EventEmitter();
  
  @Input() displayAddForm: boolean;
  @Input() displayEditForm: boolean;
  @Input() field: any;


  typeField = TYPE_FIELD;
  langDashboard = 'En';
  showForm = false;
  nameResult = true;
  typeResult = true;
  labelResult = true;
  regexResult = true;
  errorLabelResult = true;
  showRegexField = true;
  // displayInfoMessage = false;
  // inputTypePlaceholderClass = true;
  panelOpenState = false;
  hasSelectedVariable: boolean = false;


  // customRGEX = /^.{1,}$/;
  // textRGEX = /^.{1,}$/;
  // phoneRGEX = /^\s*(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})(?: *x(\d+))?\s*$/;
  // nameRGEX = /^[a-zA-Z0-9_]{1,}$/;
  // emailRGEX = /^(?=.{1,254}$)(?=.{1,64}@)[-!#$%&'*+/0-9=?A-Z^_`a-z{|}~]+(.[-!#$%&'*+/0-9=?A-Z^_`a-z{|}~]+)*@[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?(.[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/
  // /^[(]{0,1}[0-9]{3}[)]{0,1}[-\s\.]{0,1}[0-9]{3}[-\s\.]{0,1}[0-9]{4}$/;
  modelsOfType = [{ "label": "Text", "value": TYPE_FIELD.TEXT }, { "label": "Email", "value": TYPE_FIELD.EMAIL }, { "label": "Phone number", "value": TYPE_FIELD.PHONE }, { "label": "Custom", "value": TYPE_FIELD.CUSTOM }];
  infoMessages = {}
  infoMessage: string;
  markbotLabel: string;

  fieldName: string = '';
  fieldType: string = null;
  fieldRegex: string = '';
  fieldLabel: string = '';
  fieldErrorLabel: string = '';

  private logger: LoggerService = LoggerInstance.getInstance();
  
  constructor(
    private translate: TranslateService,
    private httpClient: HttpClient,
  ) { }

  ngOnInit(): void {
    this.hasSelectedVariable = false;
    this.showRegexField = true;
    if (this.displayAddForm) {
      this.field = {
        "name": "",
        "type": "",
        "regex": "",
        "label": "",
        "errorLabel": ""
      }
    } else if (this.displayEditForm) {
      this.field.type = this.field.type.toUpperCase();
      // if(this.field.regex && this.field.type === TYPE_FIELD.CUSTOM){
      //   this.fieldRegex = this.field.regex;
      // } 
      this.fieldName = this.field.name;
      if(this.fieldName && this.fieldName !== ''){
        this.hasSelectedVariable = true;
      }
      this.fieldType = this.field.type;
      this.fieldRegex = this.field.regex?this.field.regex:TYPE_REGEX.customRGEX;
      this.fieldLabel = this.field.label;
      this.fieldErrorLabel = this.field.errorLabel;
      // this.inputTypePlaceholderClass = false;
    }
    // this.setRegex();
    this.getCurrentTranslation();
    this.infoMessage = this.infoMessages['field_name'];

  }

  ngOnChanges() {
    this.fieldType = "TEXT";
    this.fieldRegex = '^.{1,}$'
    // this.logger.log('[FORM-EDIT-ADD] fieldType ', this.fieldType)
  }

  ngAfterViewInit() {
    this.showForm = false;
    if (this.displayAddForm || this.displayEditForm) {
      setTimeout(() => {
        this.showForm = true;
      }, 100);
    }
  }

  getCurrentTranslation() {
    if (this.translate.currentLang) {
      this.langDashboard = this.translate.currentLang;
    }
    this.translate.get(['CDSForm.InfoMessages', 'CDSForm.MarkbotLabel']).subscribe(data => {
      this.infoMessages = data['CDSForm.InfoMessages'];
      this.markbotLabel = data['CDSForm.MarkbotLabel'];
    })
  }

  checkFields() {
    this.nameResult = true;
    this.typeResult = true;
    this.labelResult = true;
    this.errorLabelResult = true;
    let status = true;
    if (this.fieldType == null) {
      this.typeResult = false;
      status = false;
    }
    let REGEX = new RegExp(TYPE_REGEX.nameRGEX.replace(/\//gi, ''));
    // this.logger.log('[TILEBOT-EDIT-ADD] checkFields nameRGEX REGEX ', REGEX)
    this.nameResult = REGEX.test(this.fieldName);
    // this.logger.log('[TILEBOT-EDIT-ADD] nameResult',this.nameResult,' REGEX.test - field.name', this.field.name )
    if (this.nameResult === false) {
      status = false;
    }
    if (this.fieldName.length == 0) {
      this.nameResult = false;
      status = false;
    }
    if (this.fieldLabel.length == 0) {
      //this.labelResult = false;
      //status = false;

    }
    if (this.fieldRegex.length == 0 && this.fieldType === TYPE_FIELD.CUSTOM) {
      //this.regexResult = false;
      //status = false;
    }
    // this.field.regex = this.field.regex.replace(/\//gi, '');
    // this.logger.log('[TILEBOT-EDIT-ADD] checkFields this.field.regex 1 ', this.field.regex)
    // this.fieldRegex = this.field.regex.toString();
    // this.logger.log('[TILEBOT-EDIT-ADD] checkFields this.field.regex 2 ', this.field.regex)
    return status;

  }

  private setRegex() {
    switch (this.field.type) {
      case TYPE_FIELD.TEXT:
        this.field.regex = TYPE_REGEX.textRGEX;
        break;
      case TYPE_FIELD.EMAIL:
        this.field.regex = TYPE_REGEX.emailRGEX;
        break;
      case TYPE_FIELD.PHONE:
        this.field.regex = TYPE_REGEX.phoneRGEX;
        break;
      case TYPE_FIELD.CUSTOM:
        this.field.regex = TYPE_REGEX.customRGEX;
        break;
      default:
        this.field.regex = TYPE_REGEX.textRGEX;
    }
    this.fieldRegex = this.field.regex;
  }

  // ON EVENT //
  /** */
  onChangeParameterName(parameterName) {
    parameterName.toString();
    this.fieldName = parameterName.replace(/[^A-Z0-9_]+/ig, "");
  }

  // displayPlaceholder(event) {
  //   if (event === true && this.fieldType) {
  //     this.inputTypePlaceholderClass = false;
  //   } else if (event === false) {
  //     this.inputTypePlaceholderClass = false;
  //   } else {
  //     this.inputTypePlaceholderClass = true;
  //   }
  // }


  save() {
    // this.logger.log('[TILEBOT-EDIT-ADD] save ')
    if (this.checkFields()) {
      // this.displayInfoMessage = false;
      this.showForm = false;
      this.field.name = this.fieldName ? this.fieldName : '';
      this.field.type = this.fieldType ? this.fieldType.toUpperCase() : null;
      this.field.regex = this.fieldRegex ? this.fieldRegex : TYPE_REGEX.customRGEX;
      if(!this.fieldLabel || this.fieldLabel.trim().length === 0){
        delete this.field.label
      } else {
        this.field.label = this.fieldLabel.trim();
      }
      if(!this.fieldErrorLabel || this.fieldErrorLabel.trim().length === 0){
        delete this.field.errorLabel;
      } else {
        this.field.errorLabel = this.fieldErrorLabel.trim();
      }
      // this.fieldRegex = this.field.regex.toString();
      this.logger.log('[TILEBOT-EDIT-ADD] checkFields field ',  this.field);
       this.saveAddEditForm.emit(this.field);
    }
  }

  close() {
    this.displayAddForm = false;
    this.displayEditForm = false;
    this.showForm = false;
    // this.displayInfoMessage = false;
    this.closeAddEditForm.emit();
  }

  onScrollToBottom(){
    this.scrollToBottom.emit();
  }










  /** START EVENTS */
  onSelectedAttributeParam(variableSelected: {name: string, value: string}){
    this.hasSelectedVariable = true;
    this.fieldName = variableSelected.value;
    this.field.name = variableSelected.value;
    if(this.displayAddForm === false){
      this.changedFormFields.emit(this.field);
      this.logger.log('onSelectedAttributeParam:: ',  this.field);
    }
  }
  onClearSelectedAttributeParam() {
    this.hasSelectedVariable = false;
    this.fieldName = '';
    this.field.name = '';
    if(this.displayAddForm === false){
      this.changedFormFields.emit(this.field);
      this.logger.log('clearSelectedAttributeParam:: ',  this.field);
    }
  }
  onChangeTextAreaLabel(text: string){
    this.field.label = text;
    this.fieldLabel = text;
    if(this.displayAddForm === false){
      this.changedFormFields.emit(this.field);
      this.logger.log('onChangeTextAreaLabel:: ',  this.field);
    }
  }
  onChangeValidationErrorMessage(errorLabel){
    this.field.errorLabel = this.fieldErrorLabel = errorLabel.trim();
    if(this.displayAddForm === false){
      this.changedFormFields.emit(this.field);
      this.logger.log('onChangeValidationErrorMessage:: ', errorLabel.data,  this.fieldErrorLabel);
    }
  }
  onChangeValidationRegex(regex){
    this.field.regex = this.fieldRegex = regex.trim();
    if(this.displayAddForm === false){
      this.changedFormFields.emit(this.field);
      this.logger.log('onChangeValidationRegex:: ', regex.data, this.fieldRegex);
    }
  }
  /** */
  onChangeValidationType(event: {label: string, value: string}) {
    this.field.type = event.value;
    this.setRegex();
    if(this.displayAddForm === false){
      this.changedFormFields.emit(this.field);
    }
  }
  
  // displayMessage(field?) {
  //   this.displayInfoMessage = false;
  //   if(field){
  //     if (this.infoMessages[field]) {
  //       this.infoMessage = this.infoMessages[field];
  //       this.displayInfoMessage = true;
  //     }
  //     if (field === 'field_label') {
  //       this.infoMessage += " " + this.markbotLabel;
  //     }
  //   }
  //   this.onScrollToBottom();
  // }
  /** END ACTIONS CDS-TEXTAREA */

}
