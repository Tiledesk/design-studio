import { Injectable } from '@angular/core';
import { TiledeskConnectors } from 'src/assets/js/tiledesk-connectors.js';
import { TYPE_BUTTON, isElementOnTheStage, generateShortUID, getOpacityFromRgba, getColorFromRgba } from '../utils';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

import { Setting } from 'src/app/models/action-model';
import { TYPE_ACTION, TYPE_ACTION_VXML } from '../utils-actions';
import { Subject } from 'rxjs';


// SERVICES //
// import { StageService } from '../services/stage.service';


/** CLASSE DI SERVICES PER GESTIRE I CONNETTORI **/


@Injectable({
  providedIn: 'root'
})

export class ConnectorService {
 

  private readonly subjectChangedConnectorAttributes = new Subject<any>();
  observableChangedConnectorAttributes = this.subjectChangedConnectorAttributes.asObservable();
  
  listOfConnectors: any = {};
  tiledeskConnectors: any;
  connectorDraft: any = {};
  listOfIntents: any;
  mapOfConnectors: any = {};
  scale: number = 1;
  existingIntentIds: any;

  private readonly logger: LoggerService = LoggerInstance.getInstance();
  
  constructor(
  ) {}

  initializeConnectors(){
    this.tiledeskConnectors = new TiledeskConnectors("tds_drawer", {"input_block": "tds_input_block"}, {});
    this.tiledeskConnectors.mousedown(document);
  }

  /** setScale
   * set the scale when loading the page, taking it from localStorage 
   * */
  setScale(scale: number){
    this.scale = scale;
    this.tiledeskConnectors.scale = scale;
  }
 
  /*************************************************/
  /** CREATE CONNECTOR                             */
  /*************************************************/
  public async setMapOfConnectors(listOfIntents){
    this.mapOfConnectors = await this.createMapOfConnectors(listOfIntents);
    return this.mapOfConnectors;
  }

  /**
   * createConnectorDraft
   * @param detail 
   */
  createConnectorDraft(detail){
    this.connectorDraft = {
      fromId: detail.fromId,
      fromPoint: detail.fromPoint,
      toPoint: detail.toPoint,
      menuPoint: detail.menuPoint,
      target: detail.target, 
      color: detail.color
    }
  }

  /**
   * addConnectorToList
   * @param connector 
   */
  public addConnectorToList(connector){
    this.listOfConnectors[connector.id] = connector;
    this.mapOfConnectors[connector.id] =  {'shown': true };
    this.logger.log('[CONNECTOR-SERV] addConnector::  connector ', connector)
  }

  /**
   * createNewConnector
   * @param fromId 
   * @param toId 
   * 
   */
  async createNewConnector(fromId:string, toId:string){
    this.logger.log('[CONNECTOR-SERV] createNewConnector:: fromId:', fromId, 'toId:', toId);
    let elFrom = await isElementOnTheStage(fromId); // sync
    let elTo = await isElementOnTheStage(toId); // sync
    this.logger.log('[CONNECTOR-SERV] createNewConnector:: ', elFrom, elTo);
    if (elFrom && elTo) { 
      const fromPoint = this.tiledeskConnectors.elementLogicCenter(elFrom);
      const toPoint = this.tiledeskConnectors.elementLogicTopLeft(elTo);
      this.tiledeskConnectors.createConnector(fromId, toId, fromPoint, toPoint, false, true, null);
    }
  }





  /**
   * createConnectors
   * @param intents 
   * 
   */
  public createConnectors(intents){
    this.listOfIntents = intents;
    intents.forEach(intent => {
      this.createConnectorsOfIntent(intent);
    });
  }


  public async createMapOfConnectors(intents){
    // // this.logger.log('[CONNECTOR-SERV] -----> createConnectors::: ', intents);
    this.existingIntentIds = new Set(intents.map((item) => item.intent_id));
    this.listOfIntents = intents;
    intents.forEach(async intent => {
      this.createListOfConnectorsByIntent2(intent);  
    });
    this.logger.log('[CONNECTOR-SERV] -----> createMapOfConnectors::: ', this.mapOfConnectors);
    return this.mapOfConnectors;
  }


  /**
   * createConnectorFromId
   * @param fromId 
   * @param toId 
   * @param save 
   * @returns 
   */
  public async createConnectorFromId(fromId, toId, notify=false, attributes=null) {
    const connectorID = fromId+'/'+toId;
    const isConnector = document.getElementById(connectorID);
    if (isConnector) {
      this.logger.log('[CONNECTOR-SERV] il connettore esiste già', connectorID);
      this.tiledeskConnectors.updateConnectorsOutOfItent(connectorID);
      return true;
    } 
    let fromEle = document.getElementById(fromId);
    if(!fromEle) {
      fromEle = await isElementOnTheStage(fromId); // sync
      this.logger.log('[CONNECTOR-SERV] isOnTheStage fromEle:', fromEle);
    }
    let toEle = document.getElementById(toId);
    if(!toEle) {
      toEle = await isElementOnTheStage(toId); // sync
      this.logger.log('[CONNECTOR-SERV] isOnTheStage toEle:', toEle);
    }
    if(fromEle && toEle){
      const fromPoint = this.tiledeskConnectors.elementLogicCenter(fromEle);
      const toPoint = this.tiledeskConnectors.elementLogicTopLeft(toEle);
      this.logger.log('[CONNECTOR-SERV] createConnector attributes:', attributes);
      this.tiledeskConnectors.createConnector(fromId, toId, fromPoint, toPoint, false, notify, attributes);
      return true;
    } else {
      return false;
    }
  }

  /**
   * 
   * @param connectorID 
   * @returns 
   */
  public async createConnectorById(connectorID) {
    this.logger.log('[CONNECTOR-SERV] createConnectorById: ', connectorID);
    const isConnector = document.getElementById(connectorID);
    if (isConnector) {
      this.logger.log('[CONNECTOR-SERV] createConnectorById il connettore esiste già', connectorID);
      this.tiledeskConnectors.updateConnectorsOutOfItent(connectorID);
      return true;
    } 
    let lastIndex = connectorID.lastIndexOf("/");
    if (lastIndex !== -1) {
      const fromId = connectorID.substring(0, lastIndex);
      let toId = connectorID.substring(lastIndex + 1);
      if (toId.startsWith('#')) {
        toId = toId.substring(1);
      }
      let fromEle = document.getElementById(fromId);
      if(!fromEle) {
        fromEle = await isElementOnTheStage(fromId); // sync
        this.logger.log('[CONNECTOR-SERV] isOnTheStageFrom', fromEle);
      }
      let toEle = document.getElementById(toId);
      if(!toEle) {
        toEle = await isElementOnTheStage(toId); // sync
        this.logger.log('[CONNECTOR-SERV] isOnTheStageFrom', toEle, toId);
      }
      if (toEle && fromEle) {
        const fromPoint = this.tiledeskConnectors.elementLogicCenter(fromEle);
        const toPoint = this.tiledeskConnectors.elementLogicTopLeft(toEle);
        this.logger.log('[CONNECTOR-SERV] createConnectorById createConnector', connectorID);
        this.tiledeskConnectors.createConnector(fromId, toId, fromPoint, toPoint, false, false, null);
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }


  /**
   * 
   * @param intentId 
   */
  private intentExists(intentId){
    const response = this.listOfIntents.some((obj) => obj.intent_id === intentId);
    this.logger.log('[CONNECTOR-SERV] intentExists::', intentId, this.listOfIntents, response);
    return response;
  }

  /**
   * refreshConnectorsOfIntent
   * @param intent 
   * 
   * create connectors from Intent
   */
  public createConnectorsOfIntent(intent:any){
    if(intent.attributes?.nextBlockAction){
      let idConnectorFrom = null;
      let idConnectorTo = null;
      let nextBlockAction = intent.attributes.nextBlockAction;
      if(nextBlockAction.intentName && nextBlockAction.intentName !== ''){
        idConnectorFrom = intent.intent_id+'/'+nextBlockAction._tdActionId;
        idConnectorTo = nextBlockAction.intentName.replace("#", "");
        if(!this.intentExists(idConnectorTo)){
          nextBlockAction.intentName = '';
          idConnectorTo = null;
        }
        this.logger.log('[CONNECTOR-SERV] -> CREATE CONNECTOR', intent, idConnectorFrom, idConnectorTo);
        this.createConnector(intent, idConnectorFrom, idConnectorTo);
      }
    }

    if(intent.actions){
      intent.actions.forEach(action => {
        let idConnectorFrom = null;
        let idConnectorTo = null;
        this.logger.log('[CONNECTOR-SERV] createConnectors:: ACTION ', action);
        
        /**  INTENT */
        if(action._tdActionType === TYPE_ACTION.INTENT){
          // // this.logger.log('[CONNECTOR-SERV] intent_display_name', intent.intent_display_name);
          if(action.intentName && action.intentName !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId;
            idConnectorTo = action.intentName.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.intentName = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] -> CREATE CONNECTOR', intent, idConnectorFrom, idConnectorTo);
            // // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
        }

        /**  CONNECT BLOCK */
        if(action._tdActionType === TYPE_ACTION.CONNECT_BLOCK){
          // // this.logger.log('[CONNECTOR-SERV] intent_display_name', intent.intent_display_name);
          if(action.intentName && action.intentName !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId;
            idConnectorTo = action.intentName.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.intentName = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] -> CREATE CONNECTOR', intent, idConnectorFrom, idConnectorTo);
            // // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
        }

        /**  REPLY  RANDOM_REPLY */
        if( (action._tdActionType === TYPE_ACTION.REPLY || action._tdActionType === TYPE_ACTION.RANDOM_REPLY) ||
            (action._tdActionType === TYPE_ACTION_VXML.DTMF_FORM || action._tdActionType === TYPE_ACTION_VXML.DTMF_MENU || action._tdActionType === TYPE_ACTION_VXML.BLIND_TRANSFER)){
          let buttons = this.findButtons(action);
          this.logger.log('buttons   ----- >', buttons, action);
          buttons.forEach(button => {
            // // this.logger.log('[CONNECTOR-SERV] button   ----- > ', button, button.__idConnector);
            if(button.type === TYPE_BUTTON.ACTION && button.action){
              // // const idConnectorFrom = button.__idConnector;
              if(!button.uid || button.uid === "UUIDV4"){
                button.uid = generateShortUID();
              }
              idConnectorFrom = intent.intent_id+"/"+action._tdActionId+"/"+button.uid;
              this.logger.log('[CONNECTOR-SERV] -> idConnectorFrom', idConnectorFrom);
              let startIndex = button.action.indexOf('#') + 1;
              let endIndex = button.action.indexOf('{');
              idConnectorTo = button.action.substring(startIndex);
              if(endIndex>-1){
                idConnectorTo = button.action.substring(startIndex, endIndex);
              }
              if(!this.intentExists(idConnectorTo)){
                button.action = '';
                idConnectorTo = null;
              }
              this.logger.log('[CONNECTOR-SERV] -> idConnectorFrom', idConnectorFrom);
              this.logger.log('[CONNECTOR-SERV] -> idConnectorTo', idConnectorTo);
              // // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
              this.createConnector(intent, idConnectorFrom, idConnectorTo);
            }
          });

          /** noInput and noMatch block connectors */
          if( action.settings?.noInputIntent &&  action.settings?.noInputIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/noInput';
            idConnectorTo =  action.settings.noInputIntent.replace("#", "");
            
            if(!this.intentExists(idConnectorTo)){
              action.settings.noInputIntent = '';
              idConnectorTo = null;
            }
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
          if(action.settings?.noMatchIntent && action.settings?.noMatchIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/noMatch';
            idConnectorTo = action.settings.noMatchIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.settings.noMatchIntent = '';
              idConnectorTo = null;
            }
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
        }

        /**  REPLY V2 */
        if(action._tdActionType === TYPE_ACTION.REPLYV2){
          let buttons = this.findButtons(action);
          this.logger.log('buttons   ----- >', buttons, action);
          buttons.forEach(button => {
            // //this.logger.log('[CONNECTOR-SERV] button   ----- > ', button, button.__idConnector);
            if(button.type === TYPE_BUTTON.ACTION && button.action){
              // //const idConnectorFrom = button.__idConnector;
              if(!button.uid || button.uid === "UUIDV4"){
                button.uid = generateShortUID();
              }
              idConnectorFrom = intent.intent_id+"/"+action._tdActionId+"/"+button.uid;
              this.logger.log('[CONNECTOR-SERV] -> idConnectorFrom', idConnectorFrom);
              let startIndex = button.action.indexOf('#') + 1;
              let endIndex = button.action.indexOf('{');
              idConnectorTo = button.action.substring(startIndex);
              if(endIndex>-1){
                idConnectorTo = button.action.substring(startIndex, endIndex);
              }
              if(!this.intentExists(idConnectorTo)){
                button.action = '';
                idConnectorTo = null;
              }
              this.logger.log('[CONNECTOR-SERV] -> idConnectorFrom', idConnectorFrom);
              this.logger.log('[CONNECTOR-SERV] -> idConnectorTo', idConnectorTo);
              // // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
              this.createConnector(intent, idConnectorFrom, idConnectorTo);
            }
          });
          
          if(action.noInputIntent && action.noInputIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/noInput';
            idConnectorTo = action.noInputIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.noInputIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - REPLY-V2 ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - REPLY-V2 ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
          if(action.noMatchIntent && action.noMatchIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/noMatch';
            idConnectorTo = action.noMatchIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.noMatchIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - REPLY-V2 ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - REPLY-V2 ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
        }

        /**  ONLINE_AGENTS */
        if(action._tdActionType === TYPE_ACTION.ONLINE_AGENTS || action._tdActionType === TYPE_ACTION.ONLINE_AGENTSV2){
          if(action.trueIntent && action.trueIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/true';
            idConnectorTo = action.trueIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.trueIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - ONLINE_AGENTS ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - ONLINE_AGENTS ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
          if(action.falseIntent && action.falseIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/false';
            idConnectorTo = action.falseIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.falseIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - ONLINE_AGENTS ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - ONLINE_AGENTS ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
        }

        /**  OPEN_HOURS */
        if(action._tdActionType === TYPE_ACTION.OPEN_HOURS){
          if(action.trueIntent && action.trueIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/true';
            idConnectorTo = action.trueIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.trueIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - OPEN_HOURS ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - OPEN_HOURS ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
          if(action.falseIntent && action.falseIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/false';
            idConnectorTo = action.falseIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.falseIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - OPEN_HOURS ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - OPEN_HOURS ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
        }

        /**  JSON-CONDITION */
        if(action._tdActionType === TYPE_ACTION.JSON_CONDITION){
          if(action.trueIntent && action.trueIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/true';
            idConnectorTo =  action.trueIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.trueIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - JSON_CONDITION ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - JSON_CONDITION ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
          if(action.falseIntent && action.falseIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/false';
            idConnectorTo = action.falseIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.falseIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - JSON_CONDITION ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - JSON_CONDITION ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
        }

        /** ASKGPT */
        if(action._tdActionType === TYPE_ACTION.ASKGPT){
          if(action.trueIntent && action.trueIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/true';
            idConnectorTo =  action.trueIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.trueIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - ASKGPT ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - ASKGPT ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
          if(action.falseIntent && action.falseIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/false';
            idConnectorTo = action.falseIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.falseIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - ASKGPT ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - ASKGPT ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
        }

        /** ASKGPTV2 */
        if(action._tdActionType === TYPE_ACTION.ASKGPTV2){
          if(action.trueIntent && action.trueIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/true';
            idConnectorTo =  action.trueIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.trueIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - ASKGPTV2 ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - ASKGPTV2 ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
          if(action.falseIntent && action.falseIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/false';
            idConnectorTo = action.falseIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.falseIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - ASKGPTV2 ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - ASKGPTV2 ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
        }

        /**  GPT-TASK */
        if(action._tdActionType === TYPE_ACTION.GPT_TASK){
          if(action.trueIntent && action.trueIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/true';
            idConnectorTo =  action.trueIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.trueIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - GPT-TASK ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - GPT-TASK ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
          if(action.falseIntent && action.falseIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/false';
            idConnectorTo = action.falseIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.falseIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - GPT-TASK ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - GPT-TASK ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
        }

        /**  GPT-ASSISTANT */
        if(action._tdActionType === TYPE_ACTION.GPT_ASSISTANT){
          if(action.trueIntent && action.trueIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/true';
            idConnectorTo =  action.trueIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.trueIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - GPT-ASSISTANT ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - GPT-ASSISTANT ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
          if(action.falseIntent && action.falseIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/false';
            idConnectorTo = action.falseIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.falseIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - GPT-ASSISTANT ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - GPT-ASSISTANT ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
        }

        /**  AI-PROMPT */
        if(action._tdActionType === TYPE_ACTION.AI_PROMPT){
          if(action.trueIntent && action.trueIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/true';
            idConnectorTo =  action.trueIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.trueIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - AI-PROMPT ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - AI-PROMPT ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
          if(action.falseIntent && action.falseIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/false';
            idConnectorTo = action.falseIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.falseIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - AI-PROMPT ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - AI-PROMPT ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
        }

        /** WEB-REQUEST-V2 */
        if(action._tdActionType === TYPE_ACTION.WEB_REQUESTV2){
          if(action.trueIntent && action.trueIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/true';
            idConnectorTo =  action.trueIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.trueIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - WEB-REQUEST-V2 ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - WEB-REQUEST-V2 ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
          if(action.falseIntent && action.falseIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/false';
            idConnectorTo = action.falseIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.falseIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - WEB-REQUEST-V2 ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - WEB-REQUEST-V2 ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
        }

        /** MAKE */
        if(action._tdActionType === TYPE_ACTION.MAKE){
          if(action.trueIntent && action.trueIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/true';
            idConnectorTo =  action.trueIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.trueIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - WEB-MAKE ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - WEB-MAKE ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
          if(action.falseIntent && action.falseIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/false';
            idConnectorTo = action.falseIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.falseIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - WEB-MAKE ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - WEB-MAKE ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
        }

        /**  WEB-HUBSPOT */
        if(action._tdActionType === TYPE_ACTION.HUBSPOT){
          if(action.trueIntent && action.trueIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/true';
            idConnectorTo =  action.trueIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.trueIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - WEB-HUBSPOT ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - WEB-HUBSPOT ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
          if(action.falseIntent && action.falseIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/false';
            idConnectorTo = action.falseIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.falseIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - WEB-HUBSPOT ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - WEB-HUBSPOT ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
        }

        /**  WEB-CUSTOMERIO */
        if(action._tdActionType === TYPE_ACTION.CUSTOMERIO){
          if(action.trueIntent && action.trueIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/true';
            idConnectorTo =  action.trueIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.trueIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - WEB-CUSTOMERIO ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - WEB-CUSTOMERIO ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
          if(action.falseIntent && action.falseIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/false';
            idConnectorTo = action.falseIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.falseIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - WEB-CUSTOMERIO ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - WEB-CUSTOMERIO ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
        }

          /**  WEB-BREVO */
          if(action._tdActionType === TYPE_ACTION.BREVO){
            if(action.trueIntent && action.trueIntent !== ''){
              idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/true';
              idConnectorTo =  action.trueIntent.replace("#", "");
              if(!this.intentExists(idConnectorTo)){
                action.trueIntent = '';
                idConnectorTo = null;
              }
              this.logger.log('[CONNECTOR-SERV] - WEB-BREVO ACTION -> idConnectorFrom', idConnectorFrom);
              this.logger.log('[CONNECTOR-SERV] - WEB-BREVO ACTION -> idConnectorTo', idConnectorTo);
              // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
              this.createConnector(intent, idConnectorFrom, idConnectorTo);
            }
            if(action.falseIntent && action.falseIntent !== ''){
              idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/false';
              idConnectorTo = action.falseIntent.replace("#", "");
              if(!this.intentExists(idConnectorTo)){
                action.falseIntent = '';
                idConnectorTo = null;
              }
              this.logger.log('[CONNECTOR-SERV] - WEB-BREVO ACTION -> idConnectorFrom', idConnectorFrom);
              this.logger.log('[CONNECTOR-SERV] - WEB-BREVO ACTION -> idConnectorTo', idConnectorTo);
              // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
              this.createConnector(intent, idConnectorFrom, idConnectorTo);
            }
          }

           /**  WEB-N8N */
           if(action._tdActionType === TYPE_ACTION.N8N){
            if(action.trueIntent && action.trueIntent !== ''){
              idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/true';
              idConnectorTo =  action.trueIntent.replace("#", "");
              if(!this.intentExists(idConnectorTo)){
                action.trueIntent = '';
                idConnectorTo = null;
              }
              this.logger.log('[CONNECTOR-SERV] - WEB-N8N ACTION -> idConnectorFrom', idConnectorFrom);
              this.logger.log('[CONNECTOR-SERV] - WEB-N8N ACTION -> idConnectorTo', idConnectorTo);
              // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
              this.createConnector(intent, idConnectorFrom, idConnectorTo);
            }
            if(action.falseIntent && action.falseIntent !== ''){
              idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/false';
              idConnectorTo = action.falseIntent.replace("#", "");
              if(!this.intentExists(idConnectorTo)){
                action.falseIntent = '';
                idConnectorTo = null;
              }
              this.logger.log('[CONNECTOR-SERV] - WEB-N8N ACTION -> idConnectorFrom', idConnectorFrom);
              this.logger.log('[CONNECTOR-SERV] - WEB-N8N ACTION -> idConnectorTo', idConnectorTo);
              // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
              this.createConnector(intent, idConnectorFrom, idConnectorTo);
            }
          }
        
        /** QAPLA' */
        if(action._tdActionType === TYPE_ACTION.QAPLA){
          if(action.trueIntent && action.trueIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/true';
            idConnectorTo =  action.trueIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.trueIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - QAPLA ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - QAPLA ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
          if(action.falseIntent && action.falseIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/false';
            idConnectorTo = action.falseIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.falseIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - QAPLA ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - QAPLA ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
        }

        /**  CAPTURE USER_REPLY */
        if(action._tdActionType === TYPE_ACTION.CAPTURE_USER_REPLY){
          this.logger.log('[CONNECTOR-SERV] intent_display_name', intent.intent_display_name);
          if(action.goToIntent && action.goToIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId;
            idConnectorTo = action.goToIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.goToIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
        }

        /** DTMF_MENU' ||  DTMF_FORM  || SPEECH_FORM */
        if(action._tdActionType === TYPE_ACTION_VXML.DTMF_MENU  || action._tdActionType === TYPE_ACTION_VXML.DTMF_FORM
            || action._tdActionType === TYPE_ACTION_VXML.SPEECH_FORM){
          let settingCommand: Setting = action.attributes.commands.slice(-1)[0].settings
          if(settingCommand && settingCommand.noInputIntent && settingCommand.noInputIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/noInput';
            idConnectorTo =  settingCommand.noInputIntent.replace("#", "");
            
            if(!this.intentExists(idConnectorTo)){
              settingCommand.noInputIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - DTMF_MENU ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - DTMF_MENU ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
          if(settingCommand && settingCommand.noMatchIntent && settingCommand.noMatchIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/noMatch';
            idConnectorTo = settingCommand.noMatchIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              settingCommand.noMatchIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - DTMF_MENU ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - DTMF_MENU ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
        }

        /** BLIND TRANSFER' */
        if(action._tdActionType === TYPE_ACTION_VXML.BLIND_TRANSFER){
          let settingCommand: Setting = action.attributes.commands.slice(-1)[0].settings
          if(settingCommand && settingCommand.trueIntent && settingCommand.trueIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/true';
            idConnectorTo =  settingCommand.trueIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              settingCommand.trueIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - QAPLA ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - QAPLA ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
          if(settingCommand && settingCommand.falseIntent && settingCommand.falseIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/false';
            idConnectorTo = settingCommand.falseIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              settingCommand.falseIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - QAPLA ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - QAPLA ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
        }

        /** SEND WHATSAPP  */
        if(action._tdActionType === TYPE_ACTION.SEND_WHATSAPP){
          if(action.trueIntent && action.trueIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/true';
            idConnectorTo = action.trueIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.trueIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - ONLINE_AGENTS ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - ONLINE_AGENTS ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
          if(action.falseIntent && action.falseIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/false';
            idConnectorTo = action.falseIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.falseIntent = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] - ONLINE_AGENTS ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - ONLINE_AGENTS ACTION -> idConnectorTo', idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
        }


      });
    }
  }

  private createConnector(intent, idConnectorFrom, idConnectorTo){
    const connectorsAttributes = intent.attributes.connectors;
    this.logger.log('[DEBUG] - createConnector ->', intent, connectorsAttributes, idConnectorFrom, idConnectorTo);
    if(idConnectorFrom && idConnectorTo){
      //const connectorID =  idConnectorFrom + '/' + idConnectorTo; 
      let attributes = {};
      if(connectorsAttributes && connectorsAttributes[idConnectorFrom]){
        attributes = connectorsAttributes[idConnectorFrom];
      }
      this.logger.log('[DEBUG] - createConnector attributes ->', idConnectorFrom, connectorsAttributes, attributes);
      this.createConnectorFromId(idConnectorFrom, idConnectorTo, false, attributes);
    } else {
      this.logger.log('[DEBUG] - il connettore è rotto non esiste intent ->', idConnectorTo);
    }
  }
  /*************************************************/


  /*************************************************/
  /** DELETE CONNECTOR                             */
  /*************************************************/

  /**
   * removeConnectorDraft
   */
  public removeConnectorDraft(){
    this.connectorDraft = null;
    this.tiledeskConnectors.removeConnectorDraft();
  }

  /**
   * deleteConnectorsOfBlockThatDontExist
   * @param intent_id 
   */
  public deleteConnectorsOfBlockThatDontExist(intent_id){
    this.tiledeskConnectors.deleteConnectorsOfBlockThatDontExist(intent_id);
    this.logger.log('[CONNECTOR-SERV] deleteConnectorsOfBlockThatDontExist intent_id ' ,intent_id);
  }

  /**
   * deleteConnectorsOutOfBlock
   * @param intent_id 
   * @param dispatch 
   */
  public deleteConnectorsOutOfBlock(intent_id, save=false, notify=true){
    this.tiledeskConnectors.deleteConnectorsOutOfBlock(intent_id, save, notify);
    // this.logger.log('[CONNECTOR-SERV] deleteConnectorsOutOfBlock intent_id ' ,intent_id);
  }

  /**
   * deleteConnectorsOfBlock
   * @param intent_id 
   */
  public deleteConnectorsOfBlock(intent_id, save=false, notify=false){
    this.logger.log('[CONNECTOR-SERV] deleteConnectorsOfBlock intent_id ' ,intent_id);
    this.tiledeskConnectors.deleteConnectorsOfBlock(intent_id, save, notify);
  }

  /**
   * deleteConnectorsBrokenOutOfBlock
   * @param intent_id 
   */
  public deleteConnectorsBrokenOutOfBlock(intent_id){
    this.tiledeskConnectors.deleteConnectorsBrokenOutOfBlock(intent_id);
    this.logger.log('[CONNECTOR-SERV] deleteConnectorsBrokenOutOfBlock intent_id ' ,intent_id )
  }

  /**
   * deleteConnectorFromAction
   * @param actionId 
   * @param connId 
   */
  public deleteConnectorFromAction(actionId, connId){
    this.tiledeskConnectors.deleteConnectorFromAction(actionId, connId);
    this.logger.log('[CONNECTOR-SERV] deleteConnectorFromAction actionId ' ,actionId ,' connId ', connId)
  }

  /**
   * deleteConnectorsFromActionByActionId
   * @param actionId 
   */
  public deleteConnectorsFromActionByActionId(actionId){
    this.tiledeskConnectors.deleteConnectorsFromActionByActionId(actionId);
    this.logger.log('[CONNECTOR-SERV] deleteConnectorsFromActionByActionId actionId ' ,actionId )
  }


  public deleteConnectorsToIntentById(intentId){
    this.tiledeskConnectors.deleteConnectorsToIntentById(intentId);
    this.logger.log('[CONNECTOR-SERV] deleteConnectorsToIntentById intentId ' ,intentId );
  }


  /**
   * deleteConnector
   * @param connectorID 
   * 
   */
  public deleteConnector(intent, idConnection, save=false, notify=true) {
    this.logger.log('[CONNECTOR-SERV] deleteConnector::  connectorID ', intent, idConnection, save, notify);
    const idConnector = idConnection.substring(0, idConnection.lastIndexOf('/'));
    this.logger.log('[CONNECTOR-SERV] 00000 ', idConnector);
    if(idConnector && intent.attributes?.connectors[idConnector]){
      delete intent.attributes.connectors[idConnector];
    }
    this.hideContractConnector(idConnection);
    this.tiledeskConnectors.deleteConnector(idConnection, save, notify);
  }


  /**
   * 
   * @param connectorID 
   */
  public deleteConnectorToList(connectorID){
    // this.logger.log('[CONNECTOR-SERV] deleteConnectorToList::  connectorID ', connectorID)
    delete this.listOfConnectors[connectorID];
  }

  /** */
  // public deleteAllConnectors(){
  //   this.logger.log('[CONNECTOR-SERV] deleteAllConnectors:: ');
  //   this.tiledeskConnectors.deleteAllConnectors();
  // }

  /**
   * eleteConnectorWithIDStartingWith 
   * @param connectorID 
   * @param dispatch 
   * 
   * elimino il connettore creato in precedenza allo stesso punto e lo sostituisco con il nuovo
   */
  public deleteConnectorWithIDStartingWith(connectorID, save=false, notify=true){
    this.logger.log('[CONNECTOR-SERV] deleteConnectorWithIDStartingWith:: ', connectorID, this.tiledeskConnectors.connectors);
    const isConnector = document.getElementById(connectorID);
    if (isConnector){
      const listOfConnectors = Object.keys(this.tiledeskConnectors.connectors)
      .filter(key => key.startsWith(connectorID))
      .reduce((filteredMap, key) => {
        filteredMap[key] = this.tiledeskConnectors.connectors[key];
        return filteredMap;
      }, {});
      for (const [key, connector] of Object.entries(listOfConnectors)) {
        this.logger.log('delete connector :: ', key );
        const intentId = connectorID.split('/')[0];
        const intent = this.listOfIntents.find((intent) => intent.intent_id === intentId);
        this.deleteConnector(intent, key, save, notify);
      };
    }
  }
  /*************************************************/



  /*************************************************/
  /** EDIT CONNECTOR                             */
  /*************************************************/

  /**
   * updateConnector
   * @param elementID 
   */
  public async updateConnector(elementID){
    this.logger.log('[CONNECTOR-SERV] movedConnector elementID ' ,elementID )
    const elem = await isElementOnTheStage(elementID); // chiamata sincrona
    // const elem = document.getElementById(elementID);
    if(elem){
      this.logger.log('[CONNECTOR-SERV] aggiorno i connettori: ', elem);
      //setTimeout(() => {
        this.tiledeskConnectors.updateConnectorsOutOfItent(elem);
      //}, 0);
    }
  }


  public updateConnectorAttributes(connectors: any, connector: any) {
    this.logger.log('[CONNECTOR-SERV] updateConnectorAttributes:::::  ',connectors,  connector);
    if(!connector){
      return;
    }
    if(!connectors[connector.id]){
      connectors[connector.id] = {};
    }
    Object.keys(connector).forEach(key => {
      connectors[connector.id][key] = connector[key]
    });
  }



  public updateConnectorLabel(elementID: string, label: string) {
    this.logger.log('[CONNECTOR-SERV] updateConnectorLabel:::::  ',elementID,  label);
    const lineText = document.getElementById("label_"+elementID);
    if(lineText){
      lineText.textContent = label;
      this.updateLineTextPosition(elementID, label);
    }
  }

  
  updateLineTextPosition(id: string, label: string){
    let lineText = document.getElementById("label_"+id);
    let rect = document.getElementById("rect_"+id);
    let rectLabel = lineText.getBoundingClientRect();
    if (lineText && rect) {
      let rectWidth = 0;
      let rectHeight = 0;
      if(label && label !== ''){
        rectWidth = rectLabel.width + 10;
        rectHeight = rectLabel.height + 10;
      } 
      const x = parseFloat(lineText.getAttribute("x"));
      const y = parseFloat(lineText.getAttribute("y"));
      lineText.setAttributeNS(null, "x", String(x));
      lineText.setAttributeNS(null, "y", String(y));
      rect.setAttributeNS(null, "x",  String(x - rectWidth / 2));
      rect.setAttributeNS(null, "y", String(y - rectHeight / 2));
      rect.setAttributeNS(null, "width", String(rectWidth));
      rect.setAttributeNS(null, "height", String(rectHeight));
    }
  }


  /**
   * 
   * @param elementID 
   */
  public async updateConnectorsOfBlock(elementID){
    this.logger.log('[CONNECTOR-SERV] updateConnector2 elementID ' ,elementID);
    const elem = await isElementOnTheStage(elementID); //sync
    if(elem){
      let cdsConnectors = elem.querySelectorAll('[connector]');
      this.logger.log('[CONNECTOR-SERV] elem::', Array.from(cdsConnectors));
      const elements = Array.from(cdsConnectors).map((element: HTMLElement) => element);
      elements.forEach(element => {
        const fromId = element.id;
        const connectionId = element.getAttribute('idConnection');
        this.logger.log('[CONNECTOR-SERV] element::', element, connectionId, fromId);
        for (let connectorId in this.tiledeskConnectors.connectors) {
          if (connectorId.startsWith(fromId)) {
            this.deleteConnectorById(connectorId);
          }
        }
        if(connectionId){
          this.createConnectorById(connectionId);
        }
      });
      return true;
    }
    return true;
  }


  public deleteConnectorById(connectorId) {
    let connectorElement = document.getElementById(connectorId);
    if(connectorElement){
      this.deleteConnector(connectorId, false, false);
    }
  }


  
  /**
   * moved
   * @param element 
   * @param x 
   * @param y 
   */
  public moved(element, x, y){
    this.tiledeskConnectors.moved(element, x, y);
    // this.logger.log('[CONNECTOR-SERV] moved element ' ,element , ' x ' , x ,  'y ',  y )
  }
  /*************************************************/


  /*************************************************/
  /** SEARCH CONNECTOR                             */
  /*************************************************/


  /**
   * searchConnectorsInOfIntent
   * @param intent_id 
   * @returns 
   */
  public searchConnectorsInByIntent(intent_id: string): Array<any>{
    const connectors = Object.keys(this.tiledeskConnectors.connectors)
    .filter(key => key.includes(intent_id) && !key.startsWith(intent_id) )
    .reduce((filteredMap, key) => {
      filteredMap[key] = this.tiledeskConnectors.connectors[key];
      return filteredMap;
    }, {});
    const arrayConnectors = Object.values(connectors);
    this.logger.log('[CONNECTOR-SERV] -----> arrayConnectors::: ', arrayConnectors);
    return arrayConnectors;
  }

   /**
   * searchConnectorsInOfIntent
   * @param intent_id 
   * @returns 
   */
   public searchConnectorsOutByIntent(intent_id: string): Array<any>{
    const connectors = Object.keys(this.tiledeskConnectors.connectors)
    .filter(key => key.includes(intent_id) && key.startsWith(intent_id) )
    .reduce((filteredMap, key) => {
      filteredMap[key] = this.tiledeskConnectors.connectors[key];
      return filteredMap;
    }, {});
    const arrayConnectors = Object.values(connectors);
    this.logger.log('[CONNECTOR-SERV] -----> searchConnectorsOutByIntent::: ', arrayConnectors);
    return arrayConnectors;
  }
  

  /*************************************************/


  public findButtons(obj) {
    let buttons = [];
    if(!obj) return buttons;
    if (Array.isArray(obj)) {
      for (const element of obj) {
        buttons = buttons.concat(this.findButtons(element));
      }
    } else if (typeof obj === 'object') {
      if (obj.hasOwnProperty('buttons')) {
        obj.buttons.forEach(button => {
          buttons.push(button);
        });
      }
      for (let key in obj) {
        buttons = buttons.concat(this.findButtons(obj[key]));
      }
    }
    return buttons;
  }


  /**
   * 
   * @param positions 
   */
  public logicPoint(positions){
    return this.tiledeskConnectors.logicPoint(positions);
  }
  




  createListOfConnectorsByIntent2(json: any): void {
    let intent_id = json.intent_id;
    let tdActionId = '';
    const exploreObject = (obj: any) => {

      if (typeof obj === 'object' && obj !== null) {
        if(obj._tdActionId){
          tdActionId = obj._tdActionId;
        }
        for (const key in obj) {
          if (typeof obj[key] === 'string' && obj[key].startsWith('#') && obj[key] !== '#') {
            const idConnectorTo = obj[key].replace('#', '');
            let connectorID = '';
            if(key === 'intentName'){
              connectorID = intent_id+'/'+tdActionId+'/'+idConnectorTo;
            } else if(key === 'trueIntent'){
              connectorID = intent_id+'/'+tdActionId+'/true'+'/'+idConnectorTo;
            } else if(key === 'falseIntent'){
              connectorID = intent_id+'/'+tdActionId+'/false'+'/'+idConnectorTo;
            } else if(key === 'noInputIntent'){
              connectorID = intent_id+'/'+tdActionId+'/noInput'+'/'+idConnectorTo;
            } else if(key === 'noMatchIntent'){
              connectorID = intent_id+'/'+tdActionId+'/noMatch'+'/'+idConnectorTo;
            } else if(obj.uid && obj.type === 'action'){
              connectorID = intent_id+"/"+tdActionId+"/"+obj.uid+'/'+idConnectorTo;
            } 
            let shown = 'false';
            const objectExists = this.existingIntentIds.has(idConnectorTo);
            if(!objectExists) {
              connectorID = 'ERROR_'+connectorID+'___'+generateShortUID();
              shown = 'error';
            } else if (this.mapOfConnectors.hasOwnProperty(connectorID)) {
              connectorID = 'DUPLICATE_'+connectorID+'___'+generateShortUID();
              shown = 'error';
            }
            this.mapOfConnectors[connectorID] = { shown: shown };

          }
          exploreObject(obj[key]);
        }
      }
    };
    exploreObject(json);
  }



  /** addCustomMarker
   * add custom market arrow to each connector 
   * */
  addCustomMarker(connectorId: any, color: string) {;
    const element = document.getElementById(connectorId);
    if (element) {
      this.tiledeskConnectors.addCustomMarker(element, color);
    }
  }


  /**  setConnectorColor 
   * get all connectors that start with intentid
   * iterate the array of connectors and change the connector color 
   * add the arrow with same color of connector
  */
  setConnectorColor(intentId: any, color: string, opacity: number) {
    let rgba = `rgba(${color}, 1)`; // ${opacity}
    const listOfConnectors = this.searchConnectorsOutByIntent(intentId);
    listOfConnectors.forEach(connector => {
      const element = document.getElementById(connector.id);
      let op: string = opacity.toString();
      if (element) {
        element.style.setProperty('stroke', rgba);
        // element.style.setProperty('opacity', op);
        element.setAttributeNS(null, "opacity", op);
        this.addCustomMarker(connector.id, rgba);
      }
    });
  }




  /**
   * restoreDefaultConnector
   * richiamato da cds-connector
   * scatta quando premo su connector contract per ripristinare il connettore,
   * cioè nascondere il connector contract e mostrare il connettore normale
   */
  showDefaultConnector(idConnection: string){
    idConnection = idConnection.replace("#", "");
    this.logger.log('[CONNECTOR-SERV] showDefaultConnector:: ', idConnection);
    this.setDisplayElementById(idConnection, 'flex');
    this.setDisplayElementById('rect_' + idConnection, 'flex');
    this.setDisplayElementById('label_' + idConnection, 'flex');
  }

  // setDisplayConnectorByIdConnector(connectorId: string) {
  /**
   * restoreDefaultConnector
   * richiamato da cds-canvas
   * scatta quando premo sul pulsante per nascondere il connettore
   * nasconde il connettore normale e mostra il connector contract
   */
  hideDefaultConnector(idConnection: string){
    idConnection = idConnection.replace("#", "");
    // // this.logger.log('[CONNECTOR-SERV] hideDefaultConnector:: ', idConnection);
    this.setDisplayElementById(idConnection, 'none');
    this.setDisplayElementById('rect_' + idConnection, 'none');
    this.setDisplayElementById('label_' + idConnection, 'none');
  }

  hideContractConnector(idConnection: string){
    idConnection = idConnection.replace("#", "");
    const idConnector = idConnection.substring(0, idConnection.lastIndexOf('/'));
    this.setDisplayElementById('contract_' + idConnector, 'none');
    // const connector = {id:idConnector, display:true};
    // this.subjectChangedConnectorAttributes.next(connector);
  }

  showContractConnector(idConnection: string){
    idConnection = idConnection.replace("#", "");
    const idConnector = idConnection.substring(0, idConnection.lastIndexOf('/'));
    this.setDisplayElementById('contract_' + idConnector, 'flex');
    // const connector = {id:idConnector, display:false};
    // this.subjectChangedConnectorAttributes.next(connector);
  }


  setDisplayElementById(elementId: string, displayValue: string): void {
    // this.logger.log('[CONNECTOR-SERV] setDisplayElementById:: ', elementId, displayValue);
    const element = document.getElementById(elementId);
    if (element) {
      this.logger.log('[CONNECTOR-SERV] setDisplayElementById :: ', elementId, displayValue);
      element.style.setProperty('display', displayValue);
    }
  }

  showHideConnectorByIdConnector(idConnection: string, shown: boolean) {
    if(idConnection){
      const idConnector = idConnection.substring(0, idConnection.lastIndexOf('/'));
      const displayConnector = shown?'flex':'none';
      const displayContractConnector = shown?'none':'flex';
      this.logger.log('[CONNECTOR-SERV] showHideConnectorByIdConnector:: ', idConnection, displayConnector, displayContractConnector);
      this.setDisplayElementById(idConnection, displayConnector);
      this.setDisplayElementById('rect_' + idConnection, displayConnector);
      this.setDisplayElementById('label_' + idConnection, displayConnector);
      this.setDisplayElementById('contract_' + idConnector, displayContractConnector);
    }
  }

}
