import { Injectable } from '@angular/core';
import { TiledeskStage } from 'src/assets/js/tiledesk-stage.js';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { scaleAndcenterStageOnCenterPosition } from '../utils';
import { BehaviorSubject } from 'rxjs';
import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';

enum STAGE_SETTINGS {
  AlphaConnector = 'alpha_connectors',
  Zoom = 'zoom',
  Position = 'position',
}

export interface Settings {
  alpha_connectors: number;
  zoom: number;
  position: {
    x: number;
    y: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class StageService {
  private alphaConnectorsSubject = new BehaviorSubject<number>(100);
  alphaConnectors$ = this.alphaConnectorsSubject.asObservable();

  tiledeskStage: any;
  loaded: boolean = false;
  // settings: any;
  settings: Settings = {
    alpha_connectors: 100,
    zoom: 1,
    position: {
      x: 506,
      y: -2.5
    }
  };

  private logger: LoggerService = LoggerInstance.getInstance()
  constructor(
    public appStorageService: AppStorageService
  ) { }


  initializeStage(){
    this.tiledeskStage = new TiledeskStage('tds_container', 'tds_drawer', 'tds_draggable');
  }

  setDrawer(){
    this.tiledeskStage.setDrawer();
  }

  initStageSettings(id_faq_kb){
    let response = JSON.parse(this.appStorageService.getItem(id_faq_kb+'_stage'));
    if(response){
      this.settings = response;
    }
    // this.alphaConnectorsSubject.next(this.settings.alpha_connectors);
    return this.settings;
  }


  centerStageOnPosition(stageElement){
    let intervalId = setInterval(async () => {
      const result = await this.tiledeskStage.centerStageOnPosition(stageElement);
      if (result === true) {
        clearInterval(intervalId);
      }
    }, 100);
    setTimeout(() => {
      clearInterval(intervalId);
    }, 1000);
  }

  centerStageOnTopPosition(pos){
    let intervalId = setInterval(async () => {
      const result = await this.tiledeskStage.centerStageOnTopPosition(pos);
      if (result === true) {
        clearInterval(intervalId);
      }
    }, 100);
    setTimeout(() => {
      clearInterval(intervalId);
    }, 1000);
  }

  centerStageOnHorizontalPosition(pos){
    let intervalId = setInterval(async () => {
      const result = await this.tiledeskStage.centerStageOnHorizontalPosition(pos);
      if (result === true) {
        clearInterval(intervalId);
      }
    }, 100);
    setTimeout(() => {
      clearInterval(intervalId);
    }, 1000);
  }

  translatePosition(pos){
    const result = this.tiledeskStage.translatePosition(pos);
    return result;
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
    let resp = scaleAndcenterStageOnCenterPosition(listOfintents);
    return this.tiledeskStage.translateAndScale(resp.point, resp.scale);
  }
  
  getScale(){
    return this.tiledeskStage.scale;
  }

  onSwipe(event: WheelEvent) {
    if (event.deltaX > 0) {
      // console.log('Swipe RIGHT');
      event.preventDefault();
    } else if (event.deltaX < 0) {
      // console.log('Swipe LEFT');
      event.preventDefault();
    }
    // if (event.deltaY > 0) {
    //   console.log('Swipe DOWN');
    // } else if (event.deltaY < 0) {
    //   console.log('Swipe UP');
    // }
  }

  
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

  setZoom(){
    let scale = this.settings.zoom;
    console.log('setZoom: ', scale);
    setTimeout(() => {
      this.tiledeskStage.centerStageOnCenterPosition(scale);
    }, 0);
  }

  setPosition(){
    let position = this.settings.position;
    let scale = this.settings.zoom;
    // console.log('setPosition: ', position);
    setTimeout(() => {
      this.translateAndScale(position, scale);
    }, 0);
  }
  
  savePosition(id_faq_kb, position){;
    const newPosition = this.translatePosition(position);
    //console.log('savePosition: ', newPosition);
    this.saveSettings(id_faq_kb, STAGE_SETTINGS.Position, newPosition);
  }


  translateAndScale(pos, scale){
    this.tiledeskStage.translateAndScale(pos, scale);
  }

  getAlpha(): number {
    return this.settings.alpha_connectors;
  }





  saveSettings(id_faq_kb, type, alpha){
    let settings = JSON.parse(this.appStorageService.getItem(id_faq_kb+'_stage'));
    if(settings){
      this.settings = settings;
    }
    this.settings[type] = alpha;
    // centerStageOnCenterPosition
    this.appStorageService.setItem(id_faq_kb+'_stage', JSON.stringify(this.settings));
  }



  updateAlphaConnectors(alpha) {
    const svgElement = document.querySelector('#tds_svgConnectors') as HTMLElement;
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


}
