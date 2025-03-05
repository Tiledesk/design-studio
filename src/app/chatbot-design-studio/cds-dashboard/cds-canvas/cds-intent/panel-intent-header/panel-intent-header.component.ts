import { Component, OnInit, Input, Output, EventEmitter, OnChanges, ViewChild, ElementRef } from '@angular/core';
import { Intent } from 'src/app/models/intent-model';
import { IntentService } from '../../../../services/intent.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { INTENT_COLORS, RESERVED_INTENT_NAMES, preDisplayName } from '../../../../utils';

@Component({
  selector: 'cds-panel-intent-header',
  templateUrl: './panel-intent-header.component.html',
  styleUrls: ['./panel-intent-header.component.scss']
})
export class PanelIntentHeaderComponent implements OnInit, OnChanges {
  @ViewChild('inputIntentName', { static: true }) inputIntentName!: ElementRef<HTMLInputElement>;

  @Input() intent: Intent;
  @Input() intentColor: string;
  @Output() saveIntent = new EventEmitter();

  RESERVED_INTENT_NAMES = RESERVED_INTENT_NAMES;
  listOfIntents: Intent[];
  intentName: string;
 
  
  id_faq_kb: string;
  isFocused: boolean = false;

  isStart: boolean = false;
  isDefaultFallback: boolean = false;
  isWebhook: boolean = false;
  isNotErrorName: boolean = true;

  intentNameAlreadyExist: boolean = false
  intentNameNotHasSpecialCharacters: boolean = true;
  

  private readonly logger: LoggerService = LoggerInstance.getInstance()
  constructor(
    public intentService: IntentService
  ) { 
    this.intentService.getIntents().subscribe(intents => {
      if(intents){
        this.listOfIntents = intents;
        if(this.intent){
          this.intentName = this.intent.intent_display_name;
        }
      }
    })
  }

  // SYSTEM FUNCTIONS //
  ngOnInit(): void {
    this.initialize();
  }

  ngOnChanges() {
    // this.logger.log("[PANEL-INTENT-HEADER] header OnChanges intentSelected intent_display_name: ", this.intent.intent_display_name)
  }

  /******************* CUSTOM FUNCTIONS *******************/ 

  /** initialize */
  private initialize(){
    this.listOfIntents = this.intentService.listOfIntents;
    this.intentNameAlreadyExist = false;
    this.intentNameNotHasSpecialCharacters = true;
    if (this.intent.intent_display_name === undefined && this.intent.intent_display_name.trim().length === 0) {
      this.intentService.setDisplayName();
    } else {
      this.intentName = this.intent.intent_display_name;
    }
    if(this.intentName === RESERVED_INTENT_NAMES.START) {
      this.isStart = true;
      this.intentNameAlreadyExist = true;
    } else if(this.intentName === RESERVED_INTENT_NAMES.DEFAULT_FALLBACK) {
      this.isDefaultFallback = true;
      this.intentNameAlreadyExist = true;
    } else if(this.intentName === RESERVED_INTENT_NAMES.WEBHOOK) {
      this.isWebhook = true;
      this.intentNameAlreadyExist = true;
    }
    if(!this.intentColor){
      this.intentColor = INTENT_COLORS.COLOR1;
    }
    this.logger.log("[PANEL-INTENT-HEADER] initialize name:", this.intent);
  }


  /** checkIntentNameMachRegex */
  private checkIntentNameMachRegex(intentname) {
    const regex = /^[ _0-9a-zA-Z]+$/
    return regex.test(intentname);
  }

  /** checkIntentName */
  private checkIntentName(name: string) {
    this.intentNameAlreadyExist = false;
    if(!this.intentName || this.intentName.trim().length == 0 || this.intentName === preDisplayName) {
      return false;
    }
    for (const element of this.listOfIntents) {
      if (element.intent_display_name === name && element.intent_id !== this.intent.intent_id) { 
        this.intentNameAlreadyExist = true;
        return false;
      }
    }
    this.intentNameNotHasSpecialCharacters = this.checkIntentNameMachRegex(name);
    if(!this.intentNameNotHasSpecialCharacters){
      return false;
    }
    return true;
  }
  /******************* END CUSTOM FUNCTIONS *******************/ 


  /******************* EVENT FUNCTIONS *******************/ 
  onSelectIntent(event){
    this.logger.log("[PANEL-INTENT-HEADER] onSelectIntent",event, this.intent);
    // // this.intentService.setIntentSelected(this.intent.intent_id);
  }

  /** onMouseUpInput */
  onMouseUpInput(event){
    this.logger.log("[PANEL-INTENT-HEADER] onMouseUpInput");
    this.isFocused = true;
    this.inputIntentName.nativeElement.focus();
  }

  /** onChangeIntentName */
  onChangeIntentName(event) {
    this.logger.log("[PANEL-INTENT-HEADER] onChangeIntentName", event, this.intent);
    if(this.intentService.isReservedIntent(event)){
      this.logger.log("[PANEL-INTENT-HEADER] isReservedIntent TRUE");
      this.intentNameAlreadyExist = true;
      this.isNotErrorName = false;
    } else {
      this.logger.log("[PANEL-INTENT-HEADER] isReservedIntent FALSE");
      this.intentNameAlreadyExist = false;
      this.isNotErrorName = this.checkIntentName(event);
      if(this.isNotErrorName){
        this.intentName = event;
      }
    }
  }


  onBlur(event){
    this.logger.log("[PANEL-INTENT-HEADER]  onBlur!!!", this.intent);
    if(this.intentService.isReservedIntent(this.intentName) && this.intent.attributes.readonly === false){
      this.intentNameAlreadyExist = true;
      this.intentName = this.intent.intent_display_name;
      this.logger.log("[PANEL-INTENT-HEADER]  isReservedIntent true");
    } else {
      this.intentNameAlreadyExist = false;
      this.logger.log("[PANEL-INTENT-HEADER]  isReservedIntent true");
      this.isNotErrorName = this.checkIntentName(this.intentName);
      if(this.isNotErrorName){
        this.intent.intent_display_name = this.intentName;
        this.inputIntentName.nativeElement.blur();
        this.onSaveIntent();
      }
    }
  }

  /** ENTER KEYBOARD EVENT*/
  onEnterButtonPressed(event) {
    this.logger.log('[PANEL-INTENT-HEADER] onEnterButtonPressed Intent name: onEnterButtonPressed event', event)
    this.inputIntentName.nativeElement.blur();
  }

  /** doubleClickFunction */
  doubleClickFunction(event){
    this.logger.log("[PANEL-INTENT-HEADER] doubleClickFunction");
    this.inputIntentName.nativeElement.select();
  }

  /** onSaveIntent */
  onSaveIntent() {
    this.logger.log("[PANEL-INTENT-HEADER] SALVO!!!");
    this.intentService.changeIntentName(this.intent);
  }

}
