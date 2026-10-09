import { Component, OnInit, Input, Output, EventEmitter, ViewChild, ElementRef, SimpleChanges } from '@angular/core';
import { ACTION_DRAG_MIME, TYPE_OF_MENU, TYPE_EVENT_CATEGORY, EVENTS_LIST } from '../../../../utils';
import { ControllerService } from '../../../../services/controller.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { ProjectPlanUtils } from 'src/app/utils/project-utils';
import { TYPE_CHATBOT, ACTIONS_LIST, TYPE_ACTION_CATEGORY } from 'src/app/chatbot-design-studio/utils-actions';
import { TranslateService } from '@ngx-translate/core';
import { BRAND_BASE_INFO } from 'src/app/chatbot-design-studio/utils-resources';
import { ConnectorGroup, ConnectorSubgroup } from '../../../../connector/connector-catalog.service';

/** Quanto resta aperto il riquadro dopo che il puntatore ha lasciato la riga: il tempo di
 *  raggiungerlo per premere il collegamento che contiene. */
const CLOSE_INFO_DELAY_MS = 400;

/** Quanto bisogna restare sulla "i" perche' la descrizione compaia.
 *
 *  Il puntatore attraversa quella colonna ogni volta che si scorre l'elenco: senza attesa il
 *  riquadro sbatterebbe aperto e chiuso una voce dopo l'altra. Un secondo e' il tempo di una
 *  intenzione, non di un passaggio. */
const OPEN_INFO_DELAY_MS = 1000;
/** La classe della copia della riga che segue il puntatore durante il trascinamento. */
const DRAG_GHOST_CLASS = 'action-drag-ghost';
/** I valori di disegno che la riga eredita dal pannello e che la copia, attaccata al body, non
 *  avrebbe piu': si copiano sulla copia, cosi' resta uguale alla riga da cui nasce. */
const DRAG_GHOST_INHERITED_PROPS = [
  '--ds-surface', '--ds-border', '--ds-ink', '--ds-ink-2', '--ds-canvas',
  '--space-3', '--space-5', '--space-6', '--fs-md', '--size-icon-cell',
  '--border-radius-base-preview', '--gray-light-01', '--blu',
];

/** Quanto bisogna restare sulla riga perche' compaia il nome per intero. Piu' breve dell'attesa
 *  della descrizione: qui si risponde a "cosa c'e' scritto", non si apre un riquadro. */
const NAME_TOOLTIP_DELAY_MS = 400;
// import { DragDropService } from 'app/chatbot-design-studio/services/drag-drop.service';

@Component({
  selector: 'cds-panel-actions',
  templateUrl: './cds-panel-actions.component.html',
  styleUrls: ['./cds-panel-actions.component.scss']
})
export class CdsPanelActionsComponent implements OnInit {
  @ViewChild('panel_actions_div') panelDiv: ElementRef;

  @Input() actionsList: Array<any>;
  @Input() menuType: string;
  @Input() menuCategory: string;
  @Input() pos: any;
  @Input() connectorGroups: ConnectorGroup[] = [];
  @Output() startPointClick = new EventEmitter<string>();
  @Output() isDraggingMenuElement = new EventEmitter();

  TYPE_ACTION_CATEGORY = TYPE_ACTION_CATEGORY;
  TYPE_OF_MENU = TYPE_OF_MENU;
  BRAND_BASE_INFO = BRAND_BASE_INFO;

  menuItemsList: any;
  groupRows: Array<{ group: ConnectorGroup; items: any[] }> = [];
  activeGroup: ConnectorGroup | null = null;
  activeItems: any[] = [];
  activeSubgroups: Array<{ id: string; name: string; icon: string; items: any[] }> = [];
  activeGroupPos: any = { x: 200, y: 0 };
  isOverNested = false;
  isDragging: any = false;
  indexDrag: number;

  hoveredElement: any;
  positionMenu: any = {'x': 0, 'y': 0 };
  private closeInfoTimer: any = null;
  private openInfoTimer: any = null;
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

    this.groupRows = (this.connectorGroups || []).map(group => ({
      group,
      items: (group.entries || []).map(entry => ({ type: TYPE_OF_MENU.ACTION, value: entry, canLoad: true }))
    }));

    if (this.menuType !== TYPE_OF_MENU.ACTION) {
      this.activeGroup = null;
      this.activeItems = [];
      this.activeSubgroups = [];
      this.isOverNested = false;
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

  onChildDragging(isDragging: boolean) {
    this.isDragging = isDragging;
    if (isDragging) { this.closeInfoNow(); }
    this.isDraggingMenuElement.emit(isDragging);
  }

  openGroup(rowEl: HTMLElement, row: { group: ConnectorGroup; items: any[] }) {
    this.activeGroup = row.group;
    this.activeItems = row.items;
    this.activeSubgroups = (row.group.subgroups || []).map(sg => ({
      id: sg.id,
      name: sg.name,
      icon: sg.icon,
      items: (sg.entries || []).map(entry => ({ type: TYPE_OF_MENU.ACTION, value: entry, canLoad: true })),
    }));
    // A connector can expose many actions, so the nested flyout's (max-height-capped,
    // scrollable) box can be tall. Anchor it to the hovered row, but shift it up if it would
    // run past the bottom of the viewport — otherwise the scrollable box opens off-screen and
    // feels unscrollable. Must match the .action-list max-height: min(70vh, 560px).
    const margin = 8;
    const maxFlyoutH = Math.min(window.innerHeight * 0.7, 560);
    const panelTop = this.panelDiv ? this.panelDiv.nativeElement.getBoundingClientRect().top : 0;
    let screenTop = rowEl.getBoundingClientRect().top;
    if (screenTop + maxFlyoutH > window.innerHeight - margin) {
      screenTop = Math.max(margin, window.innerHeight - margin - maxFlyoutH);
    }
    this.activeGroupPos = { x: 200, y: Math.max(0, Math.round(screenTop - panelTop)) };
  }

  closeGroup() {
    setTimeout(() => { if (!this.isOverNested) { this.activeGroup = null; } }, 0);
  }

  onOverNested() { this.isOverNested = true; }

  onLeaveNested() { this.isOverNested = false; this.closeGroup(); }

  onItemClick(item: any) {
    if (item?.value?.start_point && item.value.disabled) {
      this.startPointClick.emit(item.value.start_point);
    }
  }

  /**
   * Comincia il trascinamento di una voce dell'elenco degli eventi verso il flusso.
   *
   * E' lo stesso gesto delle azioni (vedi la lista condivisa): viaggia il tipo, sotto l'etichetta
   * che il flusso riconosce, e la riga resta dov'e'.
   */
  onDragStart(event: DragEvent, item: any) {
    if (!event.dataTransfer || item?.value?.disabled) { return; }
    // Non il solo tipo: una voce puo' essere un punto di partenza, oppure un'azione portata da un
    // connettore installato, e il flusso ha bisogno di saperlo per creare la cosa giusta. Viaggia
    // come testo perche' e' l'unica forma che il meccanismo del browser sa trasportare.
    event.dataTransfer.setData(ACTION_DRAG_MIME, JSON.stringify({
      type: item.value.type,
      start_point: item.value.start_point,
      connectorEntry: item.value.connectorEntry
    }));
    event.dataTransfer.effectAllowed = 'copy';
    this.setDragGhost(event, event.currentTarget as HTMLElement);
    // Le due cose che si toglievano di mezzo anche prima: il pannello di dettaglio di un'azione
    // gia' sul flusso, e la descrizione eventualmente aperta su questa riga.
    this.controllerService.closeActionDetailPanel();
    this.closeInfoNow();
  }

  /**
   * Da' al browser l'immagine che deve seguire il puntatore: una copia della riga, bianca e
   * con gli angoli dei blocchi del flusso.
   *
   * Lasciata a se', la foto che il browser scatta alla riga esce com'e' la riga in quel momento
   * -- ancora sotto il puntatore, col fondo grigio del passaggio -- e con gli spigoli vivi
   * dell'elenco, che una classe messa all'ultimo momento non riesce ad arrotondare. La copia
   * invece e' nostra: sta nel documento per il solo istante in cui il browser la disegna, al
   * posto esatto della riga cosi' da non comparire mai da un'altra parte, e sparisce al primo
   * giro successivo. E' attaccata al body, fuori dalla colonna di sinistra, perche' li' dentro
   * ci sono trasformazioni e ritagli che la taglierebbero; per questo i valori di disegno che
   * eredita dal pannello le vengono copiati addosso, insieme al carattere.
   */
  private setDragGhost(event: DragEvent, box: HTMLElement | null) {
    const row = box?.querySelector<HTMLElement>('.actions-btns-wpr');
    if (!row || typeof event.dataTransfer?.setDragImage !== 'function') { return; }
    const rect = row.getBoundingClientRect();
    const rowStyle = getComputedStyle(row);
    const ghost = row.cloneNode(true) as HTMLElement;
    ghost.removeAttribute('id');
    ghost.classList.add(DRAG_GHOST_CLASS);
    for (const prop of DRAG_GHOST_INHERITED_PROPS) {
      const value = rowStyle.getPropertyValue(prop);
      if (value) { ghost.style.setProperty(prop, value); }
    }
    ghost.style.fontFamily = rowStyle.fontFamily;
    ghost.style.position = 'fixed';
    ghost.style.top = `${rect.top}px`;
    ghost.style.left = `${rect.left}px`;
    ghost.style.width = `${rect.width}px`;
    ghost.style.margin = '0';
    ghost.style.pointerEvents = 'none';
    document.body.appendChild(ghost);
    // Il punto della riga sotto il puntatore resta lo stesso sulla copia: non salta sotto la mano.
    event.dataTransfer.setDragImage(ghost, event.clientX - rect.left, event.clientY - rect.top);
    setTimeout(() => ghost.remove(), 0);
  }

  onVideoUrlClick(){
    let url = this.translate.instant(this.hoveredElement.doc+'.VIDEO_URL')
    window.open (url, '_blank')
  }

}
