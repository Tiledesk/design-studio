import { Component, ElementRef, OnInit, Renderer2 } from '@angular/core';
import { LOG_LEVELS } from 'src/app/chatbot-design-studio/utils';
import { LogService } from 'src/app/services/log.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';


@Component({
  selector: 'cds-widget-logs',
  templateUrl: './cds-widget-logs.component.html',
  styleUrls: ['./cds-widget-logs.component.scss']
})


export class CdsWidgetLogsComponent implements OnInit {
  listOfLogs: Array<any>;
  private startY: number;
  private startHeight: number;
  private mouseMoveListener: () => void;
  private mouseUpListener: () => void;
  private readonly logger: LoggerService = LoggerInstance.getInstance();
  isClosed = false;
  logContainer: any;
  scrollTop: boolean = null;
  scrollBottom: boolean = null;
  loadingPrev: boolean =  true;
  loadingNext: boolean =  false;
  LOG_LEVELS = LOG_LEVELS;
  selectedLogLevel = LOG_LEVELS.DEFAULT;

  constructor(
    private readonly el: ElementRef, 
    private readonly renderer: Renderer2,
    private readonly logService: LogService
  ) {}

  ngOnInit(): void {
    if(this.logService.logs){
      this.listOfLogs = this.logService.logs;
      this.logger.log('[CDS-WIDGET-LOG] - logger', this.listOfLogs);
    }
  }

  ngAfterViewInit() {
    this.getLastLogs();
  }

  getLastLogs(){
    this.listOfLogs = [];
    this.logService.getLastLogs(this.selectedLogLevel).subscribe({ next: (resp)=> {
      this.logService.initLogService(resp);
      this.loadingPrev = false;
      this.listOfLogs = resp;
    }, error: (error)=> {
      setTimeout(() => {
        this.loadingPrev = false;
        this.loadingNext = false;
      }, 1000);
      this.logger.error("[LOG-SERV] initLogService error: ", error);
    }, complete: () => {
      setTimeout(() => {
        this.loadingPrev = false;
        this.loadingNext = false;
      }, 1000);
      this.logger.log("[LOG-SERV] initLogService completed.");
    }})
  }

  loadLogs(dir: "prev"|"next"){
    let log: any;
    if(dir === "prev"){
      log = this.listOfLogs[0];
      this.loadingPrev = true;
    } else {
      log =  this.listOfLogs[this.listOfLogs.length - 1];
      this.loadingNext = true;
    }
    if(log){
      const timestamp = log.rows?.timestamp;
      this.logService.getOtherLogs(timestamp, dir, this.selectedLogLevel).subscribe({ next: (resp)=> {
        if(dir === "prev"){
          this.listOfLogs = [...resp, ...this.listOfLogs];
        } else {
          this.listOfLogs = [...this.listOfLogs, ...resp];
        }
        this.logger.log("[CDS-WIDGET-LOG] ho caricato error: ", resp);
      }, error: (error)=> {
        setTimeout(() => {
          this.loadingPrev = false;
          this.loadingNext = false;
        }, 1000);
        this.logger.error("[CDS-WIDGET-LOG] initLogService error: ", error);
      }, complete: () => {
        setTimeout(() => {
          this.loadingPrev = false;
          this.loadingNext = false;
        }, 1000);
        this.logger.log("[CDS-WIDGET-LOG] initLogService completed.");
      }});
    } else {
      this.getLastLogs();
    }
  }


  onLogLevelChange(event: any) {
    this.selectedLogLevel = event.target.value;
    this.loadingPrev = true;
    this.getLastLogs();
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


  onScroll(event: any) {
    const element = event.target;
    const atBottom = element.scrollHeight - element.scrollTop === element.clientHeight;
    const atTop = element.scrollTop === 0;
    if (atBottom && !this.scrollBottom) {
      this.logger.log('[CDS-WIDGET-LOG] - Sei arrivato alla fine del div');
      this.scrollBottom = true;
      this.loadLogs("next");
    } 
    if (atTop && !this.scrollTop) {
      this.scrollTop = true;
      this.logger.log('[CDS-WIDGET-LOG] - Sei arrivato all\'inizio del div.');
      this.loadLogs("prev");
    } 
    else if(!atTop && !atBottom){
      this.scrollTop = false;
      this.scrollBottom = false;
    }
  }

  onWheel(event: any) {
    const element = event.target;
    const atTop = element.scrollTop === 0;
    if (atTop && event.deltaY < 0 && this.scrollTop === null) {
      this.scrollTop = true;
      this.logger.log('[CDS-WIDGET-LOG] - Sei già all\'inizio del div e stai scrollando ulteriormente verso l\'alto.');
      this.loadLogs("prev");
    }
  }

  toggleLog() {
    this.isClosed = !this.isClosed;
  }


}
