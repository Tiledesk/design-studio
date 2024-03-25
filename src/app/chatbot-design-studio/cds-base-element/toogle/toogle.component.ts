import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'cds-toogle',
  templateUrl: './toogle.component.html',
  styleUrls: ['./toogle.component.scss']
})
export class CDSToogleComponent implements OnInit {

  @Input() checked: boolean;
  @Input() disabled: boolean;
  @Input() color: string;
  @Output() onChangeToggle = new EventEmitter<any>();
  
  constructor() { }

  ngOnInit(): void {
  }

  onChangeToogle(event){
    this.checked = event.checked
    this.onChangeToggle.emit(event.checked)
  }

}
