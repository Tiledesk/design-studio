import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CdkDragStart, CdkDragEnd, CdkDragMove } from '@angular/cdk/drag-drop';
import { ControllerService } from '../../../../services/controller.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Component({
  selector: 'cds-action-drag-list',
  templateUrl: './cds-action-drag-list.component.html',
  styleUrls: ['./cds-action-drag-list.component.scss']
})
export class CdsActionDragListComponent {
  @Input() items: Array<any> = [];
  @Output() isDragging = new EventEmitter<boolean>();
  @Output() hideActionPlaceholder = new EventEmitter<boolean>();
  @Output() hoverItem = new EventEmitter<{ element: HTMLElement; value: any }>();

  dragging = false;
  indexDrag: number;

  private readonly logger: LoggerService = LoggerInstance.getInstance();

  constructor(private readonly controllerService: ControllerService) {}

  /** Connector action icons are absolute URLs (the connector's icon) and must be
   *  rendered with <img>; native action icons are MatIconRegistry names rendered
   *  with <mat-icon [svgIcon]>. */
  isUrlIcon(src: any): boolean {
    return typeof src === 'string' && /^https?:\/\//i.test(src);
  }

  onHover(element: HTMLElement, value: any) {
    this.hoverItem.emit({ element, value });
  }

  onDragStarted(event: CdkDragStart, currentIndex: number) {
    this.controllerService.closeActionDetailPanel();
    this.dragging = true;
    this.indexDrag = currentIndex;
    this.isDragging.emit(true);

    // Bug fix (preserved): keep the drag placeholder full-width during drag.
    const actionDragPlaceholder = <HTMLElement>document.querySelector('.action-drag-placeholder');
    const addActionPlaceholderEl = <HTMLElement>document.querySelector('.add--action-placeholder');
    const myObserver = new ResizeObserver(entries => {
      entries.forEach(entry => {
        const width = entry.contentRect.width;
        if (width === 258) {
          this.hideActionPlaceholder.emit(false);
          if (actionDragPlaceholder) { actionDragPlaceholder.style.opacity = '1'; }
          if (addActionPlaceholderEl) { addActionPlaceholderEl.style.opacity = '0'; }
        } else {
          this.hideActionPlaceholder.emit(true);
          if (actionDragPlaceholder) { actionDragPlaceholder.style.opacity = '0'; }
          if (addActionPlaceholderEl) { addActionPlaceholderEl.style.opacity = '1'; }
        }
      });
    });
    if (actionDragPlaceholder) { myObserver.observe(actionDragPlaceholder); }
  }

  onDragMoved(event: CdkDragMove) {}

  onDragEnd(event: CdkDragEnd) {
    this.dragging = false;
    this.indexDrag = null;
    this.isDragging.emit(false);
  }
}
