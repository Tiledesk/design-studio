import { Component, OnInit, ViewChild, ElementRef, HostListener, Output, EventEmitter, Input, ChangeDetectorRef, AfterViewInit} from '@angular/core';
import { BehaviorSubject, Observable, Subscription, skip, timeout } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { TranslateService } from '@ngx-translate/core';

// SERVICES //
import { IntentService } from '../../services/intent.service';
import { StageService } from '../../services/stage.service';
import { ConnectorService } from '../../services/connector.service';
import { ControllerService } from '../../services/controller.service';
import { DashboardService } from 'src/app/services/dashboard.service';

// MODEL //
import { Intent, Form } from 'src/app/models/intent-model';
import { Button, Action} from 'src/app/models/action-model';

// UTILS //
import { INTENT_COLORS, RESERVED_INTENT_NAMES, TYPE_INTENT_ELEMENT, TYPE_OF_MENU, INTENT_TEMP_ID, OPTIONS, STAGE_SETTINGS, TYPE_INTENT_NAME } from '../../utils';
import { LOGOS_ITEMS } from './../../utils-resources';


import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';

import { TYPE_ACTION, TYPE_CHATBOT } from 'src/app/chatbot-design-studio/utils-actions';
import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';
import { storage } from 'firebase';
import { LogService } from 'src/app/services/log.service';
import { WebhookService } from '../../services/webhook-service.service';
import { Chatbot } from 'src/app/models/faq_kb-model';
import { v4 as uuidv4 } from 'uuid';

// const swal = require('sweetalert');

// Interface per le note
export interface Note {
  note_id: string;
  x: number;
  y: number;
  text?: string;
  createdAt: Date;
}

@Component({
  selector: 'cds-canvas',
  templateUrl: './cds-canvas.component.html',
  styleUrls: ['./cds-canvas.component.scss']
})
export class CdsCanvasComponent implements OnInit, AfterViewInit{

  @ViewChild('receiver_elements_dropped_on_stage', { static: false }) receiverElementsDroppedOnStage: ElementRef;
  @ViewChild('drawer_of_items_to_zoom_and_drag', { static: false }) drawerOfItemsToZoomAndDrag: ElementRef;
  @ViewChild('cdsOptions') cdsOptions: any;

  // @Output() testItOut = new EventEmitter();
  @Input() onHeaderTestItOut: Observable<Intent>

  /** listners */
  listnerConnectorDrawn: (e: CustomEvent) => void;
  listnerMovedAndScaled: (e: CustomEvent) => void;
  listnerKeydown: (e: any) => void;
  listnerConnectorSelected: (e: CustomEvent) => void;
  listnerConnectorDeselected: (e: CustomEvent) => void;
  listnerConnectorUpdated: (e: CustomEvent) => void;
  listnerConnectorDeleted: (e: CustomEvent) => void;
  listnerConnectorCreated: (e: CustomEvent) => void;
  listnerConnectorDraftReleased: (e: CustomEvent) => void;
  listnerEndDragging: (e: CustomEvent) => void;
  listnerDragged: (e: CustomEvent) => void;
  listnerStartDragging: (e: CustomEvent) => void;

  blockId: string | null = null;
  blockName: string | null = null;

  id_faq_kb: string;
  TYPE_OF_MENU = TYPE_OF_MENU;
  TYPE_INTENT_NAME = TYPE_INTENT_NAME;

  private subscriptionListOfIntents: Subscription;
  listOfIntents: Array<Intent> = [];
  listOfEvents: Array<Intent> = [];
  listOfNotes: Array<Note> = [];
  // intentSelected: Intent;
  intent_id: string;
  hasClickedAddAction: boolean = false;
  hideActionPlaceholderOfActionPanel: boolean;

  /**  preload */
  totElementsOnTheStage: number = 0;
  countRenderedElements = 0;
  renderedAllIntents = false;
  renderedAllElements = false;
  LOGOS_ITEMS = LOGOS_ITEMS;
  loadingProgress = 0;
  mapOfConnectors = [];
  mapOfIntents = [];
  labelInfoLoading:string = 'Loading';
  
  /** panel list of intent */ 
  IS_OPEN_INTENTS_LIST: boolean = true;

  /** */
  private subscriptionChangedConnectorAttributes: Subscription;

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
  private subscriptionOpenWidgetPanel: Subscription;
  testitOutFirstClick: boolean = false;
  IS_OPEN_PANEL_WIDGET: boolean = false;
  // Variabile osservabile
  // private _isOpenPanelWidget = new BehaviorSubject<boolean>(false);
  // public isOpenPanelWidget$ = this._isOpenPanelWidget.asObservable();
       

  /** panel widget loaded */
  private subscriptionWidgetLoaded: Subscription;


  /** panel options */
  private subscriptionUndoRedo: Subscription;
  stateUndoRedo: any = {undo:false, redo: false};

  /** panel connector */
  IS_OPEN_PANEL_CONNECTOR_MENU: boolean = false;
  mousePosition: any;
  connectorSelected: any;

  /** panel context menu */
  IS_OPEN_CONTEXT_MENU: boolean = false;
  positionContextMenu: any = { 'x': 0, 'y': 0 };

  /** panel color menu */
  IS_OPEN_COLOR_MENU: boolean = false;
  positionColortMenu: any = { 'x': 0, 'y': 0 };

  /** panel widget readonly readonly log */
  IS_OPEN_WIDGET_LOG: boolean = false;
  
  /** note mode */
  isNoteModeActive: boolean = false;
  
  IS_OPEN_PANEL_INTENT_DETAIL: boolean = false;
  startDraggingPosition: any = null;
  mesage_request_id: string;

  // ---------------------------------------------------
  // @ Toggle Publish Panel 
  // ---------------------------------------------------
  private subscriptionTogglePublishPanelState: Subscription;
  IS_OPEN_PUBLISH_PANEL: boolean = false;


  chatbotSubtype: string;
  selectedChatbot: Chatbot;
  projectID: string;


  private readonly logger: LoggerService = LoggerInstance.getInstance();


  constructor(
    private readonly intentService: IntentService,
    private readonly stageService: StageService,
    private readonly connectorService: ConnectorService,
    private readonly controllerService: ControllerService,
    private readonly translate: TranslateService,
    public dashboardService: DashboardService,
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly route: ActivatedRoute, 
    public appStorageService: AppStorageService,
    public logService: LogService,
    public webhookService: WebhookService,
    
  ) {
    this.setSubscriptions();
    this.setListnerEvents();
  }

  ngOnInit(): void {
    this.logger.log("[CDS-CANVAS]  •••• ngOnInit ••••");
    this.getParamsFromURL();
    this.initialize();
  }


  /** */
  ngOnDestroy() {
    // Pulisci la coda di retry dei connettori
    this.connectorService.clearRetryQueue();

    if (this.subscriptionChangedConnectorAttributes) {
      this.subscriptionChangedConnectorAttributes.unsubscribe();
    }
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
    if (this.subscriptionOpenWidgetPanel) {
      this.subscriptionOpenWidgetPanel.unsubscribe();
    }
    if (this.subscriptionWidgetLoaded) {
      this.subscriptionWidgetLoaded.unsubscribe();
    }
    if (this.subscriptionUndoRedo) {
      this.subscriptionUndoRedo.unsubscribe();
    }
    if (this.subscriptionUndoRedo) {
      this.subscriptionUndoRedo.unsubscribe();
    }

    if (this.subscriptionTogglePublishPanelState) {
      this.subscriptionTogglePublishPanelState.unsubscribe();
    }


    
    document.removeEventListener("connector-drawn", this.listnerConnectorDrawn, false);
    document.removeEventListener("moved-and-scaled", this.listnerMovedAndScaled, false);
    document.removeEventListener("start-dragging", this.listnerStartDragging, false);
    document.removeEventListener("keydown", this.listnerKeydown, false);
    document.removeEventListener("connector-selected", this.listnerConnectorSelected, false);
    document.removeEventListener("connector-deselected", this.listnerConnectorDeselected, false);
    document.removeEventListener("connector-updated", this.listnerConnectorUpdated, false);
    document.removeEventListener("connector-deleted", this.listnerConnectorDeleted, false);
    document.removeEventListener("connector-created", this.listnerConnectorCreated, false);
    document.removeEventListener("connector-draft-released", this.listnerConnectorDraftReleased, false);
    document.removeEventListener("end-dragging", this.listnerEndDragging, false);
    document.removeEventListener("dragged", this.listnerDragged, false);
  }

  /** */
  ngAfterViewInit() {
    this.logger.log("[CDS-CANVAS]  •••• ngAfterViewInit ••••");
    this.stageService.initializeStage(this.id_faq_kb);
    if(this.stageService.settings?.open_intent_list_state != null){
      this.IS_OPEN_INTENTS_LIST = this.stageService.settings.open_intent_list_state;
    }
    
    
    // this.stageService.initStageSettings(this.id_faq_kb);
    this.stageService.setDrawer();
    this.connectorService.initializeConnectors();
    this.changeDetectorRef.detectChanges();
    
    setTimeout(() => {
      this.showStageForLimitTime();
    }, 20000);
  }

  /**
   * getParamsFromURL
   */
  private getParamsFromURL(){
    this.route.queryParams.subscribe(params => {
      this.blockId = params['blockid'];
      if (this.blockId) { /* empty */ }
      this.blockName = params['blockname'];
      if (this.blockName) { /* empty */ }
    });
  }

  /** 
   * initLoadingStage
  */
  initLoadingStage(){
    this.stageService.loaded = false;
    this.totElementsOnTheStage = 0;
    this.countRenderedElements = 0;
    this.renderedAllIntents = false;
    this.renderedAllElements = false;
    this.loadingProgress = 0;
    this.mapOfConnectors = [];
    this.mapOfIntents = [];
    this.labelInfoLoading = 'Loading';
    this.logger.log("[CDS-CANVAS]  initLoadingStage ••••",  this.stageService.loaded);
  }


  /**
   * 
   * @param intentID 
   */
  onIntentRendered(intentID) {
    if(this.stageService.loaded === false && this.renderedAllElements === false){
      this.labelInfoLoading = 'CDSCanvas.intentsProgress';
      if(this.mapOfIntents[intentID]) { //&& this.mapOfIntents[intentID].shown === false
        this.mapOfIntents[intentID].shown = 'true';
        this.countRenderedElements++;
        this.loadingProgress += (this.countRenderedElements/this.totElementsOnTheStage)*100;
      }
      this.logger.log("[CDS-CANVAS3] •••• onIntentRendered •••• ", intentID, this.countRenderedElements);
      const allShownTrue = Object.values(this.mapOfIntents).every(intent => intent.shown === 'true');
      if(allShownTrue){ 
        this.onAllIntentsRendered();
      }
    }
  }

  async onAllIntentsRendered() {
    this.labelInfoLoading = 'CDSCanvas.intentsComplete';
    this.logger.log("[CDS-CANVAS]  •••• Tutti i cds-intent sono stati renderizzati ••••", this.countRenderedElements);
    
    // Aspetta che Angular completi il rendering delle actions e dei loro connettori
    // Usa sia setTimeout che requestAnimationFrame per essere sicuri che il DOM sia pronto
    setTimeout(() => {
      requestAnimationFrame(() => {
        this.logger.log("[CDS-CANVAS]  •••• Inizio disegno connettori dopo rendering completo ••••");
        this.connectorService.createConnectors(this.listOfIntents);
        this.renderedAllIntents = true;
      });
    }, 100);
  }

  checkAllConnectors(connector){
    this.logger.log("[CDS-CANVAS]  •••• checkAllConnectors ••••", connector, this.mapOfConnectors);
    if(this.stageService.loaded === false && this.renderedAllElements === false){
      this.labelInfoLoading = 'CDSCanvas.connectorsProgress';
      if(this.mapOfConnectors[connector.id] && this.mapOfConnectors[connector.id].shown !== 'true') {
        this.mapOfConnectors[connector.id].shown = 'true';
        this.countRenderedElements++;
        this.loadingProgress += (this.countRenderedElements/this.totElementsOnTheStage)*100;
        this.logger.log("[CDS-CANVAS]  •••• E' stato creato un nuovo connettore verifico ••••", this.mapOfConnectors[connector.id], connector.id, this.countRenderedElements);
      }
    }
    this.checkAndShowStage();
  }

  private checkAndShowStage(){
    if(this.stageService.loaded === false){
      const allShownTrue = Object.values(this.mapOfConnectors).every(connector => connector.shown !== 'false');
      this.logger.log("[CDS-CANVAS]  •••• checkAndshowStage", this.mapOfConnectors, allShownTrue);
      if(allShownTrue){ 
        this.stageService.loaded = true;
        this.loadingProgress = 100;
        this.renderedAllElements = true;
        this.labelInfoLoading = 'CDSCanvas.connectorsComplete';
        this.logger.log("[CDS-CANVAS]  •••• Tutti i connettori sono stati renderizzati ••••", this.countRenderedElements, this.renderedAllElements);
        setTimeout(() => {
          this.settingStage();
        }, 100);
      }  
    }
  }

  private settingStage(){
    // //aggiorno il valore di scale nel connectorService solo dopo che tutti i connettori sono stati creati
    if(this.stageService.settings?.zoom){
      this.connectorService.setScale(this.stageService.settings?.zoom);
      this.logger.log("[CDS-CANVAS]  •••• imposto scala dei connettori ••••",this.stageService.settings?.zoom);
    }

    this.stageService.setAlphaConnectorsByLocalStorage();
    this.logger.log("[CDS-CANVAS]  •••• imposto alpha ••••: ");

    if(this.stageService.settings?.position){
      this.logger.log("[CDS-CANVAS]  •••• imposto position ••••: ", this.stageService);
      this.stageService.setPositionByLocalStorage();
    } else {
      this.logger.log("[CDS-CANVAS]  •••• se è la prima volta che carico il bot quindi this.stageService.settings.position non esiste ••••:: ", this.blockId, this.blockName);
      this.intentService.setStartIntent();
    }
  }


  private showStageForLimitTime(){
    //if (this.stageService.loaded == false) {
      this.labelInfoLoading = 'CDSCanvas.loadingCompleteWithErrors';
      this.stageService.loaded = true;
      this.loadingProgress = 100;
      this.renderedAllElements = true;
    //}
  }



  // private async setStartIntent(){
 
  //   this.intentSelected = this.listOfIntents.find((intent) => intent.intent_display_name === 'start');
  //   this.logger.log('[CDS-CANVAS]  intentSelected: ', this.intentSelected);
  //   if(this.intentSelected){
  //     // this.setIntentSelected();
  //     // if (this.intent.actions && this.intent.actions.length === 1 && this.intent.actions[0]._tdActionType === TYPE_ACTION.INTENT && this.intent.intent_display_name === 'start') {
  //     //** set 'start' intent as default selected one */
  //     this.intentService.setDefaultIntentSelected();
  //     //** center stage on 'start' intent */
  //     let startElement = await isElementOnTheStage(this.intentSelected.intent_id); // sync
  //     if(startElement){
  //       this.stageService.centerStageOnHorizontalPosition(startElement);
  //     }
  //   }
  // }

  
  /** ************************* **/
  /** START CUSTOM FUNCTIONS 
  /** ************************* **/

  // --------------------------------------------------------- //
  /** SUBSCRIBE TO THE INTENT LIST */
  // --------------------------------------------------------- //
  
  private setSubscriptions(){

    this.subscriptionChangedConnectorAttributes = this.connectorService.observableChangedConnectorAttributes.subscribe((connector: any) => {
      this.logger.log('[CDS-CANVAS] --- AGGIORNATO connettore ', connector);
      // if (connector) {
      //   this.intentService.updateIntentAttributeConnectors(connector);
      // }
    });


    this.subscriptionUndoRedo = this.intentService.behaviorUndoRedo.subscribe((undoRedo: any) => {
      this.logger.log('[cds-panel-intent-list] --- AGGIORNATO undoRedo ',undoRedo);
      if (undoRedo) {
        this.stateUndoRedo = undoRedo;
      }
    });

    // /** SUBSCRIBE TO THE LIST OF INTENTS **
    //  * Creo una sottoscrizione all'array di INTENT per averlo sempre aggiornato
    //  * ad ogni modifica (aggiunta eliminazione di un intent)
    // */
    // this.subscriptionListOfIntents = this.intentService.getIntents().subscribe(intents => {
    //   this.logger.log("[CDS-CANVAS] --- AGGIORNATO ELENCO INTENTS", intents);
    //   this.listOfIntents = intents;
    //   // if(intents.length > 0 || (intents.length == 0 && this.listOfIntents.length>0)){
    //   //   this.listOfIntents = this.intentService.hiddenEmptyIntents(intents);
    //   // }
    // });


    /** SUBSCRIBE TO THE LIST OF INTENTS **
     * Creo una sottoscrizione all'array di INTENT per averlo sempre aggiornato
     * ad ogni modifica (aggiunta eliminazione di un intent)
    */
    this.subscriptionListOfIntents = this.intentService.getIntents().subscribe(intents => {
      this.logger.log("[CDS-CANVAS] --- AGGIORNATO ELENCO INTENTS", intents);
      if(intents.length>0){
        this.listOfIntents = intents;
        // const chatbot_id = this.dashboardService.id_faq_kb;
        // const thereIsWebResponse = this.webhookService.checkIfThereIsWebResponse();
        // const updateWebhookObs = this.webhookService.updateWebhook(chatbot_id, thereIsWebResponse);
        // if (updateWebhookObs) {
        //   updateWebhookObs.subscribe({
        //     next: (resp: any) => {
        //       this.logger.log("[cds-action-webhook] updateWebhook : ", resp);
        //     },
        //     error: (error) => {
        //       this.logger.error("[cds-action-webhook] error updateWebhook: ", error);
        //     },
        //     complete: () => {
        //       this.logger.log("[cds-action-webhook] updateWebhook completed.");
        //     }
        //   });
        // } else {
        //   this.logger.log("[cds-action-webhook] Nessun update webhook necessario (condizione non soddisfatta).");
        // }
      }
    })

    /** SUBSCRIBE TO THE STATE INTENT DETAIL PANEL */
    // this.subscriptionOpenDetailPanel = this.controllerService.isOpenIntentDetailPanel$.subscribe((element: Intent) => {
    //   if (element) {
    //     this.closeAllPanels();
    //     this.IS_OPEN_PANEL_ACTION_DETAIL = true;
    //     this.removeConnectorDraftAndCloseFloatMenu();
    //   } else {
    //     this.IS_OPEN_PANEL_ACTION_DETAIL = false;
    //   }
    //   this.logger.log('[CDS-CANVAS]  isOpenActionDetailPanel ', element, this.IS_OPEN_PANEL_ACTION_DETAIL);
    // });

    /** SUBSCRIBE TO THE STATE ACTION DETAIL PANEL */
    this.subscriptionOpenDetailPanel = this.controllerService.isOpenActionDetailPanel$.subscribe((element: { type: TYPE_INTENT_ELEMENT, element: Action | string | Form }) => {
      this.elementIntentSelected = element;
      if (element.type) {
        this.closeAllPanels();
        this.IS_OPEN_PANEL_ACTION_DETAIL = true;
        this.intentService.inactiveIntent();
        this.removeConnectorDraftAndCloseFloatMenu();
        // setTimeout(() => {
        //   this.IS_OPEN_PANEL_ACTION_DETAIL = true;
        // }, 0);
      } else {
        this.IS_OPEN_PANEL_ACTION_DETAIL = false;
      }
      this.logger.log('[CDS-CANVAS]  isOpenActionDetailPanel ', element, this.IS_OPEN_PANEL_ACTION_DETAIL);
    });

    /** SUBSCRIBE TO THE STATE ACTION REPLY BUTTON PANEL */
    this.subscriptionOpenButtonPanel = this.controllerService.isOpenButtonPanel$.subscribe((button: Button) => {
      this.buttonSelected = button;
      this.logger.log('[CDS-CANVAS]  isOpenButtonPanel ', button);

      if (button) {
        this.closeAllPanels();
        this.closeActionDetailPanel();
        // this.IS_OPEN_PANEL_WIDGET = false;
        this.removeConnectorDraftAndCloseFloatMenu();
        setTimeout(() => {
          this.IS_OPEN_PANEL_BUTTON_CONFIG = true;
        }, 0);
      } else {
        this.IS_OPEN_PANEL_BUTTON_CONFIG = false;
      }
    });

    /** SUBSCRIBE TO THE STATE ACTION DETAIL PANEL */
    this.subscriptionOpenAddActionMenu = this.controllerService.isOpenAddActionMenu$.subscribe((menu: any) => {
      if (menu) {
        this.closeAllPanels();
        this.closeActionDetailPanel()
      } else {
        this.IS_OPEN_ADD_ACTIONS_MENU = false;
      }
    });    
  

    this.subscriptionOpenWidgetPanel = this.intentService.BSTestItOut.pipe(skip(1)).subscribe((intent) => {
      this.logger.log("[CDS-CANVAS] ******* BSTestItOut ", intent);
      if(intent){
        this.onTestItOut(intent);
        this.IS_OPEN_WIDGET_LOG = true;
      } else {
        //this.controllerService.onStopTestItOut();
        this.logger.log('[CDS-CANVAS] CLOSE TEST IT OUT');
        this.IS_OPEN_PANEL_WIDGET = false;
        //this.IS_OPEN_WIDGET_LOG = false;
      }
    });    

    this.subscriptionTogglePublishPanelState = this.controllerService.isOpenPublishPanel$.subscribe((event: any) => {
      this.logger.log("[CDS-CANVAS] has opened Publish panel ", event);
      // this.IS_OPEN_PUBLISH_PANEL = event
      this.logger.log("[CDS-CANVAS] has opened Publish IS_OPEN_PUBLISH_PANEL ", this.IS_OPEN_PUBLISH_PANEL);
      // isOpenButtonPanel
      // if (event) {
      //   this.closeAllPanels();
      //   this.closeActionDetailPanel()
      // } else {
      //   this.IS_OPEN_ADD_ACTIONS_MENU = false;
      // }

      if (event) {
        this.closeAllPanels();
        this.closeActionDetailPanel();
        // this.IS_OPEN_PANEL_WIDGET = false;
        this.removeConnectorDraftAndCloseFloatMenu();
        setTimeout(() => {
          this.IS_OPEN_PUBLISH_PANEL = true;
        }, 0);
      } else {
        this.IS_OPEN_PUBLISH_PANEL = false;
      }
    });    
  }

   /** initialize */
   private async initialize(){
    this.selectedChatbot = this.dashboardService.selectedChatbot;
    this.projectID = this.dashboardService.projectID;
    // console.log('[CDS-CANVAS] selectedChatbot ::', this.selectedChatbot);
    // console.log('[CDS-CANVAS] projectID ::', this.projectID);
    this.id_faq_kb = this.dashboardService.id_faq_kb;
    this.listOfIntents = [];
    
    // Pulisci la coda di retry dei connettori prima di inizializzare un nuovo bot
    this.connectorService.clearRetryQueue();
    
    let getAllIntents = await this.intentService.getAllIntents(this.id_faq_kb);
    if (getAllIntents) {
      this.listOfIntents = this.intentService.listOfIntents;
      // // this.initListOfIntents();
      this.refreshIntents();
      this.initLoadingStage();
      // // this.intentService.setStartIntent();
      this.mapOfIntents = await this.intentService.setMapOfIntents();
      this.mapOfConnectors = await this.connectorService.setMapOfConnectors(this.listOfIntents);
      const numIntents = Object.values(this.mapOfIntents).length;
      const numConnectors = Object.values(this.mapOfConnectors).length;
      this.totElementsOnTheStage = numIntents+numConnectors;
      this.logger.log('[CDS-CANVAS] totElementsOnTheStage ::', this.stageService.loaded, numIntents, numConnectors);
      // scaleAndcenterStageOnCenterPosition(this.listOfIntents)
    }
    // ---------------------------------------
    // load localstorage
    // ---------------------------------------
    let copyPasteTEMP = JSON.parse(localStorage.getItem('copied_items'));
    this.logger.log('[CDS-CANVAS]  copyPasteTEMP', copyPasteTEMP);
    if(copyPasteTEMP){
      this.intentService.arrayCOPYPAST = copyPasteTEMP['copy'];
    }

    // ---------------------------------------
    // set subtype chatbot
    // ---------------------------------------
    this.chatbotSubtype = this.dashboardService.selectedChatbot.subtype?this.dashboardService.selectedChatbot.subtype:TYPE_CHATBOT.CHATBOT;
  }


  /** closeAllPanels */
  private closeAllPanels(){
    if(this.IS_OPEN_PANEL_WIDGET){
      this.closePanelWidget();
    }
    // this._isOpenPanelWidget.next(false);
    this.IS_OPEN_PANEL_ACTION_DETAIL = false;
    this.IS_OPEN_PANEL_INTENT_DETAIL = false;
    this.IS_OPEN_PANEL_BUTTON_CONFIG = false;
    this.IS_OPEN_PANEL_CONNECTOR_MENU = false;
    this.IS_OPEN_CONTEXT_MENU = false;
    this.IS_OPEN_COLOR_MENU = false;
    this.IS_OPEN_PANEL_WIDGET = false;
    this.IS_OPEN_PUBLISH_PANEL = false;
    // // this.intentService.inactiveIntent();
  }

  closePanelWidget(){
    this.IS_OPEN_PANEL_WIDGET = false;
  }

  onClosePanelLog(){
    this.IS_OPEN_WIDGET_LOG = false;
  }

  private closeExtraPanels(){
    this.IS_OPEN_COLOR_MENU = false;
  }

  private closeActionDetailPanel(){
    this.IS_OPEN_PANEL_ACTION_DETAIL = false;
  }

  /** getIntentPosition: call from html */
  getIntentPosition(intentId: string) {
    return this.intentService.getIntentPosition(intentId);
  }

  /** SET DRAG STAGE AND CREATE CONNECTORS *
  * set drag and listner on intents, 
  * create connectors
  */
  private refreshIntents() {
      this.setDragAndListnerEventToElements();
      if(this.renderedAllIntents === true){
        this.connectorService.createConnectors(this.listOfIntents);
      }
  }

  // ---------------------------------------------------------
  // START Stage and Connectors event listeners
  // ---------------------------------------------------------

  setConnectorColor(connector: any){
    const idIntentFrom = connector.id.split('/')[0];
    const intent = this.intentService.getIntentFromId(idIntentFrom);
    const color = intent?.attributes?.color ?? INTENT_COLORS.COLOR1;
    const opacity = this.stageService.getAlpha()/100;
    //this.logger.log('[CDS-CANVAS] setConnectorColor ', connector, opacity);
    this.connectorService.setConnectorColor(intent.intent_id, color, opacity);
  }

  setListnerEvents(){
    /** LISTENER OF TILEDESK STAGE */
    /** triggers when a connector is drawn on the stage  */
    this.listnerConnectorDrawn = (e: CustomEvent) => {
      const connector = e.detail.connector;
      this.setConnectorColor(connector);
      this.checkAllConnectors(connector);
    };
    document.addEventListener("connector-drawn", this.listnerConnectorDrawn, false);
    

    

    /** moved-and-scaled ** 
    * fires when I move the stage (move or scale it):
    * - set the scale
    * - close
    * - delete the drawn connector and close the float menu if it is open
    */
    let debounceTimeout: any;
    this.listnerMovedAndScaled = (e: CustomEvent) => {
      const el = e.detail;
      this.connectorService.tiledeskConnectors.scale = e.detail.scale;
      this.removeConnectorDraftAndCloseFloatMenu();
  
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => {
        this.logger.log('[CDS-CANVAS] moved-and-scaled ', el);
        const pos = {
          x: el.x,
          y: el.y
        }
        this.stageService.savePositionByPos(this.id_faq_kb, pos);
      }, 100);

    };
    document.addEventListener("moved-and-scaled", this.listnerMovedAndScaled, false);

    /** start-dragging */
    this.listnerStartDragging = (e: CustomEvent) => {
      const el = e.detail.element;
      this.logger.log('[CDS-CANVAS] start-dragging ', el);
      this.removeConnectorDraftAndCloseFloatMenu();
      this.intentService.setIntentSelectedById(el.id);
      this.startDraggingPosition = { x: el.offsetLeft, y: el.offsetTop };
      el.style.zIndex = 2;
    };
    document.addEventListener("start-dragging", this.listnerStartDragging, false);

    /** dragged **
    * the event fires when I move an intent on the stage:
    * move the connectors attached to the intent
    * remove any dotted connectors and close the float menu if it is open
    * update the position of the selected intent
    */
    this.listnerDragged = (e: CustomEvent) => {
      const el = e.detail.element;
      const x = e.detail.x;
      const y = e.detail.y;
      this.connectorService.moved(el, x, y);
      this.intentService.setIntentSelectedPosition(el.offsetLeft, el.offsetTop);
    };
    document.addEventListener("dragged", this.listnerDragged, false);

    /** end-dragging */
    this.listnerEndDragging = (e: CustomEvent) => {
      const el = e.detail.element;
      this.logger.log('[CDS-CANVAS] end-dragging ', el);
      // // el.style.zIndex = 1;
      this.logger.log('[CDS-CANVAS] end-dragging ', this.intentService.intentSelected.attributes.position);
      this.logger.log('[CDS-CANVAS] end-dragging ', this.startDraggingPosition);
      // Verifica se la posizione è cambiata (drag effettivo)
      const pos = this.intentService.intentSelected.attributes.position;
      const dragged = !this.startDraggingPosition ||
        (pos && (pos.x !== this.startDraggingPosition.x || pos.y !== this.startDraggingPosition.y));
      this.closeAllPanels();
      this.intentService.updateIntentSelected();
      if (!dragged) {
        this.openWebhookIntentPanel(this.intentService.intentSelected);
      }
    };
    document.addEventListener("end-dragging", this.listnerEndDragging, false);

    /** connector-draft-released ** 
    * it only fires when a connector is NOT created, that is when I drop the dotted connector in a point that is not "connectable"
    * if I drop it on the stage and 'e.detail' is complete with the start and end position of the connector I can open the float menu
    * otherwise
    * I remove the dotted connector
    */
    this.listnerConnectorDraftReleased = (e: CustomEvent) => {
      this.logger.log("[CDS-CANVAS] connector-draft-released :: ", e.detail);
      if(!e?.detail) return;
      let detail = e.detail;
      const arrayOfClass = detail.target.classList.value.split(' ');
      if (detail.target && arrayOfClass.includes("receiver-elements-dropped-on-stage") && detail.toPoint && detail.menuPoint) {
        this.logger.log("[CDS-CANVAS] ho rilasciato il connettore tratteggiato nello stage (nell'elemento con classe 'receiver_elements_dropped_on_stage') e quindi apro il float menu");
        const intentId = e.detail.fromId.split('/')[0];
        const intent = this.intentService.getIntentFromId(intentId);
        if(intent.attributes?.color){
          detail.color = intent.attributes.color;
        } else {
          detail.color = INTENT_COLORS.COLOR1;
        }
        this.openFloatMenuOnConnectorDraftReleased(detail);
      } else {
        this.logger.log("[CDS-CANVAS] ho rilasciato in un punto qualsiasi del DS ma non sullo stage quindi non devo aprire il menu", detail);
        this.removeConnectorDraftAndCloseFloatMenu();
      }
    };
    document.addEventListener("connector-draft-released", this.listnerConnectorDraftReleased, false);

    /** connector-created **
    * fires when a connector is created:
    * add the connector to the connector list (addConnectorToList)
    * notify actions that connectors have changed (onChangedConnector) to update the dots
    */
    this.listnerConnectorCreated = (e: CustomEvent) => {
      this.logger.log("[CDS-CANVAS] connector-created:", e);
      const connector = e.detail.connector;
      connector['created'] = true;
      delete connector['deleted'];
      this.connectorService.addConnectorToList(connector);
      this.intentService.onChangedConnector(connector);

      // this.logger.log('[CDS-CANVAS] --- AGGIORNATO connettore ', connector);
      // if (connector) {
      //   this.intentService.updateIntentAttributeConnectors(connector);
      // }

    };
    document.addEventListener("connector-created", this.listnerConnectorCreated, false);

    /** connector-deleted **
    * fires when a connector is deleted:
    * delete the connector from the connector list (deleteConnectorToList)
    * notify actions that connectors have changed (onChangedConnector) to update the dots
    */
    this.listnerConnectorDeleted = (e: CustomEvent) => {
      this.logger.log("[CDS-CANVAS] connector-deleted:", e);
      const connector = e.detail.connector;
      connector['deleted'] = true;
      delete connector['created'];
      // const intentId = this.connectorSelected.id.split('/')[0];
      // let intent = this.intentService.getIntentFromId(intentId);
      // if(intent.attributes && intent.attributes.connectors && intent.attributes.connectors[this.connectorSelected.id]){
      //   delete intent.attributes.connectors[this.connectorSelected.id];
      // }
      // this.connectorService.updateConnectorAttributes(this.connectorSelected.id, event);
      this.connectorService.deleteConnectorToList(connector.id);
      this.intentService.onChangedConnector(connector);
      this.IS_OPEN_PANEL_CONNECTOR_MENU = false;
    };
    document.addEventListener("connector-deleted", this.listnerConnectorDeleted, false);

    /** connector-updated **
    * fires when a connector is updated:
    */   
    this.listnerConnectorUpdated = (e: CustomEvent) => {
      this.logger.log("[CDS-CANVAS] connector-updated:", e);
      const connector = e.detail.connector;
      // if(connector.notify)
      connector['updated'] = true;
      this.intentService.onChangedConnector(connector);
    };
    document.addEventListener("connector-updated", this.listnerConnectorUpdated, false);


    /** connector-selected **
    * fires when a connector is selected:
    * unselect action and intent (unselectAction)
    */  
    this.listnerConnectorSelected = (e: CustomEvent) => {
      this.closeAllPanels();
      this.closeActionDetailPanel();
      this.setConnectorSelected(e.detail.connector.id);
      this.IS_OPEN_PANEL_CONNECTOR_MENU = true;
      this.mousePosition = e.detail.mouse_pos;
      this.mousePosition.x -= -10;
      this.mousePosition.y -= 25;
      this.intentService.unselectAction();
    };
    document.addEventListener("connector-selected", this.listnerConnectorSelected, false);


    this.listnerConnectorDeselected = (e: CustomEvent) => {
      //this.IS_OPEN_PANEL_CONNECTOR_MENU = false;
    }
    document.addEventListener('connector-deselected',  this.listnerConnectorDeselected, false);

    /**  keydown 
    * check if Ctrl (Windows) or Command (Mac) and Z were pressed at the same time
    */
    this.listnerKeydown = (e) => {
      this.logger.log('[CDS-CANVAS]  keydown ', e);
      var focusedElement = document.activeElement;
      if (focusedElement.tagName === 'TEXTAREA' || focusedElement.tagName === 'INPUT') {
        return;
      }
      // Prevent undo/redo if a detail panel is open (to allow native undo/redo in panel inputs)
      if (this.IS_OPEN_PANEL_ACTION_DETAIL || this.IS_OPEN_PANEL_INTENT_DETAIL) {
        this.logger.log('[CDS-CANVAS] Panel is open - skipping canvas undo/redo');
        return;
      }


      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault(); 
        // Evita il comportamento predefinito, ad esempio la navigazione indietro nella cronologia del browser
        this.logger.log("Hai premuto Ctrl+ALT+Z (o Command+Alt+Z)!");
        this.intentService.restoreLastREDO();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        // Impedisci il comportamento predefinito (ad esempio, l'undo in un campo di testo)
        e.preventDefault(); 
        this.logger.log("Hai premuto Ctrl+Z (o Command+Z)!");
        this.intentService.restoreLastUNDO();
      }
    };
    document.addEventListener("keydown", this.listnerKeydown, false);
  }

  // ---------------------------------------------------------
  // END Stage and Connectors event listeners
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
    this.logger.log('[CDS CANVAS] DOCUMENT CLICK event: ', event.target, event);
    if (event.target.id.startsWith("cdk-drop-list-") && !event.target.className.includes('button-replies')) {
      this.removeConnectorDraftAndCloseFloatMenu();
      this.controllerService.stopTestItOut();
      this.closeAllPanels();
      this.closeActionDetailPanel();
    }
  }

  /** -------------------------------------------------------
   * LISTNER WHEN ARE CLICKED THE KEYBOARD KEYS Backspace, Escape or Canc
   * actions context menu (static & float) 
   * -------------------------------------------------------
  */
  @HostListener('document:keydown', ['$event']) 
  onKeydownHandler(event: KeyboardEvent) {
    // event.key === 'Backspace' ||
    if (event.key === 'Escape' || event.key === 'Canc' && !this.hasClickedAddAction) {
      if (!this.hasClickedAddAction) {
        // case: FLOAT MENU
        this.removeConnectorDraftAndCloseFloatMenu();
      }
      else{
        // case: STATIC MENU
        this.IS_OPEN_ADD_ACTIONS_MENU = false;
      } 
    }
  }

  @HostListener('wheel', ['$event'])
  onMouseWheel(event: WheelEvent) {
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
    // this.logger.log('[CDS-CANVAS] MOUSE UP CLOSE FLOAT MENU', this.hasClickedAddAction);
  }


  // ------------------------------------------
  // @ START DRAG DROP FUNCTIONS 
  // ------------------------------------------
  /** openFloatMenuOnConnectorDraftReleased */
  private openFloatMenuOnConnectorDraftReleased(detail){
    this.logger.log("[CDS CANVAS] ho rilasciato in un punto qualsiasi dello stage e quindi apro il float menu", detail);
    this.positionFloatMenu = this.stageService.setPositionActionsMenu(detail.menuPoint);
    detail.menuPoint = this.positionFloatMenu;
    this.closeAllPanels();
    this.closeActionDetailPanel();
    this.IS_OPEN_ADD_ACTIONS_MENU = true;
    this.hasClickedAddAction = false;
    // //this.IS_OPEN_PANEL_WIDGET = false;
    // //this.controllerService.closeActionDetailPanel();
    this.connectorService.createConnectorDraft(detail);
    this.logger.log('[CDS CANVAS] OPEN MENU hasClickedAddAction', this.hasClickedAddAction);
  }



  /** setDragAndListnerEventToElements */
  private setDragAndListnerEventToElements() {
    this.logger.log("[CDS CANVAS] AGGIORNO ELENCO LISTNER");
    this.listOfIntents.forEach(intent => {
      this.intentService.setDragAndListnerEventToElement(intent.intent_id);
    });
  }

  /** setDragAndListnerEventToElement */
  // private setDragAndListnerEventToElement(intent.intent_id) {
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
    this.IS_OPEN_CONTEXT_MENU = false;
    this.IS_OPEN_COLOR_MENU = false;
  }

  /** posCenterIntentSelected */
  private posCenterIntentSelected(intent) {
    if(intent?.intent_id){
      let stageElement = document.getElementById(intent.intent_id);
      let id_faq_kb = this.dashboardService.id_faq_kb;
      this.logger.log('[CDS-CANVAS] posCenterIntentSelected: ', stageElement);
      this.stageService.centerStageOnElement(id_faq_kb, stageElement);
    }
  }

  /**  updateIntent 
   * chiamata da cds-panel-action-detail e da cds-panel-button-configuration
   * quando modifico un intent da pannello ex: cambio il testo, aggiungo un bottone ecc.
  */
  // private async updateIntent(intent, time=0, undo=false) {
  //   this.logger.log('[CDS-CANVAS] updateIntent: ');
  //   // this.connectorService.updateConnector(intent.intent_id);
  //   const response = await this.intentService.onUpdateIntentWithTimeout(intent, time, undo);
  //   if (response) {
  //     this.logger.log('[CDS-CANVAS] OK: intent aggiornato con successo sul server', this.intentSelected);
  //   } else {
  //     this.logger.log("[CDS-CANVAS] ERRORE: aggiornamento intent sul server non riuscito", this.intentSelected);
  //   }
  // }

  /** Delete Intent **
   * deleteIntentToListOfIntents: per cancellare l'intent dalla lista degli intents (listOfIntents), quindi in automatico per rimuovere l'intent dallo stage
   * refreshIntents: fa scattare l'evento e aggiorna l'elenco degli intents (listOfIntents) in tutti i componenti sottoscritti, come cds-panel-intent-list 
   * deleteIntent: chiamo il servizio per eliminare l'intent da remoto (il servizio è asincrono e non restituisce nulla, quindi ingnoro l'esito)
   * in deleteIntent: aggiungo l'azione ad UNDO/REDO
   * deleteConnectorsOfBlock: elimino i connettori in Ingresso verso intent eliminato e in Uscita dallo stesso, e salvo in automatico gli intent modificati (quelli ai quali ho eliminato il connettore in uscita)
   * 
   * ATTENZIONE: è necessario mantenere l'ordine per permettere ad UNDO/REDO di salvare in maniera corretta
   * 
   */
  private async deleteIntent(intent) {
    this.logger.log('[CDS-CANVAS]  deleteIntent', intent);
    // this.intentSelected = null;
    this.intentService.setIntentSelectedById();
    this.intentService.deleteIntentNew(intent);
    // return
    // this.intentService.deleteIntentToListOfIntents(intent.intent_id);
    // this.intentService.refreshIntents();
    
    // IMPORTANTE operazione SUCCESSIVA! al delete cancello tutti i connettori IN e OUT dell'intent eliminato e salvo la modifica
    // this.connectorService.deleteConnectorsOfBlock(intent.intent_id, true, false); 
  }



  // --------------------------------------------------------- // 
  // START EVENTS
  // --------------------------------------------------------- // 

  /** onToogleSidebarIntentsList */
  onToogleSidebarIntentsList() {
    this.logger.log('[CDS-CANVAS] onToogleSidebarIntentsList  ')
    this.IS_OPEN_INTENTS_LIST = !this.IS_OPEN_INTENTS_LIST;
    this.removeConnectorDraftAndCloseFloatMenu();
    this.stageService.saveSettings(this.id_faq_kb, STAGE_SETTINGS.openIntentListState, this.IS_OPEN_INTENTS_LIST);
    this.logger.log('[CDS-CANVAS] onToogleSidebarIntentsList   this.IS_OPEN_INTENTS_LIST ',  this.IS_OPEN_INTENTS_LIST)
  }

  /** onDroppedElementToStage **
   * chiamata quando aggiungo (droppandola) una action sullo stage da panel element
   * oppure 
   * chiamata quando aggiungo (droppandola) una action sullo stage spostandola da un altro intent  
   * */
  async onDroppedElementToStage(event: CdkDragDrop<string[]>) {
    this.logger.log('[CDS-CANVAS] droppedElementOnStage:: ', event);
    let pos = this.connectorService.tiledeskConnectors.logicPoint(event.dropPoint);
    pos.x = pos.x - 132;
    let action: any = event.previousContainer.data[event.previousIndex];
    if (action.value && action.value.type) {
      this.logger.log('[CDS-CANVAS] ho draggato una action da panel element sullo stage');
      this.closeAllPanels();
      this.closeActionDetailPanel();
      // this.removeConnectorDraftAndCloseFloatMenu();  
      this.createNewIntentFromPanelElement(pos, action.value.type);
    } else if (action) {
      this.logger.log('[CDS-CANVAS] ho draggato una action da un intent sullo stage');
      let prevIntentOfaction = this.listOfIntents.find((intent) => intent.actions.some((act) => act._tdActionId === action._tdActionId));
      prevIntentOfaction.actions = prevIntentOfaction.actions.filter((act) => act._tdActionId !== action._tdActionId);
      this.connectorService.deleteConnectorsFromActionByActionId(action._tdActionId);
      this.connectorService.updateConnector(prevIntentOfaction.intent_id);
      this.intentService.refreshIntent(prevIntentOfaction);
      this.listOfIntents = this.listOfIntents.map(obj => obj.intent_id === prevIntentOfaction.intent_id ? prevIntentOfaction : obj);
      this.createNewIntentDraggingActionFromAnotherIntent(pos, action);
      // this.intentService.refreshIntents();
      // // this.updateIntent(intentPrevious, 0, false);
    }
  }

  /**
   * createNewIntentFromConnectorDraft
   * @param typeAction 
   * @param connectorDraft 
   * chiamata quando trascino un connettore sullo stage e creo un intent al volo  
   * createNewAction: creo una action a partire dal tipo di action selezionata
   * createNewIntent: creo un intent dalla action creata in precedenza
   * addNewIntentToListOfIntents: aggiungo il nuovo intent alla lista degli intent 
   * removeConnectorDraftAndCloseFloatMenu: rimuovo il connettore tratteggiato dallo stage e chiudo il menu
   * createConnectorFromId: crea il nuovo connettore passando fromId e toId
   * attendi che il connettore sia creato e quindi procedi al salvataggio, calcolando l'intent nello stato precedente e quello nello stato attuale
   * settingAndSaveNewIntent: chiamo la funzione per salvare in maniera asincrona l'intent creato
   * aggiorno la stato dell'intent di partenza
   * 
   */
  async createNewIntentFromConnectorDraft(typeAction, connectorDraft){
    const toPoint = connectorDraft.toPoint;
    const newAction = this.intentService.createNewAction(typeAction);
    let intent = this.intentService.createNewIntent(this.id_faq_kb, newAction, toPoint, connectorDraft.color);
    this.logger.log('[CDS-CANVAS] ho creato intent: ', intent);
    this.intentService.addNewIntentToListOfIntents(intent);
    this.removeConnectorDraftAndCloseFloatMenu();
    const fromId = connectorDraft.fromId;
    const toId = intent.intent_id;
    this.logger.log('[CDS-CANVAS] sto per creare il connettore ', connectorDraft, fromId, toId);
    const resp = await this.connectorService.createConnectorFromId(fromId, toId, true, null); //Sync
    if(resp){
      // aggiorno action di partenza 
      let splitFromId = fromId.split('/');
      let intent_id = splitFromId[0];
      let prevIntent = this.intentService.prevListOfIntent.find((obj) => obj.intent_id === intent_id);
      let nowIntent = this.listOfIntents.find((obj) => obj.intent_id === prevIntent.intent_id);
      let pos = this.listOfIntents.length-1;
      this.logger.log('[CDS-CANVAS] sto per chiamare settingAndSaveNewIntent ', prevIntent, nowIntent);
      this.settingAndSaveNewIntent(pos, intent, nowIntent, prevIntent);
      // //this.logger.log("[CDS-CANVAS] sto per aggiornare l'intent ", nowIntent);
      // //this.updateIntent(nowIntent, 0, false);
    }
  }



  /**
   * createNewIntentFromPanelElement
   * @param pos 
   * @param typeAction 
   * chiamata quando trascino un'azione sullo stage dal menu  
   * createNewAction: creo una action a partire dal tipo di action selezionata
   * createNewIntent: creo un intent dalla action creata in precedenza
   * addNewIntentToListOfIntents: aggiungo il nuovo intent alla lista degli intent
   * settingAndSaveNewIntent: chiamo la funzione per salvare in maniera asincrona l'intent creato
   */
  async createNewIntentFromPanelElement(pos, typeAction){
    const newAction = this.intentService.createNewAction(typeAction);
    let intent = this.intentService.createNewIntent(this.id_faq_kb, newAction, pos);
    this.intentService.addNewIntentToListOfIntents(intent);
    const newIntent = await this.settingAndSaveNewIntent(pos, intent, null, null);
  }



  /**
   * createNewIntentDraggingActionFromAnotherIntent
   * @param pos 
   * @param action 
   */
  async createNewIntentDraggingActionFromAnotherIntent(pos, action){
    // let nowIntent = this.listOfIntents.find((intent) => intent.actions.some((act) => act._tdActionId === action._tdActionId));
    let prevIntent = this.intentService.prevListOfIntent.find((intent) => intent.actions.some((act) => act._tdActionId === action._tdActionId));
    let nowIntent = this.listOfIntents.find((obj) => obj.intent_id === prevIntent.intent_id);
    // let nowIntent = this.listOfIntents.find((intent) => intent.actions.some((act) => act._tdActionId === action._tdActionId));
    this.logger.log('[CDS-CANVAS] createNewIntentDraggingActionFromAnotherIntent: ', prevIntent, nowIntent, this.listOfIntents);
    let intent = this.intentService.createNewIntent(this.id_faq_kb, action, pos);
    this.intentService.addNewIntentToListOfIntents(intent);
    const newIntent = await this.settingAndSaveNewIntent(pos, intent, nowIntent, prevIntent);
    // if (newIntent) {
    //   // this.logger.log('[CDS-CANVAS] cancello i connettori della action draggata');
    //   // this.connectorService.deleteConnectorsFromActionByActionId(action._tdActionId);
    //   // const elementID = this.intentService.previousIntentId;
    //   // this.logger.log("[CDS-CANVAS] aggiorno i connettori dell'intent", elementID);
    //   // this.connectorService.updateConnector(elementID);
    // }
  }





  /** createNewIntentWithNewAction
  * chiamata quando trascino un connettore sullo stage e creo un intent al volo 
  * oppure
  * chiamata quando aggiungo (droppandola) una action sullo stage da panel element
  * oppure
  * chiamata quando aggiungo (droppandola) una action sullo stage spostandola da un altro intent
 */
  private async settingAndSaveNewIntent(pos, intent, nowIntent, prevIntent) {
    this.logger.log('[CDS-CANVAS] sto per configurare il nuovo intent creato con pos e action ::: ', pos, intent, nowIntent, prevIntent);
    intent.id = INTENT_TEMP_ID;
    this.intentService.setDragAndListnerEventToElement(intent.intent_id);
    this.intentService.setIntentSelected(intent.intent_id);
    this.closeExtraPanels();
    // this.intentSelected = intent;
    const savedIntent = await this.intentService.saveNewIntent(intent, nowIntent, prevIntent);
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
    this.logger.log('[CDS-CANVAS] onSelectIntent::: ', intent);
    if (!this.hasClickedAddAction) {
      this.removeConnectorDraftAndCloseFloatMenu();
    }
    this.intentService.setIntentSelected(intent.intent_id);
    this.posCenterIntentSelected(intent);
    this.closeAllPanels();
    this.closeActionDetailPanel();
  }

  /** onDeleteIntent */
  onDeleteIntent(intent: Intent) {
    // this.intentService.setIntentSelected(intent.intent_id);
    if (!this.hasClickedAddAction) {
      this.removeConnectorDraftAndCloseFloatMenu();
    }
    this.closeAllPanels();
    this.closeActionDetailPanel();
    this.deleteIntent(intent);
    // swal({
    //   title: this.translate.instant('AreYouSure'),
    //   text: "The block " + intent.intent_display_name + " will be deleted",
    //   icon: "warning",
    //   buttons: ["Cancel", "Delete"],
    //   dangerMode: true,
    // }).then((WillDelete) => {
    //   if (WillDelete) {
    //     this.closeAllPanels();
    //     this.deleteIntent(intent);
    //   }
    // })
  }

  
    /** onColorIntent */
    onChangeColorIntent(intent: Intent) {
      this.logger.log('[CDS-CANVAS] onColorIntent: ', intent.intent_id);
      this.closeAllPanels();
      const element = document.getElementById(intent.intent_id);
      if (element) {
        const rect = element.getBoundingClientRect();
        const topRightX = rect.left;
        const topRightY = rect.top;
        this.logger.log('[CDS-CANVAS] `Coordinate angolo in alto a destra: X=${topRightX}, Y=${topRightY}`');
        this.positionColortMenu.x = topRightX;
        this.positionColortMenu.y = topRightY;
        this.IS_OPEN_COLOR_MENU = true;
      } else {
        console.error(`Elemento con ID '${intent.intent_id}' non trovato.`);
      }
    }

  /** onOpenIntent */
  onOpenIntent(intent: Intent){
    this.logger.log('[CDS-CANVAS] onOpenIntent: ', intent.intent_id);
    this.onIntentSelected(intent);
  }
  // --------------------------------------------------------- //
 

  // --------------------------------------------------------- // 
  // START EVENT > INTENT
  // --------------------------------------------------------- //



  onIntentSelected(intent){
    /// if (intent.intent_display_name === RESERVED_INTENT_NAMES.START || intent.intent_display_name === RESERVED_INTENT_NAMES.DEFAULT_FALLBACK) {
    //    return;
    // }  
    this.logger.log('[CDS-CANVAS] onIntentSelected ', intent.intent_id);
    this.closeAllPanels();
    this.removeConnectorDraftAndCloseFloatMenu();
    this.intentService.setIntentSelectedById(intent.intent_id);
    this.closeActionDetailPanel();
    setTimeout(() => {
      this.elementIntentSelected = intent;
      if(this.elementIntentSelected){
        // empty
      }
      this.IS_OPEN_PANEL_INTENT_DETAIL = true;
    }, 0);
  }

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
    // this.intentService.setIntentSelectedById(intent_id);
    // this.intentSelected = this.listOfIntents.find(el => el.intent_id === this.intentService.intentSelected.intent_id);
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
    // this.intentService.setIntentSelectedById(intent_id);
    // this.intentSelected = this.listOfIntents.find(el => el.intent_id === this.intentService.intentSelected.intent_id);
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
    // this.intentService.setIntentSelectedById(intent_id);
    // this.intentSelected = this.listOfIntents.find(el => el.intent_id === this.intentService.intentSelected.intent_id);
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
    this.closeAllPanels();
    this.closeActionDetailPanel();
    // /this.controllerService.closeActionDetailPanel();
    // /this.controllerService.closeButtonPanel();
    this.hasClickedAddAction = event.addAction;
    this.logger.log('[CDS-CANVAS] showPanelActions hasClickedAddAction:: ', this.hasClickedAddAction);
    const pos = { 'x': event.x, 'y': event.y }
    // /this.intentSelected = event.intent;
    this.intentService.setIntentSelectedById(event.intent.intent_id);
    this.positionFloatMenu = pos;
    this.logger.log('[CDS-CANVAS] showPanelActions positionFloatMenu ', this.positionFloatMenu);
    this.IS_OPEN_ADD_ACTIONS_MENU = true;
    this.intentService.inactiveIntent();
  }

  // -------------------------------------------------------
  // @ Open WHEN THE PLAY BUTTON IS CLICKED
  // - test widget
  // @ Close
  // - detail action panel
  // - actions context menu' (static & float),
  // - button configuration panel  
  // -------------------------------------------------------
  onTestItOut(intent: Intent) {
    if(intent){
      this.closeAllPanels();
      this.testitOutFirstClick = true;
      this.intentService.startTestWithIntent(intent);
      this.controllerService.closeActionDetailPanel();
      this.controllerService.closeButtonPanel();
      // // this.intentService.setLiveActiveIntent(null);
      this.controllerService.closeAddActionMenu();
      this.connectorService.removeConnectorDraft();
      // // this.intentSelected = intent;
      this.intentService.setIntentSelectedById(intent.intent_id);
      this.intentService.setIntentSelected(intent.intent_id);
      this.closeExtraPanels();
      this.logger.log('[CDS-CANVAS] onTestItOut intent ', intent);
    }
    const subtype = this.dashboardService.selectedChatbot.subtype;
    if(subtype !== TYPE_CHATBOT.WEBHOOK && subtype != TYPE_CHATBOT.COPILOT){
      setTimeout(() => {
        this.controllerService.playTestItOut();
        this.IS_OPEN_PANEL_WIDGET = true;
      }, 100);
    }
  }

  /** onActionDeleted */
  onActionDeleted(event){
    // onActionDeleted
  }
  // --------------------------------------------------------- //


   // --------------------------------------------------------- // 
  // EVENT > PANEL OPTIONS 
  // --------------------------------------------------------- //
  async onOptionClicked(resp){
    // //let id_faq_kb = this.dashboardService.id_faq_kb;
    this.closeExtraPanels();
    let option = resp.option;
    let alpha = resp.alpha;
    switch(option){
      case OPTIONS.ZOOM_IN: {
        await this.stageService.changeScale(this.id_faq_kb, 'in');
        break;
      }
      case OPTIONS.ZOOM_OUT: {
        await this.stageService.changeScale(this.id_faq_kb, 'out');
        break;
      }
      case OPTIONS.CENTER: {
        await this.stageService.scaleAndCenter(this.id_faq_kb, this.listOfIntents);
        break;
      }
      case OPTIONS.UNDO: {
        this.intentService.restoreLastUNDO();
        break;
      }
      case OPTIONS.REDO: {
        this.intentService.restoreLastREDO();
        break;
      }
      case OPTIONS.ALPHA: {
        this.logger.log("[CDS-CANVAS] alphaConnectors: ", alpha);
        this.stageService.setAlphaConnectors(this.id_faq_kb, alpha);
        break;
      }
      case OPTIONS.NOTE: {
        this.isNoteModeActive = resp.isActive !== undefined ? resp.isActive : !this.isNoteModeActive;
        this.logger.log("[CDS-CANVAS] note mode active: ", this.isNoteModeActive);
        break;
      }
    }
  }

  /**
   * Gestisce il click sullo stage quando la modalità note è attiva
   */
  onStageClick(event: MouseEvent): void {
    if (this.isNoteModeActive) {
      // Verifichiamo che il click non provenga dal pulsante note o da altri elementi che non devono essere intercettati
      const target = event.target as HTMLElement;
      if (target.closest('#cds-options-panel')) {
        // Non intercettare i click sul pannello delle opzioni
        return;
      }
      
      // Preveniamo la propagazione per evitare che il click venga gestito da altri handler
      event.stopPropagation();
      event.preventDefault();
      
      // Calcoliamo le coordinate relative al container dello stage
      const stageContainer = event.currentTarget as HTMLElement;
      const rect = stageContainer.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      // Creiamo una nuova nota
      const newNote: Note = {
        note_id: uuidv4(),
        x: x,
        y: y,
        text: '',
        createdAt: new Date()
      };
      
      // Aggiungiamo la nota all'array
      this.listOfNotes.push(newNote);
      
      this.logger.log("[CDS-CANVAS] Note created at position:", { x, y }, "Total notes:", this.listOfNotes.length);
      
      // Disattiviamo la modalità note
      this.deactivateNoteMode();
    }
  }

  /**
   * Disattiva la modalità note e ripristina lo stato del pulsante
   */
  private deactivateNoteMode(): void {
    this.isNoteModeActive = false;
    
    // Ripristiniamo lo stato del pulsante nel componente cds-options
    if (this.cdsOptions) {
      this.cdsOptions.isNoteModeActive = false;
    }
    
    this.logger.log("[CDS-CANVAS] note mode deactivated");
  } 


  // --------------------------------------------------------- // 
  // EVENT > PANEL BUTTON CONFIGURATION 
  // --------------------------------------------------------- //
  /** onSaveButton */
  onSaveButton(button: Button) {
    this.logger.log('onSaveButton: ', this.intentService.intentSelected);
    // this.intentService.onUpdateIntentFromActionPanel(this.intentService.intentSelected);
    this.intentService.updateIntent(this.intentService.intentSelected);

    // const arrayId = button.__idConnector.split("/");
    // const intentIdIntentToUpdate = arrayId[0] ? arrayId[0] : null;
    // this.logger.log('onSaveButton: ', button, intentIdIntentToUpdate, this.listOfIntents, this.intentService.intentSelected);
    // if (intentIdIntentToUpdate) {
    //   this.intentSelected = this.listOfIntents.find(obj => obj.intent_id === intentIdIntentToUpdate);
    //   // forse conviene fare come in onSavePanelIntentDetail passando intent aggiornato (con action corretta)!!!!
    //   // this.intentService.onUpdateIntentWithTimeout(this.intentSelected, 0, true);
    //   this.intentService.onUpdateIntentFromActionPanel(this.intentService.intentSelected);
    // }
  }
  // --------------------------------------------------------- //


  // --------------------------------------------------------- // 
  // EVENT > PANEL ACTION DETAIL
  // --------------------------------------------------------- //
  /** onSavePanelIntentDetail */
  onSavePanelIntentDetail(intentSelected: any) {
    this.logger.log('[CDS-CANVAS] onSavePanelIntentDetail intentSelected ', intentSelected)
    if (intentSelected && intentSelected != null) {
      // // this.intentService.setIntentSelectedByIntent(intentSelected);
      // // this.intentSelected = intentSelected;
      // // this.intentService.onUpdateIntentFromActionPanel(intentSelected);
      this.intentService.updateIntent(intentSelected);
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
  
  async onAddActionFromActionMenu(event) {
    this.logger.log('[CDS-CANVAS] onAddActionFromActionMenu:: ', event);
    this.IS_OPEN_ADD_ACTIONS_MENU = true;
    const connectorDraft = this.connectorService.connectorDraft;

    if (connectorDraft?.toPoint && !this.hasClickedAddAction) {
      this.logger.log("[CDS-CANVAS] ho trascinato il connettore e sto per creare un intent", connectorDraft);
      this.createNewIntentFromConnectorDraft(event.type, connectorDraft);
      // // this.removeConnectorDraftAndCloseFloatMenu();
    } 
    else if (this.hasClickedAddAction) {
      this.logger.log("[CDS-CANVAS] ho premuto + quindi creo una nuova action e la aggiungo all'intent");
      const newAction = this.intentService.createNewAction(event.type);
      // // this.intentSelected.actions.push(newAction);
      this.intentService.addActionToIntentSelected(newAction);
      // // this.intentService.updateIntentSelected();
      // // this.updateIntent(this.intentSelected, 0, true);
      this.controllerService.closeAddActionMenu();
    }
    
  }
  // --------------------------------------------------------- //


  /**
   * setConnectorSelected
   * @param idConnector 
   */
  setConnectorSelected(idConnection){
    const idConnector = idConnection.substring(0, idConnection.lastIndexOf('/'));
    this.connectorSelected = {};
    const intentId = idConnector.split('/')[0];
    let intent = this.intentService.getIntentFromId(intentId);
    if(intent.attributes?.connectors){
      if(intent.attributes.connectors[idConnector]){
        this.connectorSelected = intent.attributes.connectors[idConnector];
      }
    }
    this.connectorSelected.id = idConnection;
    this.logger.log("[CDS-CANVAS] setConnectorSelected: ", this.connectorSelected, idConnector);
  }


  /**
   * onAddActionFromConnectorMenu
   * @param event 
   */
  async onAddActionFromConnectorMenu(event) {
    let intent: Intent;
    this.logger.log('[CDS-CANVAS] onAddActionFromConnectorMenu:: ', event, this.connectorSelected);
    
    if(this.connectorSelected?.id){
      const intentId = this.connectorSelected.id.split('/')[0];
      intent = this.intentService.getIntentFromId(intentId);
      if(intent && !intent.attributes?.connectors){
        intent.attributes['connectors'] = {};
      } 

      this.logger.log('[CDS-CANVAS] onAddActionFromConnectorMenu intent:: ', intent);

      if(event.type === "show-hide" && event.connector){
        this.logger.log('[CDS-CANVAS] show-hide:: ', event.connector);
        this.connectorService.hideDefaultConnector(event.connector.id);
        this.connectorService.showContractConnector(event.connector.id);
        this.intentService.updateIntentAttributeConnectors( event.connector);
        this.IS_OPEN_PANEL_CONNECTOR_MENU = false;
      }
      if(event.type === "delete"){
        this.logger.log('[CDS-CANVAS] delete connector:: ', intentId, intent);
        this.connectorService.deleteConnector(intent, event.connector.id, true, true);
        // // this.intentService.updateIntent(intent);
        this.IS_OPEN_PANEL_CONNECTOR_MENU = false;
      }
      if(event.type === "line-text"){
        this.logger.log('[CDS-CANVAS] line-text:: ', event.connector);
        this.connectorService.updateConnectorLabel(this.connectorSelected.id, event.connector.label);
        this.intentService.updateIntentAttributeConnectors(event.connector);
        this.IS_OPEN_PANEL_CONNECTOR_MENU = false;
      }
    }
    
  }
  // --------------------------------------------------------- //


  openWebhookIntentPanel(intent: Intent){
    const webhookIntent = intent.intent_display_name === TYPE_INTENT_NAME.WEBHOOK ? true:false;
    if(webhookIntent){
      this.onOpenIntent(intent);
    }
  }

  public onShowContextMenu(event: MouseEvent): void {
    event.preventDefault();
    this.logger.log('[CDS-CANVAS] onShowContextMenu:: ', event);
    const targetElement = event.target as HTMLElement;
    const customAttributeValue = targetElement.getAttribute('custom-attribute');
    if(customAttributeValue === 'tds_container'){
      this.positionContextMenu.x = event.clientX;
      this.positionContextMenu.y = event.offsetY;
      this.IS_OPEN_CONTEXT_MENU = true;
    }
  }

  public onHideContextMenu(){
    this.IS_OPEN_CONTEXT_MENU = false;
  }


  public onNewConversation(request_id){
    this.logger.log('[CDS-CANVAS] onNewConversation:: ',this.elementIntentSelected, this.logService.request_id, request_id);
    if(this.logService.request_id !== request_id){
      // const support_group_id = message.recipient?message.recipient:null;
      // const projectId = message.attributes?.projectId?message.attributes?.projectId:null;
      // this.logger.log('[CDS-PANEL-WIDGET] initLogService  ', support_group_id, projectId);
      this.logService.initialize(request_id); 
      this.IS_OPEN_WIDGET_LOG = true;
      this.mesage_request_id = request_id;
    } 
    
  }



}
