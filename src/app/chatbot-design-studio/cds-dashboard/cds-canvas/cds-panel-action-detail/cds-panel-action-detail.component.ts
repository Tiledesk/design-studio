import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges, ChangeDetectorRef, TemplateRef, ViewContainerRef, HostListener } from '@angular/core';
import { Subscription } from 'rxjs';
import { ConnectorService } from '../../../services/connector.service';
import { IntentService } from '../../../services/intent.service';
import { TYPE_ACTION, TYPE_INTENT_ELEMENT } from '../../../utils';
import { Intent, Form} from 'src/app/models/intent-model';
import { Action} from 'src/app/models/action-model';
import { DashboardService } from 'src/app/services/dashboard.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Component({
  selector: 'cds-panel-action-detail',
  templateUrl: './cds-panel-action-detail.component.html',
  styleUrls: ['./cds-panel-action-detail.component.scss']
})
export class CdsActionDetailPanelComponent implements OnInit, OnChanges {
  @Input() elementIntentSelected: any;
  @Input() showSpinner: boolean;
  @Output() savePanelIntentDetail = new EventEmitter();
  

  // elementIntentSelected: any;
  project_id: string;
  intentSelected: Intent;

  typeIntentElement = TYPE_INTENT_ELEMENT;
  typeAction = TYPE_ACTION;
  
  elementSelected: any;
  // elementSelectedIndex: number;
  // elementSelectedMaxLength: number[] = [];
  elementIntentSelectedType: string;
  openCardButton = false;
  

   /** panel reply button configuaration */
   private subscriptionIntent: Subscription;

  private logger: LoggerService = LoggerInstance.getInstance()
  
  constructor(
    private intentService: IntentService,
    private connectorService: ConnectorService,
    private dashboardService: DashboardService
  ) { }

  ngOnInit(): void {
    this.project_id = this.dashboardService.projectID;
    //  this.logger.log('[PANEL-INTENT-DETAIL] (ngOnInit) @Input elementIntentSelected ', this.elementIntentSelected, this.intentSelected);
    //   try {
    //     this.elementSelected = JSON.parse(JSON.stringify(this.elementIntentSelected.element));
    //     this.elementIntentSelectedType = this.elementIntentSelected.type;
    //     this.logger.log('[PANEL-INTENT-DETAIL] (OnInit) elementSelected ', this.elementSelected);
    //   } catch (error) {
    //     this.logger.log('[PANEL-INTENT-DETAIL] (OnInit) ERROR', error);
    //   }
    this.initialize();
    this.initSubscriptions();
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('[PANEL-INTENT-DETAIL] (OnChanges)', changes, this.elementIntentSelected);
    //this.initialize();
  }


  ngOnDestroy() {
    if (this.subscriptionIntent) {
      this.subscriptionIntent.unsubscribe();
    }
  }
  

  initialize(){
    this.intentSelected = this.intentService.intentSelected;
    console.log('[PANEL-INTENT-DETAIL] (initialize)', this.elementIntentSelected);
    try{
      this.elementIntentSelectedType = this.elementIntentSelected.type;
      this.elementSelected = this.elementIntentSelected.element; // this.intentService.selectedAction; // !!!!! aggiunta da dario per bindare la action !!!
      // this.elementSelected = JSON.parse(JSON.stringify(this.elementIntentSelected.element));
      // this.elementSelectedIndex = this.elementIntentSelected.index
      // this.elementSelectedMaxLength = [...Array(this.elementIntentSelected.maxLength).keys()]
      console.log('[PANEL-INTENT-DETAIL] (OnChanges) elementIntentSelectedType ', this.elementIntentSelectedType);
      console.log('[PANEL-INTENT-DETAIL] (OnChanges) elementSelected ', this.elementSelected);
      // console.log('[PANEL-INTENT-DETAIL] (OnChanges) intentSelected ', this.intentSelected);
    }catch(error){
      this.logger.log('[CDS-PANEL-INTENT-DETAIL] (ngOnChanges) ERROR', error);
    }
  }


  initSubscriptions() {
    /** SUBSCRIBE TO THE INTENT SELECTED */
    this.subscriptionIntent = this.intentService.behaviorIntent.subscribe((intent: Intent) => {
      this.logger.log('[PANEL-INTENT-DETAIL] --- initSubscriptions AGGIORNATO INTENT ',intent.intent_id, this.elementSelected);
      //recupero id dalla action e verifico se ho modificato l'intent della action aperta
      // se si aggiorno la action
      if (intent && intent.intent_id === this.intentSelected.intent_id) {
          // this.idSelectedIntent = intent.intent_id;
          let newAction = intent.actions.find((obj) => obj._tdActionId === this.elementSelected._tdActionId);
          this.elementSelected = newAction;
          this.logger.log('[PANEL-INTENT-DETAIL] --- AGGIORNO ACTION', intent, this.elementSelected._tdActionId);
      }
    });
  }

  // private setDragConfig(){
  //   // drag study
  //   let el = document.getElementById("content-panel");
  //   console.log('getElementById:: el', el);
  //   let drawer = document.getElementById("box-right");
  //   console.log('getElementById:: drawer', drawer);
  //   setDrawer(el, drawer);
  // }

  // EVENT FUNCTIONS //

  onUpdateFormIntentSelected($event){
    this.elementSelected = $event;
    this.onSaveIntent()
    // console.log("onUpdateFormIntentSelected:::: ", $event);
  }

  onUpdateAnswerIntentSelected($event){
    this.elementSelected = $event;
    // console.log("updateAnswerIntentSelected:::: ", $event);
  }

  onUpdateQuestionsIntentSelected($event){
    this.elementSelected = $event;
    this.onSaveIntent()
    // console.log("onUpdateQuestionsIntentSelected:::: ", $event);
  }

  onSaveIntent(event?){
    if(this.elementIntentSelectedType === this.typeIntentElement.ACTION){
      //this.intentSelected.actions[this.elementSelectedIndex] = this.elementSelected;
      const index = this.intentSelected.actions.findIndex(el => el._tdActionId === this.elementSelected._tdActionId);
      this.intentSelected.actions[index] = this.elementSelected;
    } else if(this.elementIntentSelectedType === this.typeIntentElement.ANSWER){
      this.intentSelected.answer = this.elementSelected;
    } else if(this.elementIntentSelectedType === this.typeIntentElement.QUESTION){
      this.intentSelected.question = this.elementSelected;
    } else if(this.elementIntentSelectedType === this.typeIntentElement.FORM){
      this.intentSelected.form = this.elementSelected;
    }
    console.log('----> onSaveIntent:: ', event, this.elementIntentSelectedType, this.intentSelected);
    // elimino connettori della action e poi li ricreo
    this.savePanelIntentDetail.emit(this.intentSelected);
  }

  onCloseIntent(){
    console.log('----> onCloseIntent:: ', this.elementIntentSelectedType, this.intentSelected);
    // this.closeAndSavePanelIntentDetail.emit();
  }

 /**
   * onConnectorChange
   * @param type 
   * @param idConnector 
   * @param toIntentId 
   * 
   * IMPORTANTE: questa funzione deve SOLO aggiornare i connettori e NON deve salvare e NON deve aggiungere UNDO.
   */
  onConnectorChange(type: 'create' | 'delete', idConnector: string, toIntentId: string){
    const fromId = idConnector;
    this.logger.log('onConnectorChange: ');
    let toId = '';
    this.connectorService.updateConnectorAttributes(idConnector, null);
    switch(type){
      case 'create':
        const posId = toIntentId.indexOf("#");
        if (posId !== -1) {
          toId = toIntentId.slice(posId+1);
        }
        this.connectorService.deleteConnectorWithIDStartingWith(fromId, false, true);
        this.connectorService.createNewConnector(fromId, toId);
        break;
      case 'delete':
        this.connectorService.deleteConnectorWithIDStartingWith(fromId, false, true);
        break;
    }
  }

}
