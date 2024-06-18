import { Component, OnInit, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { MatMenuTrigger } from '@angular/material/menu';
import { TYPE_OF_MENU } from '../../../utils';
import { TYPE_ACTION_CATEGORY, ACTION_CATEGORY } from 'src/app/chatbot-design-studio/utils-actions';


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
  ACTION_CATEGORY = ACTION_CATEGORY
  
  constructor() { }

  ngOnInit(): void {
  }

  onHideActionPlaceholderOfActionPanel(event) {
    this.hideActionPlaceholderOfActionPanel.emit(event)
  }

  onDraggingMenuElement(event) {
    if (event === true) {
      this.isOpen = false;
    }
  } 

  onOpenMenu(e, type, category?: string) {
    this.onMouseOverActionMenuSx.emit(true)
    setTimeout(() => {
      this.menuType = type;
      this.menuCategory = category;
      //this.menuTrigger.openMenu();
      // let x = e.offsetLeft;
      let y = e.offsetTop;
      this.isOpen = true;
      if(this.isDraggingMenuElement == false){
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

}
