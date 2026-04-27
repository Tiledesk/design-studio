import { Component, OnInit, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { MatMenuTrigger } from '@angular/material/menu';
import { TYPE_OF_MENU } from '../../../utils';
import { TYPE_CHATBOT, ACTIONS_LIST, TYPE_ACTION_CATEGORY, ACTION_CATEGORY } from 'src/app/chatbot-design-studio/utils-actions';
import { ProjectPlanUtils } from 'src/app/utils/project-utils';
import { TranslateService } from '@ngx-translate/core';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { DashboardService } from 'src/app/services/dashboard.service';


@Component({
  selector: 'cds-panel-elements',
  templateUrl: './cds-panel-elements.component.html',
  styleUrls: ['./cds-panel-elements.component.scss']
  // standalone: true,
  // imports: [MatButtonModule, MatMenuModule],
})
export class CdsPanelElementsComponent implements OnInit {
  @ViewChild('menuTrigger') menuTrigger: MatMenuTrigger;
  @ViewChild('menuElement', { static: false }) private menuElement: ElementRef;


  @Output() addNewElement = new EventEmitter();
  // @Output() showPanelActions = new EventEmitter();
  @Output() onMouseOverActionMenuSx = new EventEmitter();
  @Output() hideActionPlaceholderOfActionPanel = new EventEmitter();
  isOpen: boolean = false;
  isOverMenu: boolean = false;
  positionMenu: any = {'x': 85, 'y': 0 };
  isDraggingMenuElement: boolean = false;
  menuType: string;
  menuCategory: string;
  TYPE_OF_MENU = TYPE_OF_MENU;

  TYPE_ACTION_CATEGORY = TYPE_ACTION_CATEGORY;
  ACTION_CATEGORY = ACTION_CATEGORY;

  actionsByCategory = {};
  actionsList: Array<any> = [];
  
  private readonly logger: LoggerService = LoggerInstance.getInstance();
  actionCategory: any;
  
  constructor(
    private readonly projectPlanUtils: ProjectPlanUtils,
    private readonly dashboardService: DashboardService
  ) { }

  ngOnInit(): void {
    this.createActionListByCategory();
  }

  onHideActionPlaceholderOfActionPanel(event) {
    this.hideActionPlaceholderOfActionPanel.emit(event)
  }

  onDraggingMenuElement(event) {
    this.isDraggingMenuElement = event;
    if (event === true) {
      this.isOpen = false;
    }
  } 

  onOpenMenu(e, type, category?: string) {
    this.onMouseOverActionMenuSx.emit(true)
    setTimeout(() => {
      this.menuType = type;
      this.menuCategory = category;
      this.actionsList = this.actionsByCategory[category];
      // this.menuTrigger.openMenu();
      // let x = e.offsetLeft;
      let y = e.offsetTop;
      this.isOpen = true;
      if(this.isDraggingMenuElement === false){
        this.positionMenu = {'x': 85, 'y': y }
      }
    }, 0);
  }
  
  onCloseMenu() {
    // this.menuTrigger.closeMenu();
    setTimeout(() => {
      if(this.isOverMenu == false && this.isDraggingMenuElement == false){
        this.isOpen = false;
      }
    }, 0);
  }

  // onMouseOverElement(e){
  //   // let pos = {'x': e.target.offsetLeft+e.target.offsetWidth+20, 'y': e.target.offsetTop+12 }
  //   // this.showPanelActions.emit(pos);
  // }

  // onMouseLeaveElement(e){
  //   // let pos = {'x': -100, 'y': -100 }
  //   // this.showPanelActions.emit(pos);
  // }

  onAddNewElement(){
    // this.addNewElement.emit();
  }

  onOverMenu(){
    this.isOverMenu = true;
  }

  onLeaveMenu(){
    this.isOverMenu = false;
    this.onCloseMenu();
  }

  onIsDraggingMenuElement(event: boolean){
    this.isDraggingMenuElement = event;
    if(event === false){
      this.onCloseMenu();
    }
  }


  createActionListByCategory(){
    ACTION_CATEGORY.forEach(category => {
      const subtype = this.dashboardService.selectedChatbot.subtype?this.dashboardService.selectedChatbot.subtype:TYPE_CHATBOT.CHATBOT;
      this.logger.log('[CDS-PANEL-ELEMENTS] subtype:: ', ACTIONS_LIST, subtype);
      this.projectPlanUtils.checkIfActionIsInChatbotType(subtype as TYPE_CHATBOT);
      let menuItemsList = Object.values(ACTIONS_LIST).filter(el => (el.category === TYPE_ACTION_CATEGORY[category.type] && el.status !== 'inactive')).map(element => {
        return {
          type: TYPE_OF_MENU.ACTION,
          value: element,
          canLoad: element.plan? this.projectPlanUtils.checkIfCanLoad(element.type, element.plan) : true
        };
      });
      if(menuItemsList.length>0){
        this.actionsByCategory[category.type] = menuItemsList;
      }
      this.logger.log('[CDS-PANEL-ELEMENTS] menuItemsList:: ', category.type, menuItemsList);
    });
    this.logger.log('[CDS-PANEL-ELEMENTS] actionsByCategory:: ', this.actionsByCategory);
  }

}
