import { Component, ElementRef, Input, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { IntentService } from 'app/chatbot-design-studio/services/intent.service';
import { AppConfigService } from 'app/services/app-config.service';
import { ENETDOWN } from 'constants';
import { ObserveOnMessage } from 'rxjs/internal/operators/observeOn';

// SERVICES //
import { DashboardService } from 'app/chatbot-design-studio/services/dashboard.service';
import { Intent } from 'app/models/intent-model';
import { skip } from 'rxjs/operators';
import { Chatbot } from 'app/models/faq_kb-model';

@Component({
  selector: 'cds-panel-widget',
  templateUrl: './cds-panel-widget.component.html',
  styleUrls: ['./cds-panel-widget.component.scss']
})
export class CdsPanelWidgetComponent implements OnInit {

  @ViewChild('widgetIframe', {static:true}) widgetIframe:ElementRef;

  // @Input() projectID: string;
  // @Input() id_faq_kb: string;
  // @Input() defaultDepartmentId: string;
  // @Input() intentName: string;

  intentName: string;
  projectID: string;
  selectedChatbot: Chatbot;
  defaultDepartmentId: string;

  public iframeVisibility: boolean = false
  public loading:boolean = true;

  TESTSITE_BASE_URL: string = ''
  widgetTestSiteUrl: SafeResourceUrl = null
  constructor( 
    public appConfigService: AppConfigService,
    private sanitizer: DomSanitizer,
    private elementRef: ElementRef,
    private intentService: IntentService,
    private dashboardService: DashboardService
  ) {
  }

  ngOnInit(): void {
    // this.initTiledesk();
    if(!this.intentService.intentSelected){
      this.intentService.setDefaultIntentSelected();
    }
    this.intentName = this.intentService.intentSelected.intent_display_name;
    
    /** allow to start a new converation if intent change and user has select 'play' icon from intent heaader
     *  (skip only the first time --> setIframeUrl() make the first iteration calling widget url)
     *  - save and check if intent name has changed
     *  - notify iframe with a postMessage about the changes
     */
    this.intentService.behaviorIntent.pipe(skip(1)).subscribe((intent: Intent)=> {
      if(intent && intent.intent_display_name !== this.intentName){
        this.intentName = intent.intent_display_name
        this.widgetIframe.nativeElement.contentWindow.postMessage(
            {action: 'restart', intentName: this.intentName}, "*");
      }
    })

    this.projectID = this.dashboardService.projectID;
    this.selectedChatbot = this.dashboardService.selectedChatbot;
    this.defaultDepartmentId = this.dashboardService.defaultDepartmentId;
    this.setIframeUrl()
  }

  setIframeUrl(){
    this.TESTSITE_BASE_URL = this.appConfigService.getConfig().testsiteBaseUrl;
    const testItOutBaseUrl = this.TESTSITE_BASE_URL.substring(0, this.TESTSITE_BASE_URL.lastIndexOf('/')); 
    // const testItOutBaseUrl = "https://widget.tiledesk.com/v6/5.0.71/assets/twp"; // nk for test publication
    const testItOutUrl = testItOutBaseUrl + '/chatbot-panel.html'
    // const testItOutUrl = 'http://localhost:4203/assets/twp'+ '/chatbot-panel.html'
    let url = testItOutUrl + '?tiledesk_projectid=' + this.projectID + 
                              '&tiledesk_participants=bot_' + this.selectedChatbot._id + 
                              "&tiledesk_departmentID=" + this.defaultDepartmentId + 
                              "&tiledesk_hideHeaderCloseButton=true" +
                              "&tiledesk_widgetTitle="+ this.selectedChatbot.name +
                              "&tiledesk_preChatForm=false" +
                              '&tiledesk_fullscreenMode=true&td_draft=true'
    if(this.intentName && this.intentName !== '') 
      url += '&tiledesk_hiddenMessage=' + this.intentName
                          
    this.widgetTestSiteUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url)
  }

  onLoaded(event){
    this.loading= false

    /** enable the live stage navigation when widget iframe receive a new message from the chatbot
     *  - get message from widget page
     *  - get intent name from message attributes
     *  - set live active intent and start animation
     */
    window.addEventListener('message', (event_data)=> {
      if(event_data && event_data.origin.includes('widget')){
        let message = event_data.data.message
        if(message && message.attributes && message.attributes.intentName){
          let intentName = message.attributes.intentName
          this.intentService.setLiveActiveIntent(intentName)
        }else{
          this.intentService.setLiveActiveIntent(null)
        }
      }
    })
  }

  startTest(){
    this.iframeVisibility = !this.iframeVisibility
  }
}
