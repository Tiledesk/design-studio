import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { EXTERNAL_URL } from 'src/app/chatbot-design-studio/utils';


@Component({
  selector: 'cds-changelog',
  templateUrl: './changelog.component.html',
  styleUrls: ['./changelog.component.scss']
})
export class ChangelogComponent implements OnInit {

  @Output() onClose = new EventEmitter();
  EXTERNAL_URL = EXTERNAL_URL;
  constructor() { }

  ngOnInit(): void {
  }

  onCloseClick(){
    this.onClose.emit()
  }

}
