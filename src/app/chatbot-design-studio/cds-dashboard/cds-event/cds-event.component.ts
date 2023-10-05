import { Component, Input, OnInit } from '@angular/core';
import { Intent } from 'src/app/models/intent-model';

@Component({
  selector: 'cds-event',
  templateUrl: './cds-event.component.html',
  styleUrls: ['./cds-event.component.scss']
})
export class CdsEventComponent implements OnInit {

  @Input() intent: Intent;
  
  constructor() { }

  ngOnInit(): void {
  }

}
