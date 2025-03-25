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
  selectedLogLevel = LOG_LEVELS.DEBUG;

  // logMoc = [{"_id":"67d9a1410611804b01c80ba8","request_id":"support-group-67d958cf7fec42002d5950c8-c480ddba9788441eb24a195cbc4fa671","__v":0,"createdAt":"2025-03-18T16:37:21.822Z","rows":{"text":"Executing Action Reply  {\n  \"_tdActionType\": \"reply\",\n  \"text\": \"I didn't understand. Can you rephrase your question?\",\n  \"attributes\": {\n    \"commands\": [\n      {\n        \"type\": \"wait\",\n        \"time\": 500\n      },\n      {\n        \"type\": \"message\",\n        \"message\": {\n          \"type\": \"text\",\n          \"text\": \"I didn't understand. Can you rephrase your question?\"\n        }\n      }\n    ],\n    \"fillParams\": true\n  }\n}","level":"info","_id":"67d9a14199ecba3167ed67fd","timestamp":"2025-03-18T16:37:21.826Z"},"shortExp":"2025-03-18T16:37:35.010Z","updatedAt":"2025-03-18T16:37:35.010Z"},{"_id":"67d9a1410611804b01c80ba8","request_id":"support-group-67d958cf7fec42002d5950c8-c480ddba9788441eb24a195cbc4fa671","__v":0,"createdAt":"2025-03-18T16:37:21.822Z","rows":{"text":"Action Reply terminated","level":"info","_id":"67d9a14299ecba3167ed6804","timestamp":"2025-03-18T16:37:22.500Z"},"shortExp":"2025-03-18T16:37:35.010Z","updatedAt":"2025-03-18T16:37:35.010Z"},{"_id":"67d9a1410611804b01c80ba8","request_id":"support-group-67d958cf7fec42002d5950c8-c480ddba9788441eb24a195cbc4fa671","__v":0,"createdAt":"2025-03-18T16:37:21.822Z","rows":{"text":"Executing Action Reply  {\n  \"_tdActionType\": \"reply\",\n  \"text\": \"I didn't understand. Can you rephrase your question?\",\n  \"attributes\": {\n    \"commands\": [\n      {\n        \"type\": \"wait\",\n        \"time\": 500\n      },\n      {\n        \"type\": \"message\",\n        \"message\": {\n          \"type\": \"text\",\n          \"text\": \"I didn't understand. Can you rephrase your question?\"\n        }\n      }\n    ],\n    \"fillParams\": true\n  }\n}","level":"info","_id":"67d9a14699ecba3167ed6809","timestamp":"2025-03-18T16:37:26.789Z"},"shortExp":"2025-03-18T16:37:35.010Z","updatedAt":"2025-03-18T16:37:35.010Z"},{"_id":"67d9a1410611804b01c80ba8","request_id":"support-group-67d958cf7fec42002d5950c8-c480ddba9788441eb24a195cbc4fa671","__v":0,"createdAt":"2025-03-18T16:37:21.822Z","rows":{"text":"Action Reply terminated","level":"info","_id":"67d9a14799ecba3167ed6816","timestamp":"2025-03-18T16:37:27.380Z"},"shortExp":"2025-03-18T16:37:35.010Z","updatedAt":"2025-03-18T16:37:35.010Z"},{"_id":"67d9a1410611804b01c80ba8","request_id":"support-group-67d958cf7fec42002d5950c8-c480ddba9788441eb24a195cbc4fa671","__v":0,"createdAt":"2025-03-18T16:37:21.822Z","rows":{"text":"Executing Action Reply  {\n  \"_tdActionType\": \"reply\",\n  \"text\": \"I didn't understand. Can you rephrase your question?\",\n  \"attributes\": {\n    \"commands\": [\n      {\n        \"type\": \"wait\",\n        \"time\": 500\n      },\n      {\n        \"type\": \"message\",\n        \"message\": {\n          \"type\": \"text\",\n          \"text\": \"I didn't understand. Can you rephrase your question?\"\n        }\n      }\n    ],\n    \"fillParams\": true\n  }\n}","level":"info","_id":"67d9a14899ecba3167ed681e","timestamp":"2025-03-18T16:37:28.688Z"},"shortExp":"2025-03-18T16:37:35.010Z","updatedAt":"2025-03-18T16:37:35.010Z"},{"_id":"67d9a1410611804b01c80ba8","request_id":"support-group-67d958cf7fec42002d5950c8-c480ddba9788441eb24a195cbc4fa671","__v":0,"createdAt":"2025-03-18T16:37:21.822Z","rows":{"text":"Action Reply terminated","level":"info","_id":"67d9a14999ecba3167ed6831","timestamp":"2025-03-18T16:37:29.285Z"},"shortExp":"2025-03-18T16:37:35.010Z","updatedAt":"2025-03-18T16:37:35.010Z"},{"_id":"67d9a1410611804b01c80ba8","request_id":"support-group-67d958cf7fec42002d5950c8-c480ddba9788441eb24a195cbc4fa671","__v":0,"createdAt":"2025-03-18T16:37:21.822Z","rows":{"text":"Executing Action Reply  {\n  \"_tdActionType\": \"reply\",\n  \"text\": \"I didn't understand. Can you rephrase your question?\",\n  \"attributes\": {\n    \"commands\": [\n      {\n        \"type\": \"wait\",\n        \"time\": 500\n      },\n      {\n        \"type\": \"message\",\n        \"message\": {\n          \"type\": \"text\",\n          \"text\": \"I didn't understand. Can you rephrase your question?\"\n        }\n      }\n    ],\n    \"fillParams\": true\n  }\n}","level":"info","_id":"67d9a14a99ecba3167ed683c","timestamp":"2025-03-18T16:37:30.254Z"},"shortExp":"2025-03-18T16:37:35.010Z","updatedAt":"2025-03-18T16:37:35.010Z"},{"_id":"67d9a1410611804b01c80ba8","request_id":"support-group-67d958cf7fec42002d5950c8-c480ddba9788441eb24a195cbc4fa671","__v":0,"createdAt":"2025-03-18T16:37:21.822Z","rows":{"text":"Action Reply terminated","level":"info","_id":"67d9a14a99ecba3167ed6855","timestamp":"2025-03-18T16:37:30.841Z"},"shortExp":"2025-03-18T16:37:35.010Z","updatedAt":"2025-03-18T16:37:35.010Z"},{"_id":"67d9a1410611804b01c80ba8","request_id":"support-group-67d958cf7fec42002d5950c8-c480ddba9788441eb24a195cbc4fa671","__v":0,"createdAt":"2025-03-18T16:37:21.822Z","rows":{"text":"Executing Action Reply  {\n  \"_tdActionType\": \"reply\",\n  \"text\": \"I didn't understand. Can you rephrase your question?\",\n  \"attributes\": {\n    \"commands\": [\n      {\n        \"type\": \"wait\",\n        \"time\": 500\n      },\n      {\n        \"type\": \"message\",\n        \"message\": {\n          \"type\": \"text\",\n          \"text\": \"I didn't understand. Can you rephrase your question?\"\n        }\n      }\n    ],\n    \"fillParams\": true\n  }\n}","level":"info","_id":"67d9a14d99ecba3167ed6863","timestamp":"2025-03-18T16:37:33.805Z"},"shortExp":"2025-03-18T16:37:35.010Z","updatedAt":"2025-03-18T16:37:35.010Z"},{"_id":"67d9a1410611804b01c80ba8","request_id":"support-group-67d958cf7fec42002d5950c8-c480ddba9788441eb24a195cbc4fa671","__v":0,"createdAt":"2025-03-18T16:37:21.822Z","rows":{"text":"Executing Action Reply  {\n  \"_tdActionType\": \"reply\",\n  \"text\": \"I didn't understand. Can you rephrase your question?\",\n  \"attributes\": {\n    \"commands\": [\n      {\n        \"type\": \"wait\",\n        \"time\": 500\n      },\n      {\n        \"type\": \"message\",\n        \"message\": {\n          \"type\": \"text\",\n          \"text\": \"I didn't understand. Can you rephrase your question?\"\n        }\n      }\n    ],\n    \"fillParams\": true\n  }\n}","level":"info","_id":"67d9a14e99ecba3167ed6882","timestamp":"2025-03-18T16:37:34.418Z"},"shortExp":"2025-03-18T16:37:35.010Z","updatedAt":"2025-03-18T16:37:35.010Z"},{"_id":"67d9a1410611804b01c80ba8","request_id":"support-group-67d958cf7fec42002d5950c8-c480ddba9788441eb24a195cbc4fa671","__v":0,"createdAt":"2025-03-18T16:37:21.822Z","rows":{"text":"Action Reply terminated","level":"info","_id":"67d9a14e99ecba3167ed6886","timestamp":"2025-03-18T16:37:34.420Z"},"shortExp":"2025-03-18T16:37:35.010Z","updatedAt":"2025-03-18T16:37:35.010Z"},{"_id":"67d9a1410611804b01c80ba8","request_id":"support-group-67d958cf7fec42002d5950c8-c480ddba9788441eb24a195cbc4fa671","__v":0,"createdAt":"2025-03-18T16:37:21.822Z","rows":{"text":"Action Reply terminated","level":"info","_id":"67d9a14f99ecba3167ed68b8","timestamp":"2025-03-18T16:37:35.011Z"},"shortExp":"2025-03-18T16:37:35.010Z","updatedAt":"2025-03-18T16:37:35.010Z"}]

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
      this.listOfLogs = resp; // //this.logMoc;//
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
          this.scrollTop = false;
          this.scrollBottom = false;
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


  // onScroll(event: any) {
  //   const element = event.target;
  //   const atBottom = element.scrollHeight - element.scrollTop === element.clientHeight;
  //   const atTop = element.scrollTop === 0;
  //   if (atBottom && !this.scrollBottom) {
  //     this.logger.log('[CDS-WIDGET-LOG] - Sei arrivato alla fine del div');
  //     this.scrollBottom = true;
  //     this.loadLogs("next");
  //   } 
  //   if (atTop && !this.scrollTop) {
  //     this.scrollTop = true;
  //     this.logger.log('[CDS-WIDGET-LOG] - Sei arrivato all\'inizio del div.');
  //     this.loadLogs("prev");
  //   } 
  //   else if(!atTop && !atBottom){
  //     this.scrollTop = false;
  //     this.scrollBottom = false;
  //   }
  // }

  onWheel(event: any) {
    // //this.logger.log('[CDS-WIDGET-LOG] onWheel');
    const element = event.target;
    if (event.deltaY < 0) {
      this.logger.log('[CDS-WIDGET-LOG] Scroll verso l alto');
      const atTop = element.scrollTop === 0;
      this.scrollBottom = false;
      if (atTop && !this.scrollTop) {
          this.scrollTop = true;
          this.loadLogs("prev");
          this.logger.log('[CDS-WIDGET-LOG] Sei già all\'inizio del div e stai scrollando ulteriormente verso l\'alto.');
      }
    } else if (event.deltaY > 0) {
      this.logger.log('[CDS-WIDGET-LOG] Scroll verso il basso');
      const atBottom = element.scrollHeight - element.scrollTop === element.clientHeight;
      this.scrollTop = false;
      this.logger.log('[CDS-WIDGET-LOG] Scroll verso il basso', element.scrollHeight,  element.scrollTop, element.clientHeight, atBottom);
      if (atBottom && !this.scrollBottom) {
        this.scrollBottom = true;
        this.loadLogs("next");
        this.logger.log('[CDS-WIDGET-LOG] Sei già alla fine del div e stai scrollando ulteriormente verso il basso.');
      }
    }
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
