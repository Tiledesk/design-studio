import { CDSTextComponent } from '../base-elements/text/text.component';
import { Component, OnInit, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { Button } from 'app/models/intent-model';


import { TYPE_BUTTON, TYPE_URL, BUTTON_TYPES, URL_TYPES } from '../../../utils';
import { ControllerService } from 'app/chatbot-design-studio/services/controller.service';
import { IntentService } from 'app/chatbot-design-studio/services/intent.service';
import { ConnectorService } from 'app/chatbot-design-studio/services/connector.service';



@Component({
  selector: 'cds-panel-button-configuration',
  templateUrl: './cds-panel-button-configuration.component.html',
  styleUrls: ['./cds-panel-button-configuration.component.scss']
})
export class CdsPanelButtonConfigurationComponent implements OnInit {
  @ViewChild('input_title', { static: true }) input_topic: CDSTextComponent;

  @Input() isOpenPanel: boolean;
  @Input() button: Button;
  @Output() saveButton = new EventEmitter();
  // @Output() closeButtonPanel = new EventEmitter();

  listOfIntents: Array<{name: string, value: string, icon?:string}>;
  // buttonLabelResult: boolean;
  
  typeOfButton = TYPE_BUTTON;
  typeOfUrl = TYPE_URL;
  buttonTypes = BUTTON_TYPES;
  urlTypes = URL_TYPES;

  buttonLabel: string;
  buttonType: string;
  // labelAction: string;
  urlType: string;
  buttonUrl: string;
  errorUrl: boolean;
  buttonAction: string;
  // clickInside: boolean;
  buttonAttributes: any;
  openBlockAttributes: boolean = false;

  // emojiPikerBtn: boolean = true
  // isEmojiPickerVisible: boolean = false;
  // emojiPerLine: number = 8;
  // emojiColor: string ="#ac8b2c";
  // emojiiCategories = [ 'recent', 'people', 'nature', 'activity'];


  constructor(
    private controllerService: ControllerService,
    private intentService: IntentService,
    private connectorService: ConnectorService
  ) { }


  // SYSTEM FUNCTIONS //  

  ngOnInit(): void {
    // this.initialize();
  }

  ngOnChanges() {
    this.initialize();
  }


  ngAfterViewInit() {
    if(this.input_topic){
      this.input_topic.myInput.nativeElement.focus();
    }
  }


  private initialize(){
    this.listOfIntents = this.intentService.getListOfIntents();
    // console.log('CdsPanelButtonConfigurationComponent: ', this.button);
    if(this.button){
      // this.buttonLabelResult = true;
      this.errorUrl = false;
      this.buttonLabel = '';
      this.buttonType = this.typeOfButton.TEXT;
      this.urlType = this.typeOfUrl.BLANK;
      this.buttonUrl = '';
      this.buttonAction = null;
      this.buttonAttributes = '';
      try {
        this.buttonLabel = this.button.value ? this.button.value : null;
        this.buttonType = this.button.type ? this.button.type : null;
        this.urlType = this.button.target ? this.button.target : null;
        this.buttonUrl = this.button.link ? this.button.link : null; 
        this.buttonAttributes = this.button.attributes ? this.button.attributes : '';
      } catch (error) {
        // error
      }

      let intent = this.setAttributesFromAction(this.button.action);
      // console.log('*** intent: ', intent);
      if(intent && intent.action !== null){
        this.buttonAction = intent.action;
      }
      if(intent && (intent.attributes !== null && intent.attributes !== undefined)){
        this.buttonAttributes = intent.attributes;
        // this.openBlockAttributes = true;
      }
    }
    // console.log('buttonAction:: ', this.buttonAction); 
  }


  // PRIVATE FUNCTIONS //  
  private setAttributesFromAction(actionAndParameters) {
    let intent: any = {};
    if (actionAndParameters === null) {
      return null; // invalid intent
    }
    if (actionAndParameters.trim().length === 0) {
      return null; // invalid intent
    }
    let parts = actionAndParameters.split("{");
    if (parts.length > 0 && parts[0].startsWith("{")) {
      return null; // invalid intent
    } else {
      // console.log('intent 2', actionAndParameters);
      intent.action = parts[0];
      // console.log('intent 3', intent);
    }
    if (parts.length > 1) {
      let attributes = (actionAndParameters.substring(parts[0].length));
      // console.log('intent 4', intent);
      try {
        intent.attributes = JSON.parse(attributes);
        // console.log('intent 5', intent);
      }
      catch (err) {
        console.log("error on intent.parameters = JSON.parse(json_string)", err);
      }            
    }
    return intent;
  }


  // private setBlurFocus(id){
  //   try {
  //     this.select_action.clearable = false;
  //     this.select_action.input_select.nativeElement.blur();
  //   } catch (error) {
  //     console.log('error: ', error);
  //   }
  // }

  private checkButtonLabel(): boolean {
    try {
      if (!this.buttonLabel || this.buttonLabel.length === 0) {
        this.buttonLabel = '';
      }
      if(this.button){
        this.button.value = this.buttonLabel;
      }
    } catch (error) {
      console.log('error: ', error);
    }
    return true;
  }

  private checkTypeButton() {
    if (this.button.type === this.typeOfButton.TEXT) {
      return true;
    } else if (this.button.type === this.typeOfButton.URL) {
      return this.checkUrl(this.buttonUrl);
    } else if (this.button.type === this.typeOfButton.ACTION) {
      return this.checkAction(this.buttonAction);
    }
    return false;
  }

  private checkUrl(url: string): boolean {
    this.errorUrl = true;
    if (url && url.length > 1) {
      this.errorUrl = false;
      this.button.link = url;
      this.button.target = this.urlType;
      return true;
    }
    return false;
  }

  private checkAction(action: string): boolean {
    // console.log('checkAction: ', action);
    if (action && action.length > 1) {
      // this.button.action = action;
      // this.button.action = this.buttonAction + JSON.stringify(this.buttonAttributes);
      this.button.show_echo = true;
      return true;
    }
    return false;
  }

  private checkAndSaveButton(){
    // console.log('checkAndSaveButton: ');
    let checkLabel = this.checkButtonLabel();
    let checkType = this.checkTypeButton();
    if (checkLabel && checkType) {
      this.saveButton.emit(this.button);
    }
  }

  // EVENTS FUNCTIONS //  

  /** */
  onCloseButtonPanel() {
    console.log('[CDS-PANEL-BTN-CONFIG] onCloseButtonPanel'  )
    this.controllerService.closeButtonPanel();
    // this.closeButtonPanel.emit();
  }

  /** */
  onChangeTitle(text: string) {
    this.buttonLabel = text;
    this.checkAndSaveButton();
  }

  /** */
  onChangeTypeButton(typeOfButton: { label: string, value: TYPE_BUTTON }) {
    this.buttonType = this.button.type = typeOfButton.value;
    this.buttonAction = null
    console.log('onChangeTypeButton-->', typeOfButton, this.button)
    if(this.button.__idConnector){
      const fromId = this.button.__idConnector;
      this.connectorService.deleteConnectorWithIDStartingWith(fromId);
      // let parts = this.button.idConnector.split('/');
      // if(parts && parts.length>1){
      //   let actionId = parts[1];
      //   console.log('deleteConnectorsFromActionByActionId: ', actionId);
      //   this.connectorService.deleteConnectorsFromActionByActionId(actionId);
      // }
    }
  }

  /** */
  onChangeUrl(text: string) {
    // console.log('onChangeUrl: ');
    this.buttonUrl = text;
    this.checkAndSaveButton();
  }

  /** */
  onChangeGoToBlock(event: {name: string, value: string}){
    console.log('onChangeGoToBlock: ', event);
    this.buttonAction = event.value;
    if(this.buttonAttributes && this.buttonAttributes !== '{}'){
      this.button.action = this.buttonAction + JSON.stringify(this.buttonAttributes);
    } else {
      this.button.action = this.buttonAction;
    }
    // this.openBlockAttributes = true;
    const fromId = this.button.__idConnector;
    let toId = '';
    const posId = this.button.action.indexOf("#");
    if (posId !== -1) {
      toId = this.button.action.slice(posId+1);
    }
    console.log('createNewConnector: ', fromId);
    this.connectorService.deleteConnectorWithIDStartingWith(fromId);
    this.connectorService.createNewConnector(fromId, toId);
    this.checkAndSaveButton();
  }

  onChangeOpenIn(event: {name: string, value: string}){
    console.log('onChangeOpenIn: ', event);
    this.urlType = event.value;
    this.checkAndSaveButton();
  }

  /** */
  onChangeAttributes(attributes:any){
    // console.log('attributes: ', this.button, attributes);
    this.button.attributes = attributes;
    if(attributes && attributes !== '{}'){
      this.button.action = this.buttonAction + JSON.stringify(attributes);
    } else {
      this.button.action = this.buttonAction;
    }
    // this.button.action = this.buttonAction + JSON.stringify(attributes);
    delete(this.button.attributes);
    this.checkAndSaveButton();
    // this.saveButton.emit(this.button);
  }




  /** */
  // onBlurButtonLabel(name: string) {
  //   this.buttonLabelResult = true;
  // }

  /** */
  // onChangeActionButton(actionButton) {
  //   // console.log('onChangeActionButton: ', actionButton);
  //   this.buttonAction = actionButton;
  // }

  /** */
  // onSave() {
  //   this.checkAndSaveButton();
  //   // this.closeButtonPanel.emit();
  // }

  /** */
  // onAddEmoji(event){
  //   this.buttonLabel = `${this.buttonLabel}${event.emoji.native}`;
  //   this.isEmojiPickerVisible = false;
  // } 


}
