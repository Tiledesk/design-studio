import { Component, OnInit } from '@angular/core';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { SUPPORT_OPTIONS } from '../utils-menu';

function getWindow(): any {
  return window;
}

@Component({
  selector: 'cds-support',
  templateUrl: './cds-support.component.html',
  styleUrls: ['./cds-support.component.scss']
})
export class CdsSupportComponent implements OnInit {

  private window;
  private initialized = false;

  SUPPORT_OPTIONS = SUPPORT_OPTIONS

  private logger: LoggerService = LoggerInstance.getInstance()
  
  constructor() { }

  ngOnInit(): void {
    console.log('[CDS-SUPPORT initttt]')
    // Object.keys(SUPPORT_OPTIONS).forEach(key => {
    //   SUPPORT_OPTIONS[key].map((el)=> {
    //     el.localIcon = false
    //     if(el.icon && el.icon.match(new RegExp(/(?=.*?assets|http|https\b)^.*$/))){
    //       el.localIcon =true
    //     }
    //   })
    // })
    this.window = getWindow();
    this.hideShowWidget("show")
  }

  private hideShowWidget(status: "hide" | "show") {
    try {
      if (window && window['tiledesk']) {
        this.logger.log('[CDS DSHBRD] HIDE WIDGET ', window['tiledesk'])
        if (status === 'hide') {
          window['tiledesk'].hide();
        } else if (status === 'show') {
          window['tiledesk'].show();
        }
      }
    } catch (error) {
      this.logger.error('tiledesk_widget_hide ERROR', error)
    }
  }

  ngOnDestroy(){
    this.window['Tiledesk']('hide')
  }

}
