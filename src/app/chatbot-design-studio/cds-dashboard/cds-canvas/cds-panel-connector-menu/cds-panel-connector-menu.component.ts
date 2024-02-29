import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';


enum TYPE_OF_MENU {
  DELETE = 'delete',
  LINE_TEXT = 'line-text'
}


@Component({
  selector: 'cds-panel-connector-menu',
  templateUrl: './cds-panel-connector-menu.component.html',
  styleUrls: ['./cds-panel-connector-menu.component.scss']
})


export class CdsPanelConnectorMenuComponent implements OnInit {

  @Input() connector: any;
  @Output() addActionFromConnectorMenu = new EventEmitter();

  typeOfmenu = TYPE_OF_MENU; 
  showLineTextarea: boolean = false;

  constructor() { }

  ngOnInit(): void {
    console.log('[CDS-ADD-CONNECTOR MENU] ', this.connector);
  }

  onAddActionFromConnectorMenu(type){
    let event = { 
      'type': type
    }
    // console.log('[CDS-ADD-CONNECTOR MENU] onAddActionFromConnectorMenu - connector: ', event);
    this.addActionFromConnectorMenu.emit(event);
  }

  onShowLineTextArea(){
    this.showLineTextarea = true;
  }
  
  onBlur(ev){
    const testoTextArea = ev.target.value;
    // console.log('[CDS-ADD-CONNECTOR MENU]  onBlur:: ', testoTextArea);
    let event = { 
      'type': TYPE_OF_MENU.LINE_TEXT, 
      'label': testoTextArea
    }
    this.showLineTextarea = false;
    this.addActionFromConnectorMenu.emit(event);
  }

}
