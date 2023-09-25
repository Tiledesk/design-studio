import { Component, OnInit, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { TYPE_ACTION_CATEGORY, ACTIONS_LIST, TYPE_OF_MENU, TYPE_EVENT_CATEGORY, EVENTS_LIST } from 'app/chatbot-design-studio/utils';
import { CdkDropList, CdkDragStart, CdkDragEnd, CdkDragMove } from '@angular/cdk/drag-drop';
import { ControllerService } from 'app/chatbot-design-studio/services/controller.service';
// import { DragDropService } from 'app/chatbot-design-studio/services/drag-drop.service';

@Component({
  selector: 'cds-panel-actions',
  templateUrl: './cds-panel-actions.component.html',
  styleUrls: ['./cds-panel-actions.component.scss']
})
export class CdsPanelActionsComponent implements OnInit {
  @ViewChild('action_list_drop_connect') actionListDropConnect: CdkDropList;

  @Input() menuType: string;
  @Input() menuCategory: string;
  @Input() pos: any;
  @Output() isDraggingMenuElement = new EventEmitter();
  @Output() hideActionPlaceholderOfActionPanel = new EventEmitter();

  TYPE_ACTION_CATEGORY = TYPE_ACTION_CATEGORY;
  TYPE_OF_MENU = TYPE_OF_MENU;

  menuItemsList: any;
  isDragging: any = false;
  indexDrag: number;
  // dropList: CdkDropList;
  // connectedLists: CdkDropList[];
  // connectedIDLists: string[];
  

  constructor(
    private controllerService: ControllerService,
    // public dragDropService: DragDropService
  ) { }

  ngOnInit(): void {
    // console.log('ngOnInit: ', this.menuType);
    // console.log('menuItemsList',this.menuItemsList, this.menuType);
  }

  ngOnChanges() {
    console.log('cds-panel-actions ngOnChanges:: ', this.pos, this.menuType, this.menuCategory);
    switch (this.menuType) {
      case TYPE_OF_MENU.ACTION:
        this.menuItemsList = Object.values(ACTIONS_LIST).filter(el => el.category === TYPE_ACTION_CATEGORY[this.menuCategory]).map(element => {
          return {
            type: TYPE_OF_MENU.ACTION,
            value: element
          };
        });
        break;
      case TYPE_OF_MENU.EVENT:
        this.menuItemsList = Object.values(EVENTS_LIST).map(element => {
          return {
            type: TYPE_OF_MENU.EVENT,
            value: element
          };
        });
        break;
      case TYPE_OF_MENU.BLOCK:
        this.menuItemsList = [{
          "type": TYPE_OF_MENU.BLOCK,
          "value": {
            "name": "Block",
            "type": "BLOCK",
            "src": "",
            "description": ""
          }
        }];
        break;
      case TYPE_OF_MENU.FORM:
        this.menuItemsList = [{
          "type": TYPE_OF_MENU.FORM,
          "value": {
            "name": "Form",
            "type": "FORM",
            "src": "assets/cds/images/form.svg",
            "description": ""
          }
        }];
        break;
      case TYPE_OF_MENU.QUESTION:
          this.menuItemsList = [{
            "type": TYPE_OF_MENU.QUESTION,
            "value": {
              "name": "Train",
              "type": "QUESTION",
              "src": "assets/cds/images/brain.svg",
              "description": ""
            }
          }];
          break;
      default:
        this.menuItemsList = [];
        break;
    }
    
    if(!this.pos){
      this.pos = {'x': 0, 'y':0};
    }
  }


  ngAfterViewInit(){
    // this.dragDropService.addConnectedIDList('action_list_drop_connect');
    // // this.dragDropService.addConnectedIDList('cds-box-right-content');
    // this.dragDropService.addConnectedList(this.actionListDropConnect);
    // this.connectedLists = this.dragDropService.connectedLists;
    // this.connectedIDLists = this.dragDropService.connectedIDLists;
    // // ['action_list_drop_connect','drop-actions'];
    // // this.dragDropService.connectedIDLists;
    // console.log("connectedLists--------------------> ",this.connectedIDLists);
  }

  onDragStarted(event:CdkDragStart, currentIndex: number) {
    console.log('[CDS-PANEL-ACTIONS] Drag started!', event, currentIndex);
    this.controllerService.closeActionDetailPanel();
    this.isDragging = true;
    this.indexDrag = currentIndex;
    
    this.isDraggingMenuElement.emit(this.isDragging);

    // --------------------------------------------------------------------------------------------------
    // Bug fix: When an action is dragged, the "drag placeholder" moves up and changes size to full width
    // --------------------------------------------------------------------------------------------------
    const actionDragPlaceholder = <HTMLElement>document.querySelector('.action-drag-placeholder');
    console.log('[CDS-PANEL-ACTIONS] onDragStarted actionDragPlaceholder', actionDragPlaceholder)
 
    const addActionPlaceholderEl = <HTMLElement>document.querySelector('.add--action-placeholder');
    console.log('[CDS-PANEL-ACTIONS] onDragStarted addActionPlaceholderEl ', addActionPlaceholderEl)

    const myObserver = new ResizeObserver(entries => {
      // this will get called whenever div dimension changes
       entries.forEach(entry => {
        const actionDragPlaceholderWidth  = entry.contentRect.width
        console.log('[CDS-PANEL-ACTIONS] actionDragPlaceholderWidth width', actionDragPlaceholderWidth);
        let hideActionDragPlaceholder = null;
        if (actionDragPlaceholderWidth === 258) {
          hideActionDragPlaceholder = false;
          this.hideActionPlaceholderOfActionPanel.emit(false)
          console.log('[CDS-PANEL-ACTIONS] Hide action drag placeholder', hideActionDragPlaceholder);
          if (actionDragPlaceholder) {
            actionDragPlaceholder.style.opacity = '1';
          }
          if (addActionPlaceholderEl) {
            addActionPlaceholderEl.style.opacity = '0';
          }
        } else {
          hideActionDragPlaceholder = true;
          this.hideActionPlaceholderOfActionPanel.emit(true)
          console.log('[CDS-PANEL-ACTIONS] Hide action drag placeholder', hideActionDragPlaceholder);
          if (actionDragPlaceholder) {
            actionDragPlaceholder.style.opacity = '0';
          }
          if (addActionPlaceholderEl) {
            addActionPlaceholderEl.style.opacity = '1';
          }
        }
        //  console.log('height', entry.contentRect.height);
       });
     });
  
     myObserver.observe(actionDragPlaceholder);
 
  }

  onDragEnd(event: CdkDragEnd) {
    console.log('[CDS-PANEL-ACTIONS] Drag End!', event);
    this.isDragging = false;
    this.indexDrag = null;
    this.isDraggingMenuElement.emit(this.isDragging);
  }

  onDragMoved(event: CdkDragMove) {
    // console.log('Drag Moved!', event);
    // const element = event.source.element.nativeElement;
  }

  onDragOver(event: DragEvent) {
    console.log('Drag dragOver!', event);
    // event.preventDefault(); // Annulla l'evento di default che consente il drop
  }

}
