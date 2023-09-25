import { Injectable } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';


import {
  ActionReply, 
  ActionAgent,
  ActionAssignFunction, 
  ActionAssignVariable,
  ActionChangeDepartment,
  ActionClose,
  ActionDeleteVariable,
  ActionEmail, 
  ActionHideMessage, 
  ActionIntentConnected,
  ActionJsonCondition,
  ActionOnlineAgent,
  ActionOpenHours,
  ActionRandomReply,
  ActionReplaceBot,
  ActionWait,
  ActionWebRequest,
  Command, Wait, Message, Expression, Attributes, Action, ActionAskGPT, ActionWhatsappAttribute, ActionWhatsappStatic, ActionWebRequestV2, ActionGPTTask } from 'src/app/models/action-model';
import { Intent } from 'src/app/models/intent-model';
import { FaqService } from 'src/app/services/faq.service';
import { FaqKbService } from 'src/app/services/faq-kb.service';
import { TYPE_INTENT_NAME, NEW_POSITION_ID, TYPE_ACTION, TYPE_COMMAND, removeNodesStartingWith, generateShortUID, checkIFElementExists} from '../utils';
import { ConnectorService } from '../services/connector.service';
import { ControllerService } from '../services/controller.service';
import { StageService } from '../services/stage.service';
import { DashboardService } from '../services/dashboard.service';




/** CLASSE DI SERVICES PER TUTTE LE AZIONI RIFERITE AD OGNI SINGOLO INTENT **/

@Injectable({
  providedIn: 'root'
})
export class IntentService {
  idBot: string;
  behaviorIntents = new BehaviorSubject <Intent[]>([]);
  behaviorIntent = new BehaviorSubject <Intent>(null);
  liveActiveIntent = new BehaviorSubject<Intent>(null);

  listOfIntents: Array<Intent> = [];
  prevListOfIntent: Array<Intent> = [];
  // selectedIntent: Intent;
  intentSelected: Intent;
  listActions: Array<Action>;
  selectedAction: Action;

  actionSelectedID: string;
  // intentSelectedID: string;

  previousIntentId: string = '';
  preDisplayName: string = 'untitled_block_';
  
  botAttributes: any = {};
  listOfPositions: any = {};

  setTimeoutChangeEvent: any;
  idIntentUpdating: string;

  intentNameAlreadyExist: boolean;


  // newPosition: any = {'x':0, 'y':0};
  

  private changedConnector = new Subject<any>();
  public isChangedConnector$ = this.changedConnector.asObservable();



  public arrayUNDO: Array<any> = [];
  public arrayREDO: Array<any> = [];

  constructor(
    private faqService: FaqService,
    private faqKbService: FaqKbService,
    private connectorService: ConnectorService,
    private controllerService: ControllerService,
    private stageService: StageService,
    private dashboardService: DashboardService,
  ) { }


  /**
   * onChangedConnector
   * funzione chiamata sul 'connector-created', 'connector-deleted'
   * per notificare alle actions che i connettori sono cambiati
   */
  public onChangedConnector(connector){
    console.log('onChangedConnector:: ', connector);
    this.changedConnector.next(connector);
  }

  public setDefaultIntentSelected(){
    if(this.listOfIntents && this.listOfIntents.length > 0){
      let startIntent = this.listOfIntents.filter(obj => ( obj.intent_display_name.trim() === TYPE_INTENT_NAME.DISPLAY_NAME_START));
      // console.log('setDefaultIntentSelected: ', startIntent, startIntent[0]);
      if(startIntent && startIntent.length>0){
        this.intentSelected = startIntent[0];
      }
    }
    console.log('[INTENT SERVICE] ::: setDefaultIntentSelected ::: ', this.intentSelected);
    this.behaviorIntent.next(this.intentSelected);
    //this.liveActiveIntent.next(this.intentSelected);
  }

  // public setIntentSelected(intent){
  //   this.intentSelected = intent;
  //   console.log('[INTENT SERVICE] ::: setIntentSelected ::: ', this.intentSelected);
  //   this.behaviorIntent.next(this.intentSelected);
  //   //this.liveActiveIntent.next(this.selectedIntent);
  // }

  public setLiveActiveIntent(intentName: string){
    let intent = this.listOfIntents.find((intent) => intent.intent_display_name === intentName);
    this.liveActiveIntent.next(intent)
  }


  /** checkIntentNameMachRegex */
  // checkIntentNameMachRegex(intentname) {
  //   const regex = /^[ _0-9a-zA-Z]+$/
  //   return regex.test(intentname);
  // }

  // private checkIntentName(name: string, ) {
  //   this.intentNameAlreadyExist = false;
  //   if (name !== this.intent.intent_display_name) {
  //     this.intentNameAlreadyExist = this.listOfIntents.some((el) => {
  //       return el.intent_display_name === name;
  //     });
  //   }

  //   this.intentNameNotHasSpecialCharacters = this.checkIntentNameMachRegex(name);
  //   this.intentNameResult = true;
  //   if (!this.intentName || this.intentName.trim().length === 0) {
  //     this.intentNameResult = false;
  //   }
  //   return this.intentNameResult;
  // }
  

  /** setDragAndListnerEvent */
  // public setListnerEvent(intent) {
  //   let that = this;
  //   let elem = document.getElementById(intent.intent_id);
  //   if(elem){
  //     const panelIntentContent = elem.getElementsByClassName('panel-intent-content')[0];
  //     const picHeader = panelIntentContent.getElementsByClassName('pic-header')[0];
  //     if(picHeader){
  //       console.log("imposto il listner per la selezione/deselezione dell'elemento ");
  //       // **************** !!!!!!!! aggiungo listner !!!!!!! *******************//
  //       // Aggiungi l'event listener con i parametri
  //       // console.log("2.1 --- hasListenerMouseup -> ", elem.dataset.hasListenerMouseup ,intent.intent_id);
  //       if (elem.dataset.hasListenerMouseup !== 'true') {
  //         picHeader.addEventListener('mouseup', function () {
  //           elem.dataset.hasListenerMouseup = 'true';
  //           that.onMouseUpIntent(intent, elem);
  //         });
  //       }
  //       // Aggiungi l'event listener con i parametri
  //       // console.log("2.2 --- hasListenerMousedown -> ",elem.dataset.hasListenerMousedown, intent.intent_id);
  //       if (elem.dataset.hasListenerMousedown !== 'true') {
  //         picHeader.addEventListener('mousedown', function () {
  //           elem.dataset.hasListenerMousedown = 'true';
  //           that.onMouseDownIntent(elem);
  //         });
  //       }
  //       // Aggiungi l'event listener con i parametri
  //       // console.log("2.3 --- hasListenerMousemove -> ",elem.dataset.hasListenerMousemove, intent.intent_id);
  //       if (elem.dataset.hasListenerMousemove !== 'true') {
  //         picHeader.addEventListener('mousemove', function () {
  //           elem.dataset.hasListenerMousemove = 'true';
  //           that.onMouseMoveIntent(elem);
  //         });
  //       }
  //     }
  //   }
  // }

  // /** */
  // onMouseDownIntent(element): void {
  //   // console.log("onMouseDownIntent:  element: ",element);
  //   const x = element.offsetLeft;
  //   const y = element.offsetTop;
  //   element.style.zIndex = 2;
  // }

  // /** */
  // onMouseUpIntent(intent: any, element: any) {
  //   console.log("onMouseUpIntent: ", intent, " element: ", element);
  //   let newPos = { 'x': element.offsetLeft, 'y': element.offsetTop };
  //   let pos = intent.attributes.position; // this.intentService.getIntentPosition(intent.id);
  //   if (newPos.x != pos.x || newPos.y != pos.y) {
  //     element.style.zIndex = '1';
  //     // console.log("setIntentPosition x:", newPos.x, " y: ",newPos.y);
  //     this.setIntentPosition(intent.id, newPos);
  //   }
  // }

  // /** */
  // onMouseMoveIntent(element: any) {
  // }


  /** 
   * restituisce tutti gli intents
   */
  getIntents() {
    console.log('getIntents: ',  this.behaviorIntents);
    return this.behaviorIntents.asObservable();
  }



  // START DASHBOARD FUNCTIONS //

  // //** recupero le posizioni degli intent sullo stage */
  // setDashboardAttributes(idBot, attributes){
  //   this.botAttributes = attributes;
  //   this.idBot = idBot;
  //   if(attributes && attributes['positions']){
  //     this.listOfPositions = attributes['positions'];
  //   }
  // }


  // /** imposta le posizioni degli elementi sullo stage */
  // setPositionsInDashboardAttributes(json){
  //   this.listOfPositions = json;
  //   this.botAttributes['positions'] = this.listOfPositions;
  //   // this.patchAttributes(this.botAttributes);
  // }


  refreshIntents(){
    console.log("aggiorno elenco intent: ", this.listOfIntents);
    this.behaviorIntents.next(this.listOfIntents);
  }

  refreshIntent(intentSelected){
    console.log("aggiorno singolo intent")
    this.behaviorIntent.next(intentSelected);
  }
  

  /** setPreviousIntentId
   * imposta quello che è l'intent di partenza quando inizia un drag su una action dell'intent 
   * */
  setPreviousIntentId(intentId){
    // this.intentSelected = intent;
    this.previousIntentId = intentId;
  }

  getPreviousIntent(){
    console.log("getPreviousIntent: ", this.listOfIntents, this.previousIntentId)
    return this.listOfIntents.find((intent) => intent.intent_id === this.previousIntentId);
  }



  // /** Get Intent position */    
  // OLD_getIntentPosition(id: string){
  //   let pos = {'x':0, 'y':0};
  //   const positions = this.listOfPositions;
  //   if(!positions)return pos;
  //   if(positions && positions[id]){
  //     return positions[id];
  //   }
  //   return pos;
  // }

  getIntentPosition(intentId: string){
    let pos = {'x':0, 'y':0};
    let intent = this.listOfIntents.find((intent) => intent.intent_id === intentId);
    // console.log('getIntentPosition intentId: ', intentId, intent);
    if(!intent || !intent.attributes || !intent.attributes.position)return pos;
    return intent.attributes.position;
    
  }

  // /** Set intent position */
  // OLD_setIntentPosition(id:string, newPos: any){
  //   const positions = this.listOfPositions;
  //   if(positions){
  //     if(!newPos && positions[id]){
  //       delete positions[id];
  //     } else {
  //       positions[id] =  {'x': newPos.x, 'y': newPos.y};
  //     }
  //     this.setPositionsInDashboardAttributes(positions);
  //   }
  // }

  setIntentPosition(intentId:string, newPos: any){
    console.log('setIntentPosition:: ',intentId, newPos);
    // this.listOfIntents = this.behaviorIntents.getValue();
    let intentToUpdate = this.listOfIntents.find((intent) => intent.intent_id === intentId);
    if(!intentToUpdate)return; 
    // if(!intentToUpdate.attributes){intentToUpdate.attributes = {};
    intentToUpdate['attributes']['position'] = {'x': newPos.x, 'y': newPos.y};
    this.patchAttributes(intentId, intentToUpdate.attributes);
  }
  // END DASHBOARD FUNCTIONS //

  


  // START INTENT FUNCTIONS //

  /** GET ALL INTENTS  */
  public async getAllIntents(id_faq_kb): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.faqService._getAllFaqByFaqKbId(id_faq_kb).subscribe((faqs: Intent[]) => {
        // console.log('getAllIntents: ', faqs);
        if (faqs) {
          this.listOfIntents = JSON.parse(JSON.stringify(faqs));
          this.prevListOfIntent = JSON.parse(JSON.stringify(faqs));
        } else {
          // console.log('EMPTY: ', faqs);
          this.listOfIntents = [];
          this.prevListOfIntent = [];
        }
        this.refreshIntents();
        resolve(true);
      }, (error) => {
        console.error('ERROR: ', error);
        reject(false);
      }, () => {
        console.log('COMPLETE ');
        resolve(true);
      });
    });
  }


  /** create a new intent when drag an action on the stage */
  public createNewIntent(id_faq_kb: string, action: any, pos:any){
    let intent = new Intent();
    intent.id_faq_kb = id_faq_kb;
    intent.attributes.position = pos;
    intent.intent_display_name = this.setDisplayName();
    intent.actions.push(action);
    console.log("ho creato un nuovo intent contenente l'azione ", action, " in posizione ", pos);
    return intent;
  }

  /** generate display name of intent */
  public setDisplayName(){
    // let listOfIntents = this.behaviorIntents.getValue();
    let displayNames = this.listOfIntents.filter((element) => element.intent_display_name.startsWith(this.preDisplayName))
                                          .map((element) => element.intent_display_name.replace(this.preDisplayName, ''));
    // displayNames = displayNames.slice().sort();
    const numbers = displayNames.filter(el => el !== '').map((name) => parseInt(name, 10));
    numbers.sort((a, b) => a - b);
    const lastNumber = numbers[numbers.length - 1];
    if(numbers.length>0){
      return this.preDisplayName+(lastNumber+1);
    } else {
      return this.preDisplayName+1;
    }
    // const filteredArray = this.listOfIntents.filter((element) => element.intent_display_name.startsWith(this.preDisplayName));
    // if(filteredArray.length>0){
    //   const lastElement = filteredArray.slice(-1)[0];
    //   const intent_display_name = parseInt(lastElement.intent_display_name.substring(this.preDisplayName.length));
    //   return this.preDisplayName+(intent_display_name+1);
    // } else {
    //   return this.preDisplayName+1;
    // }
  }
  
  /** save a New Intent, created on drag action on stage */
  public async saveNewIntent(id_faq_kb, newIntent, parentUD?): Promise<any> { 
    console.log('[INTENT SERVICE] -> saveNewIntent, ');
    if(!parentUD)this.addUNDOtoList();
    return new Promise((resolve, reject) => {
      console.log("[INTENT SERVICE]  salva ");
      const that = this;
      this.faqService.addIntent(
        id_faq_kb,
        newIntent.attributes,
        newIntent.question,
        newIntent.answer,
        newIntent.intent_display_name,
        newIntent.intent_id,
        newIntent.form,
        newIntent.actions,
        newIntent.webhook_enabled
      ).subscribe((intent:any) => {
        console.log("[INTENT SERVICE]  ho salvato in remoto l'intent ", intent.intent_id);
        this.prevListOfIntent = JSON.parse(JSON.stringify(this.listOfIntents));
        resolve(intent);
      }, (error) => {
        console.error('[INTENT SERVICE]  ERROR: ', error);
        reject(false);
      }, () => {
        // console.log('COMPLETE ');
        resolve(false);
      });
    });
  }





  /** updateIntent */
  public async updateIntent(originalIntent: Intent, timeout?: number, parentUD?:boolean): Promise<boolean> { 
    
    // mi assicuro chi l'intent che sto cercando di salvare esiste
    const esisteOggetto = this.listOfIntents.some((intent) => intent.intent_id === originalIntent.intent_id);
    if(!esisteOggetto)return;
    if(!timeout)timeout = 0;
    let intent = JSON.parse(JSON.stringify(originalIntent));
    intent = removeNodesStartingWith(intent, '__');
    console.log('[INTENT SERVICE] -> updateIntent, ', originalIntent);
  
    // if(!parentUD)this.addUNDOtoList();
    return new Promise((resolve, reject) => {
      let id = intent.id;
      let attributes = intent.attributes?intent.attributes:{};
      let questionIntent = intent.question?intent.question:'';
      let answerIntent = intent.answer?intent.answer:'';
      let displayNameIntent = intent.intent_display_name?intent.intent_display_name:'';
      let formIntent = {};
      if (intent.form !== null) {
        formIntent = intent.form;
      }
      let actionsIntent = intent.actions?intent.actions:[];
      let webhookEnabledIntent = intent.webhook_enabled?intent.webhook_enabled:false;
      if(this.idIntentUpdating == intent.intent_id){
        clearTimeout(this.setTimeoutChangeEvent);
      } else {
        this.idIntentUpdating = intent.intent_id;
      }
      this.setTimeoutChangeEvent = setTimeout(() => {
        this.faqService.updateIntent(
          id,
          attributes,
          questionIntent,
          answerIntent,
          displayNameIntent,
          formIntent,
          actionsIntent,
          webhookEnabledIntent
        ).subscribe((intent: Intent) => {
          console.log('[INTENT-SERVICE] UPDATED INTENT ', intent);
          this.prevListOfIntent = JSON.parse(JSON.stringify(this.listOfIntents));
          resolve(true);
        }, (error) => {
          console.error('ERROR: ', error);
          reject(false);
        }, () => {
          // console.log('COMPLETE ');
          resolve(true);
        });
      }, timeout);
    });
  }

  /** deleteIntent */
  public async deleteIntent(intent: Intent, parentUD?:boolean): Promise<boolean> { 
    this.deleteIntentToListOfIntents(intent.intent_id);
    console.log('[INTENT SERVICE] -> deleteIntent, ');
    if(!parentUD)this.addUNDOtoList();
    return new Promise((resolve, reject) => {
      this.faqService.deleteFaq(intent.id).subscribe((data) => {
        this.prevListOfIntent = JSON.parse(JSON.stringify(this.listOfIntents));
        resolve(true);
      }, (error) => {
        console.error('ERROR: ', error);
        reject(false);
      }, () => {
        // console.log('COMPLETE ');
        resolve(true);
      });
    });
  }
  // END INTENT FUNCTIONS //





  // START ACTION FUNCTIONS //

  /** update title of intent */
  public changeIntentName(intent){
    setTimeout(async () => {
      const response = await this.updateIntent(intent, 2000);
      if(response){
        this.behaviorIntents.next(this.listOfIntents);
      }
    }, 0);
  }

  // moving new action in intent from panel elements
  public moveNewActionIntoIntent(event, action, currentIntentId): any {
    console.log('[INTENT-SERVICE] moveNewActionIntoIntent');
    let newAction = this.createNewAction(action.value.type);
    let currentIntent = this.listOfIntents.find(function(obj) {
      return obj.intent_id === currentIntentId;
    });
    currentIntent.actions.splice(event.currentIndex, 0, newAction);
    this.behaviorIntent.next(currentIntent);
    this.connectorService.movedConnector(currentIntent.intent_id);
    setTimeout(async () => {
      const responseCurrentIntent = await this.updateIntent(currentIntent);
      if(responseCurrentIntent){
        // const fromEle = document.getElementById(currentIntent.intent_id);
        // this.connectorService.movedConnector(currentIntent.intent_id);
        console.log('update current Intent: OK');
        //this.behaviorIntent.next(currentIntent);
      }
    }, 0);
    return newAction
  }

  // on move action from different intents
  public moveActionBetweenDifferentIntents(event, action, currentIntentId){
    console.log('[INTENT-SERVICE] moveActionBetweenDifferentIntents');
    const that = this;
    console.log('moving action from another intent - action: ', currentIntentId);
    let currentIntent = this.listOfIntents.find(function(obj) {
      return obj.intent_id === currentIntentId;
    });
    let previousIntent = this.listOfIntents.find(function(obj) {
      return obj.intent_id === that.previousIntentId;
    });
    console.log('moveActionBetweenDifferentIntents: ', event, this.listOfIntents, currentIntentId, currentIntent, previousIntent);
    currentIntent.actions.splice(event.currentIndex, 0, action);
    previousIntent.actions.splice(event.previousIndex, 1);
    this.connectorService.movedConnector(currentIntent.intent_id);
    this.connectorService.movedConnector(previousIntent.intent_id);
    this.connectorService.deleteConnectorsFromActionByActionId(action._tdActionId);
    const responseCurrentIntent = this.updateIntent(currentIntent);
    if(responseCurrentIntent){
      console.log('update current Intent: OK');
    }
    const responsePreviousIntent = this.updateIntent(previousIntent);
    if(responsePreviousIntent){
      console.log('update previous Intent: OK');
    }  
    // this.controllerService.closeAllPanels();
    // this.behaviorIntent.next(currentIntent);
    // this.behaviorIntent.next(previousIntent);
  }


  
  // on move action from intent to stage
  // set previousIntentId on dragStarted
  // cancello la action dall'intent che la conteneva precedentemente
  public deleteActionFromPreviousIntentOnMovedAction(event, action){
    const actionId = action._tdActionId;
    let intentToUpdate = this.listOfIntents.find((intent) => intent.intent_id === this.previousIntentId);
    if(intentToUpdate){
      const actions = intentToUpdate.actions.filter((action: any) => action._tdActionId !== actionId);
      intentToUpdate.actions = actions;
      console.log("[CDS-INTENT-SERVICES] ho eliminato la action dall'intent che la conteneva ",actionId, intentToUpdate);
      this.connectorService.deleteConnectorsFromActionByActionId(actionId);
      console.log('[CDS-INTENT-SERVICES] aggiorno intent di partenza', intentToUpdate);
      const responseIntent = this.updateIntent(intentToUpdate);
      if(responseIntent){
        console.log('[CDS-INTENT-SERVICES] update Intent: OK');
        this.behaviorIntent.next(intentToUpdate);
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }


  addNewIntentToListOfIntents(intent){
    console.log("[CDS-INTENT-SERVICES] aggiungo l'intent alla lista di intent");
    this.listOfIntents.push(intent);
    this.refreshIntents();
    // this.behaviorIntents.next(this.listOfIntents);
  }

  replaceNewIntentToListOfIntents(intent, oldID){
    this.listOfIntents = this.listOfIntents.map((obj) => {
      if (obj.id === oldID) {
        return intent;
      }
      return obj;
    });
    console.log("[CDS-INTENT-SERVICES] sostituisco l'intent con id NEW con l'intent salvato nella lista degli intent");
    // this.behaviorIntents.next(this.listOfIntents);
    this.refreshIntents();
  }

  deleteIntentToListOfIntents(intentId){
    console.log("[CDS-INTENT-SERVICES] elimino l'intent alla lista di intent", intentId);
    this.listOfIntents = this.listOfIntents.filter((intent: any) => intent.intent_id !== intentId);
    this.refreshIntents();
  }


  /** getListOfActions */
  public getListOfActions(){
    return this.listActions;
  }


  public getListOfIntents(): Array<{name: string, value: string, icon?:string}>{
    return this.listOfIntents.map(a => {
      if (a.intent_display_name.trim() === 'start') {
        return { name: a.intent_display_name, value: '#' + a.intent_id, icon: 'rocket_launch' }
      } else if (a.intent_display_name.trim() === 'defaultFallback') {
        return { name: a.intent_display_name, value: '#' + a.intent_id, icon: 'undo' }
      } else {
        return { name: a.intent_display_name, value: '#' + a.intent_id, icon: 'label_important_outline' }
      }
    });
  }


  /** selectIntent */
  public selectIntent(intentID){
    console.log('[INTENT SERVICE] --> selectIntent',  this.listOfIntents, intentID);
    this.intentSelected = this.listOfIntents.find(intent => intent.intent_id === intentID);
    if(this.intentSelected)this.stageService.setDragElement(this.intentSelected.intent_id);
   
  }

  /** selectAction */
  public selectAction(intentID, actionId){
    this.actionSelectedID = actionId;
    this.intentSelected = this.listOfIntents.find(intent => intent.intent_id === intentID);
    this.listActions = this.intentSelected.actions;
    this.selectedAction = this.listActions.find(action => action._tdActionId === actionId);
    console.log('[INTENT SERVICE] --> selectAction: ', intentID, actionId);
    this.behaviorIntent.next(this.intentSelected);
  }

  /** setIntentSelected */
  public setIntentSelected(intentID){
    this.selectIntent(intentID);
    this.actionSelectedID = null;
    this.listActions = this.intentSelected.actions?this.intentSelected.actions:null;
    this.selectedAction = null;
    console.log('[INTENT SERVICE] ::: setIntentSelected ::: ', this.intentSelected);
    this.behaviorIntent.next(this.intentSelected);
    // if(!this.intentSelected)return;
    // chiudo tutti i pannelli
    // this.controllerService.closeAllPanels();
  }


  /** unselectAction */
  public unselectAction(){
    this.actionSelectedID = null;
    // this.intentSelectedID = null;
  }

  /** deleteSelectedAction 
  */
  public deleteSelectedAction(){
    console.log('[INTENT SERVICE] ::: deleteSelectedAction', this.intentSelected.intent_id, this.actionSelectedID);
    if(this.intentSelected.intent_id && this.actionSelectedID){
      this.connectorService.deleteConnectorsFromActionByActionId(this.actionSelectedID);
      let intentToUpdate = this.listOfIntents.find((intent) => intent.intent_id === this.intentSelected.intent_id);
      intentToUpdate.actions = intentToUpdate.actions.filter((action: any) => action._tdActionId !== this.actionSelectedID);
      this.listOfIntents = this.listOfIntents.map((intent) => {
        if (intent.intent_id === this.intentSelected.intent_id) {
          return intentToUpdate;
        }
        return intent;
      });
      this.behaviorIntent.next(intentToUpdate);
      this.connectorService.movedConnector(intentToUpdate.intent_id);
      this.controllerService.closeAllPanels();
      // this.connectorService.deleteConnectorsFromActionByActionId(this.actionSelectedID);
      const responseIntent = this.updateIntent(intentToUpdate);
      if(responseIntent){
        // this.connectorService.movedConnector(intentToUpdate.intent_id);
        console.log('update Intent: OK');
        // this.behaviorIntent.next(intentToUpdate);
      }
      this.unselectAction();
      console.log('deleteSelectedAction', intentToUpdate);
    }
  } 


  /** createNewAction */
  public createNewAction(typeAction: TYPE_ACTION) {
    // console.log('[INTENT-SERV] createNewAction typeAction ', typeAction)
    let action: any;

    if(typeAction === TYPE_ACTION.REPLY){
      action = new ActionReply();
      let commandWait = new Wait();
      action.attributes.commands.push(commandWait);
      let command = new Command(TYPE_COMMAND.MESSAGE);
      command.message = new Message('text', 'A chat message will be sent to the visitor');
      action.attributes.commands.push(command);
    }
    if(typeAction === TYPE_ACTION.RANDOM_REPLY){
      action = new ActionRandomReply();
      let commandWait = new Wait();
      action.attributes.commands.push(commandWait);
      let command = new Command(TYPE_COMMAND.MESSAGE);
      command.message = new Message('text', 'A chat message will be sent to the visitor');
      action.attributes.commands.push(command);
    }
    if(typeAction === TYPE_ACTION.WEB_REQUEST){
      action = new ActionWebRequest();
    }
    if(typeAction === TYPE_ACTION.WEB_REQUESTV2){
      action = new ActionWebRequestV2();
      action.assignResultTo= 'result'
      action.assignStatusTo = 'status';
      action.assignErrorTo = 'error';
    }
    if(typeAction === TYPE_ACTION.AGENT){
      action = new ActionAgent();
    }
    if(typeAction === TYPE_ACTION.CLOSE){
      action = new ActionClose();
    }
    if(typeAction === TYPE_ACTION.WAIT){
      action = new ActionWait();
    }
    if(typeAction === TYPE_ACTION.INTENT) {
      action = new ActionIntentConnected();
    }
    if(typeAction === TYPE_ACTION.EMAIL) {
      action = new ActionEmail();
    }
    if(typeAction === TYPE_ACTION.ASSIGN_VARIABLE){
      action = new ActionAssignVariable();
    }
    if(typeAction === TYPE_ACTION.DELETE_VARIABLE){
      action = new ActionDeleteVariable();
    }
    if(typeAction === TYPE_ACTION.ONLINE_AGENTS){
      action = new ActionOnlineAgent();
    }
    if(typeAction === TYPE_ACTION.OPEN_HOURS){
      action = new ActionOpenHours();
    }
    if(typeAction === TYPE_ACTION.REPLACE_BOT){
      action = new  ActionReplaceBot();
    }
    if(typeAction === TYPE_ACTION.CHANGE_DEPARTMENT) {
      action = new  ActionChangeDepartment();
    }
    if(typeAction === TYPE_ACTION.HIDE_MESSAGE){
      action = new ActionHideMessage();
    }
    if(typeAction === TYPE_ACTION.JSON_CONDITION){
      action = new ActionJsonCondition();
      action.groups.push( new Expression());
    }
    if(typeAction === TYPE_ACTION.ASSIGN_FUNCTION){
      action = new ActionAssignFunction();
    }
    if(typeAction === TYPE_ACTION.WHATSAPP_ATTRIBUTE){
      action = new ActionWhatsappAttribute();
    }
    if(typeAction === TYPE_ACTION.WHATSAPP_STATIC){
      action = new ActionWhatsappStatic();
    }
    if(typeAction === TYPE_ACTION.ASKGPT){
      action = new ActionAskGPT();
      action.question = '{{last_user_text}}'
      action.assignReplyTo = 'kb_reply';
      action.assignSourceTo = 'kb_source';
    }
    if(typeAction === TYPE_ACTION.GPT_TASK){
      action = new ActionGPTTask();
      action.max_tokens = 128;
      action.temperature = 0.7;
      action.model = "gpt-3.5-turbo";
      action.assignReplyTo = 'gpt_reply';
    }
    console.log('ho creato nuova action ', action);
    return action;
  }
  // END ATTRIBUTE FUNCTIONS //
  



  public patchButtons(buttons, idAction){
    console.log('patchButtons:: ', buttons);
    buttons.forEach((button, index) => {
      const checkUid = buttons.filter(btn => btn.uid === button.uid);
      if (checkUid.length > 1 || !button.uid && button.uid == undefined) {
        button.uid = generateShortUID(index);
      } 
      const idActionConnector = idAction+'/'+button.uid;
      button.__idConnector = idActionConnector;
      if(button.action && button.action !== ''){
        button.__isConnected = true;
      } else {
        button.__isConnected = false;
      }
    }); 
    return buttons;
  }
  

  // OLD_patchAttributes(attributes: any) {
  //   console.log('-----------> patchAttributes, ', this.idBot);
  //   this.faqKbService.patchAttributes(this.idBot, attributes).subscribe((data) => {
  //       if (data) {
  //         console.log('data:   ', data);
  //       }
  //     }, (error) => {
  //       console.log('error:   ', error);
  //     }, () => {
  //       console.log('complete');
  //     });
  // }

  patchAttributes(intentID: string, attributes: any) {
    clearTimeout(this.setTimeoutChangeEvent);
    this.setTimeoutChangeEvent = setTimeout(() => {
      console.log('[INTENT SERVICE] -> patchAttributes, ', intentID, attributes);
      // let intentToUpdate = this.listOfIntents.find((intent) => intent.id === intentID);
      // this.addUNDOtoList();
      this.faqService.patchAttributes(intentID, attributes).subscribe((data) => {
        this.prevListOfIntent = JSON.parse(JSON.stringify(this.listOfIntents));
        if (data) {
          // this.listOfIntents = this.listOfIntents.map((obj) => (obj.id === intentID ? data : obj));
          // data['attributesChanged'] = true;
          console.log('[INTENT SERVICE] patchAttributes OK: ', data);
          // this.behaviorIntent.next(data);
        }
      }, (error) => {
        console.log('error:   ', error);
      }, () => {
        console.log('complete');
      });
    }, 2000);
  }



  /** setDragAndListnerEventToElement */
  public setDragAndListnerEventToElement(intent) {
    let intervalId = setInterval(async () => {
      const result = checkIFElementExists(intent.intent_id);
      if (result === true) {
        console.log('[INTENT SERVICE] Condition is true ', intent.intent_id);
        this.stageService.setDragElement(intent.intent_id);
        // this.intentService.setListnerEvent(intent);
        clearInterval(intervalId);
      }
    }, 100); 
    // Chiamiamo la funzione ogni 100 millisecondi (0.1 secondo)
    // Termina l'intervallo dopo 2 secondi (2000 millisecondi)
    setTimeout(() => {
      console.log('Timeout: 2 secondo scaduto.');
      clearInterval(intervalId);
    }, 2000);
  }

  /************************************************/
  /** UNDO / REDO */
  /************************************************/
  public addUNDOtoList(){
    // const cloneIntents = JSON.parse(JSON.stringify(intents));
    this.arrayUNDO.push(this.prevListOfIntent);
    console.log('[INTENT SERVICE] -> addUNDO', this.arrayUNDO);
    // this.arrayUNDO = this.arrayUNDO.slice(10);
    this.arrayREDO = [];
  }


  private async confrontaArray(arrayLIVE, arrayUNDO_REDO) {
    for (const itemUNDOREDO of arrayUNDO_REDO) {
      // console.log('[INTENT SERVICE] addUNDO -> intent_id',  itemUNDO.intent_id);
      const itemLive = arrayLIVE.find((element) => element.intent_id === itemUNDOREDO.intent_id);
      if (itemLive) {
        if(JSON.stringify(itemLive) !== JSON.stringify(itemUNDOREDO)){
          // update intent
          console.log('[INTENT SERVICE] ->  UPDATE INTENT',  itemUNDOREDO);
          // this.connectorService.deleteConnectorsOfBlock(itemUNDOREDO.intent_id);
          this.updateIntent(itemUNDOREDO, 0, true);
        }
      } else {
        // insert new intent
        // caso in cui arrayUNDO contiene un item in più dell'array attualmente visualizzato
        // quindi bisogna creare un item
        console.log('[INTENT SERVICE] -> SALVO NEW INTENT',  itemUNDOREDO);
        let id_faq_kb = this.dashboardService.id_faq_kb;
        // const oldId = itemUNDOREDO.id?itemUNDOREDO.id:null;
        const newIntent = await this.saveNewIntent(id_faq_kb, itemUNDOREDO, true);
        if (newIntent) {
          this.intentSelected.id = newIntent.id;
          this.replaceNewIntentToListOfIntents(newIntent, itemUNDOREDO.id);
          this.setDragAndListnerEventToElement(newIntent);

          this.connectorService.createConnectors(this.listOfIntents);
        }
      }
    }


    // Estrai tutti gli intent_id da array1
    const intentIdsArrayUNDOREDO = arrayUNDO_REDO.map((obj) => obj.intent_id);
    // Filtra gli oggetti in array2 che non hanno un corrispondente intent_id in array1
    const missingItemsInUNDOREDO = arrayLIVE.filter(
      (item) => !intentIdsArrayUNDOREDO.includes(item.intent_id)
    );
    console.log('[INTENT SERVICE] -> ELIMINO INTENT 1',  missingItemsInUNDOREDO);
    if(missingItemsInUNDOREDO && missingItemsInUNDOREDO.length>0){
      // caso in cui array attuale contiene un item in più dell'array UNDO REDO
      // quindi bisogna eliminare un item
      missingItemsInUNDOREDO.forEach(element => {
        console.log('[INTENT SERVICE] -> ELIMINO INTENT 2',  element);
        this.deleteIntent(element, true);
        this.connectorService.deleteConnectorsOfBlock(element.intent_id);
      });
    }
    // return true; // Tutti gli oggetti con lo stesso ID sono equivalenti
  }



  public restoreLastUNDO(){
    if(this.arrayUNDO && this.arrayUNDO.length>0){
      const listOfIntentsUNDO = this.arrayUNDO.pop();
      console.log('[INTENT SERVICE] -> restoreLastUNDO', listOfIntentsUNDO, this.arrayUNDO);
      const listOfIntentsLIVE = JSON.parse(JSON.stringify(this.listOfIntents));
      this.arrayREDO.push(listOfIntentsLIVE);
      this.confrontaArray(listOfIntentsLIVE, listOfIntentsUNDO);
      
      this.listOfIntents = listOfIntentsUNDO;
      this.refreshIntents();
      // this.connectorService.deleteAllConnectors();
      // this.connectorService.createConnectors(this.listOfIntents);
      // this.refreshIntents();
    }
  }

  public restoreLastREDO(){
    if(this.arrayREDO && this.arrayREDO.length>0){
      const listOfIntentsREDO = this.arrayREDO.pop();
      console.log('[INTENT SERVICE] -> restoreLastREDO', listOfIntentsREDO);
      const listOfIntentsLIVE = JSON.parse(JSON.stringify(this.listOfIntents));
      this.arrayUNDO.push(listOfIntentsLIVE);
      this.confrontaArray(listOfIntentsLIVE, listOfIntentsREDO);
      
      this.listOfIntents = listOfIntentsREDO;
      this.refreshIntents();
      // this.connectorService.deleteAllConnectors();
      // this.connectorService.createConnectors(this.listOfIntents);
      
    }
  }
  /************************************************/

}
