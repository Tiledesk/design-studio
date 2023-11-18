import { Chatbot } from 'src/app/models/faq_kb-model';
import { Component, OnInit } from '@angular/core';
import { DashboardService } from 'src/app/services/dashboard.service';
import { FaqService } from 'src/app/services/faq.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { downloadObjectAsJson } from 'src/app/utils/util';
import { AppConfigService } from 'src/app/services/app-config';
import { TiledeskAuthService } from 'src/chat21-core/providers/tiledesk/tiledesk-auth.service';
import { UserModel } from 'src/chat21-core/models/user';


@Component({
  selector: 'cds-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss']
})
export class CDSMenuComponent implements OnInit {

  selectedChatbot: Chatbot;
  loggedUser: UserModel;

  private logger: LoggerService = LoggerInstance.getInstance()

  constructor(
    private faqService: FaqService,
    private dashboardService: DashboardService,
    private appConfigService: AppConfigService,
    private tiledeskAuthService: TiledeskAuthService
  ) {
    this.selectedChatbot = this.dashboardService.selectedChatbot
    this.loggedUser = this.tiledeskAuthService.getCurrentUser()
   }

  ngOnInit(): void {
  }


  // -------------------------------------------------------------------------------------- 
  // Go To Dashbaord --> all chatbot list
  // -------------------------------------------------------------------------------------- 
  onGoBack() {
    let dashbordBaseUrl = this.appConfigService.getConfig().dashboardBaseUrl + '#/project/'+ this.dashboardService.projectID + '/bots/my-chatbots/all'
    const myWindow = window.open(dashbordBaseUrl, '_self')
    myWindow.focus();
    // this.location.back()
    // this.router.navigate(['project/' + this.project._id + '/bots/my-chatbots/all']);
  }

  // -------------------------------------------------------------------------------------- 
  // Export chatbot to JSON
  // -------------------------------------------------------------------------------------- 
  onLogOut(){
    this.tiledeskAuthService.logOut()
    this.goToDashboardLogin()

  }

  // -------------------------------------------------------------------------------------- 
  // Export chatbot to JSON
  // -------------------------------------------------------------------------------------- 
  exportChatbotToJSON() {
    // const exportFaqToJsonBtnEl = <HTMLElement>document.querySelector('.export-chatbot-to-json-btn');
    // exportFaqToJsonBtnEl.blur();
    this.faqService.exportChatbotToJSON(this.selectedChatbot._id).subscribe((faq: any) => {
      // this.logger.log('[TILEBOT] - EXPORT CHATBOT TO JSON - FAQS', faq)
      // this.logger.log('[TILEBOT] - EXPORT FAQ TO JSON - FAQS INTENTS', faq.intents)
      if (faq) {
        downloadObjectAsJson(faq, faq.name);
      }
    }, (error) => {
      this.logger.error('[TILEBOT] - EXPORT BOT TO JSON - ERROR', error);
    }, () => {
      this.logger.log('[TILEBOT] - EXPORT BOT TO JSON - COMPLETE');
    });
  }

  goToDashboardLogin(){
    let DASHBOARD_URL = this.appConfigService.getConfig().dashboardBaseUrl + '#/login'
    const myWindow = window.open(DASHBOARD_URL, '_self');
    myWindow.focus();
  }

}
