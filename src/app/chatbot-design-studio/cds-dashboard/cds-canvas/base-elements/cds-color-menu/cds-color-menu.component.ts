import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'cds-color-menu',
  templateUrl: './cds-color-menu.component.html',
  styleUrls: ['./cds-color-menu.component.scss']
})
export class CdsColorMenuComponent implements OnInit {
  @Input() positions: any;
  @Output() hideColortMenu = new EventEmitter(); 

  constructor() { }

  ngOnInit(): void {
  }

}
