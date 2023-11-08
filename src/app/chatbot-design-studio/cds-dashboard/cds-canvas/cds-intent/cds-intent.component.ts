import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, ViewChild, ElementRef, OnChanges, OnDestroy } from '@angular/core';
import { Form, Intent } from 'src/app/models/intent-model';
import { Action, ActionIntentConnected } from 'src/app/models/action-model';
import { Subject, Subscription } from 'rxjs';

import { ACTIONS_LIST, TYPE_ACTION, TYPE_INTENT_NAME, checkInternalIntent, patchActionId } from '../../../utils';
import { IntentService } from '../../../services/intent.service';
// import { ControllerService } from 'app/chatbot-design-studio/services/controller.service';
import { ConnectorService } from '../../../services/connector.service';


import {
  CdkDragDrop,
  CdkDragHandle,
  CdkDrag,
  CdkDropList,
  CdkDropListGroup,
  moveItemInArray,
  transferArrayItem
} from '@angular/cdk/drag-drop';
import { takeUntil } from 'rxjs/operators';
import { StageService } from '../../../services/stage.service';
import { ControllerService } from '../../../services/controller.service';
import { replaceItemInArrayForKey } from '../../../utils';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';




export enum HAS_SELECTED_TYPE {
  ANSWER = "HAS_SELECTED_ANSWER",
  QUESTION = "HAS_SELECTED_QUESTION",
  FORM = "HAS_SELECTED_FORM",
  ACTION = "HAS_SELECTED_ACTION",
}

@Component({
  selector: 'cds-intent',
  templateUrl: './cds-intent.component.html',
  styleUrls: ['./cds-intent.component.scss']
})


export class CdsIntentComponent implements OnInit, OnDestroy, OnChanges {
  @Input() intent: Intent;
  @Input() hideActionPlaceholderOfActionPanel: boolean;
  @Output() questionSelected = new EventEmitter(); // !!! SI PUO' ELIMINARE
  @Output() answerSelected = new EventEmitter(); // !!! SI PUO' ELIMINARE
  @Output() formSelected = new EventEmitter(); // !!! SI PUO' ELIMINARE
  @Output() actionSelected = new EventEmitter(); // !!! SI PUO' ELIMINARE
  @Output() actionDeleted = new EventEmitter();
  @Output() showPanelActions = new EventEmitter(); // nk
  @Output() testItOut = new EventEmitter<Intent>();
  @Output() deleteIntent = new EventEmitter();

  @ViewChild('openActionMenuBtn', { static: false }) openActionMenuBtnRef: ElementRef;

  subscriptions: Array<{ key: string, value: Subscription }> = [];
  private unsubscribe$: Subject<any> = new Subject<any>();

  // intentElement: any;
  // idSelectedAction: string;
  // form: Form;
  formSize: number = 0;
  // question: any;
  // answer: string; // !!! SI PUO' ELIMINARE
  questionCount: number = 0;

  listOfActions: Action[];
  HAS_SELECTED_TYPE = HAS_SELECTED_TYPE;
  TYPE_ACTION = TYPE_ACTION;
  ACTIONS_LIST = ACTIONS_LIST;
  elementTypeSelected: HAS_SELECTED_TYPE
  isOpen: boolean = true;
  menuType: string = 'action';
  positionMenu: any;

  isStart = false;
  startAction: any;
  isDragging: boolean = false;
  actionDragPlaceholderWidth: number;
  hideActionDragPlaceholder: boolean;
  newActionCreated: Action;
  dragDisabled: boolean = true;
  connectorIsOverAnIntent: boolean = false;
  webHookTooltipText: string;
  isInternalIntent: boolean = false;

  actionIntent: ActionIntentConnected;

  private logger: LoggerService = LoggerInstance.getInstance()
  constructor(
    public intentService: IntentService,
    private connectorService: ConnectorService,
    private stageService: StageService,
    private controllerService: ControllerService,
    private elemenRef: ElementRef
  ) {
    this.initSubscriptions()
  }

  initSubscriptions() {

    let subscribtion: any;
    let subscribtionKey: string;

    /** SUBSCRIBE TO THE INTENT CREATED OR UPDATED */
    subscribtionKey = 'behaviorIntent';
    subscribtion = this.subscriptions.find(item => item.key === subscribtionKey);
    if (!subscribtion) {
      subscribtion = this.intentService.behaviorIntent.pipe(takeUntil(this.unsubscribe$)).subscribe(intent => {
        if (intent && this.intent && intent.intent_id === this.intent.intent_id) {
          this.logger.log("[CDS-INTENT] sto modifico l'intent: ", this.intent, " con : ", intent);
          this.intent = intent;

          if (intent['attributesChanged']) {
            this.logger.log("[CDS-INTENT] ho solo cambiato la posizione sullo stage");
            delete intent['attributesChanged'];
          } else { // if(this.intent.actions.length !== intent.actions.length && intent.actions.length>0)
            this.logger.log("[CDS-INTENT] aggiorno le actions dell'intent");
            this.listOfActions = this.intent.actions;
            // cerca il primo connect to block e fissalo in fondo
            // this.listOfActions = this.intent.actions.filter(function(obj) {
            //   return obj._tdActionType !== TYPE_ACTION.INTENT;
            // });
          }

          //UPDATE QUESTIONS
          if (this.intent.question) {
            const question_segment = this.intent.question.split(/\r?\n/).filter(element => element);
            this.questionCount = question_segment.length;
            // this.question = this.intent.question;
          } else {
            this.questionCount = 0;
          }

          //UPDATE FORM
          if (this.intent && this.intent.form && (this.intent.form !== null)) {
            this.formSize = Object.keys(this.intent.form).length;
          } else {
            this.formSize = 0;
          }
        }
      });
      const subscribe = { key: subscribtionKey, value: subscribtion };
      this.subscriptions.push(subscribe);
    }

    /** SUBSCRIBE TO THE INTENT LIVE SELECTED FROM TEST SITE */
    subscribtionKey = 'intentLiveActive';
    subscribtion = this.subscriptions.find(item => item.key === subscribtionKey);
    if (!subscribtion) {
      subscribtion = this.intentService.liveActiveIntent.pipe(takeUntil(this.unsubscribe$)).subscribe(intent => {
        if (intent && this.intent && intent.intent_id === this.intent.intent_id) {
          var stageElement = document.getElementById(intent.intent_id);
          this.stageService.centerStageOnTopPosition(stageElement)
          this.addCssClassAndRemoveAfterTime('live-active-intent', '#intent-content-' + (intent.intent_id), 6)
        }
      });
      const subscribe = { key: subscribtionKey, value: subscribtion };
      this.subscriptions.push(subscribe);
    }

  }


  addCssClassAndRemoveAfterTime(className: string, componentID: string, delay: number) {
    let element = this.elemenRef.nativeElement.querySelector(componentID)
    if (element) {
      element.classList.add(className)
      setTimeout(() => {
        element.classList.remove(className)
      }, delay * 1000)
    }
  }

  ngOnInit(): void {
    console.log('CdsPanelIntentComponent ngAfterViewInit-->', this.intent);


    if (this.intent.actions && this.intent.actions.length === 1 && this.intent.actions[0]._tdActionType === TYPE_ACTION.INTENT && this.intent.intent_display_name === 'start') {
      console.log('CdsPanelIntentComponent START-->',this.intent.actions[0]); 
      this.startAction = this.intent.actions[0];
      if (!this.startAction._tdActionId) {
        this.startAction = patchActionId(this.intent.actions[0]);
        this.intent.actions = [this.startAction];
      }
      this.isStart = true;
      //** set 'start' intent as default selected one */
      this.intentService.setDefaultIntentSelected();
      // //** center stage on 'start' intent */
      // let startElement = document.getElementById(this.intent.intent_id)
      // this.stageService.centerStageOnHorizontalPosition(startElement)
    } else {
      this.setIntentSelected();
    }
    this.setActionIntentInIntent();
    this.isInternalIntent = checkInternalIntent(this.intent)
    this.addEventListener();
  }

  private setActionIntentInIntent(){
    this.actionIntent = null;
    for (let i = this.intent.actions.length - 1; i >= 0; i--) {
      if (this.intent.actions[i]._tdActionType === TYPE_ACTION.INTENT) {
        if(!this.actionIntent){
          this.actionIntent = JSON.parse(JSON.stringify(this.intent.actions[i]));
        }
        // console.log('setActionIntentInIntent:: ', this.intent.actions[i]);
        this.intent.actions.splice(i, 1);
        // this.intent.actions.push(this.actionIntent);
        // break;
      }
    }
    if(!this.actionIntent){
      this.actionIntent = this.intentService.createNewAction(TYPE_ACTION.INTENT);
    }
    // set __isLast as true only for the last 'intent' action type in the list 
    this.actionIntent['__isLast'] = true;
    this.intent.actions.push(this.actionIntent);
    // this.intent.actions = this.intent.actions.map(function(action) {
    //   if(action._tdActionType === TYPE_ACTION.INTENT){
    //     actionIntent = action;
    //   }
    //   return action;
    // });
    // console.log('setActionIntentInIntent:: ', this.intent, this.actionIntent);
    if(this.actionIntent && this.actionIntent.intentName){
      const fromId = this.intent.intent_id+'/'+this.actionIntent._tdActionId;
      const toId = this.actionIntent.intentName.replace("#", "");
      this.connectorService.createConnectorFromId(fromId, toId, false, false); //Sync
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Fixed bug where an empty intent's action placeholder remains visible if an action is dragged from the left action menu
    this.logger.log('[CDS-INTENT] hideActionPlaceholderOfActionPanel (dragged from sx panel) ', this.hideActionPlaceholderOfActionPanel)
    if (this.hideActionPlaceholderOfActionPanel === false) {
      const addActionPlaceholderEl = <HTMLElement>document.querySelector('.add--action-placeholder');
      this.logger.log('[CDS-INTENT] HERE 1 !!!! addActionPlaceholderEl ', addActionPlaceholderEl);
      if (addActionPlaceholderEl !== null) {
        addActionPlaceholderEl.style.opacity = '0';
      }
    } else if (this.hideActionPlaceholderOfActionPanel === true) {
      const addActionPlaceholderEl = <HTMLElement>document.querySelector('.add--action-placeholder');
      this.logger.log('[CDS-INTENT] HERE 2 !!!! addActionPlaceholderEl ', addActionPlaceholderEl);
      if (addActionPlaceholderEl !== null) {
        addActionPlaceholderEl.style.opacity = '1';
      }
    }
  }

  ngOnDestroy() {
    this.unsubscribe();
  }

  unsubscribe() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();

  }

  // ---------------------------------------------------------
  // Event listener
  // ---------------------------------------------------------
  addEventListener() {
    let that = this;
    document.addEventListener(
      "connector-release-on-intent", (e: CustomEvent) => {
        // this.logger.log('[CDS-INTENT] connector-release-on-intent e ', e)
        // this.logger.log('[CDS-INTENT] Connector released on intent - id intent', e.detail.toId)
        // this.logger.log('[CDS-INTENT] Connector released on intent -  this.intent.intent_id', this.intent.intent_id)
        // movingBorder
        // flashBorder
        if (e.detail.toId === this.intent.intent_id) {
          const intentContentEl = <HTMLElement>document.querySelector(`#intent-content-${e.detail.toId}`);
          const blockHeaderEl = <HTMLElement>document.querySelector(`#block-header-${e.detail.toId}`);
          // this.logger.log('[CDS-INTENT] Connector released on intent -  intentContentEl', intentContentEl)
          // this.logger.log('[CDS-INTENT] Connector released on intent -  blockHeaderEl', blockHeaderEl)
          intentContentEl.classList.remove("outline-border")
          intentContentEl.classList.add("ripple-effect")
          // , "rippleEffect"
          setTimeout(() => {
            intentContentEl.classList.remove("ripple-effect")
          }, 2000);
        }
      },
      true
    );

    document.addEventListener(
      "connector-moved-over-intent", (e: CustomEvent) => {
        console.log('[CDS-INTENT] Connector Moved over intent e ', e);
        // movingBorder
        // flashBorder
        if (e.detail.toId === this.intent.intent_id) {
          // this.logger.log('[CDS-INTENT] Connector Moved over intent here yes 1 ', this.intent.intent_id)
          this.connectorIsOverAnIntent = true;
          // this.logger.log('[CDS-INTENT] Connector Moved over intent connectorIsOverAnIntent ', this.connectorIsOverAnIntent)
          const intentContentEl = <HTMLElement>document.querySelector(`#intent-content-${e.detail.toId}`);
          // this.logger.log('[CDS-INTENT] Connector Moved over intent -  intentContentEl', intentContentEl)
          intentContentEl.classList.add("outline-border")
        } else {
          this.logger.log('[CDS-INTENT] Connector Moved over intent here yes 2 ')
        }
      },
      true
    );

    document.addEventListener(
      "connector-moved-out-of-intent", (e: CustomEvent) => {
        console.log('[CDS-INTENT] Connector Moved out of intent e ', e);
        if (e.detail.toId === this.intent.intent_id) {
          // this.logger.log('[CDS-INTENT] Connector Moved out of intent e id ', e.detail.toId)
          const intentContentEl = <HTMLElement>document.querySelector(`#intent-content-${e.detail.toId}`);
          // this.logger.log('[CDS-INTENT] Connector Moved over intent -  intentContentEl', intentContentEl)
          intentContentEl.classList.remove("outline-border")
        }
        this.connectorIsOverAnIntent = false;
        // this.logger.log('[CDS-INTENT] Connector Moved out of intent connectorIsOverAnIntent ', this.connectorIsOverAnIntent)
      },
      true
    );
  }




  /** CUSTOM FUNCTIONS  */
  private setIntentSelected() {
    this.listOfActions = null;
    this.formSize = 0;
    this.questionCount = 0;
    try {
      if (this.intent) {
        console.log("setIntentSelected:: ", this.intent.actions);
        this.patchAllActionsId();
        this.patchAttributesPosition();
        // this.listOfActions = this.intent.actions.filter(function(obj) {
        //   return obj._tdActionType !== TYPE_ACTION.INTENT;
        // });
        this.listOfActions = this.intent.actions;
        // console.log("[CDS-INTENT] listOfActions: ", this.listOfActions);
        // this.form = this.intent.form;
        // this.actions = this.intent.actions;
        // this.answer = this.intent.answer;
        if (this.intent.question) {
          const question_segment = this.intent.question.split(/\r?\n/).filter(element => element);
          this.questionCount = question_segment.length;
          // this.question = this.intent.question;
        }
      }
      if (this.intent && this.intent.form && (this.intent.form !== null)) {
        this.formSize = Object.keys(this.intent.form).length;
      } else {
        this.formSize = 0;
      }
    } catch (error) {
      this.logger.error("error: ", error);
    }
  }




  /** patchAllActionsId
   * retrocompatibility patch.
   * Check if the action has a ._tdActionId attribute
   * otherwise it generates it on the fly */
  private patchAllActionsId() {
    if (this.listOfActions && this.listOfActions.length > 0) {
      this.listOfActions.forEach(function (action, index, object) {
        console.log('[CDS-INTENT] patchAllActionsId action: ', action);
        if (!action._tdActionId) {
         object[index] = patchActionId(action);
         console.log('[CDS-INTENT] object: ', object[index]);
        }
      });
    }
  }

  /**
   * patchAttributesPosition
   * retrocompatibility patch.
   */
  private patchAttributesPosition() {
    if (!this.intent.attributes || !this.intent.attributes.position) {
      this.intent['attributes'] = {};
    }
    if (!this.intent.attributes.position) {
      this.intent.attributes['position'] = { 'x': 0, 'y': 0 };
    }
  }


  /** getActionParams
   * Get action parameters from a map to create the header (title, icon) 
   * */
  getActionParams(action) {
    const enumKeys = Object.keys(TYPE_ACTION);
    let keyAction = '';
    try {
      for (const key of enumKeys) {
        if (TYPE_ACTION[key] === action._tdActionType) {
          keyAction = key;
          return ACTIONS_LIST[keyAction];
        }
      }
      return;
    } catch (error) {
      console.error("[CDS-INTENT] getActionParams ERROR: ", error);
      return;
    }
  }

  /*********************************************/


  /** EVENTS  */

  onSelectAction(action, index: number, idAction) {
    this.logger.log('[CDS-INTENT] onActionSelected action: ', action);
    this.logger.log('[CDS-INTENT] onActionSelected index: ', index);
    this.logger.log('[CDS-INTENT] onActionSelected idAction: ', idAction);
    this.elementTypeSelected = idAction;
    // this.intentService.setIntentSelected(this.intent.intent_id);
    this.intentService.selectAction(this.intent.intent_id, idAction);
    this.actionSelected.emit({ action: action, index: index, maxLength: this.listOfActions.length });
  }

  // onSelectAnswer(elementSelected) {
  //   this.elementTypeSelected = elementSelected;
  //   // this.isIntentElementSelected = true;
  //   this.answerSelected.emit(this.answer);
  // }

  onSelectQuestion(elementSelected) {
    this.logger.log('[CDS-INTENT] onSelectQuestion-->', elementSelected, this.intent.question)
    this.elementTypeSelected = elementSelected;
    this.intentService.setIntentSelected(this.intent.intent_id)
    // this.isIntentElementSelected = true;
    this.questionSelected.emit(this.intent.question);
  }

  onSelectForm(elementSelected) {
    // this.isIntentElementSelected = true;
    this.elementTypeSelected = elementSelected;
    this.intentService.setIntentSelected(this.intent.intent_id)
    if (this.intent && !this.intent.form) {
      let newForm = new Form()
      this.intent.form = newForm;
    }
    this.formSelected.emit(this.intent.form);
  }

  onClickControl(event: 'delete' | 'edit', action: Action, index: number) {
    this.logger.log('[CDS-INTENT] onClickControl', event)
    if (event === 'edit') {
      this.onSelectAction(action, index, action._tdActionId)
    } else if (event === 'delete') {
      this.intentService.selectAction(this.intent.intent_id, action._tdActionId)
      this.intentService.deleteSelectedAction();
      // this.actionDeleted.emit(true)
    }
  }

  /**
   * onKeydown
   * delete selected action by keydown backspace
   * */
  onKeydown(event) {
    // console.log('[CDS-INTENT] onKeydown: ', event);
    if (event.key === 'Backspace' || event.key === 'Escape' || event.key === 'Canc') {
      this.intentService.deleteSelectedAction();
    }
  }

  /** !!! IMPORTANT 
   * when the drag of an action starts, I save the starting intent. 
   * Useful in case I move an action between different intents 
  * */
  onDragStarted(event, previousIntentId, index) {
    this.controllerService.closeActionDetailPanel();
    this.logger.log('[CDS-INTENT] onDragStarted event ', event, 'previousIntentId ', previousIntentId);
    this.logger.log('[CDS-INTENT] onDragStarted index ', index);
    this.intentService.setPreviousIntentId(previousIntentId);
    this.isDragging = true
    this.logger.log('[CDS-INTENT] isDragging - onDragStarted', this.isDragging)
    // ----------------------------------
    // Hide action arrow on drag started 
    // ----------------------------------
    // const actionArrowElem = <HTMLElement>document.querySelector(`#action-arrow-${index}`);
    // actionArrowElem.style.display = 'none';
    // this.logger.log('[CDS-INTENT] onDragStarted actionArrowElem', actionArrowElem)

    // const actionDragPlaceholderWidth = actionDragPlaceholder.offsetWidth;
    // this.logger.log('[CDS-INTENT] onDragStarted actionDragPlaceholderWidth', actionDragPlaceholderWidth)

    // --------------------------------------------------------------------------------------------------
    // Bug fix: When an action is dragged, the "drag placeholder" moves up and changes size to full width
    // --------------------------------------------------------------------------------------------------
    const actionDragPlaceholder = <HTMLElement>document.querySelector('.action-drag-placeholder');
    this.logger.log('[CDS-INTENT] onDragStarted actionDragPlaceholder', actionDragPlaceholder)

    const addActionPlaceholderEl = <HTMLElement>document.querySelector('.add--action-placeholder');
    this.logger.log('[CDS-INTENT] onDragStarted addActionPlaceholderEl ', addActionPlaceholderEl)


    // const myObserver = new ResizeObserver(entries => {
    //   // this will get called whenever div dimension changes
    //   if(!actionDragPlaceholder || !addActionPlaceholderEl)return;
    //   entries.forEach(entry => {
    //     this.actionDragPlaceholderWidth = entry.contentRect.width
    //     this.logger.log('[CDS-INTENT] width actionDragPlaceholderWidth', this.actionDragPlaceholderWidth);
    //     if (this.actionDragPlaceholderWidth === 258) {
    //       this.hideActionDragPlaceholder = false;
    //       this.logger.log('[CDS-INTENT] Hide action drag placeholder', this.hideActionDragPlaceholder);
    //       actionDragPlaceholder.style.opacity = '1';
    //       addActionPlaceholderEl.style.opacity = '0';
    //       this.logger.log('[CDS-INTENT] HERE 1 !!!! ');
    //     } else {
    //       this.hideActionDragPlaceholder = true;
    //       this.logger.log('[CDS-INTENT] Hide action drag placeholder', this.hideActionDragPlaceholder);
    //       actionDragPlaceholder.style.opacity = '0';
    //       addActionPlaceholderEl.style.opacity = '1';
    //       this.logger.log('[CDS-INTENT] HERE 2 !!!! ');
    //     }
    //     //  this.logger.log('height', entry.contentRect.height);
    //   });
    // });
    const myObserver = new ResizeObserver(entries => {
      // this will get called whenever div dimension changes
      entries.forEach(entry => {
        this.actionDragPlaceholderWidth = entry.contentRect.width
        this.logger.log('[CDS-INTENT] width actionDragPlaceholderWidth', this.actionDragPlaceholderWidth);
        if (this.actionDragPlaceholderWidth === 258) {
          this.hideActionDragPlaceholder = false;
          this.logger.log('[CDS-INTENT] Hide action drag placeholder', this.hideActionDragPlaceholder);
          actionDragPlaceholder.style.opacity = '1';
          if (addActionPlaceholderEl) {
            addActionPlaceholderEl.style.opacity = '0';
          }
          this.logger.log('[CDS-INTENT] HERE 1 !!!! ');

        } else {
          this.hideActionDragPlaceholder = true;
          this.logger.log('[CDS-INTENT] Hide action drag placeholder', this.hideActionDragPlaceholder);
          actionDragPlaceholder.style.opacity = '0';
          if (addActionPlaceholderEl) {
            addActionPlaceholderEl.style.opacity = '1';
          }
          this.logger.log('[CDS-INTENT] HERE 2 !!!! ');
        }
        //  this.logger.log('height', entry.contentRect.height);
      });
    });
    myObserver.observe(actionDragPlaceholder);
  }



  /** onDragEnded
   * get the action moved and update its connectors */
  onDragEnded(event, index) {
    this.logger.log('[CDS-INTENT] onDragEnded: ', event);
    this.isDragging = false;
    this.logger.log('[CDS-INTENT] isDragging - onDragEnded ', this.isDragging)

    // ----------------------------------
    // Display action arrow on drag ended 
    // ----------------------------------
    // const actionArrowElem = <HTMLElement>document.querySelector(`#action-arrow-${index}`);
    // actionArrowElem.style.display = 'block';
    // this.logger.log('[CDS-INTENT] onDragEnded actionArrowElem', actionArrowElem)

    // const fromEle = document.getElementById(this.intent.intent_id);
    // this.connectorService.updateConnector(fromEle);
  }

  // mouseOverAddActionPlaceholder(event) {
  //   this.logger.log('[CDS-INTENT] mouseOverAddActionPlaceholder event ', event)

  //   const actionListEl = <HTMLElement>document.querySelector('.actions-list-wpr');
  //   this.logger.log('[CDS-INTENT] mouseOverAddActionPlaceholder actionListEl ', actionListEl)

  //   const addActionPlaceholderEl = <HTMLElement>document.querySelector('.add--action-placeholder');
  //   this.logger.log('[CDS-INTENT] mouseOverAddActionPlaceholder addActionPlaceholderEl ', addActionPlaceholderEl)

  //   if (actionListEl && actionListEl.classList.contains('cdk-drop-list-receiving')) {
  //     this.logger.log('[CDS-INTENT] mouseOverAddActionPlaceholder here yes') 

  //     addActionPlaceholderEl.style.opacity = '0'
  //     this.dragDisabled = false;
  //   } 
  // }

  // mouseOutAddActionPlaceholder(event) {
  //   this.logger.log('[CDS-INTENT] mouseOutAddActionPlaceholder ', event)
  //   const addActionPlaceholderEl = <HTMLElement>document.querySelector('.add--action-placeholder');
  //   this.logger.log('[CDS-INTENT] mouseOverAddActionPlaceholder addActionPlaceholderEl ', addActionPlaceholderEl);
  //   // addActionPlaceholderEl.style.opacity = '1'
  // }


  /** Predicate function that only allows type='intent' to be dropped into a list. */
  canEnterDropList(action: any) {
    return (item: CdkDrag<any>) => {
      this.logger.log('itemmmmmmmm', item.data, action)
      return true
    }
  }





  /** on Drop Action check the three possible cases:
   * chaimata quando muovo la action in un intent
   * 1 - moving action in the same intent 
   * 2 - moving action from another intent
   * 3 - moving new action in intent from panel elements
   */
  async onDropAction(event: CdkDragDrop<string[]>) {
   console.log('[CDS-INTENT] onDropAction: ', event);
    // this.logger.log('event:', event, 'previousContainer:', event.previousContainer, 'event.container:', event.container);
    if (event.previousContainer === event.container) {
      // moving action in the same intent
      
      //  event.container.data
      moveItemInArray(this.intent.actions, event.previousIndex-1, event.currentIndex-1);
      this.logger.log("[CDS-INTENT] onDropAction sto spostando una action all'interno dello stesso intent: ", event, this.intent.actions); 
      this.controllerService.closeAllPanels();
      this.intentService.setIntentSelected(this.intent.intent_id);
      this.connectorService.updateConnector(this.intent.intent_id);
      const response = await this.intentService.onUpdateIntentWithTimeout(this.intent);
      if (response) {
        // this.connectorService.updateConnector(this.intent.intent_id);
      }
    } else {
      try {
        let action: any = event.previousContainer.data[event.previousIndex];
        if (event.previousContainer.data.length > 0) {
          if (action._tdActionType) {
            // moving action from another intent
            this.logger.log("[CDS-INTENT] onDropAction sposto la action tra 2 intent differenti");
            this.intentService.moveActionBetweenDifferentIntents(event, action, this.intent.intent_id);
            this.controllerService.closeAllPanels();
            this.intentService.setIntentSelected(this.intent.intent_id);
          } else if (action.value && action.value.type) {
            // moving new action in intent from panel elements
            this.logger.log("[CDS-INTENT] onDropAction aggiungo una nuova action all'intent da panel elements - action ", this.newActionCreated);
            // this.logger.log("[CDS-INTENT] onDropAction aggiungo una nuova action all'intent da panel elements - currrent index ", event.currentIndex);
            // this.logger.log("[CDS-INTENT] onDropAction aggiungo una nuova action all'intent da panel elements - actionId ",  this.newActionCreated._tdActionId);
            this.intentService.moveNewActionIntoIntent(event, action, this.intent.intent_id);
            this.controllerService.closeAllPanels();
            this.intentService.setIntentSelected(this.intent.intent_id);
            //this.onSelectAction(newAction, event.currentIndex, newAction._tdActionId)
          }
        }
      } catch (error) {
        console.error(error);
      }
    }
  }




    /**  onUpdateAndSaveAction: 
   * function called by all actions in @output whenever they are modified!
   * called when the connector is created or deleted
   * OR 
   * called when the action is modified
   * */
  public async onUpdateAndSaveAction(object) {
    let connector = null;
    if(object && object.type && object.type === 'connector'){
      connector = object.element;
    } else if(object && object.type && object.type === 'action'){
      const action  = object.element;
      if(action && action._tdActionId){
        replaceItemInArrayForKey('_tdActionId', this.intent.actions, action);
      }
    }
    this.setActionIntentInListOfActions();
    // console.log('[CDS-INTENT] onUpdateAndSaveAction:::: ', object, this.intent, this.intent.actions);
    this.intentService.onUpdateIntentWithTimeout(this.intent, 0, true, connector);
  }



  private setActionIntentInListOfActions(){
    let actionIntent = this.actionIntent;
    let addIntentAction = true; 
    // for (let i = this.intent.actions.length - 1; i >= 0; i--) {
    //   if (this.intent.actions[i]._tdActionType === TYPE_ACTION.INTENT) {
    //     // this.actionIntent = this.intent.actions[i];
    //     // console.log('setActionIntentInIntent:: ', this.intent.actions[i]);
    //     // this.intent.actions.splice(i, 1);
    //     addIntentAction = true;
    //     this.intent.actions[i] = actionIntent;
    //     break; 
    //   }
    // }

    this.intent.actions = this.intent.actions.map(function(action) {
      if(action._tdActionType === TYPE_ACTION.INTENT){
        addIntentAction = false;
        return actionIntent;
      }
      return action;
    });

    if (addIntentAction) {
      this.intent.actions.push(this.actionIntent);
    }
  }

  openActionMenu(intent: any, calleBy: string) {
    this.logger.log('[CDS-INTENT] openActionMenu > intent ', intent)
    this.logger.log('[CDS-INTENT] openActionMenu > calleBy ', calleBy)
    const openActionMenuElm = this.openActionMenuBtnRef.nativeElement.getBoundingClientRect()
    let xOffSet = 157
    if (calleBy === 'add-action-placeholder') {
      xOffSet = 277
    }
    let buttonXposition = openActionMenuElm.x + xOffSet // 157 
    let buttonYposition = openActionMenuElm.y // - 10
    this.logger.log('[CDS-INTENT] openActionMenu > openActionMenuBtnRef ', openActionMenuElm)
    this.logger.log('[CDS-INTENT] openActionMenu > buttonXposition ', buttonXposition)
    const data = { 'x': buttonXposition, 'y': buttonYposition, 'intent': intent, 'addAction': true };
    this.intentService.setIntentSelected(this.intent.intent_id);
    this.showPanelActions.emit(data);
  }

  /** ******************************
   * intent controls options: START
   * ****************************** */
  onOptionIntentControlClicked(event: 'webhook' | 'delete' | 'test'){
    switch(event){
      case 'webhook':
        this.toggleIntentWebhook(this.intent);
        break;
      case 'delete':
        this.onDeleteIntent(this.intent)
        break;
      case 'test':
        this.openTestSiteInPopupWindow()
    }
  }

  openTestSiteInPopupWindow() {
    this.intentService.setIntentSelected(this.intent.intent_id);
    this.testItOut.emit(this.intent)
  }

  toggleIntentWebhook(intent) {
    this.logger.log('[CDS-INTENT] toggleIntentWebhook  intent ', intent)
    this.logger.log('[CDS-INTENT] toggleIntentWebhook  intent webhook_enabled ', intent.webhook_enabled)
    this.intentService.setIntentSelected(this.intent.intent_id);
    intent.webhook_enabled = !intent.webhook_enabled;
    // this.webHookTooltipText = "Disable webhook"
    // this.webHookTooltipText = "Enable webhook"
    this.intentService.onUpdateIntentWithTimeout(intent);
  }

  onDeleteIntent(intent: Intent) {
    this.intentService.setIntentSelected(this.intent.intent_id);
    this.deleteIntent.emit(intent);
  }

  /** ******************************
   * intent controls options: END 
   * ****************************** */


}
