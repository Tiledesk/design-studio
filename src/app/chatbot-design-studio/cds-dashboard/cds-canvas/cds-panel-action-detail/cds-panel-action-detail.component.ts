import { Component, OnInit, Input, Output, EventEmitter, OnChanges, ChangeDetectorRef, TemplateRef, ViewContainerRef, HostListener } from '@angular/core';
import { ConnectorService } from 'app/chatbot-design-studio/services/connector.service';
import { IntentService } from 'app/chatbot-design-studio/services/intent.service';
import { TYPE_ACTION, TYPE_INTENT_ELEMENT } from 'app/chatbot-design-studio/utils';
import { Action, Form, Intent } from 'app/models/intent-model';
import { LoggerService } from 'app/services/logger/logger.service';
import { DashboardService } from 'app/chatbot-design-studio/services/dashboard.service';

@Component({
  selector: 'cds-panel-action-detail',
  templateUrl: './cds-panel-action-detail.component.html',
  styleUrls: ['./cds-panel-action-detail.component.scss']
})
export class CdsActionDetailPanelComponent implements OnInit, OnChanges {
  @Input() elementIntentSelected: any;
  @Input() showSpinner: boolean;
  @Output() onUpdateIntent = new EventEmitter();
  
  project_id: string;
  intentSelected: Intent;

  typeIntentElement = TYPE_INTENT_ELEMENT;
  typeAction = TYPE_ACTION;
  
  elementSelected: any;
  // elementSelectedIndex: number;
  // elementSelectedMaxLength: number[] = [];
  elementIntentSelectedType: string;
  openCardButton = false;
  
  constructor(
    private logger: LoggerService,
    private intentService: IntentService,
    private connectorService: ConnectorService,
    private dashboardService: DashboardService
  ) { }

  ngOnInit(): void {
    this.project_id = this.dashboardService.projectID;
  //  console.log('[PANEL-INTENT-DETAIL] (ngOnInit) @Input elementIntentSelected ', this.elementIntentSelected, this.intentSelected);
  //   try {
  //     this.elementSelected = JSON.parse(JSON.stringify(this.elementIntentSelected.element));
  //     this.elementIntentSelectedType = this.elementIntentSelected.type;
  //     this.logger.log('[PANEL-INTENT-DETAIL] (OnInit) elementSelected ', this.elementSelected);
  //   } catch (error) {
  //     this.logger.log('[PANEL-INTENT-DETAIL] (OnInit) ERROR', error);
  //   }
  }

  ngOnChanges() {
    this.initialize();
  }

  initialize(){
    this.intentSelected = this.intentService.intentSelected;
    console.log('[PANEL-INTENT-DETAIL] (OnChanges) @Input elementIntentSelected ', this.intentSelected, this.elementIntentSelected);
    try{
      this.elementIntentSelectedType = this.elementIntentSelected.type;
      this.elementSelected = this.elementIntentSelected.element;
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

  onSaveIntent(){
    if(this.elementIntentSelectedType === this.typeIntentElement.ACTION){
      // this.intentSelected.actions[this.elementSelectedIndex] = this.elementSelected;
      const index = this.intentSelected.actions.findIndex(el => el._tdActionId === this.elementSelected._tdActionId);
      this.intentSelected.actions[index] = this.elementSelected;
    } else if(this.elementIntentSelectedType === this.typeIntentElement.ANSWER){
      this.intentSelected.answer = this.elementSelected;
    } else if(this.elementIntentSelectedType === this.typeIntentElement.QUESTION){
      this.intentSelected.question = this.elementSelected;
    } else if(this.elementIntentSelectedType === this.typeIntentElement.FORM){
      this.intentSelected.form = this.elementSelected;
    }
    console.log('----> onSaveIntent:: ', this.elementIntentSelectedType, this.intentSelected);
    this.onUpdateIntent.emit(this.intentSelected);
  }

  onCloseIntent(){
    console.log('----> onCloseIntent:: ', this.elementIntentSelectedType, this.intentSelected);
    // this.closeAndSavePanelIntentDetail.emit();
  }


  onConnectorChange(type: 'create' | 'delete', idConnector: string, toIntentId: string){
    console.log('createOrUpdateConnector-->', type, idConnector, toIntentId)
    const fromId = idConnector;
    let toId = '';
    const posId = toIntentId.indexOf("#");
    if (posId !== -1) {
      toId = toIntentId.slice(posId+1);
    }

    switch(type){
      case 'create':
        console.log('createNewConnector: ', fromId);
        this.connectorService.deleteConnectorWithIDStartingWith(fromId);
        this.connectorService.createNewConnector(fromId, toId);
        break;
      case 'delete':
        this.connectorService.deleteConnectorWithIDStartingWith(fromId);
        break;

    }
  }

}
