import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'cds-panel-connector-menu',
  templateUrl: './cds-panel-connector-menu.component.html',
  styleUrls: ['./cds-panel-connector-menu.component.scss']
})
export class CdsPanelConnectorMenuComponent implements OnInit {

  @Output() addActionFromConnectorMenu = new EventEmitter();
  constructor() { }

  ngOnInit(): void {

  }

  onAddActionFromConnectorMenu(){
    let event = { 
      'type': 'delete'
    }
    console.log('[CDS-ADD-CONNECTOR MENU] onAddActionFromConnectorMenu - connector: ', event);
    // console.log('[CDS-ADD-ACTION-MENU] ON ADDING ACTION - TO STAGE - actionToSearch 1: ',this.actionToSearch);
    
    // this.actionToSearch = undefined;
    // this.filterMenuItemsList = this.menuItemsList;
    this.addActionFromConnectorMenu.emit(event);
  }

}
