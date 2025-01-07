import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { IntentService } from 'src/app/chatbot-design-studio/services/intent.service';
import { Intent } from 'src/app/models/intent-model';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Component({
  selector: 'cds-panel-intent-detail',
  templateUrl: './cds-panel-intent-detail.component.html',
  styleUrls: ['./cds-panel-intent-detail.component.scss']
})
export class CdsPanelIntentDetailComponent implements OnInit {
  @Input() intentSelected: Intent;
  @Output() savePanelIntentDetail = new EventEmitter();
  @Output() closePanel = new EventEmitter();
  
  maximize: boolean = false;
  // agents_available: boolean = false;

  private logger: LoggerService = LoggerInstance.getInstance();
  constructor(
  ) { 
  }

  ngOnInit(): void {
    // this.agents_available = this.intentSelected.agents_available?this.intentSelected.agents_available:true;
    if(this.intentSelected.agents_available != false) this.intentSelected.agents_available = true;
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.logger.log('[CdsPanelIntentDetailComponent] changes: ', changes)
  }

  onAgentsAvailableChange(event: any){
    this.logger.log('[CdsPanelIntentDetailComponent] onAgentsAvailableChange:: ', event);
    this.intentSelected.agents_available = event;
    this.onSaveIntent();
  }

  private onSaveIntent(){
    this.logger.log('[CdsPanelIntentDetailComponent] onSaveIntent:: ', this.intentSelected);
    this.savePanelIntentDetail.emit(this.intentSelected);
  }
  
}
