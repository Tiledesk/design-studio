import { Injectable } from '@angular/core';
import { TiledeskConnectors } from 'src/assets/js/tiledesk-connectors.js';
import { StageService } from '../services/stage.service';
import { TYPE_ACTION, TYPE_BUTTON, isElementOnTheStage } from '../utils';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
/** CLASSE DI SERVICES PER GESTIRE I CONNETTORI **/


@Injectable({
  providedIn: 'root'
})

export class ConnectorService {
  listOfConnectors: any = {};
  tiledeskConnectors: any;
  connectorDraft: any = {};

  private logger: LoggerService = LoggerInstance.getInstance();
  
  constructor() {}

  initializeConnectors(){
    this.tiledeskConnectors = new TiledeskConnectors("tds_drawer", {"input_block": "tds_input_block"}, []);
    this.tiledeskConnectors.mousedown(document);
  }

 
  /*************************************************/
  /** CREATE CONNECTOR                             */
  /*************************************************/

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
  async createNewConnector(fromId:string, toId:string, save=false, undo=false){
    console.log('[CONNECTOR-SERV] createNewConnector:: fromId:', fromId, 'toId:', toId);
    let elFrom = await isElementOnTheStage(fromId); // sync
    let elTo = await isElementOnTheStage(toId); // sync
    // const elFrom = document.getElementById(fromId);
    // const elTo = document.getElementById(toId);
    this.logger.log('[CONNECTOR-SERV] createNewConnector:: ', elFrom, elTo);
    if (elFrom && elTo) { 
      const fromPoint = this.tiledeskConnectors.elementLogicCenter(elFrom);
      const toPoint = this.tiledeskConnectors.elementLogicTopLeft(elTo);
      this.tiledeskConnectors.createConnector(fromId, toId, fromPoint, toPoint, save, undo);
    }
  }

  /**
   * createConnectors
   * @param intents 
   * 
   */
  public createConnectors(intents){
    console.log('[CONNECTOR-SERV] -----> createConnectors::: ', intents);
    intents.forEach(intent => {
      this.createConnectorsOfIntent(intent);
    });
  }

  /**
   * createConnectorFromId
   * @param fromId 
   * @param toId 
   * @returns 
   */
  public async createConnectorFromId(fromId, toId, save=false, undo=false) {
    console.log('[CONNECTOR-SERV] createConnectorFromId fromId ', fromId, ' toId ', toId);
    const connectorID = fromId+'/'+toId;
    // let connector = await isElementOnTheStage(connectorID); // sync
    const isConnector = document.getElementById(connectorID);
    if (isConnector) {
      console.log('[CONNECTOR-SERV] il connettore esiste già', connectorID);
      // this.deleteConnector(connectorID);
      // return true;
    }
    let isOnTheStageFrom = await isElementOnTheStage(fromId); // sync
    console.log('[CONNECTOR-SERV] isOnTheStageFrom', isOnTheStageFrom);
    let isOnTheStageTo = await isElementOnTheStage(toId); // sync
    console.log('[CONNECTOR-SERV] isOnTheStageFrom', isOnTheStageFrom);
    if(isOnTheStageFrom && isOnTheStageTo){
      const result = await this.tiledeskConnectors.createConnectorFromId(fromId, toId, save, undo);
     return result;
    } else {
      return false;
    }
  }


  /**
   * refreshConnectorsOfIntent
   * @param intent 
   * 
   * create connectors from Intent
   */
  public createConnectorsOfIntent(intent:any){
    if(intent.actions){
      intent.actions.forEach(action => {
        // console.log('[CONNECTOR-SERV] createConnectors:: ACTION ', action._tdActionId);
        
        /**  INTENT */
        if(action._tdActionType === TYPE_ACTION.INTENT){
          // console.log('[CONNECTOR-SERV] intent_display_name', intent.intent_display_name);
          if(action.intentName && action.intentName !== ''){
            const idConnectorFrom = intent.intent_id+'/'+action._tdActionId;
            const idConnectorTo = action.intentName.replace("#", ""); ;
            console.log('[CONNECTOR-SERV] -> CREATE CONNECTOR', idConnectorFrom, idConnectorTo);
            this.createConnectorFromId(idConnectorFrom, idConnectorTo);
          }
        }

        /**  REPLY  RANDOM_REPLY */
        if(action._tdActionType === TYPE_ACTION.REPLY || action._tdActionType === TYPE_ACTION.RANDOM_REPLY){
          var buttons = this.findButtons(action);
          console.log('buttons   ----- >', buttons);
          buttons.forEach(button => {
            console.log('[CONNECTOR-SERV] button   ----- > ', button, button.__idConnector);
            if(button.type === TYPE_BUTTON.ACTION && button.action){
              const idConnectorFrom = button.__idConnector;
              console.log('[CONNECTOR-SERV] -> idConnectorFrom', button.__idConnector);
              var startIndex = button.action.indexOf('#') + 1;
              var endIndex = button.action.indexOf('{');
              let idConnectorTo = button.action.substring(startIndex);
              if(endIndex>-1){
                idConnectorTo = button.action.substring(startIndex, endIndex);
              }
              console.log('[CONNECTOR-SERV] -> idConnectorFrom', idConnectorFrom);
              console.log('[CONNECTOR-SERV] -> idConnectorTo', idConnectorTo);
              if(idConnectorFrom && idConnectorTo){
                this.createConnectorFromId(idConnectorFrom, idConnectorTo);
              } 
            }
          });
        }

        /**  ONLINE_AGENTS */
        if(action._tdActionType === TYPE_ACTION.ONLINE_AGENTS){
          if(action.trueIntent && action.trueIntent !== ''){
            const idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/true';
            const idConnectorTo = action.trueIntent.replace("#", "");
            console.log('[CONNECTOR-SERV] - ONLINE_AGENTS ACTION -> idConnectorFrom', idConnectorFrom);
            console.log('[CONNECTOR-SERV] - ONLINE_AGENTS ACTION -> idConnectorTo', idConnectorTo);
            this.createConnectorFromId(idConnectorFrom, idConnectorTo);
          }
          if(action.falseIntent && action.falseIntent !== ''){
            const idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/false';
            const idConnectorTo = action.falseIntent.replace("#", "");
            console.log('[CONNECTOR-SERV] - ONLINE_AGENTS ACTION -> idConnectorFrom', idConnectorFrom);
            console.log('[CONNECTOR-SERV] - ONLINE_AGENTS ACTION -> idConnectorTo', idConnectorTo);
            this.createConnectorFromId(idConnectorFrom, idConnectorTo);
          }
        }

        /**  OPEN_HOURS */
        if(action._tdActionType === TYPE_ACTION.OPEN_HOURS){
          if(action.trueIntent && action.trueIntent !== ''){
            const idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/true';
            const idConnectorTo = action.trueIntent.replace("#", "");
            console.log('[CONNECTOR-SERV] - OPEN_HOURS ACTION -> idConnectorFrom', idConnectorFrom);
            console.log('[CONNECTOR-SERV] - OPEN_HOURS ACTION -> idConnectorTo', idConnectorTo);
            this.createConnectorFromId(idConnectorFrom, idConnectorTo);
          }
          if(action.falseIntent && action.falseIntent !== ''){
            const idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/false';
            const idConnectorTo = action.falseIntent.replace("#", "");
            console.log('[CONNECTOR-SERV] - OPEN_HOURS ACTION -> idConnectorFrom', idConnectorFrom);
            console.log('[CONNECTOR-SERV] - OPEN_HOURS ACTION -> idConnectorTo', idConnectorTo);
            this.createConnectorFromId(idConnectorFrom, idConnectorTo);
          }
        }

        /**  JSON-CONDITION */
        if(action._tdActionType === TYPE_ACTION.JSON_CONDITION){
          if(action.trueIntent && action.trueIntent !== ''){
            const idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/true';
            const idConnectorTo =  action.trueIntent.replace("#", "");
            console.log('[CONNECTOR-SERV] - JSON_CONDITION ACTION -> idConnectorFrom', idConnectorFrom);
            console.log('[CONNECTOR-SERV] - JSON_CONDITION ACTION -> idConnectorTo', idConnectorTo);
            this.createConnectorFromId(idConnectorFrom, idConnectorTo);
          }
          if(action.falseIntent && action.falseIntent !== ''){
            const idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/false';
            const idConnectorTo = action.falseIntent.replace("#", "");
            console.log('[CONNECTOR-SERV] - JSON_CONDITION ACTION -> idConnectorFrom', idConnectorFrom);
            console.log('[CONNECTOR-SERV] - JSON_CONDITION ACTION -> idConnectorTo', idConnectorTo);
            this.createConnectorFromId(idConnectorFrom, idConnectorTo);
          }
        }

        /**  ASKGPT */
        if(action._tdActionType === TYPE_ACTION.ASKGPT){
          if(action.trueIntent && action.trueIntent !== ''){
            const idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/true';
            const idConnectorTo =  action.trueIntent.replace("#", "");
            console.log('[CONNECTOR-SERV] - ASKGPT ACTION -> idConnectorFrom', idConnectorFrom);
            console.log('[CONNECTOR-SERV] - ASKGPT ACTION -> idConnectorTo', idConnectorTo);
            this.createConnectorFromId(idConnectorFrom, idConnectorTo);
          }
          if(action.falseIntent && action.falseIntent !== ''){
            const idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/false';
            const idConnectorTo = action.falseIntent.replace("#", "");
            console.log('[CONNECTOR-SERV] - ASKGPT ACTION -> idConnectorFrom', idConnectorFrom);
            console.log('[CONNECTOR-SERV] - ASKGPT ACTION -> idConnectorTo', idConnectorTo);
            this.createConnectorFromId(idConnectorFrom, idConnectorTo);
          }
        }

        /**  WEB-REQUEST-V2 */
        if(action._tdActionType === TYPE_ACTION.WEB_REQUESTV2){
          if(action.trueIntent && action.trueIntent !== ''){
            const idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/true';
            const idConnectorTo =  action.trueIntent.replace("#", "");
            this.logger.log('[CONNECTOR-SERV] - WEB-REQUEST-V2 ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - WEB-REQUEST-V2 ACTION -> idConnectorTo', idConnectorTo);
            this.createConnectorFromId(idConnectorFrom, idConnectorTo);
          }
          if(action.falseIntent && action.falseIntent !== ''){
            const idConnectorFrom = intent.intent_id+'/'+action._tdActionId + '/false';
            const idConnectorTo = action.falseIntent.replace("#", "");
            this.logger.log('[CONNECTOR-SERV] - WEB-REQUEST-V2 ACTION -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] - WEB-REQUEST-V2 ACTION -> idConnectorTo', idConnectorTo);
            this.createConnectorFromId(idConnectorFrom, idConnectorTo);
          }
        }

        /**  CAPTURE USER_REPLY */
        if(action._tdActionType === TYPE_ACTION.CAPTURE_USER_REPLY){
          this.logger.log('[CONNECTOR-SERV] intent_display_name', intent.intent_display_name);
          if(action.goToIntent && action.goToIntent !== ''){
            const idConnectorFrom = intent.intent_id+'/'+action._tdActionId;
            const idConnectorTo = action.goToIntent.replace("#", ""); ;
            this.logger.log('[CONNECTOR-SERV] -> idConnectorFrom', idConnectorFrom);
            this.logger.log('[CONNECTOR-SERV] -> idConnectorTo', idConnectorTo);
            this.createConnectorFromId(idConnectorFrom, idConnectorTo);
          }
        }


      });
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
    console.log('[CONNECTOR-SERV] deleteConnectorsOfBlockThatDontExist intent_id ' ,intent_id);
  }

  /**
   * deleteConnectorsOutOfBlock
   * @param intent_id 
   * @param dispatch 
   */
  public deleteConnectorsOutOfBlock(intent_id){
    this.tiledeskConnectors.deleteConnectorsOutOfBlock(intent_id);
    console.log('[CONNECTOR-SERV] deleteConnectorsOutOfBlock intent_id ' ,intent_id);
  }

  /**
   * deleteConnectorsOfBlock
   * @param intent_id 
   */
  public deleteConnectorsOfBlock(intent_id, save=false, undo=false){
    console.log('[CONNECTOR-SERV] deleteConnectorsOfBlock intent_id ' ,intent_id);
    this.tiledeskConnectors.deleteConnectorsOfBlock(intent_id, save, undo);
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

  // deleteConnectorByToId(intentId){
  //   this.tiledeskConnectors.deleteConnectorByToId(intentId);
  //   console.log('[CONNECTOR-SERV] deleteConnectorByToId intentId ' ,intentId );
  // }


  /**
   * deleteConnector
   * @param connectorID 
   * 
   */
  public deleteConnector(connectorID){
    console.log('[CONNECTOR-SERV] deleteConnector::  connectorID ', connectorID)
    this.tiledeskConnectors.deleteConnector(connectorID);
  }

  /**
   * 
   * @param connectorID 
   */
  public deleteConnectorToList(connectorID){
    this.logger.log('[CONNECTOR-SERV] deleteConnectorToList::  connectorID ', connectorID)
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
  public deleteConnectorWithIDStartingWith(connectorID, save=false, undo=false){
    this.logger.log('[CONNECTOR-SERV] deleteConnectorWithIDStartingWith:: ', this.tiledeskConnectors.connectors);
    const isConnector = document.getElementById(connectorID);
    if (isConnector){
      const listOfConnectors = Object.keys(this.tiledeskConnectors.connectors)
      .filter(key => key.startsWith(connectorID))
      .reduce((filteredMap, key) => {
        filteredMap[key] = this.tiledeskConnectors.connectors[key];
        return filteredMap;
      }, {});
      for (const [key, connector] of Object.entries(listOfConnectors)) {
        // this.logger.log('delete connector :: ', key );
        this.tiledeskConnectors.deleteConnector(key, save, undo);
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
    console.log('[CONNECTOR-SERV] movedConnector elementID ' ,elementID )
    const elem = await isElementOnTheStage(elementID); // chiamata sincrona
    // const elem = document.getElementById(elementID);
    if(elem){
      console.log('[CONNECTOR-SERV] aggiorno i connettori: ', elem);
      //setTimeout(() => {
        this.tiledeskConnectors.updateConnectorsOutOfItent(elem);
      //}, 0);
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

  // /**
  //  * searchConnectorsOutOfIntent
  //  * @param intent_id 
  //  * @returns 
  //  */
  // public searchConnectorsOutOfIntent(intent_id): Array<any>{
  //   console.log('[CONNECTOR-SERV] -----> searchConnectorsOutOfIntent::: ', intent_id);
  //   console.log('[CONNECTOR-SERV] -----> searchConnectorsOutOfIntent::: ', this.tiledeskConnectors.connectors);
  //   const connectors = Object.keys(this.tiledeskConnectors.connectors)
  //   .filter(key => key.includes(intent_id) && key.startsWith(intent_id) )
  //   .reduce((filteredMap, key) => {
  //     filteredMap[key] = this.tiledeskConnectors.connectors[key];
  //     return filteredMap;
  //   }, {});
  //   const arrayConnectors = Object.values(connectors);
  //   console.log('[CONNECTOR-SERV] -----> arrayConnectors::: ', arrayConnectors);
  //   return arrayConnectors;
  // }

  // public searchConnectorsOfIntent(intent_id){
  //   console.log('[CONNECTOR-SERV] -----> searchConnectorsOfIntent::: ', intent_id);
  //   console.log('[CONNECTOR-SERV] -----> searchConnectorsOfIntent::: ', this.tiledeskConnectors.connectors);
  //   const INOUTconnectors = Object.keys(this.tiledeskConnectors.connectors)
  //   .filter(key => key.includes(intent_id) ) //&& !key.startsWith(intent_id)
  //   .reduce((filteredMap, key) => {
  //     filteredMap[key] = this.tiledeskConnectors.connectors[key];
  //     return filteredMap;
  //   }, {});
  //   const arrayConnectors = Object.values(INOUTconnectors);
  //   console.log('[CONNECTOR-SERV] -----> arrayConnectors::: ', arrayConnectors);
  //   return arrayConnectors
  // }


  /**
   * searchConnectorsInOfIntent
   * @param intent_id 
   * @returns 
   */
  public searchConnectorsInOfIntent(intent_id: string): Array<any>{
    // console.log('[CONNECTOR-SERV] -----> searchConnectorsInOfIntent::: ', intent_id);
    // console.log('[CONNECTOR-SERV] -----> searchConnectorsInOfIntent::: ', this.tiledeskConnectors.connectors);
    const connectors = Object.keys(this.tiledeskConnectors.connectors)
    .filter(key => key.includes(intent_id) && !key.startsWith(intent_id) )
    .reduce((filteredMap, key) => {
      filteredMap[key] = this.tiledeskConnectors.connectors[key];
      return filteredMap;
    }, {});
    const arrayConnectors = Object.values(connectors);
    // console.log('[CONNECTOR-SERV] -----> arrayConnectors::: ', arrayConnectors);
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

}
