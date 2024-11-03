import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'cds-panel-intent-detail',
  templateUrl: './cds-panel-intent-detail.component.html',
  styleUrls: ['./cds-panel-intent-detail.component.scss']
})
export class CdsPanelIntentDetailComponent implements OnInit {
  @Input() elementIntentSelected: any;
  @Input() showSpinner: boolean;
  @Output() savePanelIntentDetail = new EventEmitter();
  @Output() closePanel = new EventEmitter();
  

  maximize: boolean = false;
  agents_available: boolean = false;

  constructor() { }

  ngOnInit(): void {
  }


  onAgentsAvailableChange(event: any){

  }
}
