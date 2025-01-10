import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

import {Form} from '../../models/intent-model';
import { TYPE_INTENT_ELEMENT } from '../utils';
import { Action, Button } from 'src/app/models/action-model';

/** CLASSE DI SERVICES PER GESTIRE GLI STATI (OPEN/CLOSE) TRA GLI ELEMENTI DELLA DASHBOARD COME I PANNELLI **/

@Injectable({
  providedIn: 'root'
})
export class ControllerService {

  isOpenButtonPanel: boolean = false;
  buttonSelected: Button;

  private buttonSource = new Subject<Button>();
  public isOpenButtonPanel$ = this.buttonSource.asObservable();

  private actionSource = new Subject<{type: TYPE_INTENT_ELEMENT, element: Action | string | Form}>();
  public isOpenActionDetailPanel$ = this.actionSource.asObservable();

  private addActionMenu = new Subject<any>();
  public isOpenAddActionMenu$ = this.addActionMenu.asObservable();

  constructor() {
  }


  // Buttons s
  public openButtonPanel(button){
    this.buttonSource.next(button);
  }

  public closeButtonPanel(){
    this.buttonSource.next(null);
  }

  // action detail panel
  public openActionDetailPanel(type: TYPE_INTENT_ELEMENT, element: Action | string | Form){
    this.actionSource.next({type, element});
  }

  public closeActionDetailPanel(){
    this.actionSource.next({type: null, element: null});
  }

  /** closeAddActionMenu */
  public closeAddActionMenu(){
    this.addActionMenu.next(null);
  }


  public closeAllPanels(){
    this.addActionMenu.next(null);
    this.buttonSource.next(null);
    this.actionSource.next({type: null, element: null});
  }

}
