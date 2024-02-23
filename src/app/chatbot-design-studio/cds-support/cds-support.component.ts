import { Component, OnInit } from '@angular/core';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { SUPPORT_OPTIONS } from '../utils-menu';
import { TYPE_URL } from '../utils';
import { DashboardService } from 'src/app/services/dashboard.service';

@Component({
  selector: 'cds-support',
  templateUrl: './cds-support.component.html',
  styleUrls: ['./cds-support.component.scss']
})
export class CdsSupportComponent implements OnInit {

  SUPPORT_OPTIONS = SUPPORT_OPTIONS
  cardOptions: { [key: string]: Array<{ key: string, label: string, icon: string, type: TYPE_URL, status: "active" | "inactive", src?: string, description?: string, localIcon?: boolean }>}
  private logger: LoggerService = LoggerInstance.getInstance()
  
  constructor(
    private dashboardService: DashboardService
  ) { }

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

    let projectBaseInfo = {
      _id: this.dashboardService.project._id,
      profile: this.dashboardService.project.profile,
      isActiveSubscription: this.dashboardService.project.isActiveSubscription,
      trialExpired: this.dashboardService.project.trialExpired
    }
    this.logger.log('[CDS-SUPPORT this.cardOptions]', this.cardOptions)
    this.manageWidget("start", projectBaseInfo)
    this.manageWidget('show')
  }

  onCardItemClick(item, section){
    if(section === 'CONTACT_US'){
      switch(item.key){
        case 'EMAIL':
        case 'DISCORD':
          window.open(item.src, '_blank')
          break;
        case 'CHAT':
          this.manageWidget('open')
          break;
      }
    }


    if(section === 'SELF_SERVICE'){
      window.open(item.src, '_blank')
    }

  }

  private manageWidget(status: "hide" | "show" | "open" | "close" | "start", projectInfo?: any) {
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

      if (window && !window['tiledesk']) {
        if(status === "start"){
          window['startWidget']();
          window['tiledesk_widget_login']();
          window['tiledesk'].setAttributeParameter({ key: 'payload', value: {project:  projectInfo}})
        }
      }
      
    } catch (error) {
      this.logger.error('tiledesk_widget_hide ERROR', error)
    }
  }

  ngOnDestroy(){
    this.manageWidget("hide")
  }

}
