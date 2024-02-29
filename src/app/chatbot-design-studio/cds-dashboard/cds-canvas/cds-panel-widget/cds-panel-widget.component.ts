import { Component, ElementRef, Input, OnDestroy, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { IntentService } from '../../../services/intent.service';
import { AppConfigService } from 'src/app/services/app-config';

// SERVICES //
import { DashboardService } from 'src/app/services/dashboard.service';
import { Intent } from 'src/app/models/intent-model';
import { Chatbot } from 'src/app/models/faq_kb-model';
import { skip } from 'rxjs/operators';

@Component({
  selector: 'cds-panel-widget',
  templateUrl: './cds-panel-widget.component.html',
  styleUrls: ['./cds-panel-widget.component.scss']
})
export class CdsPanelWidgetComponent implements OnInit, OnDestroy {

  @ViewChild('widgetIframe', {static:true}) widgetIframe:ElementRef;

  @Input() isPanelVisible: boolean = false
  // @Input() intent: Intent;
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

  WIDGET_BASE_URL: string = ''
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
    this.intentService.testIntent.subscribe((intent: Intent) => {
      if(intent && intent.intent_display_name){
        this.intentName = intent.intent_display_name
        this.widgetIframe.nativeElement.contentWindow.postMessage(
          {action: 'restart', intentName: this.intentName}, "*");
      }
    })

    this.projectID = this.dashboardService.projectID;
    this.selectedChatbot = this.dashboardService.selectedChatbot;
    this.defaultDepartmentId = this.dashboardService.defaultDepartment._id;
    this.setIframeUrl()
  }

  setIframeUrl(){
    this.WIDGET_BASE_URL = this.appConfigService.getConfig().widgetBaseUrl;
    const testItOutUrl = this.WIDGET_BASE_URL + "assets/twp" + '/chatbot-panel.html'
    // const testItOutUrl = "https://widget.tiledesk.com/v6/5.0.71/assets/twp"+ '/chatbot-panel.html'
    // const testItOutUrl = 'http://localhost:4203/assets/twp'+ '/chatbot-panel.html'
    let url = testItOutUrl + '?tiledesk_projectid=' + this.projectID + 
                              '&tiledesk_participants=bot_' + this.selectedChatbot._id + 
                              "&tiledesk_departmentID=" + this.defaultDepartmentId + 
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
        //publish ACTIVE INTENT only if widget-panel is visible
        if(message && message.attributes && message.attributes.intentName && this.isPanelVisible){
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


  ngOnDestroy(): void {
  }
}