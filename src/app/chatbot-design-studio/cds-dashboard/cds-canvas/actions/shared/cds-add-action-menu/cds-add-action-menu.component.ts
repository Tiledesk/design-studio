import { Component, EventEmitter, HostListener, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { ACTIONS_LIST, TYPE_OF_MENU } from 'app/chatbot-design-studio/utils';

@Component({
  selector: 'cds-add-action-menu',
  templateUrl: './cds-add-action-menu.component.html',
  styleUrls: ['./cds-add-action-menu.component.scss']
})

export class CdsAddActionMenuComponent implements OnInit, OnChanges {

  @Input() menuType: string;
  // @Input() tdsContainerEleHeight: any;
  @Output() addingActionToStage = new EventEmitter();
  // ACTIONS_LIST = ACTIONS_LIST
  menuItemsList: any;
  filterMenuItemsList: any;
  contentHeight : any;
  actionToSearch: string;
  // @Output() clickedOutOfAddActionMenu= new EventEmitter();
  constructor() { }

  ngOnInit(): void {

    // this.menuItemsList = Object.keys(ACTIONS_LIST).map(key => {
    //   return {
    //     type: key,
    //     value: ACTIONS_LIST[key]
    //   };
    // });

  
    console.log('[CDS-ADD-ACTION-MENU] menuItemsList (oninit): ', this.menuItemsList);
    console.log('[CDS-ADD-ACTION-MENU] contentHeight (oninit): ', this.contentHeight);
    console.log('[CDS-ADD-ACTION-MENU] menuType (on init) ', this.menuType)
    switch (this.menuType) {
      case TYPE_OF_MENU.ACTION:
        this.menuItemsList = Object.keys(ACTIONS_LIST).map(key => {
          return {
            type: key,
            value: ACTIONS_LIST[key]
          };
        });
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
        });
        break;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.menuItemsList = Object.keys(ACTIONS_LIST).map(key => {
      return {
        type: key,
        value: ACTIONS_LIST[key]
      };
    });

    // console.log('[CDS-ADD-ACTION-MENU] tdsContainerEleHeight (onchanges): ', this.tdsContainerEleHeight);
    // this.contentHeight = this.tdsContainerEleHeight - 40;
    // console.log('[CDS-ADD-ACTION-MENU] contentHeight (onchanges): ', this.contentHeight);

    if(this.menuItemsList){
      this.filterMenuItemsList = this.menuItemsList;
      console.log('[CDS-ADD-ACTION-MENU] filterMenuItemsList ', this.filterMenuItemsList);
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
    console.log('[CDS-ADD-ACTION-MENU] ON SEARCH ACTION searchText: ', searchText);
    console.log('[CDS-ADD-ACTION-MENU] ON SEARCH ACTION menuItemsList: ', this.menuItemsList);
    searchText = searchText.toLocaleLowerCase()
    // this.menuItemsList =  this.menuItemsList.filter(
    //   housingLocation => housingLocation?.city.toLowerCase().includes(text.toLowerCase())
    // );
    if (!searchText) {
      console.log('[CDS-ADD-ACTION-MENU] !searchText')
     this.filterMenuItemsList = this.menuItemsList
    }

    this.filterMenuItemsList = this._filter(searchText, this.menuItemsList)

   


  //  let cloneMenuItemsList = JSON.parse(JSON.stringify(this.menuItemsList))
  //  this.menuItemsList = cloneMenuItemsList.filter((obj: any) => {
  //     console.log('[CDS-ADD-ACTION-MENU] obj',  obj.value.name.toLowerCase().includes(searchText)) 
  //     // console.log('[CDS-ADD-ACTION-MENU] menuItemsList',  this.menuItemsList) 
  //      return obj.value.name.toLowerCase().includes(searchText);
  //   });

  }

  private _filter(value: string, array: Array<any>): Array<any> {
    const filterValue = value.toLowerCase();
    return array.filter(option => option.value.name.toLowerCase().includes(filterValue));
  }

  // return it.toLocaleLowerCase().includes(searchText);

  onAddingActionToStage(item){
    console.log('[CDS-ADD-ACTION-MENU] ON ADDING ACTION - TO STAGE - item: ', item);
    // console.log('[CDS-ADD-ACTION-MENU] ON ADDING ACTION - TO STAGE - actionToSearch 1: ',this.actionToSearch);
    let event = { 
      'type': item.value.type
    }
    this.actionToSearch = undefined;
    this.filterMenuItemsList = this.menuItemsList;
    this.addingActionToStage.emit(event);
    //console.log('[CDS-ADD-ACTION-MENU] ON ADDING ACTION - TO STAGE - actionToSearch 2: ',this.actionToSearch);
  }

}
