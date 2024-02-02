import { Injectable, setTestabilityGetter } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';

import { ActionReply, ActionAgent, ActionAssignFunction, ActionAssignVariable, ActionChangeDepartment, ActionClose, ActionDeleteVariable, ActionEmail, ActionHideMessage, ActionIntentConnected, ActionJsonCondition, ActionOnlineAgent, ActionOpenHours, ActionRandomReply, ActionReplaceBot, ActionWait, ActionWebRequest, Command, Wait, Message, Expression, Action, ActionAskGPT, ActionWhatsappAttribute, ActionWhatsappStatic, ActionWebRequestV2, ActionGPTTask, ActionCaptureUserReply, ActionQapla, ActionCondition, ActionMake, ActionAssignVariableV2, ActionHubspot, ActionCode, ActionReplaceBotV2, ActionAskGPTV2 } from 'src/app/models/action-model';
import { Intent } from 'src/app/models/intent-model';
import { FaqService } from 'src/app/services/faq.service';
import { FaqKbService } from 'src/app/services/faq-kb.service';
import { TYPE_INTENT_ELEMENT, TYPE_INTENT_NAME, TYPE_ACTION, TYPE_COMMAND, removeNodesStartingWith, generateShortUID, preDisplayName, isElementOnTheStage, insertItemInArray, replaceItemInArrayForKey, deleteItemInArrayForKey } from '../utils';
import { ConnectorService } from '../services/connector.service';
import { ControllerService } from '../services/controller.service';
import { StageService } from '../services/stage.service';
import { DashboardService } from 'src/app/services/dashboard.service';
import { TiledeskAuthService } from 'src/chat21-core/providers/tiledesk/tiledesk-auth.service';
import { environment } from 'src/environments/environment';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { ExpressionType } from '@angular/compiler';

/** CLASSE DI SERVICES PER TUTTE LE AZIONI RIFERITE AD OGNI SINGOLO INTENT **/

@Injectable({
  providedIn: 'root'
})
export class IntentService {
  idBot: string;
  behaviorIntents = new BehaviorSubject <Intent[]>([]);
  behaviorIntent = new BehaviorSubject <Intent>(null);
  liveActiveIntent = new BehaviorSubject<Intent>(null);
  testIntent = new BehaviorSubject<Intent>(null);
  behaviorUndoRedo = new BehaviorSubject<{ undo: boolean, redo: boolean }>({undo:false, redo: false});

  listOfIntents: Array<Intent> = [];
  prevListOfIntent: Array<Intent> = [];
  // selectedIntent: Intent;
  intentSelected: Intent;
  listActions: Array<Action>;
  selectedAction: Action;

  actionSelectedID: string;
  // intentSelectedID: string;

  previousIntentId: string = '';
  // preDisplayName: string = 'untitled_block_';
  
  botAttributes: any = {};
  listOfPositions: any = {};

  setTimeoutChangeEvent: any;
  idIntentUpdating: string;

  intentNameAlreadyExist: boolean;

  payload: any;
  operationsUndo: any = [];
  operationsRedo: any = [];
  // newPosition: any = {'x':0, 'y':0};
  

  private changedConnector = new Subject<any>();
  public isChangedConnector$ = this.changedConnector.asObservable();



  public arrayUNDO: Array<any> = [];
  public arrayREDO: Array<any> = [];
  public lastActionUndoRedo: boolean;

  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private faqService: FaqService,
    private faqKbService: FaqKbService,
    private connectorService: ConnectorService,
    private controllerService: ControllerService,
    private stageService: StageService,
    private dashboardService: DashboardService,
    private tiledeskAuthService: TiledeskAuthService
  ) { }


  /**
   * onChangedConnector
   * funzione chiamata sul 'connector-created', 'connector-deleted'
   * per notificare alle actions che i connettori sono cambiati
   */
  public onChangedConnector(connector){
    console.log('[INTENT SERVICE] ::: onChangedConnector:: ', connector);
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
    // console.log('[INTENT SERVICE] ::: setDefaultIntentSelected ::: ', this.intentSelected);
    this.behaviorIntent.next(this.intentSelected);
    //this.liveActiveIntent.next(this.intentSelected);
  }


  public setIntentSelectedById(intent_id?){
    if(this.listOfIntents && this.listOfIntents.length > 0 && intent_id){
      this.intentSelected = this.listOfIntents.find(obj => ( obj.intent_id === intent_id));
    } else {
      this.intentSelected = null;
    }
  }

  public setIntentSelectedByIntent(intent){
    this.intentSelected = intent;
  }

  public setIntentSelectedPosition(x, y){
    if (this.intentSelected && this.intentSelected.attributes) {
      if (!this.intentSelected.attributes.position) {
        this.intentSelected.attributes.position = {};
      }
      this.intentSelected.attributes.position = {'x': x, 'y': y};
    } else {
      this.intentSelected = {
        attributes: {
          position: {
            x: x,
            y: y
          }
        }
      };
    }
  }

  public updateIntentSelected(){
    if(this.intentSelected){
      this.updateIntent(this.intentSelected);
    }
  }

  public addActionToIntentSelected(action){
    if(this.intentSelected){
      this.intentSelected.actions.push(action);
      this.updateIntent(this.intentSelected);
    }
  }

  // public setElementSelected(action){
  //   if(action && action._tdActionId){
  //     this.actionSelectedID = action._tdActionId;
  //     this.selectedAction = action;
  //   } else {
  //     this.actionSelectedID = null;
  //     this.selectedAction = null;
  //   }
  // }

  
  public setLiveActiveIntent(intentName: string){
    let intent = this.listOfIntents.find((intent) => intent.intent_display_name === intentName);
    this.liveActiveIntent.next(intent)
  }

  /** 
   * restituisce tutti gli intents
   */
  getIntents() {
    // console.log('getIntents: ',  this.behaviorIntents);
    return this.behaviorIntents.asObservable();
  }


  getIntentFromId(intentId) {
    let intent = this.listOfIntents.find((intent) => intent.intent_id === intentId);
    return intent;
  }



  // START DASHBOARD FUNCTIONS //

  refreshIntents(){
    // console.log("aggiorno elenco intent: ", this.listOfIntents);
    this.behaviorIntents.next(this.listOfIntents);
  }

  refreshIntent(intentSelected){
    console.log("aggiorno singolo intent", intentSelected);
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
    // console.log("getPreviousIntent: ", this.listOfIntents, this.previousIntentId)
    return this.listOfIntents.find((intent) => intent.intent_id === this.previousIntentId);
  }

  getIntentPosition(intentId: string){
    let pos = {'x':0, 'y':0};
    let intent = this.listOfIntents.find((intent) => intent.intent_id === intentId);
    // console.log('getIntentPosition intentId: ', intentId, intent);
    if(!intent || !intent.attributes || !intent.attributes.position)return pos;
    return intent.attributes.position;
    
  }

  // START INTENT FUNCTIONS //

  /** GET ALL INTENTS  */
  public async getAllIntents(id_faq_kb): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.faqService.getAllFaqByFaqKbId(id_faq_kb).subscribe((faqs: Intent[]) => {
        if (faqs) {
          this.patchActionId(faqs);
          this.listOfIntents = JSON.parse(JSON.stringify(faqs));
          this.prevListOfIntent = JSON.parse(JSON.stringify(faqs));
        } else {
          this.listOfIntents = [];
          this.prevListOfIntent = [];
        }
        this.refreshIntents();
        resolve(true);
      }, (error) => {
        console.error('ERROR: ', error);
        reject(false);
      }, () => {
        resolve(true);
      });
    });
  }


  /**
   * patchActionId
   * @param faqs 
   * quando creo un nuovo bot gli elementi welcome e defaultfallback non hanno un _tdActionId
   * perchè generati dal server. In questo caso è necessario assegnarne uno.
   */
  public patchActionId(faqs){
    faqs.forEach(element => {
      element.actions.forEach(action => {
        if(!action._tdActionId || action._tdActionId === "UUIDV4"){
          action._tdActionId = action._tdActionId?action._tdActionId:generateShortUID();
        }
      });
    });
  }
 

  /** create a new intent when drag an action on the stage */
  public createNewIntent(id_faq_kb: string, action: any, pos:any){
    let intent = new Intent();
    intent.id_faq_kb = id_faq_kb;
    intent.attributes.position = pos;
    intent.intent_display_name = this.setDisplayName();
    // let actionIntent = this.createNewAction(TYPE_ACTION.INTENT);
    // intent.actions.push(actionIntent);
    intent.actions.push(action);
    console.log("[INTENT SERVICE] ho creato un nuovo intent contenente l'azione ", intent, " action:", action, " in posizione ", pos);
    return intent;
  }


  // public updateActionIntent(intent){
  //   let actionIntent = null;
  //   for (let i = this.intentSelected.actions.length - 1; i >= 0; i--) {
  //     if (this.intentSelected.actions[i]._tdActionType === TYPE_ACTION.INTENT) {
  //       if(!actionIntent){
  //         actionIntent = JSON.parse(JSON.stringify(this.intentSelected.actions[i]));
  //       }
  //       this.intentSelected.actions.splice(i, 1);
  //     }
  //   }
  //   if(!actionIntent){
  //     actionIntent = this.createNewAction(TYPE_ACTION.INTENT);
  //   }
  //   this.intentSelected.actions.push(actionIntent);
  //   return actionIntent;
  // } 

  /** generate display name of intent */
  public setDisplayName(){
    // let listOfIntents = this.behaviorIntents.getValue();
    let displayNames = this.listOfIntents.filter((element) => element.intent_display_name.startsWith(preDisplayName))
                                          .map((element) => element.intent_display_name.replace(preDisplayName, ''));
    // displayNames = displayNames.slice().sort();
    const numbers = displayNames.filter(el => el !== '').map((name) => parseInt(name, 10));
    numbers.sort((a, b) => a - b);
    const lastNumber = numbers[numbers.length - 1];
    if(numbers.length>0){
      return preDisplayName+(lastNumber+1);
    } else {
      return preDisplayName+1;
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


  /************************************************/
  /** START FUNCTIONS: PUSH DEL PUT PATCH         */
  /************************************************/
  /**
   * patchAttributes
   * @param intent 
   * @param UndoRedo 
   * 
   * verifica se devo o meno aggiungere l'azione ad UNDO 
   * verifico se effettivamente c'è stato uno spostamento altrimenti esco
   * aggiungo PUT ad UNDO
   * imposto un timeout di 1/2 secondo prima di salvare la patch (questo per evitare molteplici salvataggi ravvicinati)
   */
  patchAttributes( intent: Intent, UndoRedo:boolean = true) {
    const intentID = intent.id;
    const attributes = intent.attributes;
    console.log('[INTENT SERVICE] -> patchAttributes, ', intent);
    let intentPrev = this.prevListOfIntent.find((item) => item.intent_id === intent.intent_id);
    if(JSON.stringify(intentPrev.attributes) === JSON.stringify(intent.attributes))return;
    // if(intentPrev.attributes.position.x === intent.attributes.position.x && intentPrev.attributes.position.y === intent.attributes.position.y)return;

    // if(UndoRedo){
    //   const prevIntents = JSON.parse(JSON.stringify(this.prevListOfIntent));
    //   const nowIntents = JSON.parse(JSON.stringify(this.listOfIntents));
    //   let intentsToUpdateUndo = this.setListOfintentsToUpdate(intent, prevIntents);
    //   let intentsToUpdateRedo = this.setListOfintentsToUpdate(intent, nowIntents);
    //   let intentPrev = prevIntents.find((item) => item.intent_id === intent.intent_id)?prevIntents.find((item) => item.intent_id === intent.intent_id):intent;
    //   let intentNow = nowIntents.find((item) => item.intent_id === intent.intent_id)?nowIntents.find((item) => item.intent_id === intent.intent_id):intent;
    //   this.addIntentToUndoRedo('PUT', intentPrev, intentNow, intentsToUpdateUndo, intentsToUpdateRedo);
    // }
    // clearTimeout(this.setTimeoutChangeEvent);
    // this.setTimeoutChangeEvent = setTimeout(() => {
      this.faqService.patchAttributes(intentID, attributes).subscribe((data) => {
        if (data) {
          this.prevListOfIntent = JSON.parse(JSON.stringify(this.listOfIntents));
          // data['attributesChanged'] = true;
          // console.log('[INTENT SERVICE] patchAttributes OK: ', data);
          // this.behaviorIntent.next(data);
        }
      }, (error) => {
        console.log('error:   ', error);
      }, () => {
        console.log('complete');
      });
    // }, 500);
  }

  /**
   * saveNewIntent
   * @param intent 
   * @param nowIntent 
   * @param prevIntent 
   * @param UndoRedo 
   * @returns 
   * set and save the action in UNDO
   * save the intent on the server
   */
  // async saveNewIntent(intent:Intent, nowIntent: Intent, prevIntent: Intent, UndoRedo:boolean = true){
  //   if(UndoRedo){
  //     let intentsToUpdateUndo = prevIntent?[JSON.parse(JSON.stringify(prevIntent))]:[];
  //     let intentsToUpdateRedo = nowIntent?[JSON.parse(JSON.stringify(nowIntent))]:[];
  //     console.log('[INTENT SERVICE] -> saveNewIntent, ',intentsToUpdateUndo, intentsToUpdateRedo);
  //     this.addIntentToUndoRedo('PUSH', intent, intent, intentsToUpdateUndo, intentsToUpdateRedo);
  //   }
  //   const savedIntent = await this.addIntent(intent);
  //   if (savedIntent) {
  //     console.log('[CDS-CANVAS] Intent salvato correttamente: ', savedIntent, this.listOfIntents);
  //     // this.replaceNewIntentToListOfIntents(savedIntent);
  //     this.listOfIntents = this.replaceIntent(savedIntent);
  //     this.refreshIntents();
  //     this.setDragAndListnerEventToElement(savedIntent.intent_id);
  //     return savedIntent;
  //   } else {
  //     return false;
  //   }
  // }

  /** save a New Intent, created on drag action on stage */
  // public async addIntent(newIntent: Intent): Promise<any> { 
  //   let id_faq_kb = this.dashboardService.id_faq_kb;
  //   console.log('[INTENT SERVICE] -> saveNewIntent, ');
  //   return new Promise((resolve, reject) => {
  //     // console.log("[INTENT SERVICE]  salva ");
  //     const that = this;
  //     const intentToAdd = { 
  //       'id_faq_kb': id_faq_kb, 
  //       'attributes': newIntent.attributes,
  //       'question': newIntent.question, 
  //       'answer': newIntent.answer, 
  //       'intent_display_name': newIntent.intent_display_name,
  //       'intent_id': newIntent.intent_id,
  //       'form': newIntent.form,
  //       'actions': newIntent.actions,
  //       'webhook_enabled': newIntent.webhook_enabled
  //     };
  //     this.faqService.addIntent(intentToAdd).subscribe((intent:any) => {
  //       // console.log("[INTENT SERVICE]  ho salvato in remoto l'intent ", intent, newIntent, this.listOfIntents);
  //       this.prevListOfIntent = JSON.parse(JSON.stringify(this.listOfIntents));
  //       resolve(intent);
  //     }, (error) => {
  //       console.error('[INTENT SERVICE]  ERROR: ', error);
  //       reject(false);
  //     }, () => {
  //       resolve(false);
  //     });
  //   });
  // }

  // /** deleteIntent */
  // deleteIntent_OLD(intent: Intent, UndoRedo:boolean = true){
  //   console.log('[INTENT SERVICE] -> deleteIntent, ', intent);
  //   if(UndoRedo){
  //     const prevIntents = JSON.parse(JSON.stringify(this.prevListOfIntent));
  //     const nowIntents = JSON.parse(JSON.stringify(this.listOfIntents));
  //     let intentsToUpdateUndo = this.setListOfintentsToUpdate(intent, prevIntents);
  //     let intentsToUpdateRedo = this.setListOfintentsToUpdate(intent, nowIntents);
  //     let intentPrev = prevIntents.find((item) => item.intent_id === intent.intent_id)?prevIntents.find((item) => item.intent_id === intent.intent_id):intent;
  //     let intentNow = nowIntents.find((item) => item.intent_id === intent.intent_id)?nowIntents.find((item) => item.intent_id === intent.intent_id):intent;
  //     this.addIntentToUndoRedo('DEL', intentPrev, intentNow, intentsToUpdateUndo, intentsToUpdateRedo);
  //   }
  //   this.deleteFaq(intent);
  //   // this.updateIntents(intentsToUpdateRedo);
  // }
  /** deleteFaq */
  // public async deleteFaq(intent: Intent): Promise<boolean> { 
  //   console.log('[INTENT SERVICE] -> deleteFaq, ');
  //   return new Promise((resolve, reject) => {
  //     this.faqService.deleteFaq(intent.id, intent.intent_id, intent.id_faq_kb).subscribe((data) => {
  //       this.prevListOfIntent = JSON.parse(JSON.stringify(this.listOfIntents));
  //       resolve(true);
  //     }, (error) => {
  //       // console.error('ERROR: ', error);
  //       reject(false);
  //     }, () => {
  //       resolve(true);
  //     });
  //   });
  // }

  /**
   * onUpdateIntentWithTimeout2
   * @param originalIntent 
   * @param timeout 
   * @param UndoRedo 
   * @param connector 
   * @returns 
   */
  // public async onUpdateIntentWithTimeout2(originalIntent: Intent, timeout: number=0, undo:boolean = false, connector?: any): Promise<boolean> { 
  //   const thereIsIntent = this.listOfIntents.some((intent) => intent.intent_id === originalIntent.intent_id);
  //   console.log('[INTENT SERVICE] -> onUpdateIntentWithTimeout2, ', originalIntent, connector);
  //   if(!thereIsIntent)return;
  //   let intent = JSON.parse(JSON.stringify(originalIntent));
  //   const prevIntents = JSON.parse(JSON.stringify(this.prevListOfIntent));
  //   const nowIntents = JSON.parse(JSON.stringify(this.listOfIntents));
  //   // console.log('[INTENT SERVICE] -> onUpdateIntentWithTimeout22, ',prevIntents, nowIntents);
    
  //   if(undo || connector){
  //     let intentPrev = prevIntents.find((item) => item.intent_id === intent.intent_id)?prevIntents.find((item) => item.intent_id === intent.intent_id):intent;
  //     let intentNow = nowIntents.find((item) => item.intent_id === intent.intent_id)?nowIntents.find((item) => item.intent_id === intent.intent_id):intent;
  //     let intentsToUpdateUndo = [intentPrev];
  //     let intentsToUpdateRedo = [intentNow];
  //     // if(connector && connector.undo) this.addIntentToUndoRedo('CONN', intentPrev, intentNow, intentsToUpdateUndo, intentsToUpdateRedo, connector);
  //     // else if(!connector && undo)this.addIntentToUndoRedo('PUT', intentPrev, intentNow, intentsToUpdateUndo, intentsToUpdateRedo);
  //   }
  //   if(!timeout)timeout = 0;
  //   return new Promise((resolve, reject) => {
  //     if(this.idIntentUpdating == originalIntent.intent_id){
  //       clearTimeout(this.setTimeoutChangeEvent);
  //     } else {
  //       this.idIntentUpdating = originalIntent.intent_id;
  //     }
  //     this.setTimeoutChangeEvent = setTimeout(async () => {
  //       const response = await this.updateIntent(intent);
  //       if (response) {
  //         resolve(true);
  //       } else {
  //         reject(false);
  //       }
  //     }, timeout);
  //   });
  // }


  public updateIntentInMoveActionBetweenDifferentIntents(action, currentIntent, UndoRedo:boolean = true){
    const thereIsIntent = this.listOfIntents.some((intent) => intent.intent_id === currentIntent.intent_id);
    console.log('[INTENT SERVICE] -> updateIntentInMoveActionBetweenDifferentIntents, ', thereIsIntent, currentIntent);
    if(!thereIsIntent)return;
    let intent = JSON.parse(JSON.stringify(currentIntent));
    const prevIntents = JSON.parse(JSON.stringify(this.prevListOfIntent));
    const nowIntents = JSON.parse(JSON.stringify(this.listOfIntents));
    console.log('[INTENT SERVICE] -> updateIntentInMoveActionBetweenDifferentIntents, ',prevIntents, nowIntents);
    if(UndoRedo){
      const tdAction = action._tdActionId;
      let intentOriginActionPrev = prevIntents.find((obj) => obj.actions.some((action) => action._tdActionId === tdAction));
      let intentOriginActionNow = nowIntents.find((obj) => obj.intent_id === intentOriginActionPrev.intent_id);
      let intentPrev = prevIntents.find((item) => item.intent_id === intent.intent_id)?prevIntents.find((item) => item.intent_id === intent.intent_id):intent;
      let intentNow = nowIntents.find((item) => item.intent_id === intent.intent_id)?nowIntents.find((item) => item.intent_id === intent.intent_id):intent;
      // this.addIntentToUndoRedo('PUT', intentPrev, intentNow, [intentOriginActionPrev], [intentOriginActionNow]);
    }
    // const response = this.updateIntent(intent);
  }

  /************************************************/
  /** END FUNCTIONS: PUSH DEL PUT PATCH           */
  /************************************************/

  


  // public updateIntents(listOfIntents, intent){
  //   const intents = JSON.parse(JSON.stringify(listOfIntents));
  //   let intentsToUpdate = this.setListOfintentsToUpdate(intent, intents);
  //   // aggiorna gli intent connessi all'intent eliminato
  //   intentsToUpdate.forEach(element => {
  //     this.updateIntent(element);
  //   });
  // }
  // END INTENT FUNCTIONS //





  // START ACTION FUNCTIONS //

  /** update title of intent */
  public async changeIntentName(intent){
    // setTimeout(async () => {
      let prevIntent = this.prevListOfIntent.find((obj) => obj.intent_id === intent.intent_id);
      if(intent.intent_display_name !== prevIntent.intent_display_name){
        // this.connectorService.updateConnector(intent.intent_id);
        // const response = await this.onUpdateIntentWithTimeout2(intent, 0, true);
        const response = await this.updateIntent(intent);
        // if(response){
          // this.behaviorIntents.next(this.listOfIntents);
          // this.refreshIntent(intent);
          this.setDragAndListnerEventToElement(intent.intent_id);
        // }
      }
    // }, 500);
  }


  // moving new action in intent from panel elements
  public moveNewActionIntoIntent(currentActionIndex, action, currentIntentId): any {
    // console.log('[INTENT-SERVICE] moveNewActionIntoIntent');
    let newAction = this.createNewAction(action.value.type);
    let currentIntent = this.listOfIntents.find(function(obj) {
      return obj.intent_id === currentIntentId;
    });
    currentIntent.actions.splice(currentActionIndex, 0, newAction);
    this.behaviorIntent.next(currentIntent);
    // this.connectorService.updateConnector(currentIntent.intent_id);
    // this.onUpdateIntentWithTimeout2(currentIntent, 0, true);
    this.updateIntent(currentIntent);
    // setTimeout(async () => {
      // const responseCurrentIntent = await this.onUpdateIntentWithTimeout2(currentIntent, 0, true);
      // if(responseCurrentIntent){
      //   // const fromEle = document.getElementById(currentIntent.intent_id);
      //   // this.connectorService.updateConnector(currentIntent.intent_id);
      //   console.log('update current Intent: OK');
      //   //this.behaviorIntent.next(currentIntent);
      // }
    // }, 0);
    return newAction
  }

  // on move action from different intents
  public moveActionBetweenDifferentIntents(event, action, currentIntentId){
    console.log('[INTENT-SERVICE] moveActionBetweenDifferentIntents');
    const that = this;
    // console.log('moving action from another intent - action: ', currentIntentId);
    let currentIntent = this.listOfIntents.find(function(obj) {
      return obj.intent_id === currentIntentId;
    });
    let previousIntent = this.listOfIntents.find(function(obj) {
      return obj.intent_id === that.previousIntentId;
    });
    // console.log('moveActionBetweenDifferentIntents: ', event, this.listOfIntents, currentIntentId, currentIntent, previousIntent);
    currentIntent.actions.splice(event.currentIndex, 0, action);
    previousIntent.actions.splice(event.previousIndex, 1);

    this.updateIntent(currentIntent, previousIntent);
    return;
    // this.connectorService.updateConnector(currentIntent.intent_id);
    // this.connectorService.updateConnector(previousIntent.intent_id);
    this.connectorService.deleteConnectorsFromActionByActionId(action._tdActionId);
    const responsePreviousIntent = this.updateIntent(previousIntent);
    // const responsePreviousIntent = this.onUpdateIntentWithTimeout2(previousIntent, 0, false);
    if(responsePreviousIntent){
      this.behaviorIntent.next(previousIntent);
    }
    const responseCurrentIntent = this.updateIntentInMoveActionBetweenDifferentIntents(action,currentIntent);
    // devo fare una funzione che passa anche lo stato di intent prev onUpdateIntentWithTimeout2 NON va bene
    // const responseCurrentIntent = this.onUpdateIntentWithTimeout2(currentIntent);
  }


  /**
   * addNewIntentToListOfIntents
   * @param intent 
   */
  public addNewIntentToListOfIntents(intent){
    // console.log("[CDS-INTENT-SERVICES] aggiungo l'intent alla lista di intent");
    this.listOfIntents.push(intent);
    this.refreshIntents();
    // this.behaviorIntents.next(this.listOfIntents);
  }

  /**
   * 
   * @param intentId 
   */
  // public deleteIntentToListOfIntents(intentId){
  //   // console.log("[CDS-INTENT-SERVICES] elimino l'intent alla lista di intent", intentId);
  //   // devo aggiornare tutti gli intent connessi
  //   // this.deleteAllConnectorsInAndUpdateIntents();
  //   return this.listOfIntents.filter((intent: any) => intent.intent_id !== intentId);
  // }

  // public updateAndSaveAllIntentsConnectedToDeletedIntent(intentId){
  //   // console.log("[CDS-INTENT-SERVICES] updateAllIntentsConnectedToDeletedIntent: intentId ", intentId);
  //   let arrayOfIntents = [];
  //   const listConnectors = this.connectorService.searchConnectorsInOfIntent(intentId);
  //   listConnectors.forEach(element => {
  //     const splitFromId = element.fromId.split('/');
  //     const intentToUpdateId = splitFromId[0];
  //     const resp = arrayOfIntents.some((obj) => obj.intent_id === intentToUpdateId);
  //     if(!resp){
  //       let intent = this.listOfIntents.find((intent: any) => intent.intent_id === intentToUpdateId);
  //       arrayOfIntents.push(intent);
  //     }
  //   });
  //   arrayOfIntents.forEach(intent => {
  //     // cerca in tutto l'array di actions se c'è una action che contiene intentId (quindi connessa con l'intent da eliminare) e in questo caso assegna il campo a null
  //     for (let i = 0; i < intent.actions.length; i++) {
  //       const object = intent.actions[i];
  //       for (const key in object) {
  //         // console.log("[CDS-INTENT-SERVICES] object[key]: ", object[key], intentId);
  //         if (typeof object[key] === 'string' && object[key].includes(intentId)) {
  //           object[key] = null;
  //         }
  //       }
  //     }
  //     this.updateIntent(intent);
  //   });
  // }


  /** getListOfActions */
  public getListOfActions(){
    return this.listActions;
  }

  /**
   * getListOfIntents
   * @returns 
   */
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
    // console.log('[INTENT SERVICE] --> selectIntent',  this.listOfIntents, intentID);
    this.intentSelected = this.listOfIntents.find(intent => intent.intent_id === intentID);
    if(this.intentSelected)this.stageService.setDragElement(this.intentSelected.intent_id);
   
  }

  /** selectAction */
  public selectAction(intentID, actionId){
    this.actionSelectedID = actionId;
    this.intentSelected = this.listOfIntents.find(intent => intent.intent_id === intentID);
    this.listActions = this.intentSelected.actions;
    this.selectedAction = this.listActions.find(action => action._tdActionId === actionId);
    // console.log('[INTENT SERVICE] --> selectAction: ', intentID, actionId);
    this.behaviorIntent.next(this.intentSelected);
  }

  /** setIntentSelected */
  public setIntentSelected(intentID){
    this.selectIntent(intentID);
    this.actionSelectedID = null;
    this.listActions = this.intentSelected.actions?this.intentSelected.actions:null;
    this.selectedAction = null;
    // console.log('[INTENT SERVICE] ::: setIntentSelected ::: ', this.intentSelected);
    this.behaviorIntent.next(this.intentSelected);
    // if(!this.intentSelected)return;
    // chiudo tutti i pannelli
    // this.controllerService.closeAllPanels();
  }


  public async setStartIntent(){
    this.intentSelected = this.listOfIntents.find((intent) => intent.intent_display_name === 'start');
    this.logger.log('[CDS-CANVAS]  intentSelected: ', this.intentSelected);
    if(this.intentSelected){
      this.setDefaultIntentSelected();
      //** center stage on 'start' intent */
      let startElement = await isElementOnTheStage(this.intentSelected.intent_id); // sync
      if(startElement){
        this.stageService.centerStageOnHorizontalPosition(startElement);
      }
    }
  }


  /** unselectAction */
  public unselectAction(){
    this.actionSelectedID = null;
    // this.intentSelectedID = null;
  }

  /** deleteSelectedAction 
   * deleteConnectorsFromActionByActionId: elimino i connettori in uscita della action
   * aggiorno l'intent con la nuova action 
   * aggiorno la lista degli intents
   * refreshIntent: aggiorno gli attributi della action (pallini)
   * updateConnector: aggiorno i connettori
   * closeAllPanels: chiudo i pannelli
   * onUpdateIntentWithTimeout2: salvo l'intent
  */
  public deleteSelectedAction(){
    // console.log('[INTENT SERVICE] ::: deleteSelectedAction', this.intentSelected.intent_id, this.actionSelectedID);
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
      this.refreshIntent(intentToUpdate);
      // this.connectorService.updateConnector(intentToUpdate.intent_id);
      this.controllerService.closeAllPanels();
      // this.connectorService.deleteConnectorsFromActionByActionId(this.actionSelectedID);
      // const responseIntent = this.onUpdateIntentWithTimeout2(intentToUpdate, 0, true);
      const responseIntent = this.updateIntent(intentToUpdate);
      if(responseIntent){
        // this.connectorService.movedConnector(intentToUpdate.intent_id);
        console.log('update Intent: OK');
      }
      this.unselectAction();
      // console.log('deleteSelectedAction', intentToUpdate);
    }
  } 


  /**
   * createNewAction
   * @param typeAction 
   * @returns 
   */
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
    if(typeAction === TYPE_ACTION.ASSIGN_VARIABLE_V2){
      action = new ActionAssignVariableV2();
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
    if(typeAction === TYPE_ACTION.REPLACE_BOTV2){
      action = new  ActionReplaceBotV2();
    }
    if(typeAction === TYPE_ACTION.CHANGE_DEPARTMENT) {
      action = new  ActionChangeDepartment();
      action.triggerBot = true;
    }
    if(typeAction === TYPE_ACTION.HIDE_MESSAGE){
      action = new ActionHideMessage();
    }
    if(typeAction === TYPE_ACTION.JSON_CONDITION){
      action = new ActionJsonCondition();
      action.groups.push( new Expression());
    }
    if(typeAction === TYPE_ACTION.CONDITION) {
      action = new ActionCondition();
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
    if(typeAction === TYPE_ACTION.ASKGPTV2) {
      action = new ActionAskGPTV2();
      action.question = '{{last_user_text}}'
      action.assignReplyTo = 'kb_reply';
      action.assignSourceTo = 'kb_source';
      action.model = 'gpt-3.5-turbo'
    }
    if(typeAction === TYPE_ACTION.GPT_TASK){
      action = new ActionGPTTask();
      action.max_tokens = 128;
      action.temperature = 0.7;
      action.model = "gpt-3.5-turbo";
      action.assignReplyTo = 'gpt_reply';
      action.preview = [];
    }
    if(typeAction === TYPE_ACTION.CAPTURE_USER_REPLY) {
      action = new ActionCaptureUserReply();
    }
    if(typeAction === TYPE_ACTION.QAPLA) {
      action = new ActionQapla();
      action.assignStatusTo = 'qapla_status';
      action.assignResultTo = 'qapla_result';
      action.assignErrorTo = 'qapla_error';
      this.segmentActionAdded(TYPE_ACTION.QAPLA);
    }
    if(typeAction === TYPE_ACTION.MAKE){
      action = new ActionMake();
      action.assignStatusTo = 'make_status';
      action.assignErrorTo = 'make_error';
    }
    if(typeAction === TYPE_ACTION.HUBSPOT){
      action = new ActionHubspot();
      action.assignStatusTo = 'hubspot_status';
      action.assignErrorTo = 'hubspot_error';
    }
    if(typeAction === TYPE_ACTION.CODE){
      action = new ActionCode();
    }
    return action;
  }
  // END ATTRIBUTE FUNCTIONS //
  

  public patchButtons(buttons, idAction){
    // console.log('patchButtons:: ', buttons);
    buttons.forEach((button, index) => {
      const checkUid = buttons.filter(btn => btn.uid === button.uid);
      if (checkUid.length > 1 || !button.uid && button.uid == undefined) {
        button.uid = generateShortUID(index);
      } 
      buttons[index] = this.patchButton(button, idAction);
    }); 
    return buttons;
  }
  

  public patchButton(button, idAction){
    console.log('patchButton:: ', button);
    const idActionConnector = idAction+'/'+button.uid;
    button.__idConnector = idActionConnector;
    if(button.action && button.action !== ''){
      button.__isConnected = true;
      const posId = button.action.indexOf("#");
      if (posId !== -1) {
        // const toId = button.action.slice(posId+1);
        // button.__idConnection = idActionConnector+"/"+toId;
        let result = button.action;
        const regex = /#(.*?){/;
        const match = button.action.match(regex);
        // La sottostringa desiderata sarà nel secondo elemento dell'array 'match'
        if (match && match.length > 1) {
          result = match[1];
        }
        button.__idConnection = idActionConnector+"/"+result;
      }
    } else {
      button.__isConnected = false;
      button.__idConnection = null;
    }
    return button;
  }


  

  /**
   * setDragAndListnerEventToElement
   * @param intent 
   * after the element is on the stage, set the drag on the element
   */
  public async setDragAndListnerEventToElement(intent_id) {
    let isOnTheStage = await isElementOnTheStage(intent_id); // sync
    if(isOnTheStage){
      this.stageService.setDragElement(intent_id);
    }
  }


  /**
   * replaceIntent
   * @param intent 
   * @param listOfIntents 
   * @returns 
   */
  public replaceIntent(intent){
    for (let i = 0; i < this.listOfIntents.length; i++) {
      if (this.listOfIntents[i].intent_id === intent.intent_id) {
        this.listOfIntents[i] = intent;
        break;
      }
    }
    // console.log('[INTENT SERVICE] -> SOSTITUISCO:', intent, this.listOfIntents);
    return this.listOfIntents;
  }

  /**
   * setListOfintentsToUpdate
   * @param intent 
   * @param listOfIntents 
   * @returns 
   */
  private setListOfintentsToUpdate(intent, listOfIntents){
    let intentsToUpdate = [];
    const connectorsID = this.connectorService.searchConnectorsInByIntent(intent.intent_id);
    const nowIntents = JSON.parse(JSON.stringify(listOfIntents));
    console.log('setListOfintentsToUpdate', nowIntents, connectorsID);
    connectorsID.forEach(connector => {
      let splitFromId = connector['id'].split('/');
      let intent_id = splitFromId[0];
      const idEsistente = intentsToUpdate.some((obj) => obj.intent_id === intent_id);
      if (!idEsistente) {
        const intentUpdate = nowIntents.find((obj) => obj.intent_id === intent_id);
        intentsToUpdate.push(intentUpdate);
      }
    });
    console.log('setListOfintentsToUpdate', intentsToUpdate);
    return intentsToUpdate;
  }



  /************************************************
   * UNDO / REDO
   * 
   * 
  /************************************************/

  /** */
  public restoreLastUNDO(){
    console.log('[INTENT SERVICE] -> restoreLastUNDO', this.operationsUndo);
    this.lastActionUndoRedo = true;
    if(this.arrayUNDO && this.arrayUNDO.length>0){
      const objUNDO = JSON.parse(JSON.stringify(this.arrayUNDO.pop()));
      this.arrayREDO.push(objUNDO);
      // console.log('[INTENT SERVICE] -> RESTORE UNDO: ', this.arrayREDO);
      this.payload.operations = objUNDO.undo;
      console.log('[INTENT UNDO] -> ho aggiornato gli array dopo UNDO ', this.payload, this.arrayUNDO, this.arrayREDO);
      // this.refreshIntents();
      this.restoreIntent(objUNDO.undo);
      this.setBehaviorUndoRedo();
      this.opsUpdate(this.payload);
    }
    const action = this.intentSelected.actions.find((obj) => obj._tdActionId === this.actionSelectedID);
    console.log('[INTENT SERVICE] -> è action:: ', action, this.intentSelected, this.actionSelectedID);
  }

  /** */
  public restoreLastREDO(){
    console.log('[INTENT SERVICE] -> restoreLastREDO', this.operationsRedo);
    this.lastActionUndoRedo = true;
    // console.log('[INTENT SERVICE] -> restoreLastREDO', this.arrayREDO);
    if(this.arrayREDO && this.arrayREDO.length>0){
      const objREDO = JSON.parse(JSON.stringify(this.arrayREDO.pop()));
      this.arrayUNDO.push(objREDO);
      // console.log('[INTENT SERVICE] -> RESTORE REDO: ', objREDO);
      this.payload.operations = objREDO.redo;
      this.restoreIntent(objREDO.redo);
      this.setBehaviorUndoRedo();
      console.log('[INTENT UNDO] -> ho aggiornato gli array dopo REDO ', this.arrayUNDO, this.arrayREDO);
      this.opsUpdate(this.payload);
    }
  }

  private setBehaviorUndoRedo(){
    let stateUndo = true;
    let stateRedo = true;
    if(this.arrayUNDO.length == 0)stateUndo = false;
    if(this.arrayREDO.length == 0)stateRedo = false;
    this.behaviorUndoRedo.next({ undo: stateUndo, redo: stateRedo });
  }


  async restoreIntent(operations){
    operations.forEach(async ele => {
      let intent = JSON.parse(JSON.stringify(ele.intent));
      if(ele.type === 'post'){
        console.log('[INTENT SERVICE] -> POST: ', intent);
        this.listOfIntents = insertItemInArray(this.listOfIntents, intent);
        let isOnTheStage = await isElementOnTheStage(intent.intent_id); // sync
        if(isOnTheStage){
          this.connectorService.updateConnectorsOfBlock(intent.intent_id);
          this.refreshIntents();
          this.setIntentSelected(intent.intent_id);
          this.setDragAndListnerEventToElement(intent.intent_id);  
        }
      }
      else if(ele.type === 'delete'){
        console.log('[INTENT SERVICE] -> DELETE: ', intent);
        let isOnTheStage = await isElementOnTheStage(intent.intent_id); // sync
        if(isOnTheStage){
          this.connectorService.deleteConnectorsOutOfBlock(intent.intent_id);
          this.listOfIntents = deleteItemInArrayForKey('intent_id', this.listOfIntents, intent);
          this.refreshIntents();
          this.setDefaultIntentSelected();
        }
      }
      else if(ele.type === 'put'){
        console.log('[INTENT SERVICE] -> PUT: ', intent);
        this.listOfIntents = replaceItemInArrayForKey('intent_id', this.listOfIntents, intent);
        let isOnTheStage = await isElementOnTheStage(intent.intent_id); // sync
        if(isOnTheStage){
          // console.log('[INTENT SERVICE] -> deleteConnectorsOutOfBlock: ', intent.intent_id);
          this.connectorService.deleteConnectorsOutOfBlock(intent.intent_id, false, false);
          // console.log('[INTENT SERVICE] -> updateConnectorsOfBlock: ', intent.intent_id);
          this.connectorService.updateConnectorsOfBlock(intent.intent_id);
          this.refreshIntents();
          this.setIntentSelected(intent.intent_id);
          this.setDragAndListnerEventToElement(intent.intent_id);  
        }
      }
      console.log('[INTENT SERVICE] -> restoreIntentNew: ', ele.type, intent.intent_id);
    });
    // console.log('[INTENT SERVICE] -> restore operations: ', operations, this.listOfIntents);
  }

  /************************************************/
  /** */
  public async updateIntent(intent: Intent, fromIntent?: Intent){
    console.log('[INTENT SERVICE] -> updateIntentNew, ', intent, fromIntent);
    const intentPrev = this.prevListOfIntent.find((obj) => obj.intent_id === intent.intent_id);
    this.operationsUndo = [];
    this.operationsRedo = [];
    this.payload = {
      id_faq_kb: intent.id_faq_kb,
      operations: []
    };
    this.operationsRedo.push({
      type: "put", 
      intent: JSON.parse(JSON.stringify(intent))
    });
    this.operationsUndo.push({
      type: "put", 
      intent: JSON.parse(JSON.stringify(intentPrev)) 
    });

    if(fromIntent){
      // MAI!!! da verificare!!!
      const fromIntentPrev = this.prevListOfIntent.find((obj) => obj.intent_id === fromIntent.intent_id);
      this.operationsRedo.push({
        type: "put", 
        intent: JSON.parse(JSON.stringify(fromIntent))
      });
      this.operationsUndo.push({
        type: "put", 
        intent: JSON.parse(JSON.stringify(fromIntentPrev)) 
      });
    } else {
      // quando sposto un intent sullo stage
      let intentsToUpdate = this.findsIntentsToUpdate(intent.intent_id);
      intentsToUpdate.forEach(ele => {
        this.operationsUndo.push({
          type: "put", 
          intent: JSON.parse(JSON.stringify(ele))
        }); 
        this.operationsRedo.push({
          type: "put", 
          intent: JSON.parse(JSON.stringify(ele))
        });
      });
    }
    this.payload.operations = this.operationsRedo;
    let operations = {undo:this.operationsUndo, redo:this.operationsRedo};
    this.arrayUNDO.push(operations);
    this.arrayREDO = [];
    this.setBehaviorUndoRedo();
    console.log('[INTENT SERVICE] updateIntentNew -> payload, ', this.payload,  this.operationsRedo,  this.operationsUndo);
    this.refreshIntents();
    let intentToUpdate = this.listOfIntents.find((intent) => intent.intent_id === this.intentSelected.intent_id);
    this.refreshIntent(intentToUpdate)
    this.opsUpdate(this.payload);
  }

  /** */
  public async saveNewIntent(intent: Intent, nowIntent: Intent, prevIntent:Intent){
    console.log('[INTENT SERVICE] -> addIntentNew, ', intent, nowIntent, prevIntent);
    this.operationsUndo = [];
    this.operationsRedo = [];
    this.payload = {
      id_faq_kb: intent.id_faq_kb,
      operations: []
    };
    this.operationsRedo.push({
      type: "post", 
      intent: JSON.parse(JSON.stringify(intent))
    });
    this.operationsUndo.push({
      type: "delete", 
      intent: JSON.parse(JSON.stringify(intent))
    });
    // const tdActionId = intent.actions[0]._tdActionId
    // const prevIntent = this.prevListOfIntent.find((intent) => intent.actions.some((act) => act._tdActionId === tdActionId));
    if(prevIntent){
      this.operationsUndo.push({
        type: "put", 
        intent: JSON.parse(JSON.stringify(prevIntent))
      }); 
      // const nowIntent = this.listOfIntents.find((intent) => intent.intent_id === prevIntent.intent_id);
      this.operationsRedo.push({
        type: "put", 
        intent: JSON.parse(JSON.stringify(nowIntent))
      }); 
    }
    // this.deleteIntentToListOfIntents(intent.intent_id);
    // this.listOfIntents = insertItemInArray(this.listOfIntents, intent);
    this.payload.operations = this.operationsRedo;
    let operations = {undo:this.operationsUndo, redo:this.operationsRedo};
    this.arrayUNDO.push(operations);
    this.arrayREDO = [];
    this.setBehaviorUndoRedo();
    console.log('[INTENT SERVICE] -> payload, ', this.payload,  this.operationsRedo,  this.operationsUndo);
    this.refreshIntents();
    this.opsUpdate(this.payload);
  }


    /** deleteIntent2 */
    public async deleteIntentNew(intent: Intent){
      console.log('[INTENT SERVICE] -> deleteIntent, ', intent);
      this.operationsUndo = [];
      this.operationsRedo = [];
      this.payload = {
        id_faq_kb: intent.id_faq_kb,
        operations: []
      };
      this.operationsRedo.push({
        type: "delete", 
        intent: JSON.parse(JSON.stringify(intent))
      });
      this.operationsUndo.push({
        type: "post", 
        intent: JSON.parse(JSON.stringify(intent))
      });
      let intentsToUpdate = this.findsIntentsToUpdate(intent.intent_id);
      intentsToUpdate.forEach(ele => {
        this.operationsUndo.push({
          type: "put", 
          intent: JSON.parse(JSON.stringify(ele))
        }); 
      });
      intentsToUpdate.forEach(ele => {
        this.checkEndsWith(ele, intent.intent_id, this.operationsRedo, ele);
      });

      this.listOfIntents = deleteItemInArrayForKey('intent_id', this.listOfIntents, intent);
      this.connectorService.deleteConnectorsOfBlock(intent.intent_id, false, true);
      // this.connectorService.deleteConnectorsToIntentById(intent.intent_id);
      this.payload.operations = this.operationsRedo;
      let operations = {undo:this.operationsUndo, redo:this.operationsRedo};
      this.arrayUNDO.push(operations);
      this.arrayREDO = [];
      this.setBehaviorUndoRedo();
      console.log('[INTENT SERVICE] -> payload, ', this.payload,  this.operationsRedo,  this.operationsUndo);
      this.refreshIntents();
      this.opsUpdate(this.payload);
    }



    /** */
    private findsIntentsToUpdate(intent_id){
      let intentsToUpdate = [];
      let listConnectors = this.connectorService.searchConnectorsInByIntent(intent_id);
      listConnectors.forEach(element => {
        const splitFromId = element.fromId.split('/');
        const intentToUpdateId = splitFromId[0];
        let intent = this.listOfIntents.find((intent: any) => intent.intent_id === intentToUpdateId);
        intentsToUpdate.push(intent);
      });
      return intentsToUpdate;
    }

    /** */
    private checkEndsWith(obj, end, array, element) {
      for (var key in obj) {
        if (typeof obj[key] === 'object') {
          this.checkEndsWith(obj[key], end, array, element);
        } else if (typeof obj[key] === 'string') {
          if(obj[key].endsWith(end)){
            obj[key] = "";
            array.push({
              type: "put", 
              intent: JSON.parse(JSON.stringify(element))
            }); 
          }
        }
      }
    }

    /** updateIntent */
    private async opsUpdate(payload: any, UndoRedo=true): Promise<boolean> { 
      // console.log('[INTENT SERVICE] -> opsUpdate, ', payload);
      payload = removeNodesStartingWith(payload, '__');
      //this.setDragAndListnerEventToElement(intent.intent_id);
      return new Promise((resolve, reject) => {
        this.faqService.opsUpdate(payload).subscribe((resp: any) => {
          console.log('[INTENT SERVICE] -> opsUpdate, ', resp);
          this.prevListOfIntent = JSON.parse(JSON.stringify(this.listOfIntents));
          // this.setDragAndListnerEventToElement(intent.intent_id);
          resolve(true);
        }, (error) => {
          console.error('ERROR: ', error);
          reject(false);
        }, () => {
          resolve(true);
        });
      });
    }


    public startTestWithIntent(intent: Intent){
      this.testIntent.next(intent)
    }


    private segmentActionAdded(action_type: string){
      let chatbot = this.dashboardService.selectedChatbot;
      let id_project = this.dashboardService.projectID;
      const that = this
      let user = this.tiledeskAuthService.getCurrentUser();
  
      if(window['analytics']){
        try {
          window['analytics'].page("CDS, Added Action", {
            version: environment.VERSION
          });
        } catch (err) {
          this.logger.error('Event: CDS Added Action ', action_type, ' [page] error', err);
        }
    
        try {
          window['analytics'].identify(user.uid, {
            name: user.firstname + ' ' + user.lastname,
            email: user.email,
          });
        } catch (err) {
          this.logger.error('Event: CDS Added Action ', action_type, ' [identify] error', err);
        }
        // Segments
        try {
          window['analytics'].track('Action Added', {
            "username": user.firstname + ' ' + user.lastname,
            "userId": user.uid,
            "chatbot_id": chatbot._id,
            "project_id": id_project,
            "action_type": action_type
          });
        } catch (err) {
          this.logger.error('Event: CDS Added Action ', action_type, ' [track] error', err);
        }
      }
    }

}
