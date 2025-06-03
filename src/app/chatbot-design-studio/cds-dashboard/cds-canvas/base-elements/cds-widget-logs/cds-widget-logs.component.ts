import { Component, ElementRef, EventEmitter, Input, OnInit, Output, Renderer2, SimpleChanges } from '@angular/core';
import { LOG_LEVELS } from 'src/app/chatbot-design-studio/utils';
import { LogService } from 'src/app/services/log.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { lastValueFrom, Subscription } from 'rxjs';
import { DashboardService } from 'src/app/services/dashboard.service';
import { IntentService } from 'src/app/chatbot-design-studio/services/intent.service';
import { WebhookService } from 'src/app/chatbot-design-studio/services/webhook-service.service';
import { TiledeskAuthService } from 'src/chat21-core/providers/tiledesk/tiledesk-auth.service';
import { TYPE_CHATBOT } from 'src/app/chatbot-design-studio/utils-actions';

@Component({
  selector: 'cds-widget-logs',
  templateUrl: './cds-widget-logs.component.html',
  styleUrls: ['./cds-widget-logs.component.scss']
})


export class CdsWidgetLogsComponent implements OnInit {
  private subscriptionWidgetLoadedNewMessage: Subscription;
  private subscriptionLoadedWidget: Subscription;
  @Input() 
  set IS_OPEN_PANEL_WIDGET(value: boolean) {
    this.isOpenPanelWidget = value;
    if (!value) {
      this.closeLog();
    }
  }
  @Input() request_id: string;
  @Output() closePanelLog = new EventEmitter();

  listOfLogs: Array<any> = [];
  filteredLogs: Array<any> = [];
  isClosed = false;
  logContainer: any;
  LOG_LEVELS = LOG_LEVELS;
  selectedLogLevel = LOG_LEVELS.DEBUG;
  isOpenPanelWidget: boolean;
  mqtt_token: string;
  highestTimestamp: string;
  animationLog: boolean = true;

  private startY: number;
  private startHeight: number;
  private mouseMoveListener: () => void;
  private mouseUpListener: () => void;
  private readonly logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private readonly el: ElementRef, 
    private readonly renderer: Renderer2,
    private readonly logService: LogService,
    private readonly dashboardService: DashboardService,
    private readonly webhookService: WebhookService,
    private readonly tiledeskAuthService: TiledeskAuthService,
    private intentService: IntentService
  ) {}

  ngOnInit(): void {
    //empty
    this.subscriptions();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['request_id']) { // && !changes['request_id'].isFirstChange()
      // this.request_id = changes['request_id'].currentValue;
      this.initializeChatbot();
    }
  }

  ngAfterViewInit() {
    this.logger.log("[CDS-WIDGET-LOG] ngAfterViewInit selectedChatbot ", this.dashboardService.selectedChatbot);
    //this.initializeChatbot();
  }



  getStaticLastLogs(){
    this.logService.getStaticLastLogs(this.selectedLogLevel).subscribe({ next: (resp)=> {
      this.logger.log("[CDS-WIDGET-LOG] getStaticLastLogs", resp);
      this.appendFirstMessagesToHeadArray(resp);
    }, error: (error)=> {
      this.logger.error("[LOG-SERV] initLogService error: ", error);
    }, complete: () => {
      this.logger.log("[LOG-SERV] initLogService completed.");
    }})
  }



  private appendFirstMessagesToHeadArray(dataArray) {
      let transformedArray = dataArray.map(item => ({
          dev: false,
          id_project: item.id_project,
          intent_id: item.rows.intent_id,
          level: item.rows.level,
          nlevel: item.rows.nlevel,
          request_id: item.request_id,
          text: item.rows.text,
          timestamp: item.rows.timestamp
      }));
      if(this.listOfLogs.length > 0){
        const cutoffTimestamp = new Date(this.listOfLogs[0].timestamp);
        transformedArray = transformedArray.filter(item => new Date(item.timestamp) < cutoffTimestamp);
      } else {
        this.highestTimestamp = transformedArray[transformedArray.length-1]?.timestamp;
      }
      this.listOfLogs.unshift(...transformedArray);
      this.logger.log("[CDS-WIDGET-LOG] transformedArray", transformedArray, this.listOfLogs);
  }

  
  


  async initializeChatbot(){
    this.listOfLogs = [];
    this.logger.log("[CDS-WIDGET-LOG] initializeChatbot ");
    this.listOfLogs = [];
    if(localStorage.getItem("log_animation_type") != null){
      this.animationLog = JSON.parse(localStorage.getItem("log_animation_type"));
    };
    const chatbotSubtype = this.dashboardService.selectedChatbot?.subtype;
    if(chatbotSubtype === TYPE_CHATBOT.WEBHOOK || chatbotSubtype === TYPE_CHATBOT.COPILOT){
      const webhook_id = await this.getWebhook();
      this.logger.log("[CDS-WIDGET-LOG] webhook_id : ", webhook_id);
      this.request_id = await this.getNewRequestId(webhook_id);
      this.logger.log("[CDS-WIDGET-LOG] request_id : ", this.request_id);
    } else {
      this.request_id = this.logService.request_id;
    }
    if(this.request_id){
      let resp = await this.getToken(this.request_id);
      if(resp){
        this.mqtt_token = resp['token']?resp['token']:null;
        this.request_id = resp['request_id']?resp['request_id']:null;
        this.starterLog();
      }
    }
  }



  async getWebhook(): Promise<any | null> {
      const chatbot_id = this.dashboardService.id_faq_kb;
      try {
        const resp = await lastValueFrom(this.webhookService.getWebhook(chatbot_id));
        this.logger.log("[CDS-WIDGET-LOG] getWebhook : ", resp);
        return resp.webhook_id;
      } catch (error) {
        this.logger.error("[CDS-WIDGET-LOG] error getWebhook: ", error);
        return null;
      } finally {
        this.logger.log("[CDS-WIDGET-LOG] getWebhook completed.");
      }
  }


  async getNewRequestId(webhook_id): Promise<any|null> {
    const tiledeskToken = localStorage.getItem('tiledesk_token');
    const project_id = this.dashboardService.projectID;
    try {
      const resp = await this.tiledeskAuthService.createNewRequestId(
        tiledeskToken,
        project_id, 
        webhook_id
      );
      this.logger.log('[CDS-WIDGET-LOG] >>> createNewRequestId ok ', resp);
      if(resp['request_id']){
        return resp['request_id'];
      } else {
        return null;
      }
    } catch (error: any) {
      this.logger.error('[CDS-WIDGET-LOG] createNewRequestId error::', error);
      if (error.status && error.status === 401) {
        // error
      }
      return null;
    }
  }


  async getToken(request_id): Promise<any|null> {
    const tiledeskToken = localStorage.getItem('tiledesk_token');
    const project_id = this.dashboardService.projectID;
    try {
      const resp = await this.tiledeskAuthService.createCustomTokenByRequestId(
        tiledeskToken,
        project_id,
        request_id
      );
      this.logger.log('[CDS-WIDGET-LOG] >>> getToken ok ', resp);
      return resp;
    } catch (error: any) {
      this.logger.error('[CDS-WIDGET-LOG] getToken error::', error);
      if (error.status && error.status === 401) {
        // error
      }
      return null;
    }
  }




  ngOnDestroy() {
    if (this.subscriptionWidgetLoadedNewMessage) {
      this.subscriptionWidgetLoadedNewMessage.unsubscribe();
    }
    if(this.subscriptionLoadedWidget) {
      this.subscriptionLoadedWidget.unsubscribe();
    }
  }


  subscriptions(){
     /** get dynamic logs */
    this.subscriptionWidgetLoadedNewMessage = this.logService.BSWidgetLoadedNewMessage.subscribe((message: any) => {
      this.logger.log("[CDS-WIDGET-LOG] new message loaded ", message, this.highestTimestamp);
      if(message){
        if (new Date(message.timestamp) > new Date(this.highestTimestamp) || !this.highestTimestamp){
          this.listOfLogs.push(message);
        }
        //this.goToIntentByMessage(message);
        this.scrollToBottom();
      } else {
        //this.goToIntentByMessage(message);
        // const intentId = this.intentService.intentSelectedID;
        // this.logger.log("[CDS-WIDGET-LOG] ANIMATE BLOCK: #intent-content-"+(intentId));
        // this.addCssAnimationClass('live-start-intent', '#intent-content-' + (intentId), 6);
      }
      this.goToIntentByMessage(message);
      this.filterLogMessage();
    });  


    /** get the static logs the first time */
    this.subscriptionLoadedWidget = this.logService.BSWidgetLoaded.subscribe((resp: boolean) => {
      this.logger.log("[CDS-WIDGET-LOG] loaded ", resp);
      if(resp){
        this.getStaticLastLogs();
      };
    });  
    
  }



  initResize(event?: MouseEvent) {
    this.logger.log('[CDS-WIDGET-LOG] >>> initResize ',event);
    this.startY = event.clientY;
    this.logContainer = this.el.nativeElement.querySelector('#cds_widget_log');
    if(this.logContainer){
      this.startHeight = this.logContainer.offsetHeight;
      this.mouseMoveListener = this.renderer.listen('document', 'mousemove', this.resize.bind(this));
      this.mouseUpListener = this.renderer.listen('document', 'mouseup', this.stopResize.bind(this));
    }
  }

  resize(event: MouseEvent) {
    // this.logger.log('[CDS-WIDGET-LOG] >>> resize ');
    if (this.logContainer && this.startHeight !== undefined && this.startY !== undefined) {
      const newHeight = this.startHeight - (event.clientY - this.startY);
      if (newHeight < 30) {
        //this.isClosed = true;
      } else { 
        this.isClosed = false;
        this.renderer.setStyle(this.logContainer, 'height', `${newHeight}px`);
      }
    }
  }


  stopResize(event?: MouseEvent) {
    this.logger.log('[CDS-WIDGET-LOG] >>> stopResize ', this.mouseUpListener);
    if (this.mouseMoveListener) {
      this.mouseMoveListener(); 
      this.mouseMoveListener = null;
    }
    if (this.mouseUpListener) {
      this.mouseUpListener(); 
      this.mouseUpListener = null;
    }
    this.logger.log("[CDS-WIDGET-LOG] stopResize: ridimensionamento interrotto.");
  }


  private scrollToBottom(): void {
    const logContainer = this.el.nativeElement.querySelector('#content-scroll-log');
    this.logger.log("[CDS-WIDGET-LOG] scrollToBottom: ", logContainer, logContainer.offsetHeight);
    setTimeout(() => {
      if(logContainer) {
        logContainer.scrollTop = logContainer.scrollHeight;
      }
    }, 300);
  }


  starterLog(){
    this.logger.log('[CDS-WIDGET-LOG] >>> starterLog ');
    this.logService.starterLog(this.mqtt_token, this.request_id);
  }

  closeLog(){
    this.logger.log('[CDS-WIDGET-LOG] >>> closeLog ');
    this.intentService.resetLiveActiveIntent();
    this.logService.closeLog();
  }

  onLogLevelChange(event: any) {
    this.selectedLogLevel = event.target.value;
    this.filterLogMessage();
  }

  private filterLogMessage() {
    if(this.selectedLogLevel === LOG_LEVELS.DEBUG){
      this.filteredLogs = this.listOfLogs;
    } else {
      this.filteredLogs = this.listOfLogs.filter(log => log.level === this.selectedLogLevel);
    }
    this.logger.log('[CDS-WIDGET-LOG] filterLogMessage:', this.filteredLogs);
  }


  goToIntentByMessage(message){
    this.logger.log('[CDS-WIDGET-LOG] goToIntentByMessage:', message);
    const intentId = message?.intent_id;
    localStorage.setItem("isLoggedIn", JSON.stringify(true));
    if(localStorage.getItem("log_animation_type") != null){
      this.animationLog = JSON.parse(localStorage.getItem("log_animation_type"));
    };
    let scale = null;
    const chatbotSubtype = this.dashboardService.selectedChatbot?.subtype;
    if(chatbotSubtype === TYPE_CHATBOT.CHATBOT){
      scale = 1;
    }
    this.intentService.setLiveActiveIntentByIntentId(intentId, this.animationLog, scale);
  }

  onToggleLog() {
    this.isClosed = !this.isClosed;
  }

  onClearLog(){
    this.listOfLogs = [];
    this.filteredLogs = [];
  }

  onGotoIntent(i){
    const message = this.filteredLogs[i];
    this.logger.log('[CDS-WIDGET-LOG] onGotoIntent:', message);
    this.goToIntentByMessage(message);
  }

  onToggleRowLog(i) {
    if(this.isButtonEnabled(i)){
      if(this.listOfLogs[i]['open']){
        this.listOfLogs[i]['open'] = !this.listOfLogs[i]['open'];
      } else {
        this.listOfLogs[i]['open'] = true;
      }
    }
  }

  onCloseLog(){
    this.isClosed = true;
    //this.closeLog();
    //this.closePanelLog.emit();
  }

  onOpenLog(){
    this.isClosed = false;
  }

  onSetAnimationLog(){
    this.animationLog = !this.animationLog;
    localStorage.setItem("log_animation_type", JSON.stringify(this.animationLog));
  }

  isButtonEnabled(index: number): boolean {
    const blockTextId = "row-log-text_"+index;
    const elementText = document.getElementById(blockTextId);
    const blockButtonId = "row-log-button_"+index;
    const elementButton = document.getElementById(blockButtonId);
    if (elementText) {
      if(elementText.offsetHeight > elementButton.offsetHeight){
        this.logger.log(`[CDS-WIDGET-LOG] ENABLED: ${elementText.offsetHeight}, ${elementButton.offsetHeight} px`);
        return true;
      } else {
        return false;
      }
    } else {
      this.logger.log(`[CDS-WIDGET-LOG] DISABLED: ${elementText.offsetHeight}, ${elementButton.offsetHeight} px`);
      return false;
    }
  }


  

}
