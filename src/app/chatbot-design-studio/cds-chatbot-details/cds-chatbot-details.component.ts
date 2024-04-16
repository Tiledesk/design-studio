import { Component, ElementRef, Input, OnChanges, OnInit, ViewChild } from '@angular/core';
import { Chatbot } from 'src/app/models/faq_kb-model';
import { TranslateService } from '@ngx-translate/core';
import { Project } from 'src/app/models/project-model';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { AppConfigService } from 'src/app/services/app-config';
import { DashboardService } from 'src/app/services/dashboard.service';
import { ProjectService } from 'src/app/services/projects.service';
import { BotsBaseComponent } from 'src/app/components/bots/bots-base/bots-base.component';
import { SETTINGS_SECTION } from '../utils';
import { Observable, Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { BRAND_BASE_INFO } from '../utils-resources';
const swal = require('sweetalert');

@Component({
  selector: 'cds-chatbot-details',
  templateUrl: './cds-chatbot-details.component.html',
  styleUrls: ['./cds-chatbot-details.component.scss']
})
export class CdsChatbotDetailsComponent extends BotsBaseComponent implements OnInit {
  
  selectedChatbot: Chatbot;
  @Input() activeSection: SETTINGS_SECTION = SETTINGS_SECTION.DETAIL

  
  SETTINGS_SECTION = SETTINGS_SECTION
  BRAND_BASE_INFO = BRAND_BASE_INFO
  isVisibleDEP: boolean;

  project: Project;


  translationsMap: Map<string, string> = new Map();

  private subscriptionOpenWidgetPanel: Subscription;

  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    public appConfigService: AppConfigService,
    private projectService: ProjectService,
    private translate: TranslateService,
    private dashboardService: DashboardService,
    private router: Router,
    private route: ActivatedRoute
  ) { super(); 
  }

  ngOnInit(): void {
    //TODO: check user role with guard

    // this.getParamsBotIdAndThenInit();
    this.getOSCODE();
    this.project = this.projectService.getCurrentProject()
    this.getTranslations();
    this.selectedChatbot = this.dashboardService.selectedChatbot;

    // HIDE/SHOW community section 
    if(!BRAND_BASE_INFO['COMMUNITY_SECTION']){
      this.activeSection = SETTINGS_SECTION.DETAIL
      this.toggleTab(this.activeSection)
    }

    this.route.queryParams.subscribe((params) => {
      if(!params.hasOwnProperty('active')){
        this.toggleTab(this.activeSection)
      }
      this.activeSection = params['active']
    })
  }

  toggleTab(section) {
    this.logger.log('[CDS-CHATBOT-DTLS] displaydetails', section)
    this.activeSection = section
    this.router.navigate(['.'], {relativeTo: this.route, queryParams: { active: section } })
  }

  

  // ------------------------------------------
  // @ Common methods
  // ------------------------------------------
  getTranslations() {

    let keys = [
      'CDSSetting.UpdateBotError',
      'CDSSetting.UpdateBotSuccess',
      'CDSSetting.NotAValidJSON',
      'CDSSetting.AnErrorOccurredWhilDeletingTheAnswer',
      'CDSSetting.AnswerSuccessfullyDeleted',
      'Done',
      'CDSSetting.ThereHasBeenAnErrorProcessing',
      'CDSSetting.FileUploadedSuccessfully',
      'CDSSetting.AnErrorOccurredUpdatingProfile',
      'CDSSetting.UserProfileUpdated'

    ]

    this.translate.get(keys).subscribe((text)=>{
      this.translationsMap.set('CDSSetting.UpdateBotError', text['CDSSetting.UpdateBotError'])
                          .set('CDSSetting.UpdateBotSuccess', text['CDSSetting.UpdateBotSuccess'])
                          .set('CDSSetting.NotAValidJSON', text['CDSSetting.NotAValidJSON'])
                          .set('CDSSetting.AnErrorOccurredWhilDeletingTheAnswer', text['CDSSetting.AnErrorOccurredWhilDeletingTheAnswer'])
                          .set('CDSSetting.AnswerSuccessfullyDeleted', text['CDSSetting.AnswerSuccessfullyDeleted'])
                          .set('Done', text['Done'])
                          .set('CDSSetting.ThereHasBeenAnErrorProcessing', text['CDSSetting.ThereHasBeenAnErrorProcessing'])
                          .set('CDSSetting.FileUploadedSuccessfully', text['CDSSetting.FileUploadedSuccessfully'])
                          .set('CDSSetting.ThereHasBeenAnErrorProcessing', text['CDSSetting.AnErrorOccurredUpdatingProfile'])
                          .set('CDSSetting.ThereHasBeenAnErrorProcessing', text['CDSSetting.UserProfileUpdated'])

    })

  }

  getOSCODE() {
    let public_Key = this.appConfigService.getConfig().t2y12PruGU9wUtEGzBJfolMIgK;

    let keys = public_Key.split("-");

    keys.forEach(key => {

      if (key.includes("DEP")) {
        let dep = key.split(":");
        if (dep[1] === "F") {
          this.isVisibleDEP = false;
          //this.logger.log('PUBLIC-KEY (Faqcomponent) - isVisibleDEP', this.isVisibleDEP);
        } else {
          this.isVisibleDEP = true;
          //this.logger.log('PUBLIC-KEY (Faqcomponent) - isVisibleDEP', this.isVisibleDEP);
        }
      }
      // if (key.includes("PAY")) {
      //  this.logger.log('[CDS-CHATBOT-DTLS] PUBLIC-KEY - key', key);
      //   let pay = key.split(":");
      //   //this.logger.log('PUBLIC-KEY (Navbar) - pay key&value', pay);
      //   if (pay[1] === "F") {
      //     this.payIsVisible = false;
      //    this.logger.log('[CDS-CHATBOT-DTLS] - pay isVisible', this.payIsVisible);
      //   } else {
      //     this.payIsVisible = true;
      //    this.logger.log('[CDS-CHATBOT-DTLS] - pay isVisible', this.payIsVisible);
      //   }
      // }
      // if (key.includes("ANA")) {

      //   let ana = key.split(":");

      //   if (ana[1] === "F") {
      //     this.isVisibleAnalytics = false;
      //   } else {
      //     this.isVisibleAnalytics = true;
      //   }
      // }

    });

    if (!public_Key.includes("DEP")) {
      this.isVisibleDEP = false;
    }

    // if (!this.public_Key.includes("ANA")) {
    //   this.isVisibleAnalytics = false;
    // }

    // if (!this.public_Key.includes("PAY")) {
    //   this.payIsVisible = false;
    //   //this.logger.log('[CDS-CHATBOT-DTLS] - pay isVisible', this.payIsVisible);
    // }
  }

}
