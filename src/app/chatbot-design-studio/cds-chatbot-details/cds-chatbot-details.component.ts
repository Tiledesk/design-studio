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
const swal = require('sweetalert');

@Component({
  selector: 'cds-chatbot-details',
  templateUrl: './cds-chatbot-details.component.html',
  styleUrls: ['./cds-chatbot-details.component.scss']
})
export class CdsChatbotDetailsComponent extends BotsBaseComponent implements OnInit {
  @Input() selectedChatbot: Chatbot;

  activeSection: 'bot_detail' | 'import_export' | 'community' | 'developer' = 'bot_detail'


  isVisibleDEP: boolean;
  public_Key: string;


  depts_length: number;



  done_msg: string;

  showSpinner = true;
  showSpinnerInUpdateBotCard = true;
 
  updateBotError: string;
  uploadedFile: any;

  updateBotSuccess: string;
  notValidJson: string;
  errorDeletingAnswerMsg: string;
  answerSuccessfullyDeleted: string;
  thereHasBeenAnErrorProcessing: string;
  project: Project;



  botDefaultSelectedLangCode: string


  faq_kb_remoteKey: string;

  details: any

  translationsMap: Map<string, string> = new Map();

  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    public appConfigService: AppConfigService,
    private projectService: ProjectService,
    private translate: TranslateService,
  ) { super(); }

  ngOnInit(): void {
    //TODO: check user role with guard

    // this.getParamsBotIdAndThenInit();
    this.getOSCODE();
    this.project = this.projectService.getCurrentProject()
    this.getTranslations();
  }

  toggleTab(section) {

    this.logger.log('[CDS-CHATBOT-DTLS] displaydetails', section)
    this.activeSection = section
  }

  

  // ------------------------------------------
  // @ Common methods
  // ------------------------------------------
  getTranslations() {

    let keys = [
      'CDSSetting.UpdateBotError',
      'CDSSetting.UpdateBotSuccess',
      'CDSSetting.Not a valid JSON file.',
      'CDSSetting.AnErrorOccurredWhilDeletingTheAnswer',
      'CDSSetting.AnswerSuccessfullyDeleted',
      'Done',
      'CDSSetting.ThereHasBeenAnErrorProcessing'
    ]

    this.translate.get(keys).subscribe((text)=>{
      this.translationsMap.set('CDSSetting.UpdateBotError', text['CDSSetting.UpdateBotError'])
                          .set('CDSSetting.UpdateBotSuccess', text['CDSSetting.UpdateBotSuccess'])
                          .set('CDSSetting.Not a valid JSON file.', text['CDSSetting.Not a valid JSON file.'])
                          .set('CDSSetting.AnErrorOccurredWhilDeletingTheAnswer', text['CDSSetting.AnErrorOccurredWhilDeletingTheAnswer'])
                          .set('CDSSetting.AnswerSuccessfullyDeleted', text['CDSSetting.AnswerSuccessfullyDeleted'])
                          .set('Done', text['Done'])
                          .set('CDSSetting.ThereHasBeenAnErrorProcessing', text['CDSSetting.ThereHasBeenAnErrorProcessing'])

    })

  }

  getOSCODE() {
    this.public_Key = this.appConfigService.getConfig().t2y12PruGU9wUtEGzBJfolMIgK;

    let keys = this.public_Key.split("-");

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

    if (!this.public_Key.includes("DEP")) {
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
