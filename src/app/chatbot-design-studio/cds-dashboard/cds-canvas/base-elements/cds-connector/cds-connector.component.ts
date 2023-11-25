import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'cds-connector',
  templateUrl: './cds-connector.component.html',
  styleUrls: ['./cds-connector.component.scss']
})
export class CdsConnectorComponent implements OnInit {
  @Input() idConnector: string;
  @Input() idConnection: string;
  @Input() isConnected: boolean;

  constructor() { }

  ngOnInit(): void {
    
  }
}
