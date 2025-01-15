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

  public showConnectorsIn(event: MouseEvent){
    event.stopPropagation();
    if(this.connectorsIn){
      this.connectorsIn.forEach((connector) => {
        const svgElement = document.getElementById(connector.id) as HTMLElement;
        if(svgElement){
          svgElement.setAttribute('opacity', (1).toString());
        }
        const svgElementRec = document.getElementById('rect_'+connector.id) as HTMLElement;
        if(svgElementRec){
          svgElementRec.setAttribute('opacity', (1).toString());
        }
        const svgElementTxt = document.getElementById('label_'+connector.id) as HTMLElement;
        if(svgElementTxt){
          svgElementTxt.setAttribute('opacity', (1).toString());
        }
      });
     
    }
  }

  public hideConnectorsIn(event: MouseEvent){
    event.stopPropagation();
    if(this.connectorsIn){
      this.connectorsIn.forEach((connector) => {
        const svgElement = document.getElementById(connector.id) as HTMLElement;
        if(svgElement){
          svgElement.setAttribute('opacity', (0).toString());
        }
        const svgElementRec = document.getElementById('rect_'+connector.id) as HTMLElement;
        if(svgElementRec){
          svgElementRec.setAttribute('opacity', (0).toString());
        }
        const svgElementTxt = document.getElementById('label_'+connector.id) as HTMLElement;
        if(svgElementTxt){
          svgElementTxt.setAttribute('opacity', (0).toString());
        }
      });
      
    }
  }

}
