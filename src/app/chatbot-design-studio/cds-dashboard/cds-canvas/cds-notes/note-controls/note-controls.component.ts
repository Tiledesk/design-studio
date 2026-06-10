import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'cds-note-controls',
  templateUrl: './note-controls.component.html',
  styleUrls: ['./note-controls.component.scss']
})
export class NoteControlsComponent {
  /**
   * Show/hide is controlled by the parent (`cds-notes`) to keep this component fully dumb.
   */
  @Input() visible: boolean = false;
  /**
   * When true (media notes), we hide actions that must not be available (e.g. duplicate).
   */
  @Input() isMedia: boolean = false;

  @Output() openDetail = new EventEmitter<void>();
  @Output() duplicate = new EventEmitter<void>();
  @Output() remove = new EventEmitter<void>();

  onOpenDetail(event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    this.openDetail.emit();
  }

  onDuplicate(event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    this.duplicate.emit();
  }

  onRemove(event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    this.remove.emit();
  }
}


