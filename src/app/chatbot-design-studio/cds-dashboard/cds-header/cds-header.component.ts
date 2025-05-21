import { Component, OnInit, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { ActivatedRoute, NavigationEnd, NavigationStart, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';


import { MultichannelService } from 'src/app/services/multichannel.service';
import { AppConfigService } from 'src/app/services/app-config';
import { FaqKbService } from 'src/app/services/faq-kb.service';

// SERVICES //
import { DashboardService } from 'src/app/services/dashboard.service';
import { IntentService } from '../../services/intent.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

import { Chatbot } from 'src/app/models/faq_kb-model';
import { EXTERNAL_URL, SETTINGS_SECTION, TYPE_INTENT_NAME } from '../../utils';
import { CdsPublishOnCommunityModalComponent } from '../../../modals/cds-publish-on-community-modal/cds-publish-on-community-modal.component';
import { TiledeskAuthService } from 'src/chat21-core/providers/tiledesk/tiledesk-auth.service';
import { environment } from 'src/environments/environment';
import { CdsModalActivateBotComponent } from 'src/app/modals/cds-modal-activate-bot/cds-modal-activate-bot.component';
import { LOGO_MENU_ITEMS, PLAY_MENU_ITEMS, SHARE_MENU_ITEMS } from '../../utils-menu';
import { NotifyService } from 'src/app/services/notify.service';
import { TranslateService } from '@ngx-translate/core';
import { BRAND_BASE_INFO, LOGOS_ITEMS } from './../../utils-resources';
import { firstValueFrom, every, filter, Subscription } from 'rxjs';
import { WebhookService } from '../../services/webhook-service.service';
import { LogService } from 'src/app/services/log.service';
import { ControllerService } from '../../services/controller.service';
import { TYPE_CHATBOT } from '../../utils-actions';


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

   private subscriptionTestItOutPlayed: Subscription;

  id_faq_kb: string;
  projectID: string;
  defaultDepartmentId: string;
  selectedChatbot: Chatbot;


  isBetaUrl: boolean = false;
  popup_visibility: string = 'none';
  TRY_ON_WA: boolean;
  isBlockSectionActive: boolean = true

  LOGO_MENU_ITEMS = LOGO_MENU_ITEMS;
  SHARE_MENU_ITEMS = SHARE_MENU_ITEMS;
  LOGOS_ITEMS = LOGOS_ITEMS
  BRAND_BASE_INFO = BRAND_BASE_INFO
  PLAY_MENU_ITEMS = PLAY_MENU_ITEMS;
  translationsMap: Map<string, string> = new Map();
  isPlaying:boolean = false;

  // webhook //
  isWebhook: boolean = false;
  webhookUrl: string = null;
  messageWebhookUrl: string = '';
  chatbot_id: string;
  serverBaseURL: string;

  publishPaneltoggleState: boolean = false;
  is0penDropDown: boolean = false
  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private faqKbService: FaqKbService,
    public dialog: MatDialog,
    public appConfigService: AppConfigService,
    private multichannelService: MultichannelService,
    private dashboardService: DashboardService,
    private intentService: IntentService,
    private tiledeskAuthService: TiledeskAuthService,
    private notify: NotifyService,
    private translate: TranslateService,
    private readonly webhookService: WebhookService,
    private readonly logService: LogService,
    private readonly controllerService: ControllerService,
  ) { 
    this.manageRouteChanges();
    this.setSubscriptions();
  }

  manageRouteChanges(){
    /** check INIT ROUTE */
    const urlWithoutParams = this.router.url.split('?')[0];
    const child = urlWithoutParams.split('/').slice(-1)[0];
    //const child = this.router.url.split('/').slice(-1)[0];
    if(child !== 'blocks'){
      this.isBlockSectionActive = false
    }

    /** subscribe to ROUTE changes (ON NAVIGATIONSTART) */
    this.router.events.pipe(filter(event => event instanceof NavigationStart)).subscribe((route: NavigationStart) => {
      const urlWithoutParams = route.url.split('?')[0];
      const child = urlWithoutParams.split('/').slice(-1)[0];
      //const child = route.url.split('/').slice(-1)[0];
      this.isBlockSectionActive = true
      if(child !== 'blocks'){
        this.isBlockSectionActive = false
      }
    });
  }

  ngOnInit(): void {
    this.id_faq_kb = this.dashboardService.id_faq_kb;
    this.projectID = this.dashboardService.projectID;
    this.defaultDepartmentId = this.dashboardService.defaultDepartment._id;
    this.selectedChatbot = this.dashboardService.selectedChatbot;
    this.logger.log('[CdsHeaderComponent] selectedChatbot::: ', this.selectedChatbot);
    if(this.dashboardService.selectedChatbot.subtype === 'webhook' || this.dashboardService.selectedChatbot.subtype === 'copilot'){
      this.isWebhook = true;
      this.initializeWebhook();
    }
    this.getOSCODE();
    this.getTranslations()
    this.isBetaUrl = false;
    if(this.router.url.includes('beta')){
      this.isBetaUrl = true;
    }
  }

  ngOnDestroy() {
    if (this.subscriptionTestItOutPlayed) {
      this.subscriptionTestItOutPlayed.unsubscribe();
    }
  }


  private setSubscriptions(){
      /** SUBSCRIBE TO THE STATE TEST IT OUT */
      this.subscriptionTestItOutPlayed = this.controllerService.isTestItOutPlaying$.subscribe((state) => {
        this.logger.log('[CdsHeaderComponent]  isTestItOutPlaying ', state);
        this.isPlaying = state;
        // if(state) {
        //   this.openWebhookLog();
        // } else {
        //   this.closeWebhookLog();
        // }
      });
  }


  getOSCODE() {
    let public_Key = this.appConfigService.getConfig().t2y12PruGU9wUtEGzBJfolMIgK;
    // this.logger.log('AppConfigService getAppConfig (SIGNUP) public_Key', this.public_Key)
    // this.logger.log('NavbarComponent public_Key', this.public_Key)
    let keys = public_Key.split("-");
    if (public_Key.includes("TOW") === true) {
      keys.forEach(key => {
        // this.logger.log('NavbarComponent public_Key key', key)
        if (key.includes("TOW")) {
          // this.logger.log('PUBLIC-KEY (TRY_ON_WA) - key', key);
          let tow = key.split(":");
          // this.logger.log('PUBLIC-KEY (TRY_ON_WA) - mt key&value', mt);
          if (tow[1] === "F") {
            this.TRY_ON_WA = false;
            // this.logger.log('PUBLIC-KEY (TRY_ON_WA) - mt is', this.MT);
          } else {
            this.TRY_ON_WA = true;
            // this.logger.log('PUBLIC-KEY (TRY_ON_WA) - mt is', this.MT);
          }
        }
      });

    } else {
      this.TRY_ON_WA = false;
      // this.logger.log('PUBLIC-KEY (SIGNUP) - mt is', this.MT);
    }
    this.logger.log('PUBLIC-KEY (TRY_ON_WA) - mt is', this.TRY_ON_WA);
    PLAY_MENU_ITEMS.map(el => { 
        if(el.key === 'WHATSAPP' && this.TRY_ON_WA){
          el.status = 'active'
        }else if(el.key === 'WHATSAPP' && !this.TRY_ON_WA){
          el.status = 'inactive'
        }  
    }) 

    if(this.isWebhook){
      this.TRY_ON_WA = false;
    }

  }


  getTranslations() {
    let keys = [
      'CDSHeader.LinkCopiedToClipboard',
    ]
    this.translate.get(keys).subscribe((text)=>{
      this.translationsMap.set('CDSHeader.LinkCopiedToClipboard', text['CDSHeader.LinkCopiedToClipboard'])
    })

  }

  onToggleSidebarWith(IS_OPEN) {
    this.IS_OPEN_SIDEBAR = IS_OPEN;
    this.toggleSidebarWith.emit(IS_OPEN);
  }

  goToBack() {
    this.goToBck.emit();
  }


  isOpenDropdown(_is0penDropDown) {
    this.is0penDropDown = _is0penDropDown
    // this.logger.log('[WS-REQUESTS-MSGS] this.is0penDropDown ',this.is0penDropDown)  
  }

  onClickPublish(){
    // this.publishPaneltoggleState = !this.publishPaneltoggleState
    this.logger.log('[CDS DSBRD] click on PUBLISH --> open ', this.publishPaneltoggleState)
    this.controllerService.openPublishPanel()
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
    let phoneNumber = this.appConfigService.getConfig().phoneNumber;
    let info = {
      project_id: this.projectID,
      bot_id: this.selectedChatbot._id
    }
    this.logger.log("--> info: ", info)
    this.multichannelService.getCodeForWhatsappTest(info).then((response: any) => {
      this.logger.log("--> testing code from whatsapp: ", response);
      // let code = "%23td" + response.short_uid;
      let text = "%23td" + response.short_uid + " Send me to start testing your bot";
      const testItOutOnWhatsappUrl = `https://api.whatsapp.com/send/?phone=${phoneNumber}&text=${text}&type=phone_number&app_absent=0`
      window.open(testItOutOnWhatsappUrl, 'blank');
    }).catch((err) => {
      this.logger.error("--> error getting testing code from whatsapp: ", err);
    })
  }

  onMenuOptionFN(item: { key: string, label: string, icon: string, src?: string}){
    switch(item.key){
      case 'GO_TO_DASHBOARD':
        let dashbordBaseUrl = this.appConfigService.getConfig().dashboardBaseUrl + '#/project/'+ this.dashboardService.projectID + '/bots/my-chatbots/all'
        window.open(dashbordBaseUrl, '_self').focus();
        break;
      case 'LOG_OUT':
        this.tiledeskAuthService.logOut()
        localStorage.removeItem('user')
        let DASHBOARD_URL = this.appConfigService.getConfig().dashboardBaseUrl + '#/login'
        if (window && window['tiledesk']) {
          window['tiledesk'].logout()
        }
        window.open(DASHBOARD_URL, '_self').focus();
        break;
      case 'EXPORT':
        this.router.navigate(['./settings'], {relativeTo: this.route, queryParams: { active: SETTINGS_SECTION.IMPORT_EXPORT } })
        break;
      case 'COPY_LINK':{
        let testItOutUrl = this.appConfigService.getConfig().widgetBaseUrl + "assets/twp" + '/chatbot-panel.html' +
                                '?tiledesk_projectid=' + this.projectID + 
                                '&tiledesk_participants=bot_' + this.selectedChatbot._id + 
                                "&tiledesk_departmentID=" + this.defaultDepartmentId + 
                                "&tiledesk_hideHeaderCloseButton=true" +
                                "&tiledesk_restartConversation=false" +
                                "&tiledesk_widgetTitle="+ encodeURIComponent(this.selectedChatbot.name) +
                                "&tiledesk_preChatForm=false" +
                                "&td_draft=true"
          navigator.clipboard.writeText(testItOutUrl)
          this.notify.showWidgetStyleUpdateNotification(this.translationsMap.get('CDSHeader.LinkCopiedToClipboard'), 2, 'done')
        }
        break;
      case 'OPEN_NEW_PAGE':{
        let testItOutUrl = this.appConfigService.getConfig().widgetBaseUrl + "assets/twp" + '/chatbot-panel.html' +
                              '?tiledesk_projectid=' + this.projectID + 
                              '&tiledesk_participants=bot_' + this.selectedChatbot._id + 
                              "&tiledesk_departmentID=" + this.defaultDepartmentId + 
                              "&tiledesk_hideHeaderCloseButton=true" +
                              "&tiledesk_restartConversation=false" +
                              "&tiledesk_widgetTitle="+ encodeURIComponent(this.selectedChatbot.name) +
                              "&tiledesk_preChatForm=false" +
                              "&td_draft=true"
        window.open(testItOutUrl, '_blank')
        }
        break;
      case 'WHATSAPP':
        this.openWhatsappPage()
        break;
      case 'WEB':
        this.openTestSiteInPopupWindow()
        break;
        
    }
  }

  // openWebhookLog(){
    // let intentStart = this.intentService.listOfIntents.find(obj => ( obj.intent_display_name.trim() === TYPE_INTENT_NAME.WEBHOOK));
    // this.logger.log('[cds-header] ----> openWebhookLog', intentStart);
    // if(!this.webhookUrl){
    //   this.createWebhook();
    // }
    //this.logger.log('[cds-header] ----> initialize logService', this.webhookUrl);
    //this.logService.initialize(null); 
    // this.isPlaying = true;
    // this.intentService.openTestItOut(intentStart);
  // }

  // closeWebhookLog(){
  //   let intentStart = this.intentService.listOfIntents.find(obj => ( obj.intent_display_name.trim() === TYPE_INTENT_NAME.WEBHOOK));
  //   this.logger.log('[cds-header] ----> closeWebhookLog', intentStart);
  //   this.logService.closeLog();
  //   this.stopWebhook();
  //   this.isPlaying = false;
  // }



  async onOpenTestItOut(){
    if(!this.webhookUrl){
      this.webhookUrl = await this.createWebhook();
      console.log("[cds-header] Webhook URL:", this.webhookUrl);
    }
    this.logService.initialize(null); 
    this.openTestSiteInPopupWindow();
    this.isPlaying = true;
  }


  onCloseTestItOut(){
    if(this.isWebhook){
      this.stopWebhook();
    }
    this.intentService.closeTestItOut();
    this.isPlaying = false;
    this.intentService.resetLiveActiveIntent();
    this.logService.closeLog();
  }



  openTestSiteInPopupWindow() {
    let intentName = TYPE_INTENT_NAME.START;
    if(this.isWebhook){
      intentName = TYPE_INTENT_NAME.WEBHOOK;
    }
    let intentStart = this.intentService.listOfIntents.find(obj => ( obj.intent_display_name.trim() === intentName));
    this.intentService.openTestItOut(intentStart);
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
        },
        { "context": {
           "groupId": that.projectID
          }
        });
      } catch (err) {
        this.logger.error('Event: Publish Chatbot [track] error', err);
      }
    }
  }




  // webhook //
  async initializeWebhook(){
    this.webhookUrl = null;
    this.serverBaseURL = this.appConfigService.getConfig().apiUrl;
    this.chatbot_id = this.dashboardService.id_faq_kb;
    this.webhookUrl = await this.getWebhook();
  }

  async createWebhook(): Promise<string | null> {
    this.logger.log("[cds-header] createWebhook 1: ", this.intentService.listOfIntents);
    const intentStart = this.intentService.listOfIntents.find(obj => obj.intent_display_name.trim() === TYPE_INTENT_NAME.WEBHOOK);
    if (!intentStart) {
      this.logger.log("[cds-header] Errore: intentStart non trovato.");
      return null;
    }
    this.logger.log("[cds-header] createWebhook 2: ", this.chatbot_id, intentStart.intent_id);
    const copilot = this.dashboardService.selectedChatbot.subtype === TYPE_CHATBOT.COPILOT;
    try {
      const resp: any = await firstValueFrom(this.webhookService.createWebhook(this.chatbot_id, intentStart.intent_id, true, copilot));
      this.logger.log("[cds-header] createWebhook : ", resp);
      return resp?.webhook_id ? `${this.serverBaseURL}webhook/${resp.webhook_id}` : null;
    } catch (error) {
      this.logger.log("[cds-header] error createWebhook: ", error);
      return null;
    }
  }

  async getWebhook(): Promise<string | null> {
    try {
      const resp: any = await firstValueFrom(this.webhookService.getWebhook(this.chatbot_id));
      this.logger.log("[cds-header] getWebhook : ", resp);
      const webhookUrl = resp?.webhook_id ? `${this.serverBaseURL}webhook/${resp.webhook_id}` : null;
      return webhookUrl;
    } catch (error) {
      this.logger.log("[cds-header] error getWebhook: ", error);
      return null;
    }
  }


  stopWebhook(){
    this.webhookService.deleteWebhook(this.chatbot_id).subscribe({ next: (resp: any)=> {
      this.logger.log("[cds-header] deleteWebhook : ", resp);
      //this.webhookUrl = null; //this.serverBaseURL+'webhook/'+resp.webhook_id;
    }, error: (error)=> {
      this.logger.error("[cds-header] error deleteWebhook: ", error);
    }, complete: () => {
      this.logger.log("[cds-header] deleteWebhook completed.");
    }});
  }
  

  async copyText(dev): Promise<void> {
    let url = this.webhookUrl;
    if(dev === true){
      url = this.webhookUrl +'/dev';
    }
    if (navigator?.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        this.logger.log('Text copied successfully!');
        let translatedString = this.translate.instant('CDSCanvas.DevUrlCopied');
        this.showMessage(translatedString);
      } catch (err) {
        this.logger.error('Error copying text:', err);
        let translatedString = this.translate.instant('CDSCanvas.TextErrorCopied');
        this.showMessage(translatedString+': ' +JSON.stringify(err));
      }
    } else {
      this.logger.log('Clipboard API not supported by your browser.');
      let translatedString = this.translate.instant('CDSCanvas.ApiNotSupported');
      this.showMessage(translatedString);
    }
  }

  private showMessage(msg: string): void {
    this.messageWebhookUrl = msg;
    setTimeout(() => {
      this.messageWebhookUrl = '';
    }, 5000);
  }




  
}
