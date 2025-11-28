import { Component, OnInit, Input, ViewChild, ElementRef, AfterViewInit, HostListener, OnDestroy } from '@angular/core';
import { Note } from 'src/app/models/note-model';
import { StageService } from '../../../services/stage.service';

@Component({
  selector: 'cds-notes',
  templateUrl: './cds-notes.component.html',
  styleUrls: ['./cds-notes.component.scss']
})
export class CdsNotesComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() note: Note;
  @ViewChild('noteInput', { static: false }) noteInput: ElementRef<HTMLTextAreaElement>;
  @ViewChild('noteContentElement', { static: false }) contentElement: ElementRef<HTMLDivElement>;
  @ViewChild('noteResize', { static: false }) noteResize: ElementRef<HTMLDivElement>;


  // selected = false;
  text_disabled: boolean = false;
  textareaHasFocus = false;
  dragged = false;  

  stateNote: 0|1|2|3 = 0; // 0: normal, 1: text focus, 2: resizing, 3: dropping
  
  // Getter per determinare se il drag è abilitato
  get isDraggable(): boolean {
    return this.stateNote !== 1 && !this.textareaHasFocus;
  }
  
  // Funzione per cambiare lo stato della nota
  changeState(state: 0|1|2): void {
    this.stateNote = state;
    console.log('[CDS-NOTES] State changed to:', state);
  }
  
  // Variabili per il ridimensionamento
  private isResizing = false;
  private resizeHandle: string = '';
  private startX = 0;
  private startY = 0;
  private startWidth = 0;
  private startHeight = 0;
  private startNoteX = 0;
  private startNoteY = 0;
  private justFinishedResizing = false;
  private draggedListener: EventListener | null = null;
  private draggingListener: EventListener | null = null;
  
  constructor(private stageService: StageService) { }

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    // Imposta le dimensioni iniziali del blocco basandosi su note.width e note.height
    if (this.contentElement && this.note) {
      const width = this.note.width || 220;
      const height = this.note.height || 50;
      this.contentElement.nativeElement.style.width = width + 'px';
      this.contentElement.nativeElement.style.height = height + 'px';
      // Aggiungi listener per gli eventi di drag
      this.setupDragEndListener();
      this.setupDraggingListener();
      // Inizializza il drag dopo che la vista è stata inizializzata
      this.updateDragState();
    }
  }
  
  private setupDraggingListener(): void {
    // Listener per l'evento "dragged" che intercetta il dragging
    this.draggingListener = ((e: CustomEvent) => {
      const el = e.detail.element;
      // Verifica che l'elemento sia questa nota
      if (el && el.id === this.note?.note_id) {
        this.dragged = true;
        console.log('DRAGGING');
      }
    }) as EventListener;
    document.addEventListener("dragged", this.draggingListener, false);
  }
  
  private setupDragEndListener(): void {
    // Listener per l'evento "end-dragging" che intercetta la fine del drag
    this.draggedListener = ((e: CustomEvent) => {
      const el = e.detail.element;
      // Verifica che l'elemento sia questa nota
      if (el && el.id === this.note?.note_id) {
        console.log('[CDS-NOTES] end-dragging - Note ID:', this.note.note_id);
        console.log('[CDS-NOTES] end-dragging - Element:', el);
        
        // Ricalcola e sincronizza le dimensioni e le posizioni dopo il drag
        this.recalculateNoteDimensionsAndPosition(el);
      }
    }) as EventListener;
    document.addEventListener("end-dragging", this.draggedListener, false);
  }
  
  /**
   * Ricalcola le dimensioni e le posizioni della nota basandosi sulle posizioni CSS finali
   * Questo è importante per le operazioni di resize successive
   */
  private recalculateNoteDimensionsAndPosition(element: HTMLElement): void {
    if (!this.note || !this.contentElement) return;
    
    // Leggi le posizioni CSS finali dopo il drag
    const computedStyle = window.getComputedStyle(element);
    const left = parseFloat(computedStyle.left) || parseFloat(element.style.left) || element.offsetLeft || 0;
    const top = parseFloat(computedStyle.top) || parseFloat(element.style.top) || element.offsetTop || 0;
    
    // Leggi le dimensioni CSS finali
    const width = parseFloat(computedStyle.width) || parseFloat(element.style.width) || element.offsetWidth || this.note.width || 220;
    const height = parseFloat(computedStyle.height) || parseFloat(element.style.height) || element.offsetHeight || this.note.height || 50;
    
    // Aggiorna il modello della nota con le posizioni e dimensioni correnti
    this.note.x = left;
    this.note.y = top;
    this.note.width = width;
    this.note.height = height;
    
    console.log('[CDS-NOTES] Recalculated note dimensions and position:', {
      x: this.note.x,
      y: this.note.y,
      width: this.note.width,
      height: this.note.height
    });
  }
  
  ngOnDestroy(): void {
    // Rimuovi i listener quando il componente viene distrutto
    if (this.draggingListener) {
      document.removeEventListener("dragged", this.draggingListener, false);
    }
    if (this.draggedListener) {
      document.removeEventListener("end-dragging", this.draggedListener, false);
    }
  }

  onInputChange(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    if (this.note) {
      this.note.text = textarea.value;
    }
  }

  onFocusTextarea(event: FocusEvent): void {
    this.textareaHasFocus = true;
    // Cambia lo stato a 1 quando la textarea prende il focus
    this.changeState(1);
    // Disabilita il drag quando la textarea ha il focus
    this.updateDragState();
  }

  onBlurTextarea(event: FocusEvent): void {
    this.text_disabled = true;
    this.textareaHasFocus = false;
    console.log('onBlurTextarea', event);
    this.stateNote = 0;
    // Riabilita il drag quando la textarea perde il focus (se non è selezionata)
    this.updateDragState();
  }

  onNoteResizeMouseDown(event: MouseEvent): void {
    // Se il drag è abilitato, permettere all'evento di propagarsi al contenitore principale
    // per permettere al sistema di drag di funzionare
    if (this.isDraggable) {
      // Non chiamare preventDefault o stopPropagation per permettere al drag di funzionare
      // L'evento verrà gestito dal sistema di drag sul contenitore principale
      return;
    }
    // Se il drag non è abilitato, prevenire il comportamento di default
    event.preventDefault();
  }

  onSingleClick(event: MouseEvent): void {
    // Se si è fatto drag, non gestire il click
    if (this.dragged) {
      this.dragged = false;
      return;
    }
    event.stopPropagation();
    console.log('onSingleClick');
    this.noteInput.nativeElement.blur();
    this.textareaHasFocus = false;
    // Al singolo click visualizza le maniglie
    this.stateNote = 1;
    // Disabilita il drag quando le maniglie sono visibili
    this.updateDragState();
  }

  onDoubleClick(event: MouseEvent): void {
    // Previeni la propagazione dell'evento per evitare conflitti
    event.stopPropagation();
    console.log('onDoubleClick');
    // Al doppio click nascondo il div note-resize e metto il focus sulla textarea
    this.text_disabled = false;
    this.stateNote = 1;
    this.textareaHasFocus = false;
    setTimeout(() => {
        this.noteInput.nativeElement.focus();
        // Il focus imposterà textareaHasFocus = true tramite onFocusTextarea
      }, 100);
  }



  // mouse DOWN = start resize!!
  startResize(event: MouseEvent, handle: string): void {
    console.log('-----> startResize', event, handle);
    event.stopPropagation();
    event.preventDefault();
    if (!this.contentElement || !this.note) return;
    this.isResizing = true;
    this.resizeHandle = handle;
    const rect = this.contentElement.nativeElement.getBoundingClientRect();
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.startWidth = this.note.width || 220;
    this.startHeight = this.note.height || 50;
    this.startNoteX = this.note.x || 0;
    this.startNoteY = this.note.y || 0;
    this.changeState(2);
  }


  // mouse MOVE = resize!!
  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.isResizing || !this.contentElement || !this.note) return;
    const deltaX = event.clientX - this.startX;
    const deltaY = event.clientY - this.startY;
    const minWidth = 50;
    const minHeight = 50;
    let newWidth = this.startWidth;
    let newHeight = this.startHeight;
    let newNoteX = this.startNoteX;
    let newNoteY = this.startNoteY;
    switch (this.resizeHandle) {
      case 'br': // Bottom-right: top-left fisso (posizione x,y invariata)
        {
          // La nuova larghezza è determinata da deltaX
          newWidth = Math.max(minWidth, this.startWidth + deltaX);
          // La nuova altezza è determinata da deltaY
          newHeight = Math.max(minHeight, this.startHeight + deltaY);
          // Posizione invariata
          newNoteX = this.startNoteX;
          newNoteY = this.startNoteY;
        }
        break;
        
      case 'tr': // Top-right: bottom-left fisso (bl rimane invariato)
        {
          // La nuova larghezza è determinata da deltaX
          newWidth = Math.max(minWidth, this.startWidth + deltaX);
          // La nuova altezza è determinata da deltaY (negativo perché si muove verso l'alto)
          newHeight = Math.max(minHeight, this.startHeight - deltaY);
          // Per mantenere bl fisso:
          // - bl.x = note.x (rimane uguale perché bl è all'angolo sinistro)
          // - bl.y = note.y + note.height (deve rimanere uguale)
          // Quindi: newY = startY - (newHeight - startHeight)
          newNoteX = this.startNoteX; // x rimane uguale
          newNoteY = this.startNoteY - (newHeight - this.startHeight); // y si sposta per mantenere bl.y fisso
        }
        break;
        
      case 'bl': // Bottom-left: top-right fisso (tr rimane invariato)
        {
          // La nuova larghezza è determinata da deltaX (negativo perché si muove verso sinistra)
          newWidth = Math.max(minWidth, this.startWidth - deltaX);
          // La nuova altezza è determinata da deltaY
          newHeight = Math.max(minHeight, this.startHeight + deltaY);
          // Per mantenere tr fisso:
          // - tr.x = note.x + note.width (deve rimanere uguale)
          // - tr.y = note.y (deve rimanere uguale)
          // Quindi: newX = startX - (newWidth - startWidth)
          newNoteX = this.startNoteX - (newWidth - this.startWidth); // x si sposta per mantenere tr.x fisso
          newNoteY = this.startNoteY; // y rimane uguale
        }
        break;
        
      case 'tl': // Top-left: bottom-right fisso (br rimane invariato)
        {
          // La nuova larghezza è determinata da deltaX (negativo perché si muove verso sinistra)
          newWidth = Math.max(minWidth, this.startWidth - deltaX);
          // La nuova altezza è determinata da deltaY (negativo perché si muove verso l'alto)
          newHeight = Math.max(minHeight, this.startHeight - deltaY);
          // Per mantenere br fisso:
          // - br.x = note.x + note.width (deve rimanere uguale)
          // - br.y = note.y + note.height (deve rimanere uguale)
          // Quindi: newX = startX - (newWidth - startWidth)
          //         newY = startY - (newHeight - startHeight)
          newNoteX = this.startNoteX - (newWidth - this.startWidth); // x si sposta per mantenere br.x fisso
          newNoteY = this.startNoteY - (newHeight - this.startHeight); // y si sposta per mantenere br.y fisso
        }
        break;
    }
    
    // Aggiorna le dimensioni e la posizione della nota
    this.note.width = newWidth;
    this.note.height = newHeight;
    this.note.x = newNoteX;
    this.note.y = newNoteY;
    
    // Applica le nuove dimensioni al contentElement
    this.contentElement.nativeElement.style.width = newWidth + 'px';
    this.contentElement.nativeElement.style.height = newHeight + 'px';
    
    // Aggiorna le dimensioni della textarea (sottrai padding: 10px top/bottom, 8px left/right)
    if (this.noteInput) {
      this.noteInput.nativeElement.style.width = (newWidth - 16) + 'px';
      this.noteInput.nativeElement.style.height = (newHeight - 20) + 'px';
    }
  }

  // mouse UP = end resize!!
  @HostListener('document:mouseup', ['$event'])
  onMouseUp(event: MouseEvent): void {
    if (this.isResizing) {
      this.isResizing = false;
      this.resizeHandle = '';
      // Mantieni la nota selezionata dopo il ridimensionamento
      this.stateNote = 0;
      // Imposta un flag per prevenire la deselezione immediata
      this.justFinishedResizing = true;
      // Reset del flag dopo un breve delay per permettere all'evento click di essere ignorato
      setTimeout(() => {
        this.justFinishedResizing = false;
      }, 100);
    }
  }

  // mouse CLICK = end select!!
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    // Non deselezionare se si sta facendo il ridimensionamento o si è appena finito
    if (this.isResizing || this.justFinishedResizing) {
      return;
    }
    
    // Se la nota è selezionata e si clicca fuori dal componente, deseleziona
    if (this.stateNote === 1 && this.contentElement) {
      const target = event.target as HTMLElement;
      const clickedInside = this.contentElement.nativeElement.contains(target);
      
      // Non deselezionare se si clicca su una maniglia
      const clickedOnHandle = target.classList.contains('resize-handle');
      
      if (!clickedInside && !clickedOnHandle) {
        this.stateNote = 0;
        this.textareaHasFocus = false;
        // Ri-inizializza il drag quando la selezione cambia (per riattivare il drag quando selected = false e textarea non ha focus)
        this.updateDragState();
      }
    }
  }
  
  private updateDragState(): void {
    // Ri-inizializza il drag quando lo stato cambia
    if (this.note?.note_id) {
      setTimeout(() => {
        // Abilita il drag solo se: !selected && !textareaHasFocus
        if (this.isDraggable) {
          // Inizializza il drag sull'elemento principale (contenitore)
          // Il drag funzionerà anche quando si clicca sul div note-resize perché
          // il sistema controlla se event.target ha la classe tds_draggable
          this.stageService.setDragElement(this.note.note_id);
        }
      }, 50);
    }
  }
  
}

