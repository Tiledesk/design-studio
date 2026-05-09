import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'cds-reply-controls-new',
  templateUrl: './cds-reply-controls-new.component.html',
  styleUrls: ['./cds-reply-controls-new.component.scss']
})
export class CdsReplyControlsNewComponent {

  @Input() index: number;
  @Input() isFirst: boolean = false;
  @Input() isLast: boolean = false;

  @Output() deleteReply = new EventEmitter<void>();
  @Output() moveToTop = new EventEmitter<void>();
  @Output() moveUp = new EventEmitter<void>();
  @Output() moveDown = new EventEmitter<void>();
  @Output() moveToBottom = new EventEmitter<void>();

}
