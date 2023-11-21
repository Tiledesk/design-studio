import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';


import { NotifyService } from 'src/app/services/notify.service';
import { MultichannelService } from 'src/app/services/multichannel.service';
import { AppConfigService } from 'src/app/services/app-config';
import { FaqKbService } from 'src/app/services/faq-kb.service';

// SERVICES //
import { DashboardService } from 'src/app/services/dashboard.service';
import { IntentService } from '../../services/intent.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

import { Chatbot } from 'src/app/models/faq_kb-model';
import { EXTERNAL_URL, TYPE_INTENT_NAME } from '../../utils';
import { CdsPublishOnCommunityModalComponent } from '../../../modals/cds-publish-on-community-modal/cds-publish-on-community-modal.component';
import { TiledeskAuthService } from 'src/chat21-core/providers/tiledesk/tiledesk-auth.service';
import { environment } from 'src/environments/environment';
import { CdsModalActivateBotComponent } from 'src/app/modals/cds-modal-activate-bot/cds-modal-activate-bot.component';

const swal = require('sweetalert');

@Component({
  selector: 'cds-header',
  templateUrl: './cds-header.component.html',
  styleUrls: ['./cds-header.component.scss']
})
export class CdsHeaderComponent implements OnInit {
 
  @Input() IS_OPEN_SIDEBAR: boolean;
  // @Input() projectID: string;
  // @Input() defaultDepartmentId: string;
  // @Input() id_faq_kb: string;
  // @Input() selectedChatbot: Chatbot;
  @Output() toggleSidebarWith = new EventEmitter();
  @Output() goToBck = new EventEmitter();
  @Output() onTestItOut = new EventEmitter();


  id_faq_kb: string;
  projectID: string;
  defaultDepartmentId: string;
  selectedChatbot: Chatbot;


  isBetaUrl: boolean = false;
  popup_visibility: string = 'none';
  public TESTSITE_BASE_URL: string;
  public_Key: string;
  TRY_ON_WA: boolean;

  version: string;
  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private router: Router,
    private faqKbService: FaqKbService,
    public dialog: MatDialog,
    public appConfigService: AppConfigService,
    private multichannelService: MultichannelService,
    private dashboardService: DashboardService,
    private intentService: IntentService,
    private tiledeskAuthService: TiledeskAuthService
  ) { }

  ngOnInit(): void {
    this.id_faq_kb = this.dashboardService.id_faq_kb;
    this.projectID = this.dashboardService.projectID;
    this.defaultDepartmentId = this.dashboardService.defaultDepartment._id;
    this.selectedChatbot = this.dashboardService.selectedChatbot;

    this.getTestSiteUrl();
    this.getOSCODE();
    this.isBetaUrl = false;
    if(this.router.url.includes('beta')){
      this.isBetaUrl = true;
    }

    this.version = environment.VERSION
  }

  getOSCODE() {
    this.public_Key = this.appConfigService.getConfig().t2y12PruGU9wUtEGzBJfolMIgK;
    // this.logger.log('AppConfigService getAppConfig (SIGNUP) public_Key', this.public_Key)
    // this.logger.log('NavbarComponent public_Key', this.public_Key)

    let keys = this.public_Key.split("-");

    if (this.public_Key.includes("TOW") === true) {

      keys.forEach(key => {
        // this.logger.log('NavbarComponent public_Key key', key)
        if (key.includes("TOW")) {
          // this.logger.log('PUBLIC-KEY (SIGNUP) - key', key);
          let tow = key.split(":");
          // this.logger.log('PUBLIC-KEY (SIGNUP) - mt key&value', mt);
          if (tow[1] === "F") {
            this.TRY_ON_WA = false;
            // this.logger.log('PUBLIC-KEY (SIGNUP) - mt is', this.MT);
          } else {
            this.TRY_ON_WA = true;
            // this.logger.log('PUBLIC-KEY (SIGNUP) - mt is', this.MT);
          }
        }
      });

    } else {
      this.TRY_ON_WA = false;
      // this.logger.log('PUBLIC-KEY (SIGNUP) - mt is', this.MT);
    }
  }

  getTestSiteUrl() {
    this.TESTSITE_BASE_URL = this.appConfigService.getConfig().widgetBaseUrl;
    this.logger.log('[CDS DSBRD] AppConfigService getAppConfig TESTSITE_BASE_URL', this.TESTSITE_BASE_URL);
  }

  onToggleSidebarWith(IS_OPEN) {
    this.IS_OPEN_SIDEBAR = IS_OPEN;
    this.toggleSidebarWith.emit(IS_OPEN);
  }

  goToBack() {
    this.goToBck.emit();
  }


  onClickPublish(){
    this.logger.log('[CDS DSBRD] click on PUBLISH --> open  - CdsPublishOnCommunityModalComponent ', this.selectedChatbot)
    const dialogRef = this.dialog.open(CdsModalActivateBotComponent, {
      data: {
        chatbot: this.selectedChatbot,
        departments: this.dashboardService.departments,
        project_id: this.projectID
      },
    });
    dialogRef.afterClosed().subscribe(result => {
      this.logger.log(`Dialog result: ${result}`);
      this.segmentChatbotPublished()
    });
  }


  onGoToCommunity(){
    let url = EXTERNAL_URL.getchatbotinfo+this.selectedChatbot._id;
    window.open(url, "_blank");
  }


  onRemoveFromCommunity() {
    swal({
      title: "Are you sure",
      text: 'You are about to remove the chatbot from the community',
      icon: "warning",
      buttons: ["Cancel", 'Remove'],
      dangerMode: false,
    })
      .then((WillRemove) => {
        if (WillRemove) {
          this.logger.log('[CDS DSBRD] removeFromCommunity swal WillRemove', WillRemove)
          this.selectedChatbot.public = false
          this.faqKbService.updateChatbot(this.selectedChatbot).subscribe((data) => {
            this.logger.log('[CDS DSBRD] removeFromCommunity - RES ', data)
          }, (error) => {
            swal('An error has occurred', {
              icon: "error",
            });
            this.logger.error('[CDS DSBRD] removeFromCommunity ERROR ', error);
          }, () => {
            this.logger.log('[CDS DSBRD] removeFromCommunity * COMPLETE *');
            swal("Done!", "The Chatbot has been removed from the community", {
              icon: "success",
            }).then((okpressed) => {

            });
          });
        } else {
          this.logger.log('[CDS DSBRD] removeFromCommunity (else)')
        }
      });

  }



  openWhatsappPage() {
    let tiledesk_phone_number = this.appConfigService.getConfig().tiledeskPhoneNumber;
    let info = {
      project_id: this.projectID,
      bot_id: this.selectedChatbot._id
    }
    this.logger.log("--> info: ", info)
    this.multichannelService.getCodeForWhatsappTest(info).then((response: any) => {
      this.logger.log("--> testing code from whatsapp: ", response);
      // let code = "%23td" + response.short_uid;
      let text = "%23td" + response.short_uid + " Send me to start testing your bot";
      const testItOutOnWhatsappUrl = `https://api.whatsapp.com/send/?phone=${tiledesk_phone_number}&text=${text}&type=phone_number&app_absent=0`
      window.open(testItOutOnWhatsappUrl, 'blank');
    }).catch((err) => {
      this.logger.error("--> error getting testing code from whatsapp: ", err);
    })
  }



  openTestSiteInPopupWindow() {
    // const testItOutBaseUrl = this.TESTSITE_BASE_URL.substring(0, this.TESTSITE_BASE_URL.lastIndexOf('/'));
    // const testItOutUrl = testItOutBaseUrl + '/chatbot-panel.html'
    // const url = testItOutUrl + '?tiledesk_projectid=' + this.projectID + '&tiledesk_participants=bot_' + this.id_faq_kb + "&tiledesk_departmentID=" + this.defaultDepartmentId + '&td_draft=true'
    // let params = `toolbar=no,menubar=no,width=815,height=727,left=100,top=100`;
    // window.open(url, '_blank', params);
    let intentStart = this.intentService.listOfIntents.find(obj => ( obj.intent_display_name.trim() === TYPE_INTENT_NAME.DISPLAY_NAME_START));
    this.onTestItOut.emit(intentStart);
  }


  private segmentChatbotPublished(){
    const that = this
    let user = this.tiledeskAuthService.getCurrentUser();
    let countIntents = this.intentService.listOfIntents.length;
    if(window['analytics']){
      try {
        window['analytics'].page("CDS Button Publish, Publish Chatbot", {
          version: environment.VERSION
        });
      } catch (err) {
        this.logger.error('Event:Publish Chatbot [page] error', err);
      }
  
      try {
        window['analytics'].identify(user.uid, {
          name: user.firstname + ' ' + user.lastname,
          email: user.email,
        });
      } catch (err) {
        this.logger.error('Event:Publish Chatbot [identify] error', err);
      }
      // Segments
      try {
        window['analytics'].track('Publish Chatbot', {
          "username": user.firstname + ' ' + user.lastname,
          "userId": user.uid,
          "countBlocks": countIntents,
          "chatbot_id": that.selectedChatbot._id,
          "chatbot_type": that.selectedChatbot.type,
          "project_id": that.projectID
        });
      } catch (err) {
        this.logger.error('Event: Publish Chatbot [track] error', err);
      }
    }
  }

}
