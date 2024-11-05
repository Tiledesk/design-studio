import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'cds-preload-bar',
  templateUrl: './preload-bar.component.html',
  styleUrls: ['./preload-bar.component.scss']
})
export class PreloadBarComponent implements OnInit {

  @Input() progress: number = 0;
  
  constructor() { }

  ngOnInit(): void {
  }

}
