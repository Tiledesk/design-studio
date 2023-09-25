import { Component, ElementRef, Input, OnChanges, OnInit, ViewChild } from '@angular/core';
import { Chatbot } from 'app/models/faq_kb-model';
import { AppConfigService } from 'app/services/app-config.service';
import { UploadImageNativeService } from 'app/services/upload-image-native.service';
import { UploadImageService } from 'app/services/upload-image.service';
import { LoggerService } from '../../../services/logger/logger.service';
import { FaqKbService } from '../../../services/faq-kb.service';
import { AuthService } from 'app/core/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { DepartmentService } from 'app/services/department.service';
import { avatarPlaceholder, getColorBck } from 'app/utils/util';
import { TranslateService } from '@ngx-translate/core';
import { NotifyService } from 'app/core/notify.service';
import { Project } from 'app/models/project-model';
import { FaqService } from 'app/services/faq.service';
import { BotsBaseComponent } from 'app/bots/bots-base/bots-base.component';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
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

  constructor(
    private logger: LoggerService,
    public appConfigService: AppConfigService,
    private auth: AuthService,
    private translate: TranslateService,
  ) { super(); }

  ngOnInit(): void {
    this.auth.checkRoleForCurrentProject();
    // this.getParamsBotIdAndThenInit();
    this.getOSCODE();
    this.getCurrentProject();
    this.getTranslations();
  }

  getCurrentProject() {
    this.auth.project_bs.subscribe((project) => {
      this.project = project;
      this.logger.log('[CDS-CHATBOT-DTLS] project from AUTH service subscription  ', this.project)
    });
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
      'UpdateBotError',
      'UpdateBotSuccess',
      'Not a valid JSON file.',
      'FaqPage.AnErrorOccurredWhilDeletingTheAnswer',
      'FaqPage.AnswerSuccessfullyDeleted',
      'Done',
      'ThereHasBeenAnErrorProcessing'
    ]

    this.translate.get(keys).subscribe((text)=>{
      this.translationsMap.set('UpdateBotError', text['UpdateBotError'])
                          .set('UpdateBotSuccess', text['UpdateBotSuccess'])
                          .set('Not a valid JSON file.', text['Not a valid JSON file.'])
                          .set('FaqPage.AnErrorOccurredWhilDeletingTheAnswer', text['FaqPage.AnErrorOccurredWhilDeletingTheAnswer'])
                          .set('FaqPage.AnswerSuccessfullyDeleted', text['FaqPage.AnswerSuccessfullyDeleted'])
                          .set('Done', text['Done'])
                          .set('ThereHasBeenAnErrorProcessing', text['ThereHasBeenAnErrorProcessing'])

    })

    this.translate.get('UpdateBotError')
      .subscribe((text: string) => {
        this.updateBotError = text;
      });

    this.translate.get('UpdateBotSuccess')
      .subscribe((text: string) => {
        this.updateBotSuccess = text;
      });

    this.translate.get('Not a valid JSON file.')
      .subscribe((text: string) => {
        this.notValidJson = text;
      });

    this.translate.get('FaqPage.AnErrorOccurredWhilDeletingTheAnswer')
      .subscribe((text: string) => {
        this.errorDeletingAnswerMsg = text;
      });

    this.translate.get('FaqPage.AnswerSuccessfullyDeleted')
      .subscribe((text: string) => {
        this.answerSuccessfullyDeleted = text;
      });

    this.translate.get('Done')
      .subscribe((text: string) => {
        this.done_msg = text;
      });


    this.translate.get('ThereHasBeenAnErrorProcessing')
      .subscribe((translation: any) => {
        this.thereHasBeenAnErrorProcessing = translation;
      });

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
