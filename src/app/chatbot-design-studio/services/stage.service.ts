import { Injectable } from '@angular/core';
import { TiledeskStage } from 'src/assets/js/tiledesk-stage.js';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { DEFAULT_ALPHA_CONNECTORS, CDS_ADD_ACTION_MENU_WIDTH, CDS_SIDEBAR_WIDTH, STAGE_SETTINGS, scaleAndcenterStageOnCenterPosition } from '../utils';
import { BehaviorSubject } from 'rxjs';
import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';
import { ConnectorService } from './connector.service';
import { TYPE_LOG_ANIMATION } from '../utils-actions';


export interface Settings {
  alpha_connectors: any;
  zoom: any;
  position: {
    x: number;
    y: number;
  };
  maximize: boolean;
  open_intent_list_state: boolean;
}

@Injectable({
  providedIn: 'root'
})

export class StageService {
  private readonly alphaConnectorsSubject = new BehaviorSubject<number>(100);
  alphaConnectors$ = this.alphaConnectorsSubject.asObservable();

  private tiledeskStage: any;
  private alpha_connectors: number = DEFAULT_ALPHA_CONNECTORS;
  settings: Settings;
  loaded: boolean = false;

  private readonly logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    public appStorageService: AppStorageService,
    public connectorService: ConnectorService
  ) { }


  initializeStage(id_faq_kb){
    this.tiledeskStage = new TiledeskStage('tds_container', 'tds_drawer', 'tds_draggable');
    this.alpha_connectors = DEFAULT_ALPHA_CONNECTORS;
    this.loaded = false;
    this. settings = {
      alpha_connectors: DEFAULT_ALPHA_CONNECTORS,
      zoom: 1,
      position: null,
      maximize: false, 
      open_intent_list_state: true
    };
    this.initStageSettings(id_faq_kb);
  }


  /** initStageSettings */
  private initStageSettings(id_faq_kb: string){
    let response = JSON.parse(this.appStorageService.getItem(id_faq_kb+'_stage'));
    if(response){
      this.settings = response;
    }
    return this.settings;
  }

  /** setDrawer */
  setDrawer(){
    this.tiledeskStage.setDrawer();
  }

  /**  
   * centerStageOnHorizontalPosition 
   * called only if is the first time load the chatbot then stageService.settings.position does not exist,  set the scale to 1
  */
  centerStageOnHorizontalPosition(id_faq_kb, ElementRef, left=0){
    this.logger.log("[CDS-STAGE]  •••• centerStageOnHorizontalPosition ••••");
    let intervalId = setInterval(async () => {
      const result = await this.tiledeskStage.centerStageOnHorizontalPosition(ElementRef, left);
      if (result === true) {
        clearInterval(intervalId);
      }
    }, 100);
    setTimeout(() => {
      clearInterval(intervalId);
    }, 1000);
  }


  /** 
   * centerStageOnElement
   * called when I select an intent from the left "intent list menu", always set the scale to 1
  */
  centerStageOnElement(id_faq_kb, stageElement){
    this.logger.log("[CDS-STAGE]  •••• centerStageOnElement ••••");
    let intervalId = setInterval(async () => {
      let scale = 1;
      const result = await this.tiledeskStage.centerStageOnElement(stageElement, scale);
      if (result === true) {
        clearInterval(intervalId);
        this.savePositionAndScale(id_faq_kb);
      }
    }, 100);
    setTimeout(() => {
      clearInterval(intervalId);
    }, 1000);
  }


  /**
   * centerStageOnTopPosition
   * called when I select an intent from the "intentLiveActive" in intent component, always set the scale to 1
   * @param id_faq_kb 
   * @param stageElement 
   */
  centerStageOnTopPosition(id_faq_kb, stageElement, logAnimationType){
    this.logger.log("[CDS-STAGE]  •••• centerStageOnTopPosition ••••");
    let intervalId = setInterval(async () => {
      let scale = 1;
      if(logAnimationType === TYPE_LOG_ANIMATION.NONE){
        scale = this.tiledeskStage.scale;
      }
      const result = await this.tiledeskStage.centerStageOnTopPosition(stageElement, scale);
      if (result === true) {
        clearInterval(intervalId);
        this.savePositionAndScale(id_faq_kb);
      }
    }, 100);
    setTimeout(() => {
      clearInterval(intervalId);
    }, 1000);
  }


  setDragElement(elementId:string) {
    const element = document.getElementById(elementId);
    this.logger.log("[STAGE SERVICE] imposto il drag sull'elemento ", elementId, element);
    if(element)this.tiledeskStage.setDragElement(element);
  }


  /**
   * changeScale
   * This function is called when I change the stage scale by pressing the + and - buttons in the cds-options menu
   * @param id_faq_kb 
   * @param event 
   */
  async changeScale(id_faq_kb:string, event: 'in' | 'out'){
    // //this.logger.log("[STAGE SERVICE] changeScale");
    let result = await this.tiledeskStage.changeScale(event);
    if (result === true) {
      this.savePositionAndScale(id_faq_kb);
    }
  }



  /**
   * scaleAndCenter
   * This function is called when I press the "center" button in the cds-options menu to center all the chatbot intents in the stage
   * @param id_faq_kb 
   * @param listOfintents 
   */
  async scaleAndCenter(id_faq_kb:string, listOfintents){
    // //this.logger.log("[STAGE SERVICE] scaleAndCenter");
    let resp = scaleAndcenterStageOnCenterPosition(listOfintents);
    if(resp){
      const result = this.tiledeskStage.translateAndScale(resp.point, resp.scale);
      if(result){
        this.savePositionAndScale(id_faq_kb);
      }
    }
  }
  

  /** */
  getMaximize(){
    return this.settings.maximize;
  }

  /** */
  getAlpha(): number {
    return this.alpha_connectors;
  }


  /** onSwipe */
  onSwipe(event: WheelEvent) {
    if (event.deltaX > 0) {
      event.preventDefault();
    } 
    else if (event.deltaX < 0) {
      event.preventDefault();
    } else {
      return;
    }
  }

  /** SET FUNCTIONS */

  /**
   * setAlphaConnectorsByLocalStorage
   */
  setAlphaConnectorsByLocalStorage(){
    if(this.settings?.alpha_connectors){
      this.alpha_connectors = this.settings?.alpha_connectors;
    } else {
      this.alpha_connectors = DEFAULT_ALPHA_CONNECTORS;
    }
    this.updateAlphaConnectors(this.alpha_connectors);
    this.alphaConnectorsSubject.next(this.alpha_connectors);
  }


  /** 
   * setAlphaConnectors 
   * !!! NON SALVO PIù NEL LOCAL STORAGE !!!
   * */
  setAlphaConnectors(id_faq_kb: string, alpha: number){
    // //console.log("[STAGE SERVICE] setAlphaConnectors: ", alpha);
    if(alpha >= 0){
      // // this.saveSettings(id_faq_kb, STAGE_SETTINGS.AlphaConnector, alpha);
      this.settings.alpha_connectors = alpha;
      this.alpha_connectors = alpha;
      this.updateAlphaConnectors(alpha);
      this.alphaConnectorsSubject.next(alpha);
    } 
  }


  /** 
   * updateAlphaConnectors 
   * */
  updateAlphaConnectors(alpha: number) {
    this.logger.log("[CDS-STAGE]  •••• updateAlphaConnectors ••••", alpha);
    const svgElement = document.querySelector('#tds_svgConnectors'); 
    if (svgElement) {
      const paths = svgElement.querySelectorAll('path');
      paths.forEach((path) => {
        path.setAttribute('opacity', (alpha / 100).toString());
      });
    }
    const alphaLabel = (alpha>0)?1:0;
    const svgLines = document.querySelectorAll('.line-text-connector');
    svgLines.forEach((svgLine) => {
      const rect = svgLine.querySelector('rect');
      rect.setAttribute('opacity', alphaLabel.toString());
      const text = svgLine.querySelector('text');
      text.setAttribute('opacity', alphaLabel.toString());
    });
  }


  /** 
   * setPositionByLocalStorage 
   * 
  */
  setPositionByLocalStorage(){
    this.logger.log("[STAGE SERVICE] setPositionByLocalStorage ");
    let position, scale;
    if(this.settings?.position){
      position = this.settings.position;
    }
    if(this.settings?.zoom){
      scale = this.settings.zoom;
    }
    if(scale && position){
      setTimeout(() => {
        this.tiledeskStage.translateAndScale(position, scale);
      }, 0);
    }
  }

  
  /**
   * savePositionByPos
   * @param id_faq_kb 
   * @param position 
   * called on moved-and-scaled and centerStageOnElement, centerStageOnPosition, centerStageOnTopPosition, changeScale, scaleAndCenter
   */
  savePositionByPos(id_faq_kb:string, position:any){
    const scale = this.tiledeskStage.scale;
    const newPosition = this.tiledeskStage.translatePosition(position);
    this.connectorService.setScale(this.tiledeskStage.scale);
    this.saveSettings(id_faq_kb, STAGE_SETTINGS.Position, newPosition);
    this.saveSettings(id_faq_kb, STAGE_SETTINGS.Zoom, scale);
  }


  /**
   * savePositionAndScale
   * @param id_faq_kb 
   */
  savePositionAndScale(id_faq_kb:string){
    const scale = this.tiledeskStage.scale;
    const position = this.tiledeskStage.position;
    this.connectorService.setScale(this.tiledeskStage.scale);
    this.saveSettings(id_faq_kb, STAGE_SETTINGS.Position, position);
    this.saveSettings(id_faq_kb, STAGE_SETTINGS.Zoom, scale);
  }


  /**
   * setPositionActionsMenu
   * calculates the position of the "FLOAT ADD ACTION MENU" to display it on the right or left of the connector
   * @param point 
   * @returns 
  */
  public setPositionActionsMenu(point){
    let positionFloatMenu = this.tiledeskStage.physicPointCorrector(point);
    let pos = positionFloatMenu.x+CDS_ADD_ACTION_MENU_WIDTH;
    let cont = this.tiledeskStage.container.offsetWidth;
    // /this.logger.log("[CDS SERVICE] setPositionActionsMenu", pos, cont);
    if(cont<pos){
      positionFloatMenu.x = positionFloatMenu.x+CDS_SIDEBAR_WIDTH-CDS_ADD_ACTION_MENU_WIDTH;
    } else {
      positionFloatMenu.x = positionFloatMenu.x+CDS_SIDEBAR_WIDTH;
    }
    return positionFloatMenu;
  }




  /** saveSettings 
   * save settings stage parameters in local storage
  */
  public saveSettings(id_faq_kb:string, type:STAGE_SETTINGS, value:any){
    let settings = JSON.parse(this.appStorageService.getItem(id_faq_kb+'_stage'));
    if(settings){
      this.settings = settings;
    }
    this.settings[type] = value;
    this.appStorageService.setItem(id_faq_kb+'_stage', JSON.stringify(this.settings));
  }

}
