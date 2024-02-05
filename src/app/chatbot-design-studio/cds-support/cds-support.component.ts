import { Component, OnInit } from '@angular/core';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { SUPPORT_OPTIONS } from '../utils-menu';
import { TYPE_URL } from '../utils';

@Component({
  selector: 'cds-support',
  templateUrl: './cds-support.component.html',
  styleUrls: ['./cds-support.component.scss']
})
export class CdsSupportComponent implements OnInit {

  SUPPORT_OPTIONS = SUPPORT_OPTIONS
  cardOptions: { [key: string]: Array<{ key: string, label: string, icon: string, type: TYPE_URL, status: "active" | "inactive", src?: string, description?: string, localIcon?: boolean }>}
  private logger: LoggerService = LoggerInstance.getInstance()
  
  constructor() { }

  ngOnInit(): void {
    this.cardOptions = SUPPORT_OPTIONS
    Object.keys(SUPPORT_OPTIONS).forEach(key => {
      this.cardOptions[key] =  this.cardOptions[key].filter(el => el.status !== 'inactive')
      this.cardOptions[key].map((el)=> {
        el.localIcon = false
        if(el.icon && el.icon.match(new RegExp(/(?=.*?assets|http|https\b)^.*$/))){
          el.localIcon =true
        }
      })
    })
    this.logger.log('[CDS-SUPPORT this.cardOptions]', this.cardOptions)
    this.hideShowWidget("show")
  }

  onCardItemClick(item, section){
    if(section === 'CONTACT_US'){
      switch(item.key){
        case 'EMAIL':
        case 'DISCORD':
          window.open(item.src, '_blank')
          break;
        case 'CHAT':
          this.hideShowWidget('open')
          break;
      }
    }


    if(section === 'SELF_SERVICE'){
      window.open(item.src, '_blank')
    }

  }

  private hideShowWidget(status: "hide" | "show" | "open" | "close") {
    try {
      if (window && window['tiledesk']) {
        this.logger.log('[CDS DSHBRD] HIDE WIDGET ', window['tiledesk'])
        if (status === 'hide') {
          window['tiledesk'].hide();
        } else if (status === 'show') {
          window['tiledesk'].show();
        } else if(status === 'open'){
          window['tiledesk'].open();
        }else if(status === "close"){
          window['tiledesk'].close();
        }
      }
    } catch (error) {
      this.logger.error('tiledesk_widget_hide ERROR', error)
    }
  }

  ngOnDestroy(){
    this.hideShowWidget("hide")
  }

}
