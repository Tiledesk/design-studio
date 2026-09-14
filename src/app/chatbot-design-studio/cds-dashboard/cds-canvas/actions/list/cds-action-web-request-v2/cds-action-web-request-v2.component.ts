import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs/internal/Subscription';
import { TranslateService } from '@ngx-translate/core';

//SERVICES
import { IntentService } from '../../../../../services/intent.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

//MODELS
import { Intent } from 'src/app/models/intent-model';
import { ActionWebRequestV2 } from 'src/app/models/action-model';

//UTILS
import { TYPE_UPDATE_ACTION, TYPE_METHOD_ATTRIBUTE, TEXT_CHARS_LIMIT } from 'src/app/chatbot-design-studio/utils';
import { variableList } from 'src/app/chatbot-design-studio/utils-variables';
import { checkConnectionStatusOfAction, updateConnector } from 'src/app/chatbot-design-studio/utils-connectors';
import { HEADER_TYPE, TYPE_METHOD_REQUEST, WEB_REQUEST_BODY_MODES, WEB_REQUEST_RAW_TYPES, RAW_TYPE_CONTENT_TYPE } from 'src/app/chatbot-design-studio/utils-request';
// import { CDSTextareaComponent } from '../../../base-elements/textarea/textarea.component';

@Component({
  selector: 'cds-action-web-request-v2',
  templateUrl: './cds-action-web-request-v2.component.html',
  styleUrls: ['./cds-action-web-request-v2.component.scss']
})
export class CdsActionWebRequestV2Component implements OnInit {
  // @ViewChild('cdsTextareaBody', { static: false }) cdsTextareaBody!: CDSTextareaComponent;

  @Input() intentSelected: Intent;
  @Input() action: ActionWebRequestV2;
  @Input() previewMode: boolean = true;
  @Output() updateAndSaveAction = new EventEmitter();
  @Output() onConnectorChange = new EventEmitter<{type: 'create' | 'delete',  fromId: string, toId: string}>()
  
  listOfIntents: Array<{name: string, value: string, icon?:string}>;

  // Connectors
  idIntentSelected: string;
  idConnectorTrue: string;
  idConnectorFalse: string;
  idConnectionTrue: string;
  idConnectionFalse: string;
  isConnectedTrue: boolean = false;
  isConnectedFalse: boolean = false;
  connector: any;
  private subscriptionChangedConnector: Subscription;
  
  methods: Array<{label: string, value: string}>;
  optionSelected: 'header' | 'body' = 'header'
  pattern = "^[a-zA-Z_]*[a-zA-Z_]+[a-zA-Z0-9_]*$";

  limitCharsText = TEXT_CHARS_LIMIT;
  jsonHeader: any; 
  jsonSettings: any;
  body: string = null
  jsonIsValid = true;
  errorMessage: string;
  methodSelectedHeader = true;
  methodSelectedBody = false;
  headerAttributes: any;
  autocompleteHeaderOptions: Array<{label: string, value: string}> = [];

  valueIsInvalid: boolean = false;

  // hasSelectedVariable: boolean = false;
  typeMethodAttribute = TYPE_METHOD_ATTRIBUTE;
  assignments: {} = {}

  // Postman-like body selectors
  bodyModes = WEB_REQUEST_BODY_MODES;
  rawTypes = WEB_REQUEST_RAW_TYPES;
  bodyMode: 'none' | 'form-data' | 'raw' = 'none';
  rawType: 'text' | 'javascript' | 'json' | 'html' | 'xml' = 'json';
  private validateTimer: any;

  private logger: LoggerService = LoggerInstance.getInstance();
  constructor(
    private readonly intentService: IntentService,
    private readonly translate: TranslateService
  ) { }

  // SYSTEM FUNCTIONS //
  ngOnInit(): void {
    this.logger.debug("[ACTION-WEB-REQUEST-v2] action detail: ", this.action);
    this.subscriptionChangedConnector = this.intentService.isChangedConnector$.subscribe((connector: any) => {
      this.logger.debug('[ACTION-WEB-REQUEST-v2] isChangedConnector -->', connector);
      let connectorId = this.idIntentSelected+"/"+this.action._tdActionId;
      if(connector.fromId.startsWith(connectorId)){
        this.connector = connector;
        this.updateConnector();
      }
    });
    this.initialize();
  }

  /** */
  ngOnDestroy() {
    if (this.subscriptionChangedConnector) {
      this.subscriptionChangedConnector.unsubscribe();
    }
    clearTimeout(this.validateTimer);
  }

  ngOnChanges(changes: SimpleChanges) {
    // on change
    this.initialize();
    if(this.intentSelected){
      this.initializeConnector();
    }
    this.logger.log('[ACTION-WEB-REQUEST-v2] onChanges' , this.action, this.intentSelected )
    // if (this.action && this.action.assignStatusTo) {
    //   this.hasSelectedVariable = true
    // }
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
    this.logger.log('[ACTION WEB-REQUEST-v2] updateConnector:');
    const resp = updateConnector(this.connector, this.action, this.isConnectedTrue, this.isConnectedFalse, this.idConnectionTrue, this.idConnectionFalse);
    if(resp){
      this.isConnectedTrue    = resp.isConnectedTrue;
      this.isConnectedFalse   = resp.isConnectedFalse;
      this.idConnectionTrue   = resp.idConnectionTrue;
      this.idConnectionFalse  = resp.idConnectionFalse;
      this.logger.log('[ACTION WEB-REQUEST-v2] updateConnector:', resp);
      if (resp.emit) {
        this.updateAndSaveAction.emit({ type: TYPE_UPDATE_ACTION.CONNECTOR, element: this.connector });
      } 
    }
  }

  
  // CUSTOM FUNCTIONS //
  private initialize(){
    this.initializeAttributes();
    this.methods = Object.keys(TYPE_METHOD_REQUEST).map((key, index) => {
      return { label: key, value: key }
    })
    this.jsonHeader = this.action.headersString
    // derive UI state (read-only) from the persisted model — no writes to action (G3)
    this.deriveBodyState();

    if(this.action.jsonBody){
      //this.body = this.checkAndSetJsonBody(this.action.jsonBody);
      this.body = this.action.jsonBody;
      this.body = this.formatJSON(this.body, "\t");
    }
    this.validateBody();
    this.jsonSettings = { timeout: 20000}
    if(this.action.settings){
      this.jsonSettings = this.action.settings
    }
    if(!this.action.formData){
      this.action.formData = []
    }
    this.assignments = this.action.assignments
    if(this.intentSelected){
      this.initializeConnector();
    }
    this.autocompleteHeaderOptions = [];
    HEADER_TYPE.forEach(el => this.autocompleteHeaderOptions.push({label: el.label, value: el.value}))
  
  }

  private initializeAttributes() {
    let new_attributes = [];
    if (!variableList.find(el => el.key ==='userDefined').elements.some(v => v.name === 'result')) {
      new_attributes.push({ name: "result", value: "result" });
    }
    if (!variableList.find(el => el.key ==='userDefined').elements.some(v => v.name === 'status')) {
      new_attributes.push({ name: "status", value: "status" });
    }
    if (!variableList.find(el => el.key ==='userDefined').elements.some(v => v.name === 'error')) {
      new_attributes.push({ name: "error", value: "error" });
    }
    variableList.find(el => el.key ==='userDefined').elements = [ ...variableList.find(el => el.key ==='userDefined').elements, ...new_attributes];
    this.logger.debug("[ACTION-WEB-REQUEST-v2] Initialized variableList.userDefined: ", variableList.find(el => el.key ==='userDefined'));
  }


  private formatJSON(input, indent) {
    if (input.length == 0) {
      return '';
    }
    else {
      try {
        var parsedData = JSON.parse(input);
        return JSON.stringify(parsedData, null, indent);
      } catch (e) {
        return input;
      }
    }
  }

  private isValidJson(json) {
    try {
      JSON.parse(json);
      this.errorMessage = null;
      return true;
    } catch (e) {
      this.errorMessage = this.translate.instant('CDSCanvas.WebRequestInvalidJson');
      return false;
    }
  }

  private isValidXml(xml: string): boolean {
    try {
      const doc = new DOMParser().parseFromString(xml, 'application/xml');
      const valid = doc.getElementsByTagName('parsererror').length === 0;
      this.errorMessage = valid ? null : this.translate.instant('CDSCanvas.WebRequestInvalidXml');
      return valid;
    } catch (e) {
      this.errorMessage = this.translate.instant('CDSCanvas.WebRequestInvalidXml');
      return false;
    }
  }

  private isValidJs(js: string): boolean {
    try {
      // syntax-only check; does NOT execute the code
      // eslint-disable-next-line no-new-func
      new Function(js);
      this.errorMessage = null;
      return true;
    } catch (e) {
      this.errorMessage = this.translate.instant('CDSCanvas.WebRequestInvalidJs');
      return false;
    }
  }

  /** Replace Tiledesk placeholders ({{ ... }}, incl. filters like {{ x | json }}) with a neutral
   *  token so a body carrying runtime variables is not flagged as syntactically invalid. */
  private stripPlaceholders(txt: string): string {
    return (txt || '').replace(/{{[^}]*}}/g, '0');
  }

  /** Validate the current raw body against the selected rawType. Non-blocking: only sets jsonIsValid + errorMessage. */
  private validateBody(): void {
    if (this.bodyMode !== 'raw') {
      this.jsonIsValid = true;
      this.errorMessage = null;
      return;
    }
    const content = this.stripPlaceholders(this.body);
    if (!content || content.trim().length === 0) {
      this.jsonIsValid = true;
      this.errorMessage = null;
      return;
    }
    switch (this.rawType) {
      case 'json':       this.jsonIsValid = this.isValidJson(content); break;
      case 'xml':        this.jsonIsValid = this.isValidXml(content);  break;
      case 'javascript': this.jsonIsValid = this.isValidJs(content);   break;
      case 'text':
      case 'html':
      default:           this.jsonIsValid = true; this.errorMessage = null; break;
    }
  }

  /** Derive UI selectors (bodyMode/rawType) from the persisted model. READ-ONLY: never writes to action (G3). */
  private deriveBodyState(): void {
    const bt = this.action.bodyType;
    if (bt === 'form-data') {
      this.bodyMode = 'form-data';
    } else if (bt === 'none') {
      this.bodyMode = 'none';
    } else {
      // 'raw' (new actions) or legacy 'json' (or any other value carrying a body) -> raw mode
      this.bodyMode = 'raw';
      this.rawType = (this.action.rawType as any) || this.inferRawTypeFromHeaders() || 'json';
    }
  }

  private inferRawTypeFromHeaders(): 'text' | 'javascript' | 'json' | 'html' | 'xml' | null {
    const ct = ((this.jsonHeader && this.jsonHeader['Content-Type']) || '').toString().toLowerCase();
    if (!ct) { return null; }
    if (ct.includes('json'))       { return 'json'; }
    if (ct.includes('xml'))        { return 'xml'; }
    if (ct.includes('html'))       { return 'html'; }
    if (ct.includes('javascript')) { return 'javascript'; }
    if (ct.includes('text/plain')) { return 'text'; }
    return null;
  }


  // EVENT FUNCTIONS //
  onChangeMethodButton(e: {label: string, value: string}){
    this.action.method = e.value;
    this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
  }

  onChangeBodyMode(event: {name: string, value: string}){
    this.bodyMode = event.value as 'none' | 'form-data' | 'raw';
    switch (event.value){
      case 'none':
        this.action.bodyType = 'none';
        delete this.action.rawType;
        delete this.jsonHeader['Content-Type'];
        break;
      case 'form-data':
        this.action.bodyType = 'form-data';
        delete this.action.rawType;
        this.jsonHeader['Content-Type'] = 'multipart/form-data';
        break;
      case 'raw':
        this.action.bodyType = 'raw';
        this.rawType = this.rawType || 'json';
        this.action.rawType = this.rawType;
        this.jsonHeader['Content-Type'] = RAW_TYPE_CONTENT_TYPE[this.rawType];
        break;
    }
    this.action.headersString = this.jsonHeader;
    this.validateBody();
    this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
  }

  onChangeRawType(event: {name: string, value: string}){
    this.rawType = event.value as 'text' | 'javascript' | 'json' | 'html' | 'xml';
    this.action.bodyType = 'raw';
    this.action.rawType = this.rawType;
    this.jsonHeader['Content-Type'] = RAW_TYPE_CONTENT_TYPE[this.rawType];
    this.action.headersString = this.jsonHeader;
    this.validateBody();
    this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
  }

  onChangeTextarea(e, type: 'url' | 'body' | 'setting'){
    switch(type){
      case 'body': {
        this.body = e;
        clearTimeout(this.validateTimer);
        this.validateTimer = setTimeout(() => { this.validateBody(); }, 500);
        break;
      }
      case 'url' : {
        this.action.url = e;
        // this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
        break;
      }
      case 'setting': {
        if(isNaN(+e)){
          this.valueIsInvalid = true;
          break;
        }
        this.valueIsInvalid = false;
        this.jsonSettings.timeout = +e;
        this.action['settings'] = this.jsonSettings;
        break;
      }
    }
  }

  onBlur(event){
    // this.action.jsonBody = this.checkAndSetJsonBody(this.body);
    // this.body = this.action.jsonBody;
    this.action.jsonBody = this.body;
    this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
  }

  onChangeOption(event: 'header'|'body'){
    switch(event){
      case 'header':
        this.jsonHeader = this.action.headersString;
        break;
      case 'body':
        break;
    }
  }

  onChangeAttributes(attributes:any){
    this.logger.log('onChangeAttributes');
    this.action.headersString = attributes;
    this.jsonHeader = attributes;
    this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
  }

  onChangeAttributesResponse(attributes:{[key: string]: string }){
    this.action.assignments = attributes ;
    this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
  }

  onFormDataChanged(event){
    this.logger.log('[ACTION-WEB-REQUEST-v2] onFormDataChanged --> ', event)
    this.action.formData= event
    this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
  }

  onSelectedAttribute(event, property) {
    this.logger.log("[ACTION-WEB-REQUEST-v2] onEditableDivTextChange event", event)
    this.logger.log("[ACTION-WEB-REQUEST-v2] onEditableDivTextChange property", property)
    this.action[property] = event.value;
    this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
  }

  // onSelectedAttribute2(event, property) {
  //   if (this.cdsTextareaBody) {
  //     // const cursorPosition = this.cdsTextareaBody.getCursorPosition();
  //     this.logger.log("[ACTION-WEB-REQUEST-v2] onSelectedAttribute2 textarea",event);
  //     const textarea: HTMLTextAreaElement = this.cdsTextareaBody.textAreaElement.nativeElement;
    
  //     const cursorPosition = textarea.selectionStart;
  //     this.logger.log("[ACTION-WEB-REQUEST-v2] onSelectedAttribute2 cursorPosition", textarea);
  //     const textBeforeCursor = this.body.slice(0, cursorPosition); // Testo fino al cursore
  //     this.logger.log("[ACTION-WEB-REQUEST-v2] onSelectedAttribute2 textBeforeCursor", textBeforeCursor);
  //     // Regex per individuare solo l'ultima istanza di {{...}} immediatamente prima del cursore
  //     const regex = new RegExp(`{{\\s*${event.value}\\s*}}`, 'g'); // Cerca tutte le istanze
  //     const matches = textBeforeCursor.match(regex);
  //     const match = matches?matches[matches.length - 1] : null;
  //     //const match = textBeforeCursor.match(regex);
  //     this.logger.log("[ACTION-WEB-REQUEST-v2] onSelectedAttribute2", match);

  //     if (match) {
  //         const extractedText = match;//[0];
  //         this.logger.log("[ACTION-WEB-REQUEST-v2] extractedText", extractedText);
  //         // Modifica il testo estratto (ad esempio, aggiunge '-modificato')
  //         const modifiedText = this.checkAndSetJsonBody(extractedText);
  //         // Sostituisce solo il testo trovato immediatamente prima del cursore
  //         const updatedTextBeforeCursor = textBeforeCursor.replace(extractedText, modifiedText);
  //         this.body = updatedTextBeforeCursor + this.body.slice(cursorPosition); // Combina il testo aggiornato con il resto
  //         // Aggiorna la textarea con il nuovo contenuto
  //         textarea.value = this.body;
  //     }
  //   }
  // }

  // checkAndSetJsonBody(jsonBody){
  //   this.logger.log('[ACTION-WEB-REQUEST-v2] jsonBody:: ', jsonBody);
  //   return jsonBody.replace(/{{(.*?)}}/g, (match, content) => {
  //     if (match.includes('| json') || match.includes('|json')) {
  //       return match;
  //     } else {
  //       return `{{ ${content.trim()} | json }}`;
  //     }
  //   });
  // }


  onChangeBlockSelect(event:{name: string, value: string}, type: 'trueIntent' | 'falseIntent') {
    if(event){
      this.action[type]=event.value
      switch(type){
        case 'trueIntent':
          this.onConnectorChange.emit({ type: 'create', fromId: this.idConnectorTrue, toId: this.action.trueIntent})
          break;
        case 'falseIntent':
          this.onConnectorChange.emit({ type: 'create', fromId: this.idConnectorFalse, toId: this.action.falseIntent})
          break;
      }
      this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
    }
  }

  onResetBlockSelect(event:{name: string, value: string}, type: 'trueIntent' | 'falseIntent') {
    switch(type){
      case 'trueIntent':
        this.onConnectorChange.emit({ type: 'delete', fromId: this.idConnectorTrue, toId: this.action.trueIntent})
        break;
      case 'falseIntent':
        this.onConnectorChange.emit({ type: 'delete', fromId: this.idConnectorFalse, toId: this.action.falseIntent})
        break;
    }
    this.action[type] = null;
    this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
  }
}
