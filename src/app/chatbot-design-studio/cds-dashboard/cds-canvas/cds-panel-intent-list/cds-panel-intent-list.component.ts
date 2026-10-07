import { Component, OnInit, OnChanges, SimpleChanges, Input, Output, EventEmitter, Optional } from '@angular/core';
import { Subscription } from 'rxjs';

// SERVICES //
import { IntentService } from '../../../services/intent.service';
 
// MODEL //
import { Intent } from 'src/app/models/intent-model';

// UTILS //
import { RESERVED_INTENT_NAMES, moveItemToPosition, TYPE_INTENT_NAME, UNTITLED_BLOCK_PREFIX } from '../../../utils';
import { listedIntents, isWebStartDisabled } from 'src/app/chatbot-design-studio/utils-start-points';
import { StartPointManagerService } from '../../../services/start-point-manager.service';
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
  private subscriptionWebStart: Subscription;
  
  
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
  ICON_CLOSE = 'call_end';
  ICON_WEBHOOK = 'webhook';

  private readonly logger: LoggerService = LoggerInstance.getInstance()
  
  constructor(
    private intentService: IntentService,
    @Optional() private readonly startPointManager?: StartPointManagerService
  ) { 
    this.setSubscriptions();
  }

  ngOnInit(): void {
    // // console.log('ngOnInit:: ');
    this.idSelectedIntent = null;
  }

  ngOnChanges(changes: SimpleChanges) {
    // //console.log('[CdsPanelIntentListComponent] ngOnChanges::', this.listOfIntents);
  }

  /** ngOnDestroy */
  ngOnDestroy() {
    if (this.subscriptionListOfIntents) {
      this.subscriptionListOfIntents.unsubscribe();
    }
    if (this.subscriptionIntent) {
      this.subscriptionIntent.unsubscribe();
    }
    this.subscriptionWebStart?.unsubscribe();
    
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

    /** Web start disabled/enabled: the start block stays in the flow, only its row goes or comes back */
    this.subscriptionWebStart = this.startPointManager?.webStartChanged$.subscribe(() => {
      const intents = this.intentService.listOfIntents;
      if(intents && intents.length>0){
        this.initialize(intents);
      }
    });

    /** SUBSCRIBE TO THE INTENT SELECTED */
    this.subscriptionIntent = this.intentService.behaviorIntent.subscribe((intent: Intent) => {
      this.logger.log('[cds-panel-intent-list] --- AGGIORNATO INTENT ',intent);
      // a disabled Web start is hidden: never the selected row
      if (intent && !isWebStartDisabled(intent)) {
        if (!intent['attributesChanged']) {
          this.idSelectedIntent = intent.intent_id;
        }
      }
    });
  }

  /** initialize */
  private initialize(intents){
    // a disabled Web start is hidden on the canvas: not listed here either
    intents = listedIntents(intents);
    // // intents = this.intentService.hiddenEmptyIntents(intents);
    // // this.internalIntents = intents.filter(obj => ( obj.intent_display_name.trim() === TYPE_INTENT_NAME.START || obj.intent_display_name.trim() === TYPE_INTENT_NAME.DEFAULT_FALLBACK));
    this.internalIntents = intents.filter(obj => obj.attributes && obj.attributes.readonly === true && !obj.intent_display_name?.startsWith(UNTITLED_BLOCK_PREFIX));
    this.logger.log('[cds-panel-intent-list] --- internalIntents ',this.internalIntents);
    this.defaultIntents = intents.filter(obj => obj.attributes && obj.attributes.readonly !== true && !obj.intent_display_name?.startsWith(UNTITLED_BLOCK_PREFIX));
    this.logger.log('[cds-panel-intent-list] --- defaultIntents ',this.defaultIntents);
    this.internalIntents = moveItemToPosition(this.internalIntents, TYPE_INTENT_NAME.START, 0);
    this.internalIntents = moveItemToPosition(this.internalIntents, TYPE_INTENT_NAME.DEFAULT_FALLBACK, 1);
    this.internalIntents = moveItemToPosition(this.internalIntents, TYPE_INTENT_NAME.CLOSE, 2);

    // Ordina gli intent in ordine alfabetico crescente
    this.defaultIntents = this.defaultIntents.sort((a, b) => {
      const nameA = a.intent_display_name?.toLowerCase() || '';
      const nameB = b.intent_display_name?.toLowerCase() || '';
      return nameA.localeCompare(nameB);
    });

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
  onGetIconForName(intent: Intent){
    let name = intent.intent_display_name;
    let readonly = intent.attributes.readonly;
    let icon = this.ICON_DEFAULT;
    if (name.trim() === TYPE_INTENT_NAME.START && readonly) {
      icon = this.ICON_ROCKET;
    } else if (name.trim() === TYPE_INTENT_NAME.DEFAULT_FALLBACK && readonly) {
      icon = this.ICON_UNDO;
    } else if (name.trim() === TYPE_INTENT_NAME.WEBHOOK && readonly){
      icon = this.ICON_WEBHOOK;
    } else if (name.trim() === TYPE_INTENT_NAME.CLOSE && readonly){
      icon = this.ICON_CLOSE;
    }
    return icon;
  }

  /** Search a block... */
  onLiveSearch(text: string) {
    this.filteredIntents = this.defaultIntents.filter(element => 
      element.intent_display_name.toLowerCase().includes(text.toLowerCase())
    ).sort((a, b) => {
      const nameA = a.intent_display_name?.toLowerCase() || '';
      const nameB = b.intent_display_name?.toLowerCase() || '';
      return nameA.localeCompare(nameB);
    });
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
