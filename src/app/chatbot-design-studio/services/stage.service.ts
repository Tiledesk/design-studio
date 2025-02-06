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

  settings: Settings = {
    alpha_connectors: 70,
    zoom: 1,
    position: null,
    maximize: false
  };

  // {
  //   x: 506,
  //   y: -2.5
  // }
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
  centerStageOnHorizontalPosition(ElementRef, left=0){
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

  /** */
  centerStageOnPosition(id_faq_kb, stageElement){
    this.logger.log("[CDS-STAGE]  •••• centerStageOnPosition ••••");
    let intervalId = setInterval(async () => {
      const result = await this.tiledeskStage.centerStageOnPosition(stageElement);
      if (result === true) {
        clearInterval(intervalId);
        this.savePositionByStageElement(id_faq_kb, stageElement);
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
        this.savePositionByStageElement(id_faq_kb, stageElement);
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


  async zoom(id_faq_kb, event: 'in' | 'out'){
    let resp = await this.tiledeskStage.zoom(event);
    let scale = this.tiledeskStage.scale;
    this.settings.zoom = scale;
    this.saveSettings(id_faq_kb, STAGE_SETTINGS.Zoom, scale);
    return resp;
  }

  scaleAndCenter(listOfintents){
    this.logger.log("[STAGE SERVICE] scaleAndCenter ");
    let resp = scaleAndcenterStageOnCenterPosition(listOfintents);
    return this.tiledeskStage.translateAndScale(resp.point, resp.scale);
  }
  
  getMaximize(){
    return this.settings.maximize;
  }

  getScale(){
    return this.tiledeskStage.scale;
  }
  getAlpha(): number {
    return this.settings.alpha_connectors;
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
    if(id_faq_kb && alpha >= 0){
      this.saveSettings(id_faq_kb, STAGE_SETTINGS.AlphaConnector, alpha);
      this.settings.alpha_connectors = alpha;
    } else if(this.settings && this.settings.alpha_connectors >= 0){
      alpha = Number(this.settings.alpha_connectors);
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
  savePositionByStageElement(id_faq_kb:string, ElementRef:any){
    const scale = this.tiledeskStage.scale;
    const position = this.tiledeskStage.setPositionByStageElement(ElementRef, scale);
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
    let cont = this.tiledeskStage.container.offsetWidth+cdsSidebarWidth;
    if(cont<pos){
      positionFloatMenu.x = positionFloatMenu.x+cdsSidebarWidth-cdsAddActionMenuWidth;
    } else {
      positionFloatMenu.x = positionFloatMenu.x+cdsSidebarWidth;
    }
    return positionFloatMenu;
    // /this.logger.log("[CDS CANVAS] this.positionFloatMenu", pos, cont);
  }
}
