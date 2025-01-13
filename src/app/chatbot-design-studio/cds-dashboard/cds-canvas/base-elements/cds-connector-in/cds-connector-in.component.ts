import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'cds-connector-in',
  templateUrl: './cds-connector-in.component.html',
  styleUrls: ['./cds-connector-in.component.scss']
})
export class CdsConnectorInComponent implements OnInit {
  @Input() connectorsIn: any[] = [];

  labelNumber: string;
  constructor() { }

  ngOnInit(): void {
    this.labelNumber = this.connectorsIn.length.toString();
    if(this.connectorsIn.length>9){
      this.labelNumber = "+9";
    }
  }

  public showConnectorsIn(){
    if(this.connectorsIn){
      this.connectorsIn.forEach((connector) => {
        const svgElement = document.getElementById(connector.id) as HTMLElement;
        if(svgElement){
          svgElement.setAttribute('opacity', (1).toString());
        }
      });
    }
  }

  public hideConnectorsIn(){
    if(this.connectorsIn){
      this.connectorsIn.forEach((connector) => {
        const svgElement = document.getElementById(connector.id) as HTMLElement;
        if(svgElement){
          svgElement.setAttribute('opacity', (0).toString());
        }
      });
    }
  }

}
