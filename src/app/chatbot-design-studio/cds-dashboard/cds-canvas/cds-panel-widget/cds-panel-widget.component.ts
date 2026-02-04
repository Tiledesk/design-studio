import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { IntentService } from '../../../services/intent.service';
import { LogService } from 'src/app/services/log.service';

import { AppConfigService } from 'src/app/services/app-config';

// SERVICES //
import { DashboardService } from 'src/app/services/dashboard.service';
import { Intent } from 'src/app/models/intent-model';
import { Chatbot } from 'src/app/models/faq_kb-model';
import { Subject } from 'rxjs';
import { skip, takeUntil } from 'rxjs/operators';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';


@Component({
  selector: 'cds-panel-widget',
  templateUrl: './cds-panel-widget.component.html',
  styleUrls: ['./cds-panel-widget.component.scss']
})
export class CdsPanelWidgetComponent implements OnInit, OnDestroy {

  @ViewChild('widgetIframe', {static:true}) widgetIframe:ElementRef;
  @Input() isPanelVisible: boolean = false;
  @Output() newConversation = new EventEmitter();
  intentName: string;
  projectID: string;
  selectedChatbot: Chatbot;
  defaultDepartmentId: string;
  support_group_id: string;
  public iframeVisibility: boolean = false;
  public loading:boolean = true;
  WIDGET_BASE_URL: string = '';
  widgetTestSiteUrl: SafeResourceUrl = null;
  private messageListener: (event: Event) => void;
  private logger: LoggerService = LoggerInstance.getInstance();
  
  // --- Subscription cleanup ---
  private destroy$ = new Subject<void>();

  constructor( 
    public appConfigService: AppConfigService,
    private sanitizer: DomSanitizer,
    private elementRef: ElementRef,
    private intentService: IntentService,
    private dashboardService: DashboardService,
    private logService: LogService
  ) {
  }

  ngOnInit(): void {
    if(!this.intentService.intentSelected){
      this.intentService.setDefaultIntentSelected();
    }
    this.intentName = this.intentService.intentSelected.intent_display_name;
    this.resetLogService();
    /** allow to start a new converation if intent change and user has select 'play' icon from intent heaader
     *  (skip only the first time --> setIframeUrl() make the first iteration calling widget url)
     *  - save and check if intent name has changed
     *  - notify iframe with a postMessage about the changes
     */
    this.intentService.testIntent
      .pipe(takeUntil(this.destroy$))
      .subscribe((intent: Intent) => {
        if(intent && intent.intent_display_name){
          this.intentName = intent.intent_display_name;
          this.widgetIframe.nativeElement.contentWindow?.postMessage(
            {action: 'restart', intentName: this.intentName}, "*");
        }
      })

    this.projectID = this.dashboardService.projectID;
    this.selectedChatbot = this.dashboardService.selectedChatbot;
    this.defaultDepartmentId = this.dashboardService.defaultDepartment._id;
    this.logger.log('[CDS-PANEL-WIDGET] ngOnInit  ');
    this.setIframeUrl()
  }


  ngAfterViewInit() {
    const iframe = document.querySelector('iframe');
    if (iframe) {
      iframe.addEventListener('load', (event) => {
        this.logger.log('[CDS-PANEL-WIDGET] onLoaded  ');
        this.onLoaded(event);
      });
    }
  }

  setIframeUrl(){
    this.WIDGET_BASE_URL = this.appConfigService.getConfig().widgetBaseUrl;
    const testItOutUrl = this.WIDGET_BASE_URL + "assets/twp" + '/chatbot-panel.html'
    // const testItOutUrl = "https://widget.tiledesk.com/v6/5.0.71/assets/twp"+ '/chatbot-panel.html'
    // const testItOutUrl = 'http://localhost:4203/assets/twp'+ '/chatbot-panel.html'
    let url = testItOutUrl + '?tiledesk_projectid=' + this.projectID + 
                              '&tiledesk_participants=bot_' + this.selectedChatbot._id + 
                              "&tiledesk_departmentID=" + this.defaultDepartmentId + 
                              "&tiledesk_widgetTitle="+ encodeURIComponent(this.selectedChatbot.name) +
                              "&tiledesk_preChatForm=false" +
                              '&tiledesk_fullscreenMode=true&td_draft=true'
    if(this.intentName && this.intentName !== '') 
      url += '&tiledesk_hiddenMessage=' + this.intentName            
    this.widgetTestSiteUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    this.logger.log('[CDS-PANEL-WIDGET] setIframeUrl ----------------- DA QUI ---------------  ');
  }

  onLoaded(event){
    this.support_group_id = null;
    this.loading= false;
    this.logger.log('[CDS-PANEL-WIDGET] onLoaded!! ', event);
    /** enable the live stage navigation when widget iframe receive a new message from the chatbot
     *  - get message from widget page
     *  - get intent name from message attributes
     *  - set live active intent and start animation
     */

    this.messageListener = (event: Event) => {
      const eventData = (event as MessageEvent).data;
      this.logger.log('[CDS-PANEL-WIDGET] messageListener ', event);
      if(eventData?.source?.includes('widget') && eventData.event === 'onNewConversation'){
        this.logger.log('[CDS-PANEL-WIDGET] OPEN NEW CONVERSATION ', eventData);
        const conversation_id = eventData?.data?.conversation_id;
        this.newConversation.emit(conversation_id);
      } else if(eventData?.source?.includes('widget')){
        let message = eventData?.data?.message;
        this.logger.log('[CDS-PANEL-WIDGET] NEW MESSAGE ', message, this.support_group_id);
        if(message && message.status>0){
          if(!this.support_group_id){
            this.initLogStaticServices(message);
          }
        }
      }
    };
    window.addEventListener('message', this.messageListener);

    // window.addEventListener('message', (event_data)=> {
    //   if(event_data && event_data?.data?.source?.includes('widget') &&  event_data?.data?.event === 'onNewConversation'){
    //     this.logger.log('[CDS-PANEL-WIDGET] OPEN NEW CONVERSATION ', event_data);
    //     const conversation_id = event_data?.data?.data?.conversation_id;
    //     this.newConversation.emit(conversation_id);
    //   }

    //   else if(event_data && event_data?.data?.source?.includes('widget') ){
    //     let message = event_data?.data?.data?.message;
    //     this.logger.log('[CDS-PANEL-WIDGET] NEW MESSAGE ', message);
    //     // const request_id = message?.recipient;
    //     // this.newConversation.emit(request_id);

    //     if(message.status>0){
    //       //publish ACTIVE INTENT only if widget-panel is visible
    //       if(message && message.attributes && message.attributes.intentName && this.isPanelVisible){
    //         let intentName = message.attributes.intentName;
    //         this.intentService.setLiveActiveIntent(intentName);
    //       }else{
    //         this.intentService.setLiveActiveIntent(null);
    //       }
    //     }
    //   }
    // })
  }


  initLogStaticServices(message){
    this.support_group_id = message.recipient?message.recipient:null;
    const projectId = message.attributes?.projectId?message.attributes?.projectId:null;
    this.logger.log('[CDS-PANEL-WIDGET] initLogService  ', this.support_group_id, projectId);
    let serverBaseURL = this.appConfigService.getConfig().apiUrl;
    this.logService.initStaticServices(serverBaseURL, projectId, this.support_group_id); 
  }

  startTest(){
    this.iframeVisibility = !this.iframeVisibility
  }

  ngOnDestroy() {
    // Cleanup all subscriptions via takeUntil
    this.destroy$.next();
    this.destroy$.complete();
    
    // Cleanup event listener
    window.removeEventListener('message', this.messageListener);
  }

  resetLogService(){
    this.logService.resetLogService();
  }

}