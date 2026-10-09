import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MatTooltip } from '@angular/material/tooltip';
import { ACTION_DRAG_MIME } from '../../../../utils';
import { ControllerService } from '../../../../services/controller.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

/** Quanto bisogna restare sulla riga perche' compaia il nome per intero. Piu' breve dell'attesa
 *  della descrizione: qui si risponde a "cosa c'e' scritto", non si apre un riquadro. */
const NAME_TOOLTIP_DELAY_MS = 400;

/** La classe della copia della riga che segue il puntatore durante il trascinamento. */
const DRAG_GHOST_CLASS = 'action-drag-ghost';
/** I valori di disegno che la riga eredita dal pannello e che la copia, attaccata al body, non
 *  avrebbe piu': si copiano sulla copia, cosi' resta uguale alla riga da cui nasce. */
const DRAG_GHOST_INHERITED_PROPS = [
  '--ds-surface', '--ds-border', '--ds-ink', '--ds-ink-2', '--ds-canvas',
  '--space-3', '--space-5', '--space-6', '--fs-md', '--size-icon-cell',
  '--border-radius-base-preview', '--gray-light-01', '--blu',
];

@Component({
  selector: 'cds-action-drag-list',
  templateUrl: './cds-action-drag-list.component.html',
  styleUrls: ['./cds-action-drag-list.component.scss']
})
export class CdsActionDragListComponent {
  NAME_TOOLTIP_DELAY_MS = NAME_TOOLTIP_DELAY_MS;

  @Input() items: Array<any> = [];
  @Output() isDragging = new EventEmitter<boolean>();
  @Output() hoverItem = new EventEmitter<{ element: HTMLElement; value: any }>();
  @Output() itemClick = new EventEmitter<any>();
  /** Il puntatore ha lasciato la *i*: chi ascolta decide quando chiudere la descrizione. */
  @Output() leaveItem = new EventEmitter<void>();

  private readonly logger: LoggerService = LoggerInstance.getInstance();

  constructor(private readonly controllerService: ControllerService) {}

  /**
   * Il puntatore entra in una riga: il nome per intero si mostra solo se la riga lo taglia.
   *
   * La misura si fa adesso e non una volta per tutte: la stessa riga taglia o non taglia a
   * seconda della lingua, del carattere caricato e della larghezza del pannello, che cambia.
   * `scrollWidth` e' quanto servirebbe al testo, `clientWidth` quanto gli e' stato dato.
   *
   * Si spegne il riquadro invece di non aprirlo: Material ha gia' il suo ascoltatore su questa
   * riga, e quale dei due arrivi prima non e' una cosa su cui valga la pena scommettere.
   *
   * Le voci che portano gia' una spiegazione loro -- un punto di partenza che e' gia' nel flusso
   * -- restano con quella: due riquadri sulla stessa riga si coprirebbero a vicenda.
   */
  onRowEnter(row: HTMLElement, tooltip: MatTooltip, item: any): void {
    const name = row.querySelector('.action-btn-text') as HTMLElement | null;
    const isTruncated = !!name && name.scrollWidth > name.clientWidth;
    tooltip.disabled = !isTruncated || !!item?.value?.tooltip;
    if (tooltip.disabled) { tooltip.hide(0); }
  }

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
    this.setDragGhost(event, event.currentTarget as HTMLElement);
    this.controllerService.closeActionDetailPanel();
    this.isDragging.emit(true);
  }

  /**
   * Da' al browser l'immagine che deve seguire il puntatore: una copia della riga, bianca e
   * con gli angoli dei blocchi del flusso.
   *
   * Lasciata a se', la foto che il browser scatta alla riga esce com'e' la riga in quel momento
   * -- ancora sotto il puntatore, col fondo grigio del passaggio -- e con gli spigoli vivi
   * dell'elenco, che una classe messa all'ultimo momento non riesce ad arrotondare. La copia
   * invece e' nostra: sta nel documento per il solo istante in cui il browser la disegna, al
   * posto esatto della riga cosi' da non comparire mai da un'altra parte, e sparisce al primo
   * giro successivo. E' attaccata al body, fuori dalla colonna di sinistra, perche' li' dentro
   * ci sono trasformazioni e ritagli che la taglierebbero; per questo i valori di disegno che
   * eredita dal pannello le vengono copiati addosso, insieme al carattere.
   */
  private setDragGhost(event: DragEvent, box: HTMLElement | null) {
    const row = box?.querySelector<HTMLElement>('.actions-btns-wpr');
    if (!row || typeof event.dataTransfer?.setDragImage !== 'function') { return; }
    const rect = row.getBoundingClientRect();
    const rowStyle = getComputedStyle(row);
    const ghost = row.cloneNode(true) as HTMLElement;
    ghost.removeAttribute('id');
    ghost.classList.add(DRAG_GHOST_CLASS);
    for (const prop of DRAG_GHOST_INHERITED_PROPS) {
      const value = rowStyle.getPropertyValue(prop);
      if (value) { ghost.style.setProperty(prop, value); }
    }
    ghost.style.fontFamily = rowStyle.fontFamily;
    ghost.style.position = 'fixed';
    ghost.style.top = `${rect.top}px`;
    ghost.style.left = `${rect.left}px`;
    ghost.style.width = `${rect.width}px`;
    ghost.style.margin = '0';
    ghost.style.pointerEvents = 'none';
    document.body.appendChild(ghost);
    // Il punto della riga sotto il puntatore resta lo stesso sulla copia: non salta sotto la mano.
    event.dataTransfer.setDragImage(ghost, event.clientX - rect.left, event.clientY - rect.top);
    setTimeout(() => ghost.remove(), 0);
  }
}
