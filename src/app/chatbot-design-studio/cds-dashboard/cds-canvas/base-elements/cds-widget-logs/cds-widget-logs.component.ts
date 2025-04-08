import { Component, ElementRef, EventEmitter, Input, OnInit, Output, Renderer2 } from '@angular/core';
import { LOG_LEVELS } from 'src/app/chatbot-design-studio/utils';
import { LogService } from 'src/app/services/log.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { Subscription } from 'rxjs';

@Component({
  selector: 'cds-widget-logs',
  templateUrl: './cds-widget-logs.component.html',
  styleUrls: ['./cds-widget-logs.component.scss']
})


export class CdsWidgetLogsComponent implements OnInit {
  private subscriptionWidgetLoadedNewMessage: Subscription;
  @Input() 
  set IS_OPEN_PANEL_WIDGET(value: boolean) {
    this.isOpenPanelWidget = value;
    if (!value) {
      this.closeLog();
    }
  }
  @Output() closePanelLog = new EventEmitter();

  listOfLogs: Array<any> = [];
  filteredLogs: Array<any> = [];
  isClosed = false;
  logContainer: any;
  LOG_LEVELS = LOG_LEVELS;
  selectedLogLevel = LOG_LEVELS.DEBUG;
  isOpenPanelWidget: boolean;

  private startY: number;
  private startHeight: number;
  private mouseMoveListener: () => void;
  private mouseUpListener: () => void;
  private readonly logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private readonly el: ElementRef, 
    private readonly renderer: Renderer2,
    private readonly logService: LogService
  ) {}

  ngOnInit(): void {
    //empty
  }

  ngAfterViewInit() {
    this.subscriptions();
    this.logService.initLogService();
    this.initResize();
  }


  ngOnDestroy() {
    if (this.subscriptionWidgetLoadedNewMessage) {
      this.subscriptionWidgetLoadedNewMessage.unsubscribe();
    }
  }


  subscriptions(){
    this.subscriptionWidgetLoadedNewMessage = this.logService.BSWidgetLoadedNewMessage .subscribe((message: any) => {
      this.logger.log("[CDS-WIDGET-LOG] new message loaded ", message);
      if(message){
        this.listOfLogs.push(message);
      }
      this.filterLogMessage();
    });  
  }


  initResize(event?: MouseEvent) {
    this.startY = event.clientY;
    this.logContainer = this.el.nativeElement.querySelector('#cds_widget_log');
    if(this.logContainer && !this.isClosed){
      this.startHeight = this.logContainer.offsetHeight;
      this.mouseMoveListener = this.renderer.listen('document', 'mousemove', this.resize.bind(this));
      this.mouseUpListener = this.renderer.listen('document', 'mouseup', this.stopResize.bind(this));
    }
  }

  resize(event: MouseEvent) {
    if(this.logContainer){
      const newHeight = this.startHeight - (event.clientY - this.startY);
      if (newHeight < 30) {
        this.isClosed = true;
      } else { 
        this.isClosed = false;
        this.renderer.setStyle(this.logContainer, 'height', `${newHeight}px`);
      }
    }
  }

  stopResize() {
    if (this.mouseMoveListener) this.mouseMoveListener();
    if (this.mouseUpListener) this.mouseUpListener();
  }


  starterLog(){
    this.logger.log('[CdsWidgetLogsComponent] >>> starterLog ');
    this.logService.starterLog();
    // alla chiusura del log richiamo mqtt_client.close()
  }

  closeLog(){
    this.logger.log('[CdsWidgetLogsComponent] >>> closeLog ');
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



  onToggleLog() {
    this.isClosed = !this.isClosed;
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
    this.closePanelLog.emit();
  }


  isButtonEnabled(index: number): boolean {
    const blockTextId = "row-log-text_"+index;
    const elementText = document.getElementById(blockTextId);
    const blockButtonId = "row-log-button_"+index;
    const elementButton = document.getElementById(blockButtonId);
    if (elementText && elementButton) {
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
