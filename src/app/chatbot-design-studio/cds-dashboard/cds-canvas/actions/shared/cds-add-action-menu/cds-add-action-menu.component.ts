import { Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { TYPE_OF_MENU } from '../../../../../utils';
import { TranslateService } from '@ngx-translate/core';
import { ACTIONS_LIST, isSubagentSubtype, isActionAvailableInSubagentContext } from 'src/app/chatbot-design-studio/utils-actions';
import { DashboardService } from 'src/app/services/dashboard.service';

@Component({
  selector: 'cds-add-action-menu',
  templateUrl: './cds-add-action-menu.component.html',
  styleUrls: ['./cds-add-action-menu.component.scss']
})

export class CdsAddActionMenuComponent implements OnInit, OnChanges {

  @ViewChild('search', { static: false }) searchElement: ElementRef<HTMLInputElement>;
  
  @Input() menuType: string;
  @Input() isActive: boolean;
  // @Input() tdsContainerEleHeight: any;
  @Output() addActionFromActionMenu = new EventEmitter();
  // ACTIONS_LIST = ACTIONS_LIST
  menuItemsList: any;
  filterMenuItemsList: any;
  contentHeight : any;
  actionToSearch: string;
  // @Output() clickedOutOfAddActionMenu= new EventEmitter();
  constructor(
    public translate: TranslateService,
    private readonly dashboardService: DashboardService
  ) { }

  /**
   * Voci del menu azioni disponibili nel contesto corrente: esclude le azioni
   * disattivate e quelle riservate a (o vietate in) un subagent.
   */
  private getAvailableActions(): Array<{type: string, value: any}> {
    const isSubagent = isSubagentSubtype(this.dashboardService.selectedChatbot?.subtype);
    return Object.keys(ACTIONS_LIST).map(key => {
      return {
        type: key,
        value: ACTIONS_LIST[key]
      };
    }).filter(el => el.value.status !== 'inactive' && isActionAvailableInSubagentContext(el.value, isSubagent));
  }

  ngOnInit(): void {
    switch (this.menuType) {
      case TYPE_OF_MENU.ACTION:
        this.menuItemsList = this.getAvailableActions();
        break;
      case TYPE_OF_MENU.EVENT:
        this.menuItemsList = [];
        break;
      case TYPE_OF_MENU.BLOCK:
        this.menuItemsList = [{
          "type": "BLOCK",
          "value": {
            "name": "Block",
            "type": "BLOCK",
            "src": "",
            "description": ""
          }
        }];
        break;
      case TYPE_OF_MENU.FORM:
        this.menuItemsList = [];
        break;
      default:
        this.menuItemsList = this.getAvailableActions();
        break;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.menuItemsList = this.getAvailableActions();

    if(this.menuItemsList){
      this.filterMenuItemsList = this.menuItemsList.sort((el1, el2)=> this.translate.instant(el1.value.name).localeCompare(this.translate.instant(el2.value.name)));
    }
    //set autofocus on search input element (only when component is active)
    if(this.isActive){
      setTimeout(()=>{ 
        // this will make the execution after the above boolean has changed
        this.searchElement.nativeElement.focus();
      },500); 
    }
  }


  // @HostListener('document:click', ['$event'])
  // documentClick(event: any): void {
  //   if (event.target.id ==='cdk-drop-list-0') {
  //     this.clickedOutOfAddActionMenu.emit(true)
  //   }
  // }

  onSearchAction(searchText) {
    searchText = searchText.toLocaleLowerCase()
    if (!searchText) {
     this.filterMenuItemsList = this.menuItemsList
    }
    this.filterMenuItemsList = this._filter(searchText, this.menuItemsList)
  }

  private _filter(value: string, array: Array<any>): Array<any> {
    const filterValue = value.toLowerCase();
    return array.filter(option => this.translate.instant(option.value.name).toLowerCase().includes(filterValue));
  }

  // return it.toLocaleLowerCase().includes(searchText);

  onAddActionFromActionMenu(item){
    let event = { 
      'type': item.value.type
    }
    this.actionToSearch = undefined;
    this.filterMenuItemsList = this.menuItemsList;
    this.addActionFromActionMenu.emit(event);
  }

}
