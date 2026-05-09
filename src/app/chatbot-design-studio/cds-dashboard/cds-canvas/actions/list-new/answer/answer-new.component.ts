import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'cds-answer-new',
  templateUrl: './answer-new.component.html',
  styleUrls: ['./answer-new.component.scss']
})
export class CdsAnswerComponent implements OnInit {
  @Input() intentSelected: any;
  @Output() updateAnswerIntentSelected = new EventEmitter();
  
  public answer: string;

  constructor() { }

  ngOnInit(): void {
    this.answer = this.intentSelected.answer
  }

  onChangeText(_answer:string) { 
    this.updateAnswerIntentSelected.emit(_answer);
  }

}
