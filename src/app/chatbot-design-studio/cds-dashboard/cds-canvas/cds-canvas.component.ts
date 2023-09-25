import { Component, OnInit, ViewChild, ElementRef, HostListener, Output, EventEmitter } from '@angular/core';
import { Subscription } from 'rxjs';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { TranslateService } from '@ngx-translate/core';

// SERVICES //
import { IntentService } from 'app/chatbot-design-studio/services/intent.service';
import { StageService } from 'app/chatbot-design-studio/services/stage.service';
import { ConnectorService } from 'app/chatbot-design-studio/services/connector.service';
import { ControllerService } from 'app/chatbot-design-studio/services/controller.service';
import { DashboardService } from 'app/chatbot-design-studio/services/dashboard.service';

// MODEL //
import { Intent, Button, Action, Form } from 'app/models/intent-model';

// UTILS //
import { checkIFElementExists, TYPE_INTENT_ELEMENT, TYPE_OF_MENU, NEW_POSITION_ID } from 'app/chatbot-design-studio/utils';
import { LoggerService } from 'app/services/logger/logger.service';

const swal = require('sweetalert');

@Component({
  selector: 'cds-canvas',
  templateUrl: './cds-canvas.component.html',
  styleUrls: ['./cds-canvas.component.scss']
})
export class CdsCanvasComponent implements OnInit {

  @ViewChild('receiver_elements_dropped_on_stage', { static: false }) receiverElementsDroppedOnStage: ElementRef;
  @ViewChild('drawer_of_items_to_zoom_and_drag', { static: false }) drawerOfItemsToZoomAndDrag: ElementRef;

  @Output() testItOut = new EventEmitter();
  @Output() closePanelWidget = new EventEmitter();

  id_faq_kb: string;
  TYPE_OF_MENU = TYPE_OF_MENU;

  private subscriptionListOfIntents: Subscription;
  listOfIntents: Array<Intent> = [];
  listOfEvents: Array<Intent> = []
  intentSelected: Intent;
  intent_id: string;
  hasClickedAddAction: boolean = false;
  hideActionPlaceholderOfActionPanel: boolean;

  /** panel list of intent */ 
  IS_OPEN_INTENTS_LIST: boolean = true;

  /** panel add action menu */
  private subscriptionOpenAddActionMenu: Subscription;
  IS_OPEN_ADD_ACTIONS_MENU: boolean = false;
  positionFloatMenu: any = { 'x': 0, 'y': 0 };
  tdsContainerEleHeight: number = 0;

  /** panel action detail */
  private subscriptionOpenDetailPanel: Subscription;
  IS_OPEN_PANEL_ACTION_DETAIL: boolean = false;
  elementIntentSelected: any;
  
  /** panel reply button configuaration */
  private subscriptionOpenButtonPanel: Subscription;
  IS_OPEN_PANEL_BUTTON_CONFIG: boolean = false;
  buttonSelected: any;
  

  /** panel widget */
  IS_OPEN_PANEL_WIDGET: boolean = false;
  
  constructor(
    private intentService: IntentService,
    private stageService: StageService,
    private connectorService: ConnectorService,
    private controllerService: ControllerService,
    private translate: TranslateService,
    private dashboardService: DashboardService,
    private logger: LoggerService
  ) {
    this.setSubscriptions();
  }

  ngOnInit(): void {
    this.logger.log("[CDS-CANVAS]  •••• ngOnInit ••••");
    this.initialize();
  }

  /** */
  ngOnDestroy() {
    if (this.subscriptionListOfIntents) {
      this.subscriptionListOfIntents.unsubscribe();
    }
    if (this.subscriptionOpenDetailPanel) {
      this.subscriptionOpenDetailPanel.unsubscribe();
    }
    if (this.subscriptionOpenAddActionMenu) {
      this.subscriptionOpenAddActionMenu.unsubscribe();
    }
    if (this.subscriptionOpenButtonPanel) {
      this.subscriptionOpenButtonPanel.unsubscribe();
    }
  }

  /** */
  ngAfterViewInit() {
    this.logger.log("[CDS-CANVAS]  •••• ngAfterViewInit ••••");
    this.stageService.initializeStage();
    this.stageService.setDrawer();
    this.connectorService.initializeConnectors();
    this.addEventListener();
  }


  /** ************************* **/
  /** START CUSTOM FUNCTIONS 
  /** ************************* **/

  // --------------------------------------------------------- //
  /** SUBSCRIBE TO THE INTENT LIST */
  // --------------------------------------------------------- //
  private setSubscriptions(){

    /** SUBSCRIBE TO THE LIST OF INTENTS **
     * Creo una sottoscrizione all'array di INTENT per averlo sempre aggiornato
     * ad ogni modifica (aggiunta eliminazione di un intent)
    */
    this.subscriptionListOfIntents = this.intentService.getIntents().subscribe(intents => {
      // this.logger.log("[CDS-CANVAS] --- AGGIORNATO ELENCO INTENTS", intents);
      this.listOfIntents = intents;
    });

    /** SUBSCRIBE TO THE STATE ACTION DETAIL PANEL */
    this.subscriptionOpenDetailPanel = this.controllerService.isOpenActionDetailPanel$.subscribe((element: { type: TYPE_INTENT_ELEMENT, element: Action | string | Form }) => {
      this.elementIntentSelected = element;
      this.logger.log('[CDS-CANVAS]  isOpenActionDetailPanel ', element);
      if (element.type) {
        this.closeAllPanels();
        this.removeConnectorDraftAndCloseFloatMenu();
        this.IS_OPEN_PANEL_ACTION_DETAIL = true;
      } else {
        this.IS_OPEN_PANEL_ACTION_DETAIL = false;
      }
    });

    /** SUBSCRIBE TO THE STATE ACTION REPLY BUTTON PANEL */
    this.subscriptionOpenButtonPanel = this.controllerService.isOpenButtonPanel$.subscribe((button: Button) => {
      this.buttonSelected = button;
      if (button) {
        // this.closeAllPanels(); // nk the action detail panel is not closed when the button detail panel is opened
        this.IS_OPEN_PANEL_WIDGET = false;
        this.closePanelWidget.next();
        // this.IS_OPEN_PANEL_ACTION_DETAIL = false;
        // this.IS_OPEN_PANEL_BUTTON_CONFIG = false;
        // this.IS_OPEN_ADD_ACTIONS_MENU = true;
        this.removeConnectorDraftAndCloseFloatMenu();
        this.IS_OPEN_PANEL_BUTTON_CONFIG = true;
      } else {
        this.IS_OPEN_PANEL_BUTTON_CONFIG = false;
      }
    });

    /** SUBSCRIBE TO THE STATE ACTION DETAIL PANEL */
    this.subscriptionOpenAddActionMenu = this.controllerService.isOpenAddActionMenu$.subscribe((menu: any) => {
      if (menu) {
        this.closeAllPanels();
        
      } else {
        this.IS_OPEN_ADD_ACTIONS_MENU = false;
      }
    });

  }

  /** initialize */
  private async initialize(){
    this.id_faq_kb = this.dashboardService.id_faq_kb;
    this.listOfIntents = [];
    const getAllIntents = await this.intentService.getAllIntents(this.id_faq_kb);
    this.logger.log('[CDS-CANVAS] getAllIntents', getAllIntents);
    if (getAllIntents) {
      this.listOfIntents = this.intentService.listOfIntents;
      this.initListOfIntents();
    }
  }
 

  /** closeAllPanels */
  private closeAllPanels(){
    this.IS_OPEN_PANEL_WIDGET = false;
    this.IS_OPEN_PANEL_ACTION_DETAIL = false;
    this.IS_OPEN_PANEL_BUTTON_CONFIG = false;
    this.closePanelWidget.next();
  }

  /** getIntentPosition: call from html */
  getIntentPosition(intentId: string) {
    return this.intentService.getIntentPosition(intentId);
  }

  /** initListOfIntents */
  private initListOfIntents() {
    this.listOfIntents.forEach(intent => {
      if (intent.actions) {
        intent.actions = intent.actions.filter(obj => obj !== null); //patch if action is null
      }
    });
    // this.updatePanelIntentList = !this.updatePanelIntentList;
    /* variabile booleana aggiunta per far scattare l'onchange nei componenti importati dalla dashboard
    * ngOnChanges funziona bene solo sugli @import degli elementi primitivi!!!  */
    this.refreshIntents();
  }

  /** SET DRAG STAGE AND CREATE CONNECTORS *
  * set drag and listner on intents, 
  * create connectors
  */
  private refreshIntents() {
    setTimeout(() => {
      this.setDragAndListnerEventToElements();
      this.connectorService.createConnectors(this.listOfIntents);
    }, 0);
  }

  // ---------------------------------------------------------
  // Event listener di eventi Stage e Connectors
  // ---------------------------------------------------------
  addEventListener() {
    let that = this;
    /** LISTENER OF TILEDESK STAGE */

    /** moved-and-scaled ** 
     * scatta quando sposto lo stage (lo muovo o lo scalo):
     * - imposto la scala
     * - chiudo 
     * - elimino il connettore disegnato e chiudo il float menu se è aperto
    */
    document.addEventListener(
      "moved-and-scaled", (e: CustomEvent) => {
        const el = e.detail;
        // this.logger.log('[CDS-CANVAS] moved-and-scaled ', el)
        this.connectorService.tiledeskConnectors.scale = e.detail.scale;
        this.removeConnectorDraftAndCloseFloatMenu();
      },
      false
    );

    /** start-dragging */
    document.addEventListener(
      "start-dragging", (e: CustomEvent) => {
        const el = e.detail.element;
        // this.logger.log('[CDS-CANVAS] start-dragging ', el);
        this.removeConnectorDraftAndCloseFloatMenu();
        this.intentSelected = this.listOfIntents.find((intent) => intent.intent_id === el.id);
        el.style.zIndex = 2;
      },
      false
    );

    /** dragged **
     * l'evento scatta quando muovo un intent sullo stage:
     * - muovo i connettori collegati all'intent
     * - rimuovo eventuali connectors tratteggiati e chiudo il float menu se è aperto
     * - aggiorno la posizione dell'intent selected
    */
    document.addEventListener(
      "dragged", (e: CustomEvent) => {
        const el = e.detail.element;
        // this.logger.log('[CDS-CANVAS] dragged ', el);
        const x = e.detail.x;
        const y = e.detail.y;
        this.connectorService.moved(el, x, y);
        // Verifica se intentSelected è definito e se attributes è definito
        if (this.intentSelected && this.intentSelected.attributes) {
          if (!this.intentSelected.attributes.position) {
            this.intentSelected.attributes.position = {};
          }
          this.intentSelected.attributes.position = {'x': el.offsetLeft, 'y': el.offsetTop};
        } else {
          this.intentSelected = {
            attributes: {
              position: {
                x: el.offsetLeft,
                y: el.offsetTop
              }
            }
          };
        }
      },
      false
    );

    /** end-dragging */
    document.addEventListener(
      "end-dragging", (e: CustomEvent) => {
        const el = e.detail.element;
        this.logger.log('[CDS-CANVAS] end-dragging ', el);
        el.style.zIndex = 1;
        if(this.intentSelected){
          this.intentService.patchAttributes(this.intentSelected.id, this.intentSelected.attributes);
        }
      },
      false
    );

    
    /** LISTNER OF TILEDESK CONNECTORS */
     
    /** connector-draft-released ** 
     * scatta solo quando NON viene creato un connettore, cioè quando rilascio il connettore tratteggiato in un punto che non è "collegabile"
     * se lo rilascio sullo stage ed 'e.detail' è completo della posizione di partenza e di arrivo del connettore posso aprire il float menu
     * altrimenti
     * rimuovo il connettore tratteggiato
    */
    document.addEventListener(
      "connector-draft-released", (e: CustomEvent) => {
        this.logger.log("[CDS-CANVAS] connector-draft-released :: ", e.detail);
        if(!e || !e.detail) return;
        const detail = e.detail;
        const arrayOfClass = detail.target.classList.value.split(' ');
        if (detail.target && arrayOfClass.includes("receiver-elements-dropped-on-stage") && detail.toPoint && detail.menuPoint) {
          this.logger.log("[CDS-CANVAS] ho rilasciato il connettore tratteggiato nello stage (nell'elemento con classe 'receiver_elements_dropped_on_stage') e quindi apro il float menu");
          this.openFloatMenuOnConnectorDraftReleased(detail);
        } else {
          this.logger.log("[CDS-CANVAS] ho rilasciato in un punto qualsiasi del DS ma non sullo stage quindi non devo aprire il menu", detail);
          this.removeConnectorDraftAndCloseFloatMenu();
        }
      },
      true
    );

    /** connector-created **
     * scatta quando viene creato un connettore:
     *  - aggiungo il connettore alla lista dei connettori (addConnectorToList)
     *  - notificare alle actions che i connettori sono cambiati (onChangedConnector) per aggiornare i pallini
    */
    document.addEventListener(
      "connector-created", (e: CustomEvent) => {
        this.logger.log("[CDS-CANVAS] connector-created:", e);
        const connector = e.detail.connector;
        this.connectorService.addConnectorToList(connector);
        this.intentService.onChangedConnector(connector);
      },
      true
    );

    /** connector-deleted **
     * scatta quando viene eliminato un connettore:
     *  - elimino il connettore dalla lista dei connettori (deleteConnectorToList)
     *  - notificare alle actions che i connettori sono cambiati (onChangedConnector) per aggiornare i pallini
    */
    document.addEventListener(
      "connector-deleted", (e: CustomEvent) => {
        this.logger.log("[CDS-CANVAS] connector-deleted:", e);
        const connector = e.detail.connector;
        connector['deleted'] = true;
        this.connectorService.deleteConnectorToList(connector.id);
        this.intentService.onChangedConnector(connector);
      },
      true
    );

    /** connector-selected **
     * scatta quando viene selezionato un connettore:
     * deseleziono action e intent (unselectAction)
    */
    document.addEventListener(
      "connector-selected", (e: CustomEvent) => {
        this.logger.log("[CDS-CANVAS] connector-selected:", e);
        this.intentService.unselectAction();
      },
      true
    );
    
    
    
  
    document.addEventListener(
      "keydown", (e) => {
        // Verifica se è stato premuto Ctrl (Windows) o Command (Mac) e Z contemporaneamente
        console.log('[CDS-CANVAS]  subscriptionUNDO ', e);
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') {
          e.preventDefault(); 
          // Evita il comportamento predefinito, ad esempio la navigazione indietro nella cronologia del browser
          console.log("Hai premuto Ctrl+ALT+Z (o Command+Alt+Z)!");
          this.intentService.restoreLastREDO();
        } else if ((e.ctrlKey || e.metaKey) && e.key === "z") {
          // Impedisci il comportamento predefinito (ad esempio, l'undo in un campo di testo)
          e.preventDefault(); 
          console.log("Hai premuto Ctrl+Z (o Command+Z)!");
          this.intentService.restoreLastUNDO();
        }
      }, false
    );

    

  }
  // ---------------------------------------------------------
  // END listener di eventi Stage e Connectors
  // ---------------------------------------------------------


  // -------------------------------------------------------
  // @ Close WHEN THE STAGE IS CLICKED 
  // - actions context menu' (static & float),
  // - detail action panel, 
  // - button configuration panel
  // - test widget
  // -------------------------------------------------------
  @HostListener('document:click', ['$event'])
  documentClick(event: any): void {
    this.logger.log('[CDS CANVAS] DOCUMENT CLICK event: ', event.target.id);
    if (event.target.id.startsWith("cdk-drop-list-")) {
      this.removeConnectorDraftAndCloseFloatMenu();
      // this.controllerService.closeActionDetailPanel();
      // this.controllerService.closeButtonPanel();
      this.closeAllPanels();
    }
  }

  /** -------------------------------------------------------
   * LISTNER WHEN ARE CLICKED THE KEYBOARD KEYS Backspace, Escape or Canc
   * actions context menu (static & float) 
   * -------------------------------------------------------
  */
  @HostListener('document:keydown', ['$event']) 
  onKeydownHandler(event: KeyboardEvent) {
    this.logger.log('[CDS-CANVAS] MOUSE KEYDOWN CLOSE FLOAT MENU hasClickedAddAction ', this.hasClickedAddAction)
    if (event.key === 'Backspace' || event.key === 'Escape' || event.key === 'Canc' && !this.hasClickedAddAction) {
      if (!this.hasClickedAddAction) {
        // case: FLOAT MENU
        this.removeConnectorDraftAndCloseFloatMenu();
      }else{
        // case: STATIC MENU
        this.IS_OPEN_ADD_ACTIONS_MENU = false;
      } 
    }
  }


  @HostListener('contextmenu', ['$event'])
  onRightClick(event){
  }

  /** -------------------------------------------------------
   * LISTNER OF FLOAT MENU 
   * -------------------------------------------------------
  */
  @HostListener('document:mouseup', ['$event']) 
  onMouseUpHandler(event: KeyboardEvent) {
    this.logger.log('[CDS-CANVAS] MOUSE UP CLOSE FLOAT MENU', this.hasClickedAddAction)
  }


  // ------------------------------------------
  // @ START DRAG DROP FUNCTIONS 
  // ------------------------------------------
  /** openFloatMenuOnConnectorDraftReleased */
  private openFloatMenuOnConnectorDraftReleased(detail){
    this.logger.log("[CDS CANVAS] ho rilasciato in un punto qualsiasi dello stage e quindi apro il float menu", detail);
    this.positionFloatMenu = this.stageService.physicPointCorrector(detail.menuPoint);
    this.positionFloatMenu.x = this.positionFloatMenu.x + 300;
    detail.menuPoint = this.positionFloatMenu;
    this.closeAllPanels();
    this.IS_OPEN_ADD_ACTIONS_MENU = true;
    this.hasClickedAddAction = false;
    // this.IS_OPEN_PANEL_WIDGET = false;
    // this.controllerService.closeActionDetailPanel();
    this.connectorService.createConnectorDraft(detail);
    this.logger.log('[CDS CANVAS] OPEN MENU hasClickedAddAction', this.hasClickedAddAction);
  }

  /** setDragAndListnerEventToElements */
  private setDragAndListnerEventToElements() {
    this.logger.log("[CDS CANVAS] AGGIORNO ELENCO LISTNER");
    this.listOfIntents.forEach(intent => {
      this.intentService.setDragAndListnerEventToElement(intent);
    });
  }

  /** setDragAndListnerEventToElement */
  // private setDragAndListnerEventToElement(intent) {
  //   let intervalId = setInterval(async () => {
  //     const result = checkIFElementExists(intent.intent_id);
  //     if (result === true) {
  //       this.logger.log('[CDS CANVAS] Condition is true ', intent.intent_id);
  //       this.stageService.setDragElement(intent.intent_id);
  //       // this.intentService.setListnerEvent(intent);
  //       clearInterval(intervalId);
  //     }
  //   }, 100); 
  //   // Chiamiamo la funzione ogni 100 millisecondi (0.1 secondo)
  //   // Termina l'intervallo dopo 2 secondi (2000 millisecondi)
  //   setTimeout(() => {
  //     this.logger.log('Timeout: 2 secondo scaduto.');
  //     clearInterval(intervalId);
  //   }, 2000);
  // }
  /** ************************* **/
  /** END DRAG DROP FUNCTIONS 
  /** ************************* **/
 
 
 
  /** removeConnectorDraftAndCloseFloatMenu */
  private removeConnectorDraftAndCloseFloatMenu() {
    this.connectorService.removeConnectorDraft();
    this.IS_OPEN_ADD_ACTIONS_MENU = false;
  }

  /** posCenterIntentSelected */
  private posCenterIntentSelected(intent) {
    var stageElement = document.getElementById(intent.intent_id);
    this.stageService.centerStageOnPosition(stageElement);
  }

  /**  updateIntent 
   * chiamata da cds-panel-action-detail
   * quando modifico un intent da pannello ex: cambio il testo, aggiungo un bottone ecc.
  */
  private async updateIntent(time?) {
    if(!time)time = 0;
    const response = await this.intentService.updateIntent(this.intentSelected, time);
    if (response) {
      this.logger.log('[CDS-CANVAS] OK: intent aggiornato con successo sul server', this.intentSelected);
    } else {
      this.logger.log("[CDS-CANVAS] ERRORE: aggiornamento intent sul server non riuscito", this.intentSelected);
    }
  }

  /** Delete Intent **
   * cancello tutti i connettori dell'intent
   * rimuovo l'intent dallo stage
   * elimino intent da remoto
   */
  private async deleteIntent(intent) {
    console.log('[CDS-CANVAS]  deleteIntent',intent);
    setTimeout(() => {
      this.intentSelected = null;
      this.intentService.deleteIntent(intent);
      this.connectorService.deleteConnectorsOfBlock(intent.intent_id);
      // console.log('[CDS-CANVAS]  copiaArray',copiaArray);
    }, 0);
    
    
    

    // //this.intentService.deleteIntentToListOfIntents(intent.intent_id);
  }



  // --------------------------------------------------------- // 
  // START EVENTS
  // --------------------------------------------------------- // 

  /** onToogleSidebarIntentsList */
  onToogleSidebarIntentsList() {
    this.logger.log('[CDS-CANVAS] onToogleSidebarIntentsList  ')
    this.IS_OPEN_INTENTS_LIST = !this.IS_OPEN_INTENTS_LIST;
    this.logger.log('[CDS-CANVAS] onToogleSidebarIntentsList   this.IS_OPEN_INTENTS_LIST ',  this.IS_OPEN_INTENTS_LIST)
  }

  /** onDroppedElementToStage **
   * chiamata quando aggiungo (droppandola) una action sullo stage da panel element
   * oppure 
   * chiamata quando aggiungo (droppandola) una action sullo stage spostandola da un altro intent  
   * */
  async onDroppedElementToStage(event: CdkDragDrop<string[]>) {
    this.logger.log('[CDS-CANVAS] droppedElementOnStage:: ', event);
    this.closeAllPanels();
    this.removeConnectorDraftAndCloseFloatMenu();

    let pos = this.connectorService.tiledeskConnectors.logicPoint(event.dropPoint);
    pos.x = pos.x - 132;
    let action: any = event.previousContainer.data[event.previousIndex];
    if (action.value && action.value.type) {
      // dragging a new action into the stage
      console.log('[CDS-CANVAS] ho draggato una action da panel element sullo stage');
      const newAction = this.intentService.createNewAction(action.value.type);
      const newIntent = await this.createNewIntentWithAnAction(pos, newAction);
    } else if (action) {
      // dragging an action from another intent, into the stage
      console.log('[CDS-CANVAS] ho draggato una action da un intent sullo stage');
      const resp = this.intentService.deleteActionFromPreviousIntentOnMovedAction(event, action);
      if (resp) {
        const newIntent = await this.createNewIntentWithAnAction(pos, action);
        if (newIntent) {
          this.logger.log('[CDS-CANVAS] cancello i connettori della action draggata');
          this.connectorService.deleteConnectorsFromActionByActionId(action._tdActionId);
          const elementID = this.intentService.previousIntentId;
          this.logger.log("[CDS-CANVAS] aggiorno i connettori dell'intent", elementID);
          this.connectorService.movedConnector(elementID);
        }
      }
    }
  }

  /** createNewIntentWithNewAction
  * chiamata quando trascino un connettore sullo stage e creo un intent al volo 
  * oppure
  * chiamata quando aggiungo (droppandola) una action sullo stage da panel element
  * oppure
  * chiamata quando aggiungo (droppandola) una action sullo stage spostandola da un altro intent
 */
  private async createNewIntentWithAnAction(pos, action) {
    this.logger.log('[CDS-CANVAS] sto per creare un nuovo intent con pos e action ::: ', pos, action);
    this.intentSelected = this.intentService.createNewIntent(this.id_faq_kb, action, pos);
    this.intentSelected.id = NEW_POSITION_ID;
    this.intentService.addNewIntentToListOfIntents(this.intentSelected);

    this.intentService.setDragAndListnerEventToElement(this.intentSelected);
    this.intentService.setIntentSelected(this.intentSelected.intent_id);
    /** chiamata quando trascino un connettore sullo stage e creo un intent al volo  */
    const connectorDraft = this.connectorService.connectorDraft;
    if(connectorDraft){
      const fromId = connectorDraft.fromId;
      const toId = this.intentSelected.intent_id;
      this.logger.log('[CDS-CANVAS] sto per creare il connettore ', connectorDraft, fromId, toId);
      this.connectorService.createConnectorFromId(fromId, toId);
      this.removeConnectorDraftAndCloseFloatMenu();
    }

    const newIntent = await this.intentService.saveNewIntent(this.id_faq_kb, this.intentSelected);
    if (newIntent) {
      this.intentSelected.id = newIntent.id;
      console.log('[CDS-CANVAS] Intent salvato correttamente: ', newIntent, this.listOfIntents);
      this.intentService.replaceNewIntentToListOfIntents(newIntent, NEW_POSITION_ID);
      this.intentService.setDragAndListnerEventToElement(newIntent);
      return newIntent;
    } else {
      return null;
    }
  }
  // --------------------------------------------------------- //
 

  // --------------------------------------------------------- // 
  // START EVENT > PANEL ELEMENTS
  // --------------------------------------------------------- // 
  /** Close WHEN THE ACTION LEFT MENU IS CLICKED **
   * - actions context menu (static & float)
   * - test widget
  */
  onMouseOverActionMenuSx(event: boolean) {
    this.logger.log('[CDS-CANVAS] onMouseOverActionMenuSx ', event)
    // if (event === true) {
    //   this.IS_OPEN_PANEL_WIDGET = false;
    //   // this.isOpenAddActionsMenu = false
    //   // @ Remove connectors of the float context menu
    //   if (!this.hasClickedAddAction) {
    //     this.removeConnectorDraftAndCloseFloatMenu();
    //   }
    // }
  }

  /** onHideActionPlaceholderOfActionPanel */
  onHideActionPlaceholderOfActionPanel(event){
    this.logger.log('[CDS-CANVAS] onHideActionPlaceholderOfActionPanel event : ', event);
    // this.hideActionPlaceholderOfActionPanel = event
  }
  // --------------------------------------------------------- // 



  // --------------------------------------------------------- // 
  // START EVENT > PANEL INTENT LIST
  // --------------------------------------------------------- // 
  /** onSelectIntent */
  onSelectIntent(intent: Intent) {
    // this.logger.log('[CDS-CANVAS] onSelectIntent::: ', intent);
    if (!this.hasClickedAddAction) {
      this.removeConnectorDraftAndCloseFloatMenu();
    }
    this.intentSelected = intent;
    this.intentService.setIntentSelected(intent.intent_id);
    this.posCenterIntentSelected(intent);
    this.closeAllPanels();
  }

  /** onDeleteIntent */
  onDeleteIntent(intent: Intent) {
    this.intentService.setIntentSelected(intent.intent_id);
    if (!this.hasClickedAddAction) {
      this.removeConnectorDraftAndCloseFloatMenu();
    }
    swal({
      title: this.translate.instant('AreYouSure'),
      text: "The block " + intent.intent_display_name + " will be deleted",
      icon: "warning",
      buttons: ["Cancel", "Delete"],
      dangerMode: true,
    }).then((WillDelete) => {
      if (WillDelete) {
        this.closeAllPanels();
        this.deleteIntent(intent);
      }
    })
  }
  // --------------------------------------------------------- //
 

  // --------------------------------------------------------- // 
  // START EVENT > INTENT
  // --------------------------------------------------------- //
  /** onActionSelected  **
   * @ Close WHEN AN ACTION IS SELECTED FROM AN INTENT
   * - actions context menu (static & float)
   * - button configuration panel  
   * - test widget
  */
  onActionSelected(event) {
    this.logger.log('[CDS-CANVAS] onActionSelected from PANEL INTENT - action ', event.action, ' - index ', event.index);
    // CHIUDI TUTTI I PANNELLI APERTI
    if (!this.hasClickedAddAction) {
      this.removeConnectorDraftAndCloseFloatMenu();
    }
    this.intentSelected = this.listOfIntents.find(el => el.intent_id === this.intentService.intentSelected.intent_id);
    this.controllerService.openActionDetailPanel(TYPE_INTENT_ELEMENT.ACTION, event.action);
  }

  /** onQuestionSelected  **
   * @ Close WHEN THE QUESTION DETAIL PANEL IS OPENED
   * - actions context menu (static & float)
   * - button configuration panel 
   * - test widget
  */
  onQuestionSelected(question: string) {
    this.logger.log('[CDS-CANVAS] onQuestionSelected from PANEL INTENT - question ', question);
    // CHIUDI TUTTI I PANNELLI APERTI
    if (!this.hasClickedAddAction) {
      this.removeConnectorDraftAndCloseFloatMenu();
    }
    this.intentSelected = this.listOfIntents.find(el => el.intent_id === this.intentService.intentSelected.intent_id);
    this.controllerService.openActionDetailPanel(TYPE_INTENT_ELEMENT.QUESTION, question);
  }

  /** onIntentFormSelected  **
   * @ Close WHEN THE FORM DETAIL PANEL IS OPENED
   * - actions context menu (static & float)
   * - button configuration panel 
   * - test widget
  */
  onIntentFormSelected(intentform: Form) {
    // CHIUDI TUTTI I PANNELLI APERTI
    if (!this.hasClickedAddAction) {
      this.removeConnectorDraftAndCloseFloatMenu();
    }
    this.intentSelected = this.listOfIntents.find(el => el.intent_id === this.intentService.intentSelected.intent_id);
    this.controllerService.openActionDetailPanel(TYPE_INTENT_ELEMENT.FORM, intentform);
  }

  // -------------------------------------------------------
  // @ Open WHEN THE ADD ACTION BTN IS PRESSED
  // - actions static context menu
  // @ Close
  // - test widget
  // - detail action panel
  // - button configuration panel 
  // -------------------------------------------------------
  onShowPanelActions(event) {
    this.logger.log('[CDS-CANVAS] showPanelActions event:: ', event);
    this.IS_OPEN_ADD_ACTIONS_MENU = true;
    this.closeAllPanels();
    // this.controllerService.closeActionDetailPanel();
    // this.controllerService.closeButtonPanel();
    this.hasClickedAddAction = event.addAction;
    this.logger.log('[CDS-CANVAS] showPanelActions hasClickedAddAction:: ', this.hasClickedAddAction);
    const pos = { 'x': event.x, 'y': event.y }
    this.intentSelected = event.intent;
    this.positionFloatMenu = pos;
    this.logger.log('[CDS-CANVAS] showPanelActions intentSelected ', this.intentSelected);
    this.logger.log('[CDS-CANVAS] showPanelActions positionFloatMenu ', this.positionFloatMenu)
  }

  // -------------------------------------------------------
  // @ Open WHEN THE PLAY BUTTON IS CLICKED
  // - test widget
  // @ Close
  // - detail action panel
  // - actions context menu' (static & float),
  // - button configuration panel  
  // -------------------------------------------------------
  onTestItOut(status) {
    this.logger.log('[CDS-CANVAS] onTestItOut  status ', status);
    this.testItOut.emit(true);
  }

  /** onActionDeleted */
  onActionDeleted(event){
    // onActionDeleted
  }
  // --------------------------------------------------------- //


  // --------------------------------------------------------- // 
  // EVENT > PANEL BUTTON CONFIGURATION 
  // --------------------------------------------------------- //
  /** onSaveButton */
  onSaveButton(button: Button) {
    const arrayId = button.__idConnector.split("/");
    const idConnector = arrayId[0] ? arrayId[0] : null;
    console.log('onSaveButton: ', idConnector, this.listOfIntents);
    if (idConnector) {
      this.intentSelected = this.listOfIntents.find(obj => obj.intent_id === idConnector);
      this.updateIntent(2000);
    }
  }
  // --------------------------------------------------------- //


  // --------------------------------------------------------- // 
  // EVENT > PANEL ACTION DETAIL
  // --------------------------------------------------------- //
  /** onSavePanelIntentDetail */
  onSavePanelIntentDetail(intentSelected: any) {
    console.log('[CDS-CANVAS] onSavePanelIntentDetail intentSelected ', intentSelected)
    if (intentSelected && intentSelected != null) {
      this.intentSelected = intentSelected;
      this.intentService.refreshIntent(this.intentSelected);
      this.updateIntent(2000);
    } else {
      // this.onOpenDialog();
    }
    
  }
  // --------------------------------------------------------- //


  // --------------------------------------------------------- // 
  // EVENT > ADD ACTION MENU
  // --------------------------------------------------------- //
  /** START EVENTS PANEL INTENT */
  /** chiamata quando trascino un connettore sullo stage e creo un intent al volo */
  /** OPPURE */
  /** chiamata quando premo + sull'intent per aggiungere una nuova action */
  async onAddingActionToStage(event) {
    console.log('[CDS-CANVAS] onAddingActionToStage:: ', event);
    this.IS_OPEN_ADD_ACTIONS_MENU = true;
    const connectorDraft = this.connectorService.connectorDraft;
    if (connectorDraft && connectorDraft.toPoint && !this.hasClickedAddAction) {
      console.log('[CDS-CANVAS] trascino connettore sullo stage ', event, connectorDraft.toPoint, this.hasClickedAddAction);
      const toPoint = connectorDraft.toPoint;
      const fromId = connectorDraft.fromId;
      const newAction = this.intentService.createNewAction(event.type);
      const newIntent = await this.createNewIntentWithAnAction(toPoint, newAction);
      if (newIntent) {
        console.log('[CDS-DSHBRD] ho creato un nuovo intent co la action trascinata');
      }
    } else if (this.hasClickedAddAction) {
      console.log("[CDS-CANVAS] ho premuto + quindi creo una nuova action e la aggiungo all'intent", this.intentSelected);
      const newAction = this.intentService.createNewAction(event.type);
      this.intentSelected.actions.push(newAction);
      this.updateIntent(0);
      // this.intentService.refreshIntent(this.intentSelected);
    }
    this.removeConnectorDraftAndCloseFloatMenu();
  }
  // --------------------------------------------------------- //


}
