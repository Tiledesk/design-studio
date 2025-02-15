import { Component, ElementRef, OnInit, Renderer2 } from '@angular/core';
import { LogService } from 'src/app/services/log.service';

@Component({
  selector: 'cds-widget-logs',
  templateUrl: './cds-widget-logs.component.html',
  styleUrls: ['./cds-widget-logs.component.scss']
})
export class CdsWidgetLogsComponent implements OnInit {

  logs: string;
  private startY: number;
  private startHeight: number;
  private mouseMoveListener: () => void;
  private mouseUpListener: () => void;

  constructor(
    private readonly el: ElementRef, 
    private readonly renderer: Renderer2,
    private readonly logService: LogService
  ) {}

  ngOnInit(): void {
    // empty
  }

  ngAfterViewInit() {
    this.logs = this.logService.logs;
    
  }


  initResize(event: MouseEvent) {
    this.startY = event.clientY;
    const logContainer = this.el.nativeElement.querySelector('#tds_widget_log');
    this.startHeight = logContainer.offsetHeight;
    this.mouseMoveListener = this.renderer.listen('document', 'mousemove', this.resize.bind(this));
    this.mouseUpListener = this.renderer.listen('document', 'mouseup', this.stopResize.bind(this));
  }

  resize(event: MouseEvent) {
    const logContainer = this.el.nativeElement.querySelector('#tds_widget_log');
    const newHeight = this.startHeight - (event.clientY - this.startY);
    if (newHeight >= 200 && newHeight <= 500) { // Imposta i limiti di altezza
      this.renderer.setStyle(logContainer, 'height', `${newHeight}px`);
    }
  }

  stopResize() {
    if (this.mouseMoveListener) this.mouseMoveListener();
    if (this.mouseUpListener) this.mouseUpListener();
  }

}
