import { Component, OnInit, Input, Output, EventEmitter, OnChanges, ViewChild, ElementRef } from '@angular/core';
import { Intent } from 'src/app/models/intent-model';
import { IntentService } from '../../../../services/intent.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { preDisplayName } from '../../../../utils';

@Component({
  selector: 'cds-panel-intent-header',
  templateUrl: './panel-intent-header.component.html',
  styleUrls: ['./panel-intent-header.component.scss']
})
export class PanelIntentHeaderComponent implements OnInit, OnChanges {
  @ViewChild('myInput', { static: true }) myInput!: ElementRef<HTMLInputElement>;

  @Input() intent: Intent;
  @Output() saveIntent = new EventEmitter();

  listOfIntents: Intent[];
  intentName: string;
  intentNameResult: boolean = true;
  intentNameAlreadyExist: boolean = false
  intentNameNotHasSpecialCharacters: boolean = true;
  id_faq_kb: string;
  isFocused: boolean = false;

  private logger: LoggerService = LoggerInstance.getInstance()
  constructor(
    public intentService: IntentService
  ) { 
    this.intentService.getIntents().subscribe(intents => {
      if(intents){
        this.listOfIntents = intents;
      }
    })
  }

  // SYSTEM FUNCTIONS //
  ngOnInit(): void {
    this. initialize();
  }

  ngOnChanges() {
    // this.logger.log("[PANEL-INTENT-HEADER] header OnChanges intentSelected intent_display_name: ", this.intent.intent_display_name)
  }

  /******************* CUSTOM FUNCTIONS *******************/ 
  /** initialize */
  private initialize(){
    this.listOfIntents = this.intentService.listOfIntents;
    if (this.intent.intent_display_name === undefined && this.intent.intent_display_name.trim().length === 0) {
      this.intentService.setDisplayName();
    } else {
      this.intentName = this.intent.intent_display_name;
    }
    this.intentNameAlreadyExist = false;
    this.intentNameNotHasSpecialCharacters = true;
  }



  // funzione

  /** checkIntentNameMachRegex */
  private checkIntentNameMachRegex(intentname) {
    const regex = /^[ _0-9a-zA-Z]+$/
    return regex.test(intentname);
  }

  /** checkIntentName */
  private checkIntentName(name: string) {
    this.intentNameResult = true;
    this.intentNameAlreadyExist = false;
    if(!this.intentName || this.intentName.trim().length == 0 || this.intentName === preDisplayName) {
      this.logger.log("[PANEL-INTENT-HEADER] error 1");
      this.intentNameResult = false;
    }
    for (let i = 0; i < this.listOfIntents.length; i++) {
      if (this.listOfIntents[i].intent_display_name === name && this.listOfIntents[i].intent_id !== this.intent.intent_id) { 
        this.intentNameAlreadyExist = true;
        this.intentNameResult = false;
        break;
      }
    }
    this.intentNameNotHasSpecialCharacters = this.checkIntentNameMachRegex(name);
    if(!this.intentNameNotHasSpecialCharacters){
      this.logger.log("[PANEL-INTENT-HEADER] error 3");
      this.intentNameResult = false;
    }
    return this.intentNameResult;
  }
  /******************* END CUSTOM FUNCTIONS *******************/ 


  /******************* EVENT FUNCTIONS *******************/ 

  onSelectIntent(event){
    this.logger.log("[PANEL-INTENT-HEADER] onSelectIntent",event, this.intent);
    // this.intentService.setIntentSelected(this.intent.intent_id);
  }

  /** onMouseUpInput */
  onMouseUpInput(event){
    this.logger.log("[PANEL-INTENT-HEADER] onMouseUpInput");
    this.isFocused = true;
    this.myInput.nativeElement.focus();
  }

  /** onChangeIntentName */
  onChangeIntentName(event) {
    const result = this.checkIntentName(event);
    this.intent.intent_display_name = event.trim();
    if(result){
      this.intentName = event;
      // this.onSaveIntent();
      // this.intentService.setIntentSelected(this.intent.intent_id);
    }
  }

  onBlur(event){
    this.myInput.nativeElement.blur();
    const result = this.checkIntentName(this.intentName);
    if(result){
      this.onSaveIntent();
    }
  }

  /** ENTER KEYBOARD EVENT*/
  onEnterButtonPressed(event) {
    this.logger.log('[PANEL-INTENT-HEADER] onEnterButtonPressed Intent name: onEnterButtonPressed event', event)
    // // this.checkIntentName(this.intentName);
    // // this.onSaveIntent();
    // event.target.blur()
    this.myInput.nativeElement.blur();
    // this.intentService.selectIntent(this.intent);
  }

  /** doubleClickFunction */
  doubleClickFunction(event){
    this.logger.log("[PANEL-INTENT-HEADER] doubleClickFunction");
    this.myInput.nativeElement.select();
    // this.intentService.selectIntent(this.intent);
  }

  // onMouseBlur(){
  //   this.logger.log("[PANEL-INTENT-HEADER] onMouseBlur");
  //   this.isFocused = false;
  // }

  // /** BLUR EVENT*/
  // onBlurIntentName(event) {
  //   // this.checkIntentName(this.intentName);
  //   // this.onSaveIntent();
  // }

 

  /** */
  onSaveIntent() {
    this.logger.log("[PANEL-INTENT-HEADER] SALVO!!!");
    // this.intentService.setIntentSelected(this.intent.intent_id);
    this.intent.intent_display_name = this.intentName.trim();
    this.intentService.changeIntentName(this.intent);
  }

}
