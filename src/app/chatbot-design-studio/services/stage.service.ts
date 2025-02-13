import { Injectable } from '@angular/core';
import { TiledeskStage } from 'src/assets/js/tiledesk-stage.js';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { STAGE_SETTINGS, scaleAndcenterStageOnCenterPosition } from '../utils';
import { BehaviorSubject } from 'rxjs';
import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';
import { ConnectorService } from './connector.service';


export interface Settings {
  alpha_connectors: any;
  zoom: any;
  position: {
    x: number;
    y: number;
  };
  maximize: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class StageService {
  private readonly alphaConnectorsSubject = new BehaviorSubject<number>(100);
  alphaConnectors$ = this.alphaConnectorsSubject.asObservable();

  tiledeskStage: any;
  loaded: boolean = false;
  alpha_connectors: number = 70;

  settings: Settings = {
    alpha_connectors: this.alpha_connectors,
    zoom: 1,
    position: null,
    maximize: false
  };

  private readonly logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    public appStorageService: AppStorageService,
    public connectorService: ConnectorService
  ) { }


  initializeStage(){
    this.tiledeskStage = new TiledeskStage('tds_container', 'tds_drawer', 'tds_draggable');
  }

  /** initStageSettings */
  initStageSettings(id_faq_kb: string){
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

  /**  centerStageOnHorizontalPosition 
   * called start element only
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
   * centerStageOnPosition
   * @param id_faq_kb 
   * @param stageElement 
   */
  centerStageOnPosition(id_faq_kb, stageElement){
    this.logger.log("[CDS-STAGE]  •••• centerStageOnPosition ••••");
    let intervalId = setInterval(async () => {
      const result = await this.tiledeskStage.centerStageOnPosition(stageElement);
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
   * !!! questa azione NON salva lo scale e NON salva la posizione DA CORREGGERE !!!
   * @param id_faq_kb 
   * @param stageElement 
   */
  centerStageOnTopPosition(id_faq_kb, stageElement){
    this.logger.log("[CDS-STAGE]  •••• centerStageOnTopPosition ••••");
    let intervalId = setInterval(async () => {
      let scale = 1;
      const result = await this.tiledeskStage.centerStageOnTopPosition(stageElement, scale);
      // // const result = await this.tiledeskStage.centerStageOnHorizontalPosition(pos);
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
  
  physicPointCorrector(point){
    return this.tiledeskStage.physicPointCorrector(point);
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
      // this.connectorService.setScale(this.tiledeskStage.scale);
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
        this.tiledeskStage.scale = resp.scale;
        this.tiledeskStage.position = resp.point;
        // this.connectorService.setScale(this.tiledeskStage.scale);
        this.savePositionAndScale(id_faq_kb);
      }
    }
  }
  



  getMaximize(){
    return this.settings.maximize;
  }

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

  /** setAlphaConnectors */
  setAlphaConnectors(id_faq_kb?: string, alpha?: number){
    // //console.log("[STAGE SERVICE] setAlphaConnectors: ", alpha);
    if(id_faq_kb && alpha >= 0){
      // // this.saveSettings(id_faq_kb, STAGE_SETTINGS.AlphaConnector, alpha);
      this.settings.alpha_connectors = alpha;
      this.alpha_connectors = alpha;
    } else {
      // // if(this.settings && this.settings.alpha_connectors >= 0){
      alpha = Number(this.alpha_connectors);
    }
    this.updateAlphaConnectors(alpha);
    this.alphaConnectorsSubject.next(alpha);
  }

  /** updateAlphaConnectors */
  updateAlphaConnectors(alpha: number) {
    const svgElement = document.querySelector('#tds_svgConnectors'); 
    // document.querySelector('#tds_svgConnectors') as HTMLElement;
    if (svgElement) {
      const paths = svgElement.querySelectorAll('path');
      paths.forEach((path) => {
        path.setAttribute('opacity', (alpha / 100).toString());
      });
    }
    const svgLines = document.querySelectorAll('.line-text-connector');
    svgLines.forEach((svgLine) => {
      const rect = svgLine.querySelector('rect');
      rect.setAttribute('opacity', (alpha / 100).toString());
      const text = svgLine.querySelector('text');
      text.setAttribute('opacity', (alpha / 100).toString());
    });
  }


  /** setPosition */
  setPosition(){
    this.logger.log("[STAGE SERVICE] setPosition ");
    let position = this.settings.position;
    let scale = this.settings.zoom;
    setTimeout(() => {
      this.translateAndScale(position, scale);
    }, 0);
  }

  setPositionByStageElement(ElementRef:any){
    const scale = this.tiledeskStage.scale;
    const position = this.tiledeskStage.setPositionByStageElement(ElementRef, scale);
    return position;
  }

  /** translateAndScale */
  translateAndScale(pos:any, scale:number){
    this.tiledeskStage.translateAndScale(pos, scale);
  }

  
  /**
   * savePositionByPos
   * @param id_faq_kb 
   * @param position 
   * called on moved-and-scaled and centerStageOnTopPosition
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
   * called on centerStageOnPosition
   */
  savePositionAndScale(id_faq_kb:string){
    const scale = this.tiledeskStage.scale;
    const position = this.tiledeskStage.position;
    this.connectorService.setScale(this.tiledeskStage.scale);
    this.saveSettings(id_faq_kb, STAGE_SETTINGS.Position, position);
    this.saveSettings(id_faq_kb, STAGE_SETTINGS.Zoom, scale);
  }


  /** saveSettings */
  saveSettings(id_faq_kb:string, type:STAGE_SETTINGS, value:any){
    let settings = JSON.parse(this.appStorageService.getItem(id_faq_kb+'_stage'));
    if(settings){
      this.settings = settings;
    }
    this.settings[type] = value;
    this.appStorageService.setItem(id_faq_kb+'_stage', JSON.stringify(this.settings));
  }



  /**
   * calcolo la posizione del action menu sul float per decidere se visualizzarlo a dx o sx del puntatore
   * @param point 
   * @returns 
   */
  public setPositionActionsMenu(point){
    let positionFloatMenu = this.physicPointCorrector(point);
    // // const element = document.getElementById('cdsPanelIntentList');
    let cdsSidebarWidth = 60;
    let cdsAddActionMenuWidth = 270;
    let pos = positionFloatMenu.x+cdsAddActionMenuWidth;
    let cont = this.tiledeskStage.container.offsetWidth;
    // /this.logger.log("[CDS SERVICE] setPositionActionsMenu", pos, cont);
    if(cont<pos){
      positionFloatMenu.x = positionFloatMenu.x+cdsSidebarWidth-cdsAddActionMenuWidth;
    } else {
      positionFloatMenu.x = positionFloatMenu.x+cdsSidebarWidth;
    }
    return positionFloatMenu;
  }
}
