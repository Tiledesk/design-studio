import { Injectable } from '@angular/core';
import { TiledeskConnectors } from 'src/assets/js/tiledesk-connectors.js';
import { StageService } from '../services/stage.service';
import { TYPE_BUTTON, isElementOnTheStage, generateShortUID } from '../utils';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { Setting } from 'src/app/models/action-model';
import { TYPE_ACTION, TYPE_ACTION_VXML } from '../utils-actions';
/** CLASSE DI SERVICES PER GESTIRE I CONNETTORI **/


@Injectable({
  providedIn: 'root'
})

export class ConnectorService {
  listOfConnectors: any = {};
  tiledeskConnectors: any;
  connectorDraft: any = {};
  listOfIntents: any;
  mapOfConnectors: any = {};

  private logger: LoggerService = LoggerInstance.getInstance();
  
  constructor() {}

  initializeConnectors(){
    this.tiledeskConnectors = new TiledeskConnectors("tds_drawer", {"input_block": "tds_input_block"}, {});
    this.tiledeskConnectors.mousedown(document);
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
      target: detail.target
    }
  }

  /**
   * addConnectorToList
   * @param connector 
   */
  public addConnectorToList(connector){
    this.listOfConnectors[connector.id] = connector;
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
    // this.logger.log('[CONNECTOR-SERV] -----> createConnectors::: ', intents);
    this.listOfIntents = intents;
    intents.forEach(async intent => {
      this.createListOfConnectorsByIntent(intent);     
    });
    // private createConnector(intent, idConnectorFrom, idConnectorTo){
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
    var lastIndex = connectorID.lastIndexOf("/");
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
    if(intent.attributes && intent.attributes.nextBlockAction){
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
        this.logger.log('[CONNECTOR-SERV] -> CREATE CONNECTOR', idConnectorFrom, idConnectorTo);
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
          // this.logger.log('[CONNECTOR-SERV] intent_display_name', intent.intent_display_name);
          if(action.intentName && action.intentName !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId;
            idConnectorTo = action.intentName.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.intentName = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] -> CREATE CONNECTOR', idConnectorFrom, idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
        }

        /**  CONNECT BLOCK */
        if(action._tdActionType === TYPE_ACTION.CONNECT_BLOCK){
          // this.logger.log('[CONNECTOR-SERV] intent_display_name', intent.intent_display_name);
          if(action.intentName && action.intentName !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId;
            idConnectorTo = action.intentName.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.intentName = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] -> CREATE CONNECTOR', idConnectorFrom, idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
        }

        /**  REPLY  RANDOM_REPLY */
        if( (action._tdActionType === TYPE_ACTION.REPLY || action._tdActionType === TYPE_ACTION.RANDOM_REPLY) ||
            (action._tdActionType === TYPE_ACTION_VXML.DTMF_FORM || action._tdActionType === TYPE_ACTION_VXML.DTMF_MENU || action._tdActionType === TYPE_ACTION_VXML.BLIND_TRANSFER)){
          var buttons = this.findButtons(action);
          this.logger.log('buttons   ----- >', buttons, action);
          buttons.forEach(button => {
            // this.logger.log('[CONNECTOR-SERV] button   ----- > ', button, button.__idConnector);
            if(button.type === TYPE_BUTTON.ACTION && button.action){
              // const idConnectorFrom = button.__idConnector;
              if(!button.uid || button.uid === "UUIDV4"){
                button.uid = generateShortUID();
              }
              idConnectorFrom = intent.intent_id+"/"+action._tdActionId+"/"+button.uid;
              this.logger.log('[CONNECTOR-SERV] -> idConnectorFrom', idConnectorFrom);
              var startIndex = button.action.indexOf('#') + 1;
              var endIndex = button.action.indexOf('{');
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
              // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
              this.createConnector(intent, idConnectorFrom, idConnectorTo);
            }
          });

          /** noInput and noMatch block connectors */
          if( action.settings  &&  action.settings .noInputIntent &&  action.settings .noInputIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/noInput';
            idConnectorTo =  action.settings.noInputIntent.replace("#", "");
            
            if(!this.intentExists(idConnectorTo)){
              action.settings.noInputIntent = '';
              idConnectorTo = null;
            }
            this.createConnector(intent, idConnectorFrom, idConnectorTo);
          }
          if(action.settings && action.settings.noMatchIntent && action.settings.noMatchIntent !== ''){
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

          var buttons = this.findButtons(action);
          this.logger.log('buttons   ----- >', buttons, action);
          buttons.forEach(button => {
            // this.logger.log('[CONNECTOR-SERV] button   ----- > ', button, button.__idConnector);
            if(button.type === TYPE_BUTTON.ACTION && button.action){
              // const idConnectorFrom = button.__idConnector;
              if(!button.uid || button.uid === "UUIDV4"){
                button.uid = generateShortUID();
              }
              idConnectorFrom = intent.intent_id+"/"+action._tdActionId+"/"+button.uid;
              this.logger.log('[CONNECTOR-SERV] -> idConnectorFrom', idConnectorFrom);
              var startIndex = button.action.indexOf('#') + 1;
              var endIndex = button.action.indexOf('{');
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
              // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
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
    if(idConnectorFrom && idConnectorTo){
      const connectorID = idConnectorFrom+'/'+idConnectorTo;
      let attributes = null;
      if(connectorsAttributes && connectorsAttributes[connectorID]){
        attributes = connectorsAttributes[connectorID]
      }
      this.createConnectorFromId(idConnectorFrom, idConnectorTo, false, attributes);
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
  public deleteConnector(connectorID, save=false, notify=true) {
    this.logger.log('[CONNECTOR-SERV] deleteConnector::  connectorID ', connectorID, save, notify);
    this.deleteConnectorAttributes(connectorID);
    this.tiledeskConnectors.deleteConnector(connectorID, save, notify);
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
        this.deleteConnector(key, save, notify);
      };
    }
  }


  private deleteConnectorAttributes(connectorID){
    const intentId = connectorID.split('/')[0];
    let intent = this.listOfIntents.find((intent) => intent.intent_id === intentId);
    if(intent && intent.attributes && intent.attributes.connectors && intent.attributes.connectors[connectorID]){
      delete intent.attributes.connectors[connectorID];
    }
    this.updateConnectorAttributes(connectorID, null);
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


  public updateConnectorAttributes(elementID, attributes=null) {
    // console.log("updateConnectorAttributes:::::  ",elementID,  attributes);
    const lineText = document.getElementById("label_"+elementID);
    if(lineText){
      var label = null;
      if(attributes && attributes.label){
        label = attributes.label;
      }
      lineText.textContent = label;
      this.updateLineTextPosition(elementID, label);
    }
    // update position lineText
  }

  
  updateLineTextPosition(id, label){
    let lineText = document.getElementById("label_"+id);
    let rect = document.getElementById("rect_"+id);
    var rectLabel = lineText.getBoundingClientRect();
    // console.log("lineText.style:::::  ", rectLabel);
    if (lineText && rect) {
      // const rectWidth = rectLabel.width + 10;
      // const rectHeight = rectLabel.height + 10;
      var rectWidth = 0;
      var rectHeight = 0;
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
      var cdsConnectors = elem.querySelectorAll('[connector]');
      this.logger.log('[CONNECTOR-SERV] elem::', Array.from(cdsConnectors));
      const elements = Array.from(cdsConnectors).map((element: HTMLElement) => element);
      elements.forEach(element => {
        const fromId = element.id;
        const connectionId = element.getAttribute('idConnection');
        this.logger.log('[CONNECTOR-SERV] element::', element, connectionId, fromId);
        for (var connectorId in this.tiledeskConnectors.connectors) {
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
    // for (var connectorKey in this.tiledeskConnectors.connectors) {
    //   console.log("[JS] deleteConnectorWithFromId ----> ", fromId, connectorKey);
    //   if (connectorKey.startsWith(fromId)) {
    //     const connectorId = this.tiledeskConnectors.connectors[connectorKey].id;
        let connectorElement = document.getElementById(connectorId);
        if(connectorElement){
          // console.log("[JS] deleteConnectorWithFromId ----> ID",connectorId);
          this.deleteConnector(connectorId, false, false);
        }
    //   }
    // }
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

  // /**
  //  * searchConnectorsOutOfIntent
  //  * @param intent_id 
  //  * @returns 
  //  */
  // public searchConnectorsOutOfIntent(intent_id): Array<any>{
  //   this.logger.log('[CONNECTOR-SERV] -----> searchConnectorsOutOfIntent::: ', intent_id);
  //   this.logger.log('[CONNECTOR-SERV] -----> searchConnectorsOutOfIntent::: ', this.tiledeskConnectors.connectors);
  //   const connectors = Object.keys(this.tiledeskConnectors.connectors)
  //   .filter(key => key.includes(intent_id) && key.startsWith(intent_id) )
  //   .reduce((filteredMap, key) => {
  //     filteredMap[key] = this.tiledeskConnectors.connectors[key];
  //     return filteredMap;
  //   }, {});
  //   const arrayConnectors = Object.values(connectors);
  //   this.logger.log('[CONNECTOR-SERV] -----> arrayConnectors::: ', arrayConnectors);
  //   return arrayConnectors;
  // }

  // public searchConnectorsOfIntent(intent_id){
  //   this.logger.log('[CONNECTOR-SERV] -----> searchConnectorsOfIntent::: ', intent_id);
  //   this.logger.log('[CONNECTOR-SERV] -----> searchConnectorsOfIntent::: ', this.tiledeskConnectors.connectors);
  //   const INOUTconnectors = Object.keys(this.tiledeskConnectors.connectors)
  //   .filter(key => key.includes(intent_id) ) //&& !key.startsWith(intent_id)
  //   .reduce((filteredMap, key) => {
  //     filteredMap[key] = this.tiledeskConnectors.connectors[key];
  //     return filteredMap;
  //   }, {});
  //   const arrayConnectors = Object.values(INOUTconnectors);
  //   this.logger.log('[CONNECTOR-SERV] -----> arrayConnectors::: ', arrayConnectors);
  //   return arrayConnectors
  // }


  /**
   * searchConnectorsInOfIntent
   * @param intent_id 
   * @returns 
   */
  public searchConnectorsInByIntent(intent_id: string): Array<any>{
    // this.logger.log('[CONNECTOR-SERV] -----> searchConnectorsInOfIntent::: ', intent_id);
    // this.logger.log('[CONNECTOR-SERV] -----> searchConnectorsInOfIntent::: ', this.tiledeskConnectors.connectors);
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

  /*************************************************/


  public findButtons(obj) {
    var buttons = [];
    if(!obj) return buttons;
    // Verifica se l'oggetto corrente è un array
    if (Array.isArray(obj)) {
      // Itera sugli elementi dell'array
      for (var i = 0; i < obj.length; i++) {
        // Richiama la funzione findButtons in modo ricorsivo per ogni elemento
        buttons = buttons.concat(this.findButtons(obj[i]));
      }
    } else if (typeof obj === 'object') {
      // Verifica se l'oggetto corrente ha una proprietà "buttons"
      if (obj.hasOwnProperty('buttons')) {
        // Aggiungi l'array di pulsanti alla lista dei pulsanti trovati
        obj.buttons.forEach(button => {
          buttons.push(button);
        });
      }
      // Itera sulle proprietà dell'oggetto
      for (var key in obj) {
        // Richiama la funzione findButtons in modo ricorsivo per ogni proprietà
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
  








  public createListOfConnectorsByIntent(intent:any){
    if(intent.attributes && intent.attributes.nextBlockAction){
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
        this.logger.log('[CONNECTOR-SERV] -> CREATE CONNECTOR', idConnectorFrom, idConnectorTo);
        const connectorID = idConnectorFrom+'/'+idConnectorTo;
        this.mapOfConnectors[connectorID] =  {'shown': false };
      }
    }

    if(intent.actions){
      intent.actions.forEach(action => {
        let idConnectorFrom = null;
        let idConnectorTo = null;
        this.logger.log('[CONNECTOR-SERV] createConnectors:: ACTION ', action);
        
        /**  INTENT */
        if(action._tdActionType === TYPE_ACTION.INTENT){
          // this.logger.log('[CONNECTOR-SERV] intent_display_name', intent.intent_display_name);
          if(action.intentName && action.intentName !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId;
            idConnectorTo = action.intentName.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.intentName = '';
              idConnectorTo = null;
            }
            this.logger.log('[CONNECTOR-SERV] -> CREATE CONNECTOR', idConnectorFrom, idConnectorTo);
            // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
            const connectorID = idConnectorFrom+'/'+idConnectorTo;
        this.mapOfConnectors[connectorID] =  {'shown': false };
          }
        }

        /**  REPLY  RANDOM_REPLY */
        if( (action._tdActionType === TYPE_ACTION.REPLY || action._tdActionType === TYPE_ACTION.RANDOM_REPLY) ||
            (action._tdActionType === TYPE_ACTION_VXML.DTMF_FORM || action._tdActionType === TYPE_ACTION_VXML.DTMF_MENU || action._tdActionType === TYPE_ACTION_VXML.BLIND_TRANSFER)){
          var buttons = this.findButtons(action);
          this.logger.log('buttons   ----- >', buttons, action);
          buttons.forEach(button => {
            // this.logger.log('[CONNECTOR-SERV] button   ----- > ', button, button.__idConnector);
            if(button.type === TYPE_BUTTON.ACTION && button.action){
              // const idConnectorFrom = button.__idConnector;
              if(!button.uid || button.uid === "UUIDV4"){
                button.uid = generateShortUID();
              }
              idConnectorFrom = intent.intent_id+"/"+action._tdActionId+"/"+button.uid;
              this.logger.log('[CONNECTOR-SERV] -> idConnectorFrom', idConnectorFrom);
              var startIndex = button.action.indexOf('#') + 1;
              var endIndex = button.action.indexOf('{');
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
              // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
              const connectorID = idConnectorFrom+'/'+idConnectorTo;
        this.mapOfConnectors[connectorID] =  {'shown': false };
            }
          });

          /** noInput and noMatch block connectors */
          if( action.settings  &&  action.settings .noInputIntent &&  action.settings .noInputIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/noInput';
            idConnectorTo =  action.settings.noInputIntent.replace("#", "");
            
            if(!this.intentExists(idConnectorTo)){
              action.settings.noInputIntent = '';
              idConnectorTo = null;
            }
            const connectorID = idConnectorFrom+'/'+idConnectorTo;
        this.mapOfConnectors[connectorID] =  {'shown': false };
          }
          if(action.settings && action.settings.noMatchIntent && action.settings.noMatchIntent !== ''){
            idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/noMatch';
            idConnectorTo = action.settings.noMatchIntent.replace("#", "");
            if(!this.intentExists(idConnectorTo)){
              action.settings.noMatchIntent = '';
              idConnectorTo = null;
            }
            const connectorID = idConnectorFrom+'/'+idConnectorTo;
        this.mapOfConnectors[connectorID] =  {'shown': false };
          }
        }

        /**  REPLY V2 */
        if(action._tdActionType === TYPE_ACTION.REPLYV2){

          var buttons = this.findButtons(action);
          this.logger.log('buttons   ----- >', buttons, action);
          buttons.forEach(button => {
            // this.logger.log('[CONNECTOR-SERV] button   ----- > ', button, button.__idConnector);
            if(button.type === TYPE_BUTTON.ACTION && button.action){
              // const idConnectorFrom = button.__idConnector;
              if(!button.uid || button.uid === "UUIDV4"){
                button.uid = generateShortUID();
              }
              idConnectorFrom = intent.intent_id+"/"+action._tdActionId+"/"+button.uid;
              this.logger.log('[CONNECTOR-SERV] -> idConnectorFrom', idConnectorFrom);
              var startIndex = button.action.indexOf('#') + 1;
              var endIndex = button.action.indexOf('{');
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
              // this.createConnectorFromId(idConnectorFrom, idConnectorTo);
              const connectorID = idConnectorFrom+'/'+idConnectorTo;
              this.mapOfConnectors[connectorID] =  {'shown': false };

              this.mapOfConnectors[connectorID] =  {'shown': false };
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
            const connectorID = idConnectorFrom+'/'+idConnectorTo;
        this.mapOfConnectors[connectorID] =  {'shown': false };
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
            const connectorID = idConnectorFrom+'/'+idConnectorTo;
        this.mapOfConnectors[connectorID] =  {'shown': false };
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
            const connectorID = idConnectorFrom+'/'+idConnectorTo;
        this.mapOfConnectors[connectorID] =  {'shown': false };
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
            const connectorID = idConnectorFrom+'/'+idConnectorTo;
        this.mapOfConnectors[connectorID] =  {'shown': false };
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
            const connectorID = idConnectorFrom+'/'+idConnectorTo;
        this.mapOfConnectors[connectorID] =  {'shown': false };
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
            const connectorID = idConnectorFrom+'/'+idConnectorTo;
        this.mapOfConnectors[connectorID] =  {'shown': false };
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
            const connectorID = idConnectorFrom+'/'+idConnectorTo;
        this.mapOfConnectors[connectorID] =  {'shown': false };
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
            const connectorID = idConnectorFrom+'/'+idConnectorTo;
        this.mapOfConnectors[connectorID] =  {'shown': false };
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
            const connectorID = idConnectorFrom+'/'+idConnectorTo;
        this.mapOfConnectors[connectorID] =  {'shown': false };
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
            const connectorID = idConnectorFrom+'/'+idConnectorTo;
        this.mapOfConnectors[connectorID] =  {'shown': false };
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
            const connectorID = idConnectorFrom+'/'+idConnectorTo;
        this.mapOfConnectors[connectorID] =  {'shown': false };
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
            const connectorID = idConnectorFrom+'/'+idConnectorTo;
        this.mapOfConnectors[connectorID] =  {'shown': false };
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
            const connectorID = idConnectorFrom+'/'+idConnectorTo;
        this.mapOfConnectors[connectorID] =  {'shown': false };
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
            const connectorID = idConnectorFrom+'/'+idConnectorTo;
        this.mapOfConnectors[connectorID] =  {'shown': false };
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
            const connectorID = idConnectorFrom+'/'+idConnectorTo;
        this.mapOfConnectors[connectorID] =  {'shown': false };
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
            const connectorID = idConnectorFrom+'/'+idConnectorTo;
        this.mapOfConnectors[connectorID] =  {'shown': false };
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
            const connectorID = idConnectorFrom+'/'+idConnectorTo;
        this.mapOfConnectors[connectorID] =  {'shown': false };
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
            const connectorID = idConnectorFrom+'/'+idConnectorTo;
        this.mapOfConnectors[connectorID] =  {'shown': false };
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
            const connectorID = idConnectorFrom+'/'+idConnectorTo;
        this.mapOfConnectors[connectorID] =  {'shown': false };
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
            const connectorID = idConnectorFrom+'/'+idConnectorTo;
        this.mapOfConnectors[connectorID] =  {'shown': false };
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
            const connectorID = idConnectorFrom+'/'+idConnectorTo;
        this.mapOfConnectors[connectorID] =  {'shown': false };
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
            const connectorID = idConnectorFrom+'/'+idConnectorTo;
        this.mapOfConnectors[connectorID] =  {'shown': false };
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
            const connectorID = idConnectorFrom+'/'+idConnectorTo;
        this.mapOfConnectors[connectorID] =  {'shown': false };
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
            const connectorID = idConnectorFrom+'/'+idConnectorTo;
        this.mapOfConnectors[connectorID] =  {'shown': false };
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
              const connectorID = idConnectorFrom+'/'+idConnectorTo;
        this.mapOfConnectors[connectorID] =  {'shown': false };
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
              const connectorID = idConnectorFrom+'/'+idConnectorTo;
        this.mapOfConnectors[connectorID] =  {'shown': false };
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
              const connectorID = idConnectorFrom+'/'+idConnectorTo;
        this.mapOfConnectors[connectorID] =  {'shown': false };
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
              const connectorID = idConnectorFrom+'/'+idConnectorTo;
        this.mapOfConnectors[connectorID] =  {'shown': false };
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
            const connectorID = idConnectorFrom+'/'+idConnectorTo;
        this.mapOfConnectors[connectorID] =  {'shown': false };
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
            const connectorID = idConnectorFrom+'/'+idConnectorTo;
        this.mapOfConnectors[connectorID] =  {'shown': false };
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
            const connectorID = idConnectorFrom+'/'+idConnectorTo;
            this.mapOfConnectors[connectorID] =  {'shown': false };
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
            const connectorID = idConnectorFrom+'/'+idConnectorTo;
            this.mapOfConnectors[connectorID] =  {'shown': false };
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
            const connectorID = idConnectorFrom+'/'+idConnectorTo;
            this.mapOfConnectors[connectorID] =  {'shown': false };
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
            const connectorID = idConnectorFrom+'/'+idConnectorTo;
            this.mapOfConnectors[connectorID] =  {'shown': false };
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
            const connectorID = idConnectorFrom+'/'+idConnectorTo;
            this.mapOfConnectors[connectorID] =  {'shown': false };
          }
        }


      });
    }
  }
}
