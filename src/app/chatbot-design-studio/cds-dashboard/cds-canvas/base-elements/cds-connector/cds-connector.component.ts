import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'cds-connector',
  templateUrl: './cds-connector.component.html',
  styleUrls: ['./cds-connector.component.scss']
})
export class CdsConnectorComponent implements OnInit {
  @Input() idConnector: string;
  @Input() idConnection: string;
  @Input() isConnected: boolean;

  @Output() onShowConnector = new EventEmitter();
  @Output() onHideConnector = new EventEmitter();

  constructor() { }

  ngOnInit(): void {
  }

  public showConnector(){
    if(this.idConnection && this.isConnected){
      const idConnection = this.idConnection.replace('#', '');
      const svgElement = document.getElementById(idConnection) as HTMLElement;
      if(svgElement){
        svgElement.setAttribute('opacity', (1).toString());
      }
      // const svgElementTxt = document.getElementById('rect_'+idConnection) as HTMLElement;
      // if(svgElementTxt){
      //   svgElementTxt.setAttribute('opacity', (1).toString());
      // }
    }
  }

  public hideConnector(){
    if(this.idConnection && this.isConnected){
      const idConnection = this.idConnection.replace('#', '');
      const svgElement = document.getElementById(idConnection) as HTMLElement;
      if(svgElement){
        svgElement.setAttribute('opacity', (0).toString());
      }

      // const svgElementTxt = document.getElementById('rect_'+idConnection) as HTMLElement;
      // if(svgElementTxt){
      //   svgElementTxt.setAttribute('opacity', (0).toString());
      // }
    }
  }

}
