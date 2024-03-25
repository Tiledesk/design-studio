import { Component, EventEmitter, HostListener, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { ACTIONS_LIST, TYPE_OF_MENU } from '../../../../../utils';

@Component({
  selector: 'cds-add-action-menu',
  templateUrl: './cds-add-action-menu.component.html',
  styleUrls: ['./cds-add-action-menu.component.scss']
})

export class CdsAddActionMenuComponent implements OnInit, OnChanges {

  @Input() menuType: string;
  // @Input() tdsContainerEleHeight: any;
  @Output() addActionFromActionMenu = new EventEmitter();
  // ACTIONS_LIST = ACTIONS_LIST
  menuItemsList: any;
  filterMenuItemsList: any;
  contentHeight : any;
  actionToSearch: string;
  // @Output() clickedOutOfAddActionMenu= new EventEmitter();
  constructor() { }

  ngOnInit(): void {
    switch (this.menuType) {
      case TYPE_OF_MENU.ACTION:
        this.menuItemsList = Object.keys(ACTIONS_LIST).map(key => {
          return {
            type: key,
            value: ACTIONS_LIST[key]
          };
        }).filter(el => el.value.status !== 'inactive');
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
        this.menuItemsList = Object.keys(ACTIONS_LIST).map(key => {
          return {
            type: key,
            value: ACTIONS_LIST[key]
          };
        }).filter(el => el.value.status !== 'inactive');
        break;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.menuItemsList = Object.keys(ACTIONS_LIST).map(key => {
      return {
        type: key,
        value: ACTIONS_LIST[key]
      };
    }).filter(el => el.value.status !== 'inactive');;

    if(this.menuItemsList){
      this.filterMenuItemsList = this.menuItemsList;
    }
  }

  // @HostListener('document:click', ['$event'])
  // documentClick(event: any): void {
  //   console.log('[CDS-ADD-ACTION-MENU] DOCUMENT CLICK event: ', event.target.id);
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
    return array.filter(option => option.value.name.toLowerCase().includes(filterValue));
  }

  // return it.toLocaleLowerCase().includes(searchText);

  onAddActionFromActionMenu(item){
    // console.log('[CDS-ADD-ACTION-MENU] ON ADDING ACTION - TO STAGE - actionToSearch 1: ',this.actionToSearch);
    let event = { 
      'type': item.value.type
    }
    this.actionToSearch = undefined;
    this.filterMenuItemsList = this.menuItemsList;
    this.addActionFromActionMenu.emit(event);
    //console.log('[CDS-ADD-ACTION-MENU] ON ADDING ACTION - TO STAGE - actionToSearch 2: ',this.actionToSearch);
  }

}
