import { Injectable } from '@angular/core';
import { TiledeskStage } from 'src/assets/js/tiledesk-stage.js';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { STAGE_SETTINGS, scaleAndcenterStageOnCenterPosition } from '../utils';
import { BehaviorSubject } from 'rxjs';
import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';

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
    public appStorageService: AppStorageService
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
   * quando seleziono un elemento dal menu di sinistra, imposto sempre lo scale a 1
  */
  centerStageOnElement(id_faq_kb, stageElement){
    this.logger.log("[CDS-STAGE]  •••• centerStageOnElement ••••");
    let intervalId = setInterval(async () => {
      let scale = 1;
      const result = await this.tiledeskStage.centerStageOnElement(stageElement, scale);
      if (result === true) {
        clearInterval(intervalId);
        this.savePositionByStageElement(id_faq_kb);
      }
    }, 100);
    setTimeout(() => {
      clearInterval(intervalId);
    }, 1000);
  }

  /** */
  centerStageOnPosition(id_faq_kb, stageElement){
    this.logger.log("[CDS-STAGE]  •••• centerStageOnPosition ••••");
    let intervalId = setInterval(async () => {
      const result = await this.tiledeskStage.centerStageOnPosition(stageElement);
      if (result === true) {
        clearInterval(intervalId);
        this.savePositionByStageElement(id_faq_kb);
      }
    }, 100);
    setTimeout(() => {
      clearInterval(intervalId);
    }, 1000);
  }

  centerStageOnTopPosition(id_faq_kb, stageElement){
    this.logger.log("[CDS-STAGE]  •••• centerStageOnTopPosition ••••");
    let intervalId = setInterval(async () => {
      const result = await this.tiledeskStage.centerStageOnTopPosition(stageElement);
      // // const result = await this.tiledeskStage.centerStageOnHorizontalPosition(pos);
      if (result === true) {
        clearInterval(intervalId);
        this.savePositionByStageElement(id_faq_kb);
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
   * quando premo + o - per cambiare lo zoom
   * @param id_faq_kb 
   * @param event 
   * @returns 
   */
  async changeScale(id_faq_kb, event: 'in' | 'out'){
    let result = await this.tiledeskStage.changeScale(event);
    if (result === true) {
      this.savePositionByStageElement(id_faq_kb);
    }
    // let scale = this.tiledeskStage.scale;
    // this.settings.zoom = scale;
    // let position = {
    //   x: this.settings.position.x*scale,
    //   y: this.settings.position.y*scale
    // }
    //this.settings.position = position;
    return result;
  }

  scaleAndCenter(id_faq_kb, listOfintents){
    this.logger.log("[STAGE SERVICE] scaleAndCenter ");
    let resp = scaleAndcenterStageOnCenterPosition(listOfintents);
    const scale = resp.scale;
    const position = resp.point
    this.saveSettings(id_faq_kb, STAGE_SETTINGS.Position, position);
    this.saveSettings(id_faq_kb, STAGE_SETTINGS.Zoom, scale);
    return this.tiledeskStage.translateAndScale(resp.point, resp.scale);
  }
  
  getMaximize(){
    return this.settings.maximize;
  }

  getScale(){
    return this.tiledeskStage.scale;
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

    
  /** setZoom 
   * ! NOT USED !
   * */
  setZoom(){
    let scale = this.settings.zoom;
    setTimeout(() => {
      this.tiledeskStage.centerStageOnCenterPosition(scale);
    }, 0);
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
  
  /**
   * savePositionByPos
   * @param id_faq_kb 
   * @param position 
   * called on moved-and-scaled and centerStageOnTopPosition
   */
  savePositionByPos(id_faq_kb:string, position:any){
    const scale = this.tiledeskStage.scale;
    const newPosition = this.tiledeskStage.translatePosition(position);
    this.saveSettings(id_faq_kb, STAGE_SETTINGS.Position, newPosition);
    this.saveSettings(id_faq_kb, STAGE_SETTINGS.Zoom, scale);
  }

  /**
   * savePositionByStageElement
   * @param id_faq_kb 
   * @param ElementRef 
   * called on centerStageOnPosition
   */
  savePositionByStageElement(id_faq_kb:string){
    const scale = this.tiledeskStage.scale;
    const position = this.tiledeskStage.position;
    this.saveSettings(id_faq_kb, STAGE_SETTINGS.Position, position);
    this.saveSettings(id_faq_kb, STAGE_SETTINGS.Zoom, scale);
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




  /** saveSettings */
  saveSettings(id_faq_kb:string, type:STAGE_SETTINGS, value:any){
    let settings = JSON.parse(this.appStorageService.getItem(id_faq_kb+'_stage'));
    if(settings){
      this.settings = settings;
    }
    this.settings[type] = value;
    this.appStorageService.setItem(id_faq_kb+'_stage', JSON.stringify(this.settings));
  }



  public setPositionActionsMenu(point){
    let positionFloatMenu = this.physicPointCorrector(point);
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
