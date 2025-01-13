import { Component, EventEmitter, OnInit, Output } from '@angular/core';

@Component({
  selector: 'cds-connector-in',
  templateUrl: './cds-connector-in.component.html',
  styleUrls: ['./cds-connector-in.component.scss']
})
export class CdsConnectorInComponent implements OnInit {
  @Output() onClickedConnectorsIn = new EventEmitter();
  constructor() { }

  ngOnInit(): void {
  }

  clickedConnectorsIn(){
    this.onClickedConnectorsIn.emit();
  }

}
