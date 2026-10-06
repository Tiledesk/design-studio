import { Component, OnInit, OnChanges, SimpleChanges, Input, Output, EventEmitter } from '@angular/core';
import { Subscription } from 'rxjs';

// SERVICES //
import { IntentService } from '../../../services/intent.service';
import { DashboardService } from 'src/app/services/dashboard.service';
 
// MODEL //
import { Intent } from 'src/app/models/intent-model';

// UTILS //
import { RESERVED_INTENT_NAMES, moveItemToPosition, TYPE_INTENT_NAME, UNTITLED_BLOCK_PREFIX, isDefaultFallbackWithoutActions } from '../../../utils';
import { ACTIONS_LIST } from '../../../utils-actions';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

import { LeftPanelStateService } from '../../../services/left-panel-state.service';
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
  /** nasconde il titolo interno "Blocks" quando il pannello è sotto i tab Blocks/Subagents */
  /** Teneva nascosto il titolo quando il pannello stava sotto le linguette orizzontali.
   *  Con l'intestazione del V4 il titolo torna a esserci sempre, ma l'ingresso resta per non
   *  rompere chi lo passa. */
  @Input() hideTitle: boolean = false;
  @Output() selectIntent = new EventEmitter();
  @Output() deleteIntent = new EventEmitter();
 


  listOfIntents: Intent[] = [];
  internalIntents: Intent[] = [];
  defaultIntents: Intent[] = [];
  filteredIntents: Intent[] = [];
  /** I blocchi che non hanno ancora un nome. Prima venivano tolti dall'elenco: esistevano sul
   *  canvas e non comparivano qui, quindi l'unico modo di raggiungerli era trovarli a vista.
   *  Come nel V4, stanno in un gruppo a parte invece che nascosti. */
  untitledIntents: Intent[] = [];
  filteredUntitledIntents: Intent[] = [];
  searchText: string = '';
  isRenamedExpanded: boolean = true;
  isUntitledExpanded: boolean = true;
  
  idSelectedIntent: string;


  ICON_DEFAULT = 'package_2';
  ICON_ROCKET = 'rocket_launch';
  ICON_UNDO = 'undo';
  ICON_CLOSE = 'call_end';
  ICON_WEBHOOK = 'webhook';

  private readonly logger: LoggerService = LoggerInstance.getInstance()
  
  constructor(
    private intentService: IntentService,
    private dashboardService: DashboardService,
    private readonly leftPanelState: LeftPanelStateService
  ) { 
    this.setSubscriptions();
  }

  /** Su un agent V3 un blocco contiene una sola action, quindi l'icona di quella
   *  action dice cosa fa il blocco meglio dell'icona generica uguale per tutti -- e il
   *  contatore accanto al nome, che su V3 vale sempre uno, non dice niente. */
  get IS_V3(): boolean {
    return !!this.dashboardService?.isV3;
  }

  /** Percorso dell'icona dell'action del blocco, o null se non ce n'e' una da mostrare.
   *
   *  Legge la prima action: su V3 e' anche l'unica. I blocchi vuoti e quelli riservati
   *  (start, defaultFallback) non ne hanno, e ricadono sull'icona generica.
   *
   *  Il risultato e' tenuto da parte per tipo: il template lo chiede a ogni giro di
   *  rilevamento delle modifiche, per ogni riga dell'elenco. */
  actionIconSrc(intent: Intent): string | null {
    const type = (intent?.actions?.[0] as any)?._tdActionType;
    if (!type) { return null; }
    if (!this.actionIconByType.has(type)) {
      const entry = Object.values(ACTIONS_LIST).find(action => action.type === type);
      this.actionIconByType.set(type, entry?.src || null);
    }
    return this.actionIconByType.get(type);
  }

  private readonly actionIconByType = new Map<string, string | null>();

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
    // // intents = this.intentService.hiddenEmptyIntents(intents);
    // // this.internalIntents = intents.filter(obj => ( obj.intent_display_name.trim() === TYPE_INTENT_NAME.START || obj.intent_display_name.trim() === TYPE_INTENT_NAME.DEFAULT_FALLBACK));
    this.internalIntents = intents.filter(obj => obj.attributes && obj.attributes.readonly === true && !obj.intent_display_name?.startsWith(UNTITLED_BLOCK_PREFIX));
    this.logger.log('[cds-panel-intent-list] --- internalIntents ',this.internalIntents);
    this.defaultIntents = intents.filter(obj => obj.attributes && obj.attributes.readonly !== true && !obj.intent_display_name?.startsWith(UNTITLED_BLOCK_PREFIX));
    this.untitledIntents = intents.filter(obj => obj.attributes && obj.attributes.readonly !== true && obj.intent_display_name?.startsWith(UNTITLED_BLOCK_PREFIX));
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
    this.filteredUntitledIntents = this.untitledIntents;
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

  /** La defaultFallback vuota di un agent V3: sullo stage la sua icona prende il blu delle
   *  azioni AI, e qui deve avere lo stesso colore. Con un'azione dentro, o sui legacy, resta rossa. */
  isV3EmptyFallback(intent: Intent): boolean {
    return this.IS_V3 && isDefaultFallbackWithoutActions(intent);
  }

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

  /** Chiude il pannello di sinistra, come la freccia del V4. Passa dallo stato condiviso, lo
   *  stesso che muovono le linguette: un secondo interruttore avrebbe potuto dire il contrario. */
  onClosePanel(): void {
    this.leftPanelState.close();
  }

  /** Search a block... */
  onLiveSearch(text: string) {
    const needle = (text || '').toLowerCase();
    const perNome = (list: Intent[]) => list
      .filter(element => (element.intent_display_name || '').toLowerCase().includes(needle))
      .sort((a, b) => (a.intent_display_name || '').toLowerCase()
        .localeCompare((b.intent_display_name || '').toLowerCase()));

    this.filteredIntents = perNome(this.defaultIntents);
    // Anche i senza nome rispondono alla ricerca: cercando "untitled" si trovano tutti.
    this.filteredUntitledIntents = perNome(this.untitledIntents);
    this.searchText = text || '';
  }

  /** Vero se la sezione e' aperta. Cercando si aprono entrambe, altrimenti i risultati
   *  resterebbero nascosti dietro una sezione chiusa. */
  isSectionOpen(section: 'renamed' | 'untitled'): boolean {
    if (this.searchText.trim()) { return true; }
    return section === 'renamed' ? this.isRenamedExpanded : this.isUntitledExpanded;
  }

  toggleSection(section: 'renamed' | 'untitled'): void {
    if (section === 'renamed') { this.isRenamedExpanded = !this.isRenamedExpanded; }
    else { this.isUntitledExpanded = !this.isUntitledExpanded; }
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
