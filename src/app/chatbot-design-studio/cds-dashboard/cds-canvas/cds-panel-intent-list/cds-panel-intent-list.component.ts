import { Component, OnInit, OnChanges, SimpleChanges, Input, Output, EventEmitter } from '@angular/core';
import { Subscription } from 'rxjs';

// SERVICES //
import { IntentService } from '../../../services/intent.service';
 
// MODEL //
import { Intent } from 'src/app/models/intent-model';

// UTILS //
import { moveItemToPosition, TYPE_INTENT_NAME } from '../../../utils';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Component({
  selector: 'cds-panel-intent-list',
  templateUrl: './cds-panel-intent-list.component.html',
  styleUrls: ['./cds-panel-intent-list.component.scss']
})

export class CdsPanelIntentListComponent implements OnInit, OnChanges {

  private subscriptionListOfIntents: Subscription;
  private subscriptionIntent: Subscription;
  
  
  @Input() IS_OPEN: boolean;
  @Input() intent_id: string;
  @Output() selectIntent = new EventEmitter();
  @Output() deleteIntent = new EventEmitter();
 


  listOfIntents: Intent[] = [];
  internalIntents: Intent[] = [];
  defaultIntents: Intent[] = [];
  filteredIntents: Intent[] = [];
  
  idSelectedIntent: string;


  ICON_DEFAULT = 'package_2';
  ICON_ROCKET = 'rocket_launch';
  ICON_UNDO = 'undo';

  private logger: LoggerService = LoggerInstance.getInstance()
  
  constructor(
    private intentService: IntentService
  ) { 
    this.setSubscriptions();
  }

  ngOnInit(): void {
    // console.log('ngOnInit:: ');
    this.idSelectedIntent = null;
  }

  ngOnChanges(changes: SimpleChanges) {
    //console.log('[CdsPanelIntentListComponent] ngOnChanges::', this.listOfIntents);
  }

  /** ngOnDestroy */
  ngOnDestroy() {
    if (this.subscriptionListOfIntents) {
      this.subscriptionListOfIntents.unsubscribe();
    }
    if (this.subscriptionIntent) {
      this.subscriptionIntent.unsubscribe();
    }
    
  }


  /** SUBSCRIBE TO THE INTENT LIST */
  /**
   * Creo una sottoscrizione all'array di INTENT per averlo sempre aggiornato
   * ad ogni modifica (aggiunta eliminazione di un intent)
   */
  private setSubscriptions(){
    this.subscriptionListOfIntents = this.intentService.getIntents().subscribe(intents => {
      this.logger.log('[cds-panel-intent-list] --- AGGIORNATO ELENCO INTENTS ',intents);
      if(intents && intents.length>0){
        this.initialize(intents);
      }
    });

    /** SUBSCRIBE TO THE INTENT SELECTED */
    this.subscriptionIntent = this.intentService.behaviorIntent.subscribe((intent: Intent) => {
      this.logger.log('[cds-panel-intent-list] --- AGGIORNATO INTENT ',intent);
      if (intent) {
        if (!intent['attributesChanged']) {
          this.idSelectedIntent = intent.intent_id;
        }
      }
    });
  }

  /** initialize */
  private initialize(intents){
    // intents = this.intentService.hiddenEmptyIntents(intents);
    this.internalIntents = intents.filter(obj => ( obj.intent_display_name.trim() === TYPE_INTENT_NAME.DISPLAY_NAME_START || obj.intent_display_name.trim() === TYPE_INTENT_NAME.DISPLAY_NAME_DEFAULT_FALLBACK));
    this.defaultIntents = intents.filter(obj => ( obj.intent_display_name.trim() !== TYPE_INTENT_NAME.DISPLAY_NAME_START && obj.intent_display_name.trim() !== TYPE_INTENT_NAME.DISPLAY_NAME_DEFAULT_FALLBACK));
    this.internalIntents = moveItemToPosition(this.internalIntents, TYPE_INTENT_NAME.DISPLAY_NAME_START, 0);
    this.internalIntents = moveItemToPosition(this.internalIntents, TYPE_INTENT_NAME.DISPLAY_NAME_DEFAULT_FALLBACK, 1);
    this.filteredIntents = this.defaultIntents;
    if(!this.defaultIntents || this.defaultIntents.length == 0){
      this.intentService.setDefaultIntentSelected();
      this.idSelectedIntent = this.intentService.intentSelected.intent_id;
    } 
    this.listOfIntents = intents;
    const resp = this.listOfIntents.find((intent) => intent.intent_id === this.idSelectedIntent);
    if(!resp){
      this.idSelectedIntent = null;
    }
  }


  /** EVENTS  */

  /** onGetIconForName */
  onGetIconForName(name: string){
    let icon = this.ICON_DEFAULT;
    if (name.trim() === TYPE_INTENT_NAME.DISPLAY_NAME_START) {
      icon = this.ICON_ROCKET;
    } else if (name.trim() === TYPE_INTENT_NAME.DISPLAY_NAME_DEFAULT_FALLBACK) {
      icon = this.ICON_UNDO;
    }
    return icon;
  }

  /** Search a block... */
  onLiveSearch(text: string) {
    this.filteredIntents = this.defaultIntents.filter(element => element.intent_display_name.toLowerCase().includes(text.toLowerCase()));
  }

  /** onSelectIntent */
  onSelectIntent(intent: Intent) {
    this.idSelectedIntent = intent.intent_id;
    this.selectIntent.emit(intent);
  }

  /** onDeleteIntent */
  onDeleteIntent(intent: Intent) {
    this.deleteIntent.emit(intent);
  }


}
