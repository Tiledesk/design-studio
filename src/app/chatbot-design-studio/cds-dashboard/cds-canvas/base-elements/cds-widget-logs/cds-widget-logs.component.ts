import { Component, ElementRef, OnInit, Renderer2 } from '@angular/core';
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
  loading: boolean =  false;

  constructor(
    private readonly el: ElementRef, 
    private readonly renderer: Renderer2,
    private readonly logService: LogService
  ) {}

  ngOnInit(): void {
    // empty
    if(this.logService.logs){
      this.listOfLogs = this.logService.logs;

      this.logger.log('[CDS-WIDGET-LOG] - logger', this.listOfLogs);
    }
  }

  ngAfterViewInit() {
    //empty
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
    this.scrollTop = false;
    if (atBottom) {
      this.logger.log('[CDS-WIDGET-LOG] - Sei arrivato alla fine del div');
      this.loadLogs("next");
    }
    if (atTop && !this.scrollTop) {
      this.scrollTop = true;
      this.logger.log('[CDS-WIDGET-LOG] - Sei arrivato all\'inizio del div.');
      this.loadLogs("prev");
    }
}

onWheel(event: any) {
  const element = event.target;
  const atTop = element.scrollTop === 0;
  if (atTop && event.deltaY < 0 && this.scrollTop === null) {
    this.logger.log('[CDS-WIDGET-LOG] - Sei già all\'inizio del div e stai scrollando ulteriormente verso l\'alto.');
    this.scrollTop = true;
  }
}


  toggleLog() {
    this.isClosed = !this.isClosed;
  }

  loadLogs(dir: "prev"|"next"){
    let log: any;
    if(dir === "next"){
      log = this.listOfLogs[0];
    } else {
      log =  this.listOfLogs[this.listOfLogs.length - 1];
    }
    if(log){
      const timestamp = log.rows?.timestamp;
      this.logService.getOtherLogs(timestamp, dir).subscribe({ next: (resp)=> {
        if(dir === "prev"){
          this.listOfLogs = [...resp, ...this.listOfLogs];
        } else {
          this.listOfLogs = [...this.listOfLogs, ...resp];
        }
        this.logger.log("[CDS-WIDGET-LOG] ho caricato error: ", resp)
      }, error: (error)=> {
        this.logger.error("[CDS-WIDGET-LOG] initLogService error: ", error);
      }, complete: () => {
        this.logger.log("[CDS-WIDGET-LOG] initLogService completed.");
      }});
    }
  }
  
}
