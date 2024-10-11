import { Component, OnInit, Input, Output, EventEmitter, ViewChild, SimpleChanges } from '@angular/core';
import { TYPE_OF_MENU, TYPE_EVENT_CATEGORY, EVENTS_LIST } from '../../../../utils';
import { CdkDropList, CdkDragStart, CdkDragEnd, CdkDragMove } from '@angular/cdk/drag-drop';
import { ControllerService } from '../../../../services/controller.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { ProjectPlanUtils } from 'src/app/utils/project-utils';
import { ACTIONS_LIST, TYPE_ACTION_CATEGORY } from 'src/app/chatbot-design-studio/utils-actions';
import { TranslateService } from '@ngx-translate/core';
import { BRAND_BASE_INFO } from 'src/app/chatbot-design-studio/utils-resources';
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
  BRAND_BASE_INFO = BRAND_BASE_INFO;
  
  menuItemsList: any;
  isDragging: any = false;
  indexDrag: number;

  hoveredElement: any;
  positionMenu: any = {'x': 200, 'y': 0 };
  isOpen: boolean = false;
  // dropList: CdkDropList;
  // connectedLists: CdkDropList[];
  // connectedIDLists: string[];
  
  private logger: LoggerService = LoggerInstance.getInstance()
  constructor(
    private controllerService: ControllerService,
    private projectPlanUtils: ProjectPlanUtils,
    private translate: TranslateService,
    // public dragDropService: DragDropService
  ) { }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges) {
    switch (this.menuType) {
      case TYPE_OF_MENU.ACTION:
        this.menuItemsList = Object.values(ACTIONS_LIST).filter(el => (el.category === TYPE_ACTION_CATEGORY[this.menuCategory] && el.status !== 'inactive')).map(element => {
          return {
            type: TYPE_OF_MENU.ACTION,
            value: element,
            canLoad: element.plan? this.projectPlanUtils.checkIfCanLoad(element.type, element.plan) : true
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
            "src": "assets/images/form.svg",
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
              "src": "assets/images/brain.svg",
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
  }


  openInfo(e, element) {
    if(!BRAND_BASE_INFO['DOCS']){
      return;
    }
    /**if element doesn't have any doc, close info */
    if(!element.doc || element.doc===""){
      this.closeInfo();
      return; 
    } 

    setTimeout(() => {
      this.hoveredElement = element;
      //this.menuTrigger.openMenu();
      // let x = e.offsetLeft;
      let y = e.offsetTop;
      this.isOpen = true;
      this.positionMenu = {'x': 200, 'y': y }
    }, 0);
  }

  closeInfo() {
    if(!BRAND_BASE_INFO['DOCS']){
      return;
    }
    setTimeout(() => {this.isOpen = false;},0)
    this.hoveredElement = null;
  }

  onDragStarted(event:CdkDragStart, currentIndex: number) {
    this.logger.log('[CDS-PANEL-ACTIONS] Drag started!', event, currentIndex);
    this.controllerService.closeActionDetailPanel();
    this.isDragging = true;
    this.isOpen = false;
    this.indexDrag = currentIndex;
    
    this.isDraggingMenuElement.emit(this.isDragging);

    // --------------------------------------------------------------------------------------------------
    // Bug fix: When an action is dragged, the "drag placeholder" moves up and changes size to full width
    // --------------------------------------------------------------------------------------------------
    const actionDragPlaceholder = <HTMLElement>document.querySelector('.action-drag-placeholder');
    this.logger.log('[CDS-PANEL-ACTIONS] onDragStarted actionDragPlaceholder', actionDragPlaceholder)
 
    const addActionPlaceholderEl = <HTMLElement>document.querySelector('.add--action-placeholder');
    this.logger.log('[CDS-PANEL-ACTIONS] onDragStarted addActionPlaceholderEl ', addActionPlaceholderEl)

    const myObserver = new ResizeObserver(entries => {
      // this will get called whenever div dimension changes
       entries.forEach(entry => {
        const actionDragPlaceholderWidth  = entry.contentRect.width
        this.logger.log('[CDS-PANEL-ACTIONS] actionDragPlaceholderWidth width', actionDragPlaceholderWidth);
        let hideActionDragPlaceholder = null;
        if (actionDragPlaceholderWidth === 258) {
          hideActionDragPlaceholder = false;
          this.hideActionPlaceholderOfActionPanel.emit(false)
          this.logger.log('[CDS-PANEL-ACTIONS] Hide action drag placeholder', hideActionDragPlaceholder);
          if (actionDragPlaceholder) {
            actionDragPlaceholder.style.opacity = '1';
          }
          if (addActionPlaceholderEl) {
            addActionPlaceholderEl.style.opacity = '0';
          }
        } else {
          hideActionDragPlaceholder = true;
          this.hideActionPlaceholderOfActionPanel.emit(true)
          this.logger.log('[CDS-PANEL-ACTIONS] Hide action drag placeholder', hideActionDragPlaceholder);
          if (actionDragPlaceholder) {
            actionDragPlaceholder.style.opacity = '0';
          }
          if (addActionPlaceholderEl) {
            addActionPlaceholderEl.style.opacity = '1';
          }
        }
        //  this.logger.log('height', entry.contentRect.height);
       });
     });
  
     myObserver.observe(actionDragPlaceholder);
 
  }

  onDragEnd(event: CdkDragEnd) {
    this.logger.log('[CDS-PANEL-ACTIONS] Drag End!', event);
    this.isDragging = false;
    this.indexDrag = null;
    this.isDraggingMenuElement.emit(this.isDragging);
  }

  onDragMoved(event: CdkDragMove) {
    // this.logger.log('Drag Moved!', event);
    // const element = event.source.element.nativeElement;
  }

  onDragOver(event: DragEvent) {
    this.logger.log('Drag dragOver!', event);
    // event.preventDefault(); // Annulla l'evento di default che consente il drop
  }

  onVideoUrlClick(){
    let url = this.translate.instant(this.hoveredElement.doc+'.VIDEO_URL')
    window.open (url, '_blank')
  }

}
