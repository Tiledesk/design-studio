import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ACTION_DRAG_MIME } from '../../../../utils';
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
  @Output() hoverItem = new EventEmitter<{ element: HTMLElement; value: any }>();
  @Output() itemClick = new EventEmitter<any>();
  /** Il puntatore ha lasciato la *i*: chi ascolta decide quando chiudere la descrizione. */
  @Output() leaveItem = new EventEmitter<void>();

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

  /**
   * Comincia il trascinamento di una voce verso il flusso.
   *
   * Nel pacchetto viaggia solo il tipo: e' quanto basta al flusso per creare il blocco, e tenerlo
   * a una stringa evita di far passare oggetti vivi attraverso un meccanismo del browser.
   * L'etichetta del contenuto e' quella che il flusso riconosce: senza, un file trascinato dal
   * desktop e una voce di qui sarebbero la stessa cosa.
   */
  onDragStart(event: DragEvent, item: any) {
    if (!event.dataTransfer || item?.value?.disabled) { return; }
    // Non il solo tipo: una voce puo' essere un punto di partenza, oppure un'azione portata da un
    // connettore installato, e il flusso ha bisogno di saperlo per creare la cosa giusta. Viaggia
    // come testo perche' e' l'unica forma che il meccanismo del browser sa trasportare.
    event.dataTransfer.setData(ACTION_DRAG_MIME, JSON.stringify({
      type: item.value.type,
      start_point: item.value.start_point,
      connectorEntry: item.value.connectorEntry
    }));
    event.dataTransfer.effectAllowed = 'copy';
    this.controllerService.closeActionDetailPanel();
    this.isDragging.emit(true);
  }
}
