import { Injectable } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';

import { ActionReply, ActionAgent, ActionAssignFunction, ActionAssignVariable, ActionChangeDepartment, ActionClose, ActionDeleteVariable, ActionEmail, ActionHideMessage, ActionIntentConnected, ActionJsonCondition, ActionOnlineAgent, ActionOpenHours, ActionRandomReply, ActionReplaceBot, ActionWait, ActionWebRequest, Command, Wait, Message, Expression, Action, ActionAskGPT, ActionWhatsappAttribute, ActionWhatsappStatic, ActionWebRequestV2, ActionGPTTask, ActionCaptureUserReply } from 'src/app/models/action-model';
import { Intent } from 'src/app/models/intent-model';
import { FaqService } from 'src/app/services/faq.service';
import { FaqKbService } from 'src/app/services/faq-kb.service';
import { TYPE_INTENT_NAME, TYPE_ACTION, TYPE_COMMAND, removeNodesStartingWith, generateShortUID, preDisplayName, isElementOnTheStage, insertItemIntoPositionInTheArray} from '../utils';
import { ConnectorService } from '../services/connector.service';
import { ControllerService } from '../services/controller.service';
import { StageService } from '../services/stage.service';
import { DashboardService } from 'src/app/services/dashboard.service';

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
  // preDisplayName: string = 'untitled_block_';
  
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
  public lastActionUndoRedo: boolean;

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
    // console.log('[INTENT SERVICE] ::: onChangedConnector:: ', connector);
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



  // START DASHBOARD FUNCTIONS //

  refreshIntents(){
    // console.log("aggiorno elenco intent: ", this.listOfIntents);
    this.behaviorIntents.next(this.listOfIntents);
  }

  refreshIntent(intentSelected){
    // console.log("aggiorno singolo intent")
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
        // console.log('getAllIntents: ', faqs);
        if (faqs) {
          this.patchActionId(faqs);
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
        // console.error('ERROR: ', error);
        reject(false);
      }, () => {
        // console.log('COMPLETE ');
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
  private patchActionId(faqs){
    faqs.forEach(element => {
      element.actions.forEach(action => {
        if(!action._tdActionId){
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
    intent.actions.push(action);
    console.log("[INTENT SERVICE] ho creato un nuovo intent contenente l'azione ", action, " in posizione ", pos);
    return intent;
  }

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

    if(UndoRedo){
      const prevIntents = JSON.parse(JSON.stringify(this.prevListOfIntent));
      const nowIntents = JSON.parse(JSON.stringify(this.listOfIntents));
      let intentsToUpdateUndo = this.setListOfintentsToUpdate(intent, prevIntents);
      let intentsToUpdateRedo = this.setListOfintentsToUpdate(intent, nowIntents);
      let intentPrev = prevIntents.find((item) => item.intent_id === intent.intent_id)?prevIntents.find((item) => item.intent_id === intent.intent_id):intent;
      let intentNow = nowIntents.find((item) => item.intent_id === intent.intent_id)?nowIntents.find((item) => item.intent_id === intent.intent_id):intent;
      this.addIntentToUndoRedo('PUT', intentPrev, intentNow, intentsToUpdateUndo, intentsToUpdateRedo);
    }
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
  async saveNewIntent(intent:Intent, nowIntent: Intent, prevIntent: Intent, UndoRedo:boolean = true){
    if(UndoRedo){
      let intentsToUpdateUndo = prevIntent?[JSON.parse(JSON.stringify(prevIntent))]:[];
      let intentsToUpdateRedo = nowIntent?[JSON.parse(JSON.stringify(nowIntent))]:[];
      console.log('[INTENT SERVICE] -> saveNewIntent, ',intentsToUpdateUndo, intentsToUpdateRedo);
      this.addIntentToUndoRedo('PUSH', intent, intent, intentsToUpdateUndo, intentsToUpdateRedo);
    }
    const savedIntent = await this.addIntent(intent);
    if (savedIntent) {
      console.log('[CDS-CANVAS] Intent salvato correttamente: ', savedIntent, this.listOfIntents);
      // this.replaceNewIntentToListOfIntents(savedIntent);
      this.listOfIntents = this.replaceIntent(savedIntent);
      this.refreshIntents();
      this.setDragAndListnerEventToElement(savedIntent.intent_id);
      return savedIntent;
    } else {
      return false;
    }
  }

  /** save a New Intent, created on drag action on stage */
  public async addIntent(newIntent: Intent): Promise<any> { 
    let id_faq_kb = this.dashboardService.id_faq_kb;
    console.log('[INTENT SERVICE] -> saveNewIntent, ');
    return new Promise((resolve, reject) => {
      // console.log("[INTENT SERVICE]  salva ");
      const that = this;
      const intentToAdd = { 
        'id_faq_kb': id_faq_kb, 
        'attributes': newIntent.attributes,
        'question': newIntent.question, 
        'answer': newIntent.answer, 
        'intent_display_name': newIntent.intent_display_name,
        'intent_id': newIntent.intent_id,
        'form': newIntent.form,
        'actions': newIntent.actions,
        'webhook_enabled': newIntent.webhook_enabled
      };
      this.faqService.addIntent(intentToAdd).subscribe((intent:any) => {
        // console.log("[INTENT SERVICE]  ho salvato in remoto l'intent ", intent, newIntent, this.listOfIntents);
        this.prevListOfIntent = JSON.parse(JSON.stringify(this.listOfIntents));
        resolve(intent);
      }, (error) => {
        console.error('[INTENT SERVICE]  ERROR: ', error);
        reject(false);
      }, () => {
        resolve(false);
      });
    });
  }

  /** deleteIntent */
  deleteIntent(intent: Intent, UndoRedo:boolean = true){
    console.log('[INTENT SERVICE] -> deleteIntent, ', intent);
    if(UndoRedo){
      const prevIntents = JSON.parse(JSON.stringify(this.prevListOfIntent));
      const nowIntents = JSON.parse(JSON.stringify(this.listOfIntents));
      let intentsToUpdateUndo = this.setListOfintentsToUpdate(intent, prevIntents);
      let intentsToUpdateRedo = this.setListOfintentsToUpdate(intent, nowIntents);
      let intentPrev = prevIntents.find((item) => item.intent_id === intent.intent_id)?prevIntents.find((item) => item.intent_id === intent.intent_id):intent;
      let intentNow = nowIntents.find((item) => item.intent_id === intent.intent_id)?nowIntents.find((item) => item.intent_id === intent.intent_id):intent;
      this.addIntentToUndoRedo('DEL', intentPrev, intentNow, intentsToUpdateUndo, intentsToUpdateRedo);
    }
    this.deleteFaq(intent);
    // this.updateIntents(intentsToUpdateRedo);
  }
  /** deleteFaq */
  public async deleteFaq(intent: Intent): Promise<boolean> { 
    console.log('[INTENT SERVICE] -> deleteFaq, ');
    return new Promise((resolve, reject) => {
      this.faqService.deleteFaq(intent.id, intent.intent_id, intent.id_faq_kb).subscribe((data) => {
        this.prevListOfIntent = JSON.parse(JSON.stringify(this.listOfIntents));
        resolve(true);
      }, (error) => {
        // console.error('ERROR: ', error);
        reject(false);
      }, () => {
        resolve(true);
      });
    });
  }

  /**
   * onUpdateIntentWithTimeout
   * @param originalIntent 
   * @param timeout 
   * @param UndoRedo 
   * @param connector 
   * @returns 
   */
  public async onUpdateIntentWithTimeout(originalIntent: Intent, timeout: number=0, undo:boolean = false, connector?: any): Promise<boolean> { 
    const thereIsIntent = this.listOfIntents.some((intent) => intent.intent_id === originalIntent.intent_id);
    console.log('[INTENT SERVICE] -> onUpdateIntentWithTimeout, ', originalIntent, connector);
    if(!thereIsIntent)return;
    let intent = JSON.parse(JSON.stringify(originalIntent));
    const prevIntents = JSON.parse(JSON.stringify(this.prevListOfIntent));
    const nowIntents = JSON.parse(JSON.stringify(this.listOfIntents));
    // console.log('[INTENT SERVICE] -> onUpdateIntentWithTimeout2, ',prevIntents, nowIntents);
    
    if(undo || connector){
      let intentPrev = prevIntents.find((item) => item.intent_id === intent.intent_id)?prevIntents.find((item) => item.intent_id === intent.intent_id):intent;
      let intentNow = nowIntents.find((item) => item.intent_id === intent.intent_id)?nowIntents.find((item) => item.intent_id === intent.intent_id):intent;
      let intentsToUpdateUndo = [intentPrev];
      let intentsToUpdateRedo = [intentNow];
      if(connector && connector.undo) this.addIntentToUndoRedo('CONN', intentPrev, intentNow, intentsToUpdateUndo, intentsToUpdateRedo, connector);
      else if(!connector && undo)this.addIntentToUndoRedo('PUT', intentPrev, intentNow, intentsToUpdateUndo, intentsToUpdateRedo);
    }
    if(!timeout)timeout = 0;
    return new Promise((resolve, reject) => {
      if(this.idIntentUpdating == intent.intent_id){
        clearTimeout(this.setTimeoutChangeEvent);
      } else {
        this.idIntentUpdating = intent.intent_id;
      }
      this.setTimeoutChangeEvent = setTimeout(async () => {
        const response = await this.updateIntent(intent);
        if (response) {
          resolve(true);
        } else {
          reject(false);
        }
      }, timeout);
    });
  }


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
      this.addIntentToUndoRedo('PUT', intentPrev, intentNow, [intentOriginActionPrev], [intentOriginActionNow]);
    }
    const response = this.updateIntent(intent);
  }

  
  /**
   * onUpdateIntentFromActionPanel
   * @param currentIntent 
   * @param UndoRedo 
   * @returns 
   * 
   * 
   */
  public onUpdateIntentFromActionPanel(currentIntent, UndoRedo:boolean = true){
    const thereIsIntent = this.listOfIntents.some((intent) => intent.intent_id === currentIntent.intent_id);
    if(!thereIsIntent)return;
    this.listOfIntents = this.replaceIntent(currentIntent);
    console.log('[INTENT SERVICE] -> onUpdateIntentFromActionPanel ', this.listOfIntents, currentIntent);
    let intent = JSON.parse(JSON.stringify(currentIntent));
    const prevIntents = JSON.parse(JSON.stringify(this.prevListOfIntent));
    const nowIntents = JSON.parse(JSON.stringify(this.listOfIntents));
    // console.log('[INTENT SERVICE] -> onUpdateIntentFromActionPanel ',prevIntents, nowIntents);
    if(UndoRedo){
      let intentPrev = prevIntents.find((item) => item.intent_id === intent.intent_id)?prevIntents.find((item) => item.intent_id === intent.intent_id):intent;
      let intentNow = nowIntents.find((item) => item.intent_id === intent.intent_id)?nowIntents.find((item) => item.intent_id === intent.intent_id):intent;
      // console.log('[INTENT SERVICE] -> PUT ', intentPrev, intent);
      this.addIntentToUndoRedo('PUT', intentPrev, intent, [intentPrev], [intentNow]);
    }
    const response = this.updateIntent(intent);
  }

  /**
   * deleteActionFromPreviousIntentOnMovedAction
   * @param action 
   * @returns 
   * 
   * on move action from intent to stage
   * set previousIntentId on dragStarted
   * cancello la action dall'intent che la conteneva precedentemente
   */
  public deleteActionFromPreviousIntentOnMovedAction(action){
    const actionId = action._tdActionId;
    let intentToUpdate = this.listOfIntents.find((intent) => intent.intent_id === this.previousIntentId);
    if(intentToUpdate){
      const actions = intentToUpdate.actions.filter((action: any) => action._tdActionId !== actionId);
      intentToUpdate.actions = actions;
      // console.log("[CDS-INTENT-SERVICES] ho eliminato la action dall'intent che la conteneva ",actionId, intentToUpdate);
      this.connectorService.deleteConnectorsFromActionByActionId(actionId);
      console.log('[CDS-INTENT-SERVICES] aggiorno intent di partenza', intentToUpdate);
      // const responseIntent = this.updateIntent(intentToUpdate);
      const responseIntent = this.onUpdateIntentWithTimeout(intentToUpdate, 0, true);
      if(responseIntent){
        // console.log('[CDS-INTENT-SERVICES] update Intent: OK');
        this.behaviorIntent.next(intentToUpdate);
      }
      return intentToUpdate;
    } else {
      return;
    }
  }

  /** updateIntent */
  private async updateIntent(intent: Intent): Promise<boolean> { 
    console.log('[INTENT SERVICE] -> updateIntent, ', intent);
    intent = removeNodesStartingWith(intent, '__');
    return new Promise((resolve, reject) => {
      let id = intent.id;
      let attributes = intent.attributes?intent.attributes:{};
      let questionIntent = intent.question?intent.question:'';
      let answerIntent = intent.answer?intent.answer:'';
      let displayNameIntent = intent.intent_display_name?intent.intent_display_name:'';
      let formIntent = intent.form?intent.form:{};
      let actionsIntent = intent.actions?intent.actions:[];
      let webhookEnabledIntent = intent.webhook_enabled?intent.webhook_enabled:false;

      let intentToUpdate = {
        '_id': intent.id,
        'attributes': attributes, 
        'question': questionIntent, 
        'answer': answerIntent, 
        'intent_display_name': displayNameIntent, 
        'form': formIntent,
        'actions': actionsIntent,
        'webhook_enabled': webhookEnabledIntent,
        "id_faq_kb": intent.id_faq_kb,
        "intent_id":intent.intent_id
      };

      this.faqService.updateIntent(intentToUpdate).subscribe((intent: Intent) => {
        this.prevListOfIntent = JSON.parse(JSON.stringify(this.listOfIntents));
        this.setDragAndListnerEventToElement(intent.intent_id);
        resolve(true);
      }, (error) => {
        console.error('ERROR: ', error);
        reject(false);
      }, () => {
        resolve(true);
      });
    });
  }
  /************************************************/
  /** END FUNCTIONS: PUSH DEL PUT PATCH           */
  /************************************************/

  


  
  


  


  public updateIntents(listOfIntents, intent){
    const intents = JSON.parse(JSON.stringify(listOfIntents));
    let intentsToUpdate = this.setListOfintentsToUpdate(intent, intents);
    // aggiorna gli intent connessi all'intent eliminato
    intentsToUpdate.forEach(element => {
      this.updateIntent(element);
    });
  }
  // END INTENT FUNCTIONS //





  // START ACTION FUNCTIONS //

  /** update title of intent */
  public async changeIntentName(intent){
    // setTimeout(async () => {
      let prevIntent = this.prevListOfIntent.find((obj) => obj.intent_id === intent.intent_id);
      if(intent.intent_display_name !== prevIntent.intent_display_name){
        const response = await this.onUpdateIntentWithTimeout(intent, 0, true);
        if(response){
          // this.behaviorIntents.next(this.listOfIntents);
          // this.refreshIntent(intent);
          this.setDragAndListnerEventToElement(intent.intent_id);
        }
      }
    // }, 500);
  }

  // moving new action in intent from panel elements
  public moveNewActionIntoIntent(event, action, currentIntentId): any {
    // console.log('[INTENT-SERVICE] moveNewActionIntoIntent');
    let newAction = this.createNewAction(action.value.type);
    let currentIntent = this.listOfIntents.find(function(obj) {
      return obj.intent_id === currentIntentId;
    });
    currentIntent.actions.splice(event.currentIndex, 0, newAction);
    this.behaviorIntent.next(currentIntent);
    this.connectorService.updateConnector(currentIntent.intent_id);
    this.onUpdateIntentWithTimeout(currentIntent, 0, true);
    // setTimeout(async () => {
      // const responseCurrentIntent = await this.onUpdateIntentWithTimeout(currentIntent, 0, true);
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
    // console.log('[INTENT-SERVICE] moveActionBetweenDifferentIntents');
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
    this.connectorService.updateConnector(currentIntent.intent_id);
    this.connectorService.updateConnector(previousIntent.intent_id);
    this.connectorService.deleteConnectorsFromActionByActionId(action._tdActionId);

    const responsePreviousIntent = this.onUpdateIntentWithTimeout(previousIntent, 0, false);
    const responseCurrentIntent = this.updateIntentInMoveActionBetweenDifferentIntents(action,currentIntent);
    // devo fare una funzione che passa anche lo stato di intent prev onUpdateIntentWithTimeout NON va bene
    // const responseCurrentIntent = this.onUpdateIntentWithTimeout(currentIntent);
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
  public deleteIntentToListOfIntents(intentId){
    // console.log("[CDS-INTENT-SERVICES] elimino l'intent alla lista di intent", intentId);
    // devo aggiornare tutti gli intent connessi
    // this.deleteAllConnectorsInAndUpdateIntents();
    this.listOfIntents = this.listOfIntents.filter((intent: any) => intent.intent_id !== intentId);
  }

  public updateAndSaveAllIntentsConnectedToDeletedIntent(intentId){
    // console.log("[CDS-INTENT-SERVICES] updateAllIntentsConnectedToDeletedIntent: intentId ", intentId);
    let arrayOfIntents = [];
    const listConnectors = this.connectorService.searchConnectorsInOfIntent(intentId);
    listConnectors.forEach(element => {
      const splitFromId = element.fromId.split('/');
      const intentToUpdateId = splitFromId[0];
      const resp = arrayOfIntents.some((obj) => obj.intent_id === intentToUpdateId);
      if(!resp){
        let intent = this.listOfIntents.find((intent: any) => intent.intent_id === intentToUpdateId);
        arrayOfIntents.push(intent);
      }
    });
    arrayOfIntents.forEach(intent => {
      // cerca in tutto l'array di actions se c'è una action che contiene intentId (quindi connessa con l'intent da eliminare) e in questo caso assegna il campo a null
      for (let i = 0; i < intent.actions.length; i++) {
        const object = intent.actions[i];
        for (const key in object) {
          // console.log("[CDS-INTENT-SERVICES] object[key]: ", object[key], intentId);
          if (typeof object[key] === 'string' && object[key].includes(intentId)) {
            object[key] = null;
          }
        }
      }
      this.updateIntent(intent);
    });
  }


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
   * onUpdateIntentWithTimeout: salvo l'intent
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
      this.connectorService.updateConnector(intentToUpdate.intent_id);
      this.controllerService.closeAllPanels();
      // this.connectorService.deleteConnectorsFromActionByActionId(this.actionSelectedID);
      const responseIntent = this.onUpdateIntentWithTimeout(intentToUpdate, 0, true);
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
      action.triggerBot = true;
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
      action.preview = [];
    }
    if(typeAction === TYPE_ACTION.CAPTURE_USER_REPLY) {
      action = new ActionCaptureUserReply();
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
    } else {
      button.__isConnected = false;
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
      // console.log('[INTENT SERVICE] -> replaceIntent:', intent.intent_id, listOfIntents[i].intent_id);
      if (this.listOfIntents[i].intent_id === intent.intent_id) {
        this.listOfIntents[i] = intent;
        break;
      }
    }
    console.log('[INTENT SERVICE] -> SOSTITUISCO:', intent, this.listOfIntents);
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
    const connectorsID = this.connectorService.searchConnectorsInOfIntent(intent.intent_id);
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

  /**
   * addIntentToUndoRedo
   * @param type 
   * @param intent 
   * @param intentsToUpdateUndo 
   * @param intentsToUpdateRedo 
   */
  public addIntentToUndoRedo(type: string, intentPre: Intent, intentNow: Intent, intentsToUpdateUndo: Array<Intent>, intentsToUpdateRedo: Array<Intent>, connector?: string){
    console.log('[INTENT UNDO] *****  addIntentToUndoRedo', intentNow );
    let typeUNDO = type;
    let typeREDO = type;
    if(type === 'PUSH'){typeUNDO = 'DEL';}
    if(type === 'DEL'){typeUNDO = 'PUSH';}
    let pos =  this.listOfIntents.findIndex((element) => { return element.intent_id === intentPre.intent_id });
    if(!pos || pos<0)pos = this.listOfIntents.length;
    let UNDO = this.setUndoRedoObject(type, typeUNDO, typeREDO, pos, intentPre, intentNow, intentsToUpdateUndo, intentsToUpdateRedo, connector);
    this.arrayUNDO.push(UNDO);
    console.log('[INTENT UNDO] ***** AGGIUNGO ', UNDO, this.arrayUNDO );
    // this.arrayUNDO = this.arrayUNDO.slice(10);
    this.lastActionUndoRedo = false;
    this.arrayREDO = [];
  }


  /**
   * 
   * @param type 
   * @param typeUNDO 
   * @param typeREDO 
   * @param pos 
   * @param intentPre 
   * @param intentNow 
   * @param intentsToUpdateUndo 
   * @param intentsToUpdateRedo 
   * @param connector 
   * @returns 
   */
  private setUndoRedoObject(type, typeUNDO, typeREDO, pos, intentPre, intentNow, intentsToUpdateUndo, intentsToUpdateRedo, connector?){
    console.log('[INTENT UNDO] -> setUndoRedoObject ',intentNow, intentPre, intentsToUpdateUndo, intentsToUpdateRedo, connector);
    let obj = {
      type: type,
      pos: pos,
      undo:{
        type: typeUNDO,
        connector: connector,
        intent: JSON.parse(JSON.stringify(intentPre)),
        intentsToUpdate: JSON.parse(JSON.stringify(intentsToUpdateUndo)),
      },
      redo:{
        type: typeREDO,
        connector: connector,
        intent: JSON.parse(JSON.stringify(intentNow)),
        intentsToUpdate: JSON.parse(JSON.stringify(intentsToUpdateRedo)),
      }
    }
    // console.log('[INTENT SERVICE] -> setUndoRedoObject', obj);
    return obj;
  }

  /** */
  public restoreLastUNDO(){
    this.lastActionUndoRedo = true;
    // console.log('[INTENT SERVICE] -> restoreLastUNDO', this.arrayUNDO);
    if(this.arrayUNDO && this.arrayUNDO.length>0){
      const objUNDO = JSON.parse(JSON.stringify(this.arrayUNDO.pop()));
      this.arrayREDO.push(objUNDO);
      // console.log('[INTENT SERVICE] -> RESTORE UNDO: ', this.arrayREDO);
      this.restoreIntent(objUNDO.pos, objUNDO.undo);
      console.log('[INTENT UNDO] -> ho aggiornato gli array dopo UNDO ', this.arrayUNDO, this.arrayREDO);
    }
  }

  /** */
  public restoreLastREDO(){
    this.lastActionUndoRedo = true;
    // console.log('[INTENT SERVICE] -> restoreLastREDO', this.arrayREDO);
    if(this.arrayREDO && this.arrayREDO.length>0){
      const objREDO = JSON.parse(JSON.stringify(this.arrayREDO.pop()));
      this.arrayUNDO.push(objREDO);
      // console.log('[INTENT SERVICE] -> RESTORE REDO: ', objREDO);
      this.restoreIntent(objREDO.pos, objREDO.redo);
      console.log('[INTENT UNDO] -> ho aggiornato gli array dopo REDO ', this.arrayUNDO, this.arrayREDO);
    }
  }

  /**
   * restoreIntent
   * @param pos 
   * @param object 
   * @returns 
   */
  async restoreIntent(pos, obj){
    this.controllerService.closeAllPanels();
    const object = JSON.parse(JSON.stringify(obj));
    const restoreAction = object.type;
    const intent = object.intent;
    const intentsToUpdate = object.intentsToUpdate;
    const connector = object.connector;
    this.lastActionUndoRedo = intent.intent_id;
    console.log('[INTENT UNDO] -> restoreAction : typeAction:', object, intentsToUpdate);
    if(restoreAction == 'DEL'){
      this.restoreDel(intent, intentsToUpdate);
      return;
    } 
    if(restoreAction == 'PUSH'){
      this.restorePush(intent, pos, intentsToUpdate);
      return
    }
    if(restoreAction == 'PUT'){ 
      this.restorePut(intent, intentsToUpdate);
      return;
    } 
    if(restoreAction == 'CONN' && connector){ 
      this.restoreConnector(intent, connector);
      return;
    } 
  }

  /**
   * restorePush
   * @param intent 
   * @param pos 
   * @param intentsToUpdate 
   * @returns 
   * 
   * insertItemIntoPositionInTheArray: inserisco l'intent (precedentemente eliminato), nella lista degli intents (listOfIntents) nella posizione corretta
   * refreshIntent: aggiorna i pallini delle actions a seconda che abbiano o meno un connettore in uscita, successivamente verrà creato il connettore
   * isElementOnTheStage: aspetto che l'intent sia effettivamente sullo stage e procedo
   * replaceIntent: sostituisce l'intent modificato nell'elenco degli intents
   * deleteConnectorsOfBlockThatDontExist: elimina i connettori che puntano ad un intent che non esiste sullo stage 
   * * il caso è: ...
   * createConnectorsOfIntent: crea i connettori in uscita verso l'intent creato
   * updateIntent: salva l'intent modificato
   * refreshIntents: fa scattare l'evento e aggiorna l'elenco degli intents (listOfIntents) in tutti i componenti sottoscritti, come cds-panel-intent-list 
   * saveNewIntent: salva in remoto l'intent creato 
   */
  private async restorePush(intent, pos, intentsToUpdate){
    this.listOfIntents = insertItemIntoPositionInTheArray(this.listOfIntents, intent, pos);
    this.refreshIntent(intent);
    let isOnTheStage = await isElementOnTheStage(intent.intent_id); // sync
    this.intentSelected = intent;
    if(isOnTheStage){
      this.connectorService.createConnectorsOfIntent(intent);
      intentsToUpdate.forEach(element => {
        console.log('[INTENT UNDO] -> REPLACE ', element);
        this.listOfIntents = this.replaceIntent(element);
        // this.refreshIntent(element); 
        setTimeout(()=> {
          // ATTENZIONE!!! le seguenti azioni devono essere svolte solo dopo che l'elemento è stato aggiornato (gli attributi __ dovrebbero essere generati quando carichiamo i dati dal server!!!)
          this.connectorService.deleteConnectorsOfBlockThatDontExist(element.intent_id);
          this.connectorService.createConnectorsOfIntent(element);
          // this.connectorService.updateConnector(element.intent_id, false);
        }, 100);
        this.updateIntent(element); // async
      });
      // console.log('[INTENT SERVICE] -> restoreAction', isOnTheStage, intent.intent_id);
      this.refreshIntents();
      this.saveNewIntent(intent, null, null, false); // async
      return;
    }
  }

  /**
   * restoreDel
   * @param intent 
   * @param intentsToUpdate 
   * @returns 
   * 
   * deleteIntentToListOfIntents: cancello l'intent dall'elenco degli intents (listOfIntents)
   * deleteConnectorsOfBlock: cancello tutti i connettori IN e OUT dall'intent eliminato
   * replaceIntent: per ogni intent collegato (tramite connettore) all'intent eliminato, sostituisco la vecchia versione nell'elenco degli intent
   * // refreshIntent: faccio scattare l'evento per comunicare a tutti i componenti sottoscritti che l'intent è stato modificato (fa scattare updateConnector in tutte le azioni coinvolte e aggiorna i pallini dei connettori)
   * createConnectorsOfIntent: creo i connettori dell'intent (se esistono li sostituisco)
   * // updateConnector: aggiorno i connettori perchè può cambiare la posizione delle actions
   * updateIntent: salva l'intent modificato in remoto
   * deleteIntent: elimina l'intent in remoto
   * refreshIntents: fa scattare l'evento e aggiorna l'elenco degli intents (listOfIntents) in tutti i componenti sottoscritti, come cds-panel-intent-list 
   */
  private async restoreDel(intent, intentsToUpdate){
    this.deleteIntentToListOfIntents(intent.intent_id);
    this.connectorService.deleteConnectorsOfBlock(intent.intent_id); // cancello tutti i connettori IN e OUT
    this.intentSelected = null;
    intentsToUpdate.forEach(element => {
      console.log('[INTENT UNDO] -> REPLACE ', element);
      this.listOfIntents = this.replaceIntent(element);
      setTimeout(()=> {
        // ATTENZIONE!!! le seguenti azioni devono essere svolte solo dopo che l'elemento è stato aggiornato (gli attributi __ dovrebbero essere generati quando carichiamo i dati dal server!!!)
        this.connectorService.createConnectorsOfIntent(element);
        // this.connectorService.deleteConnectorsOfBlockThatDontExist(element.intent_id, false);
        // this.connectorService.updateConnector(element.intent_id, false);
      }, 100);
      this.updateIntent(element); // async
    });
    this.deleteIntent(intent, false); // async
    this.refreshIntents();
    return;
  }

  /**
   * restorePut
   * @param intent 
   * @param intentsToUpdate 
   * @returns 
   * 
   * replaceIntent: per ogni intent collegato (tramite connettore) all'intent eliminato, sostituisco la vecchia versione nell'elenco degli intent
   * refreshIntent: faccio scattare l'evento per comunicare a tutti i componenti sottoscritti che l'intent è stato modificato 
   *  * (fa scattare updateConnector in tutte le azioni coinvolte e aggiorna i pallini dei connettori cioè tutti gli attributi custom __) !!! DA ELIMINARE !!!
   * updateConnector: aggiorno i connettori dell'elemento modificato perchè può cambiare la posizione delle actions
   * updateConnector: aggiorno i connettori di tutti gli intent collegati all'intent modificato
   * updateIntent: salva l'intent modificato in remoto
   * refreshIntents: fa scattare l'evento e aggiorna l'elenco degli intents (listOfIntents) in tutti i componenti sottoscritti, come cds-panel-intent-list 
   */
  private async restorePut(intent, intentsToUpdate){
    this.listOfIntents = this.replaceIntent(intent);
    console.log('[INTENT UNDO] -> REPLACE INTENT: ', intent);
    // this.refreshIntent(intent); // aggiorno gli attributi custom ex: __isConnected !!! DA RIFATTORIZZARE !!!
    setTimeout(()=> {
      this.connectorService.deleteConnectorsOutOfBlock(intent.intent_id, false, false, false); // false, false
      // this.connectorService.deleteConnectorsBrokenOutOfBlock(intent.intent_id); // false, false
      this.connectorService.createConnectorsOfIntent(intent); // false, false
      this.connectorService.updateConnector(intent.intent_id);
      // cancello tutti i connettori in uscita e li ricreo
    }, 100);
    this.intentSelected = intent;
    intentsToUpdate.forEach(element => {
      this.listOfIntents = this.replaceIntent(element);
      console.log('[INTENT UNDO] -> REPLACE ELEMENT: ', element);
      // this.refreshIntent(element);
      if( element.intent_id !== intent.intent_id){
        setTimeout(()=> {
          this.connectorService.deleteConnectorsOutOfBlock(intent.intent_id, false, false, false); // false, false
          // this.connectorService.deleteConnectorsBrokenOutOfBlock(element.intent_id); // false, false
          this.connectorService.createConnectorsOfIntent(element); // false, false
          this.connectorService.updateConnector(element.intent_id);
        }, 100);
        this.updateIntent(element); // async
      }
    });
    this.updateIntent(intent); // async
    this.refreshIntents();
    return;
  }

  /**
   * restoreConnector
   * @param intent 
   * @param connector 
   * @returns 
   * 
   * replaceIntent: per ogni intent collegato (tramite connettore) all'intent eliminato, sostituisco la vecchia versione nell'elenco degli intent
   * mi assicuro che il connettore è sullo stage 
   * deleteConnector: elimino il connettore
   * createNewConnector: ricreo il connettore
   * updateIntent: salva l'intent modificato in remoto
   * refreshIntents: fa scattare l'evento e aggiorna l'elenco degli intents (listOfIntents) in tutti i componenti sottoscritti, come cds-panel-intent-list 
   */
  private async restoreConnector(intent, connector){
    this.updateIntent(intent); // async
    this.listOfIntents = this.replaceIntent(intent); /// Arggggg!! questa mmerda ricarica tutte le action e mi svuota tutti i connettori true false
    setTimeout(()=> {
        const arrow = document.getElementById(connector.id);
        console.log('[INTENT UNDO] -> arrow: ', arrow, connector);
        if(arrow)this.connectorService.deleteConnector(connector.id);
        else this.connectorService.createNewConnector(connector.fromId, connector.toId);
      // this.connectorService.updateConnector(intent.intent_id, false);
    }, 100);

       // this.refreshIntent(intent);
    return;
  }
  /************************************************/

}
