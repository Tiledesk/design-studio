import { Component, OnInit, Input, Output, EventEmitter, ViewChild, SimpleChanges } from '@angular/core';
import { ACTION_DRAG_MIME, TYPE_OF_MENU, TYPE_EVENT_CATEGORY, EVENTS_LIST } from '../../../../utils';
import { ControllerService } from '../../../../services/controller.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { ProjectPlanUtils } from 'src/app/utils/project-utils';
import { TYPE_CHATBOT, ACTIONS_LIST, TYPE_ACTION_CATEGORY } from 'src/app/chatbot-design-studio/utils-actions';
import { TranslateService } from '@ngx-translate/core';
import { BRAND_BASE_INFO } from 'src/app/chatbot-design-studio/utils-resources';

/** Quanto resta aperto il riquadro dopo che il puntatore ha lasciato la riga: il tempo di
 *  raggiungerlo per premere il collegamento che contiene. */
const CLOSE_INFO_DELAY_MS = 400;

/** Quanto bisogna restare sulla "i" perche' la descrizione compaia.
 *
 *  Il puntatore attraversa quella colonna ogni volta che si scorre l'elenco: senza attesa il
 *  riquadro sbatterebbe aperto e chiuso una voce dopo l'altra. Un secondo e' il tempo di una
 *  intenzione, non di un passaggio. */
const OPEN_INFO_DELAY_MS = 1000;
// import { DragDropService } from 'app/chatbot-design-studio/services/drag-drop.service';

@Component({
  selector: 'cds-panel-actions',
  templateUrl: './cds-panel-actions.component.html',
  styleUrls: ['./cds-panel-actions.component.scss']
})
export class CdsPanelActionsComponent implements OnInit {

  @Input() actionsList: Array<any>;
  @Input() menuType: string;
  @Input() menuCategory: string;
  @Input() pos: any;

  TYPE_ACTION_CATEGORY = TYPE_ACTION_CATEGORY;
  TYPE_OF_MENU = TYPE_OF_MENU;
  BRAND_BASE_INFO = BRAND_BASE_INFO;
  
  menuItemsList: any;
  isDragging: any = false;
  indexDrag: number;

  hoveredElement: any;
  private closeInfoTimer: any = null;
  private openInfoTimer: any = null;
  positionMenu: any = {'x': 200, 'y': 0 };
  isOpen: boolean = false;
  // dropList: CdkDropList;
  // connectedLists: CdkDropList[];
  // connectedIDLists: string[];
  
  private readonly logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private readonly controllerService: ControllerService,
    private readonly projectPlanUtils: ProjectPlanUtils,
    private readonly translate: TranslateService,
    // public dragDropService: DragDropService
  ) { }

  ngOnInit(): void {
    // //empty
  }

  ngOnChanges(changes: SimpleChanges) {
    switch (this.menuType) {
      case TYPE_OF_MENU.ACTION:
        this.menuItemsList = this.actionsList;
        /*
        // this.projectPlanUtils.checkIfActionIsInChatbotType(TYPE_CHATBOT.WEBHOOK);
        // this.logger.log('[CDS-PANEL-ACTIONS] ACTIONS_LIST:: ', ACTIONS_LIST);
        // this.menuItemsList = Object.values(ACTIONS_LIST).filter(el => (el.category === TYPE_ACTION_CATEGORY[this.menuCategory] && el.status !== 'inactive')).map(element => {
        //   return {
        //     type: TYPE_OF_MENU.ACTION,
        //     value: element,
        //     canLoad: element.plan? this.projectPlanUtils.checkIfCanLoad(element.type, element.plan) : true
        //   };
        // }); 
        */
        break;
      case TYPE_OF_MENU.EVENT:
        this.menuItemsList = Object.values(EVENTS_LIST).map(element => {
          return {
            type: TYPE_OF_MENU.EVENT,
            value: element
          };
        });
        break;
      case TYPE_OF_MENU.BLOCK:
        this.menuItemsList = [{
          "type": TYPE_OF_MENU.BLOCK,
          "value": {
            "name": "Block",
            "type": "BLOCK",
            "src": "",
            "description": ""
          }
        }];
        break;
      case TYPE_OF_MENU.FORM:
        this.menuItemsList = [{
          "type": TYPE_OF_MENU.FORM,
          "value": {
            "name": "Form",
            "type": "FORM",
            "src": "assets/images/form.svg",
            "description": ""
          }
        }];
        break;
      case TYPE_OF_MENU.QUESTION:
          this.menuItemsList = [{
            "type": TYPE_OF_MENU.QUESTION,
            "value": {
              "name": "Train",
              "type": "QUESTION",
              "src": "assets/images/brain.svg",
              "description": ""
            }
          }];
          break;
      default:
        this.menuItemsList = [];
        break;
    }
    
    if(!this.pos){
      this.pos = {'x': 0, 'y':0};
    }

  }


  ngAfterViewInit(){
    
    // this.dragDropService.addConnectedIDList('action_list_drop_connect');
    // // this.dragDropService.addConnectedIDList('cds-box-right-content');
    // this.dragDropService.addConnectedList(this.actionListDropConnect);
    // this.connectedLists = this.dragDropService.connectedLists;
    // this.connectedIDLists = this.dragDropService.connectedIDLists;
    // // ['action_list_drop_connect','drop-actions'];
    // // this.dragDropService.connectedIDLists;
  }


  openInfo(e, element) {
    this.logger.log('[CDS-PANEL-ACTIONS] openInfo!', element);

    if(!BRAND_BASE_INFO['DOCS']){
      return;
    }
    /**if element doesn't have any doc, close info */
    if(!element.doc || element.doc===""){
      this.closeInfo();
      return; 
    } 

    this.cancelCloseInfo();
    // Se il riquadro e' gia' aperto su un'altra voce passa subito a questa: l'attesa serve a
    // non aprirlo per sbaglio, non a rallentare chi lo sta gia' leggendo.
    clearTimeout(this.openInfoTimer);
    this.openInfoTimer = setTimeout(() => {
      this.hoveredElement = element;
      //this.menuTrigger.openMenu();
      // let x = e.offsetLeft;
      let y = e.offsetTop;
      this.isOpen = true;
      // Solo l'altezza: il lato lo decide il foglio di stile (`left: 100%`), cosi' il riquadro
      // resta a filo col pannello anche se il pannello cambia larghezza. Uno stile in linea
      // avrebbe la precedenza e inchioderebbe quella misura a un numero scritto qui.
      this.positionMenu = {'x': 0, 'y': y }
      this.openInfoTimer = null;
    }, this.isOpen ? 0 : OPEN_INFO_DELAY_MS);
  }

  /** Chiude il riquadro, ma non subito.
   *
   *  Dentro c'e' un collegamento da premere, e per premerlo il puntatore deve lasciare la riga
   *  e attraversare il vuoto fra la riga e il riquadro: chiudendo all'istante il riquadro
   *  sparirebbe proprio mentre lo si sta raggiungendo. Entrando nel riquadro la chiusura viene
   *  annullata, cosi' resta aperto finche' serve. */
  closeInfo() {
    if(!BRAND_BASE_INFO['DOCS']){
      return;
    }
    // Uscendo prima che sia comparso, l'apertura in attesa si annulla: altrimenti il riquadro
    // si aprirebbe un secondo dopo, su una voce che il puntatore ha gia' lasciato.
    clearTimeout(this.openInfoTimer);
    this.openInfoTimer = null;
    this.cancelCloseInfo();
    this.closeInfoTimer = setTimeout(() => {
      this.isOpen = false;
      this.hoveredElement = null;
      this.closeInfoTimer = null;
    }, CLOSE_INFO_DELAY_MS);
  }

  /** Il puntatore e' arrivato sul riquadro: la chiusura in corso si annulla. */
  cancelCloseInfo() {
    if (this.closeInfoTimer) {
      clearTimeout(this.closeInfoTimer);
      this.closeInfoTimer = null;
    }
  }

  /** Chiude senza aspettare: serve quando parte un trascinamento o si cambia categoria. */
  closeInfoNow() {
    clearTimeout(this.openInfoTimer);
    this.openInfoTimer = null;
    this.cancelCloseInfo();
    this.isOpen = false;
    this.hoveredElement = null;
  }

  /**
   * Comincia il trascinamento di un'azione verso il flusso.
   *
   * Nel pacchetto viaggia solo il tipo dell'azione: e' tutto quello che serve al canvas per
   * creare il blocco, e tenerlo a una stringa evita di far passare oggetti vivi attraverso un
   * meccanismo del browser. L'etichetta del contenuto e' quella che il canvas riconosce: senza,
   * un file trascinato dal desktop e un'azione sarebbero la stessa cosa.
   *
   * La riga non viene toccata: resta nell'elenco, e quello che segue il puntatore e' l'istantanea
   * che disegna il browser.
   */
  onDragStart(event: DragEvent, item: any) {
    if (!event.dataTransfer || item?.value?.disabled) { return; }
    event.dataTransfer.setData(ACTION_DRAG_MIME, item.value.type);
    event.dataTransfer.effectAllowed = 'copy';
    // Le due cose che si toglievano di mezzo anche prima: il pannello di dettaglio di un'azione
    // gia' sul flusso, e la descrizione eventualmente aperta su questa riga.
    this.controllerService.closeActionDetailPanel();
    this.closeInfoNow();
  }

  onVideoUrlClick(){
    let url = this.translate.instant(this.hoveredElement.doc+'.VIDEO_URL')
    window.open (url, '_blank')
  }

}
