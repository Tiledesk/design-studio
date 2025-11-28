import { Component, OnInit, Input, ViewChild, ElementRef, AfterViewInit, HostListener, OnDestroy } from '@angular/core';
import { Note } from 'src/app/models/note-model';
import { StageService } from '../../../services/stage.service';
import { NoteService } from 'src/app/services/note.service';
import { firstValueFrom } from 'rxjs';

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


  textareaHasFocus = false;
  dragged = false;  

  stateNote: 0|1|2|3 = 0; // 0: normal, 1: text focus, 2: resizing, 3: dropping
  
  // Getter per determinare se il drag è abilitato
  get isDraggable(): boolean {
    return this.stateNote !== 1 && !this.textareaHasFocus;
  }
  
  // Funzione per cambiare lo stato della nota
  changeState(state: 0|1|2|3): void {
    this.stateNote = state;
    if(state === 1) {
      this.textareaHasFocus = true;
      setTimeout(() => {
        this.noteInput.nativeElement.focus();
      }, 100);
    } else {
      this.textareaHasFocus = false;
      this.noteInput.nativeElement.blur();
    }
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
  
  constructor(
    private stageService: StageService,
    private noteService: NoteService
  ) { }

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    // Imposta le dimensioni iniziali del blocco basandosi su note.width e note.height
    if (this.contentElement && this.note) {
      const width = this.note.width || 220;
      const height = this.note.height || 50;
      this.contentElement.nativeElement.style.width = width + 'px';
      this.contentElement.nativeElement.style.height = height + 'px';
      // Inizializza tutti i listener per gli eventi
      this.setupAllListeners();
      // Inizializza il drag dopo che la vista è stata inizializzata
      this.updateDragState();
    }
  }

  // ============================================================================
  // LISTENER SETUP - Configurazione di tutti i listener per gli eventi
  // ============================================================================
  
  /**
   * Inizializza tutti i listener necessari per il componente
   */
  private setupAllListeners(): void {
    this.setupDragListeners();
  }

  // ============================================================================
  // LISTENER PER EVENTI DI DRAG (Custom Events dal sistema di drag)
  // ============================================================================
  
  /**
   * Configura i listener per gli eventi di drag personalizzati
   * Questi eventi vengono emessi dal sistema di drag (tiledesk-stage.js)
   */
  private setupDragListeners(): void {
    this.setupDraggingListener();
    this.setupDragEndListener();
  }

  /**
   * Listener per l'evento "dragged" emesso durante il trascinamento
   * Viene chiamato continuamente mentre l'utente trascina la nota
   * Imposta il flag dragged = true per distinguere un drag da un click
   */
  private setupDraggingListener(): void {
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
  
  /**
   * Listener per l'evento "end-dragging" emesso quando termina il drag
   * Viene chiamato quando l'utente rilascia il mouse dopo aver trascinato
   * Ricalcola e sincronizza le dimensioni e posizioni della nota con le posizioni CSS finali
   * Salva la nota nel localStorage dopo il drag
   */
  private setupDragEndListener(): void {
    this.draggedListener = ((e: CustomEvent) => {
      const el = e.detail.element;
      // Verifica che l'elemento sia questa nota
      if (el && el.id === this.note?.note_id) {
        console.log('DRAGGING END');
        console.log('[CDS-NOTES] end-dragging - Note ID:', this.note.note_id);
        console.log('[CDS-NOTES] end-dragging - position:', el.offsetLeft, el.offsetTop, this.note.x, this.note.y);
        // Salva la nota nel localStorage dopo il drag
        // se la posizione è cambiata, salva la nota
        if (this.note.x !== el.offsetLeft || this.note.y !== el.offsetTop) {
          this.updateNote();
          // Ricalcola e sincronizza le dimensioni e le posizioni dopo il drag
          this.recalculateNoteDimensionsAndPosition(el);
        }
      } else {
        console.log('DRAGGING END - NOT THIS NOTE');
        this.changeState(0);
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
  
  // ============================================================================
  // LIFECYCLE HOOKS
  // ============================================================================
  
  /**
   * Cleanup: rimuove tutti i listener quando il componente viene distrutto
   * Previene memory leak rimuovendo gli event listener dal document
   */
  ngOnDestroy(): void {
    // Rimuovi i listener per gli eventi di drag
    if (this.draggingListener) {
      document.removeEventListener("dragged", this.draggingListener, false);
    }
    if (this.draggedListener) {
      document.removeEventListener("end-dragging", this.draggedListener, false);
    }
  }

  // ============================================================================
  // LISTENER PER EVENTI DELLA TEXTAREA
  // ============================================================================
  
  /**
   * Listener per l'evento input della textarea
   * Aggiorna il testo della nota quando l'utente digita
   */
  onInputChange(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    if (this.note) {
      this.note.text = textarea.value;
    }
  }

  /**
   * Listener per l'evento focus della textarea
   * Quando la textarea prende il focus:
   * - Cambia lo stato a 1 (text focus)
   * - Disabilita il drag per permettere la modifica del testo
   */
  onFocusTextarea(event: FocusEvent): void {
    // Cambia lo stato a 1 quando la textarea prende il focus
    this.changeState(1);
    // Disabilita il drag quando la textarea ha il focus
    this.updateDragState();
  }

  /**
   * Listener per l'evento blur della textarea
   * Quando la textarea perde il focus:
   * - Resetta lo stato a 0 (normal)
   * - Riabilita il drag se la nota non è selezionata
   * - Salva la nota nel localStorage dopo la modifica del testo
   */
  onBlurTextarea(event: FocusEvent): void {
    console.log('onBlurTextarea', event);
    this.changeState(0);
    // Riabilita il drag quando la textarea perde il focus (se non è selezionata)
    this.updateDragState();
    // Salva la nota nel localStorage dopo la modifica del testo
    this.updateNote();
  }

  // ============================================================================
  // LISTENER PER EVENTI DEL MOUSE SUL BLOCCO NOTE-RESIZE
  // ============================================================================
  
  /**
   * Listener per l'evento mousedown sul div note-resize
   * Permette al sistema di drag di funzionare quando si clicca sul blocco
   * Se il drag è abilitato, l'evento viene propagato al contenitore principale
   */
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

  /**
   * Listener per l'evento click sul div note-resize
   * Al singolo click:
   * - Se non si è fatto drag, seleziona la nota (mostra le maniglie)
   * - Disabilita il drag quando le maniglie sono visibili
   * 
   * NOTA: Non chiama updateNote() perché il click singolo serve solo per selezionare la nota,
   * non per salvare modifiche. Il salvataggio avviene solo quando:
   * - Termina un drag (fine spostamento)
   * - Termina il resize (fine ridimensionamento)
   * - Termina la modifica del testo (perdita del focus sulla textarea)
   */
  onSingleClick(event: MouseEvent): void {
    // Se si è fatto drag, non gestire il click
    if (this.dragged) {
      this.dragged = false;
      return;
    }
    event.stopPropagation();
    console.log('[CDS-NOTES] onSingleClick');
    // Al singolo click visualizza le maniglie
    this.changeState(2);
    // Disabilita il drag quando le maniglie sono visibili
    this.updateDragState();
    // NON chiamare updateNote() qui - il click serve solo per selezionare
  }

  /**
   * Listener per l'evento dblclick sul div note-resize
   * Al doppio click:
   * - Mette il focus sulla textarea per permettere la modifica del testo
   * - Cambia lo stato a 1 (text focus)
   * 
   * NOTA: Non chiama updateNote() perché il doppio click serve solo per attivare la modifica,
   * non per salvare. Il salvataggio avviene quando la textarea perde il focus (onBlurTextarea).
   */
  onDoubleClick(event: MouseEvent): void {
    // Previeni la propagazione dell'evento per evitare conflitti
    event.stopPropagation();
    console.log('onDoubleClick');
    // Al doppio click nascondo il div note-resize e metto il focus sulla textarea
    this.changeState(1);
    // NON chiamare updateNote() qui - il doppio click serve solo per attivare la modifica
  }



  // ============================================================================
  // LISTENER PER EVENTI DI RIDIMENSIONAMENTO (RESIZE)
  // ============================================================================
  
  /**
   * Listener per l'evento mousedown sulle maniglie di ridimensionamento
   * Inizia l'operazione di resize quando l'utente clicca su una maniglia
   * @param event - Evento mouse
   * @param handle - Identificatore della maniglia ('tl', 'tr', 'bl', 'br')
   */
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

  /**
   * Listener globale per l'evento mousemove durante il ridimensionamento
   * Viene chiamato continuamente mentre l'utente trascina una maniglia
   * Calcola le nuove dimensioni e posizioni basandosi sul punto di ancoraggio
   */
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

  /**
   * Listener globale per l'evento mouseup che termina il ridimensionamento
   * Viene chiamato quando l'utente rilascia il mouse dopo aver ridimensionato
   * Resetta lo stato di resize e imposta un flag per prevenire la deselezione immediata
   * Salva la nota nel localStorage dopo il resize
   */
  @HostListener('document:mouseup', ['$event'])
  onMouseUp(event: MouseEvent): void {
    if (this.isResizing) {
      this.isResizing = false;
      this.resizeHandle = '';
      console.log('[CDS-NOTES] onMouseUp');
      this.changeState(0);
      // Imposta un flag per prevenire la deselezione immediata
      this.justFinishedResizing = true;
      // Reset del flag dopo un breve delay per permettere all'evento click di essere ignorato
      setTimeout(() => {
        this.justFinishedResizing = false;
      }, 100);
      // Salva la nota nel localStorage dopo il resize
      this.updateNote();
    }
  }

  // ============================================================================
  // LISTENER PER EVENTI GLOBALI DEL DOCUMENTO
  // ============================================================================
  
  /**
   * Listener globale per l'evento click sul documento
   * Deseleziona la nota quando si clicca fuori dal componente
   * Ignora il click se si sta facendo resize o si è appena finito
   */
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
        this.changeState(0);
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

  // ============================================================================
  // METODI DI PERSISTENZA
  // ============================================================================
  
  /**
   * Salva la nota in remoto chiamando il servizio NoteService
   * Viene chiamato automaticamente quando:
   * - Termina un drag (fine spostamento)
   * - Termina il resize (fine ridimensionamento)
   * - Termina la modifica del testo (perdita del focus sulla textarea)
   * 
   * Best practice: Il servizio gestisce tutto internamente:
   * - Recupera tutte le note dal dashboardService
   * - Aggiorna o aggiunge la nota specifica
   * - Salva l'array completo aggiornato in remoto
   * Usa firstValueFrom invece di subscribe per una gestione moderna e sicura
   */
  private async updateNote(): Promise<void> {
    if (this.note && this.note.id_faq_kb) {
      try {
        // Il servizio gestisce tutto: recupera, aggiorna e salva l'array completo
        await firstValueFrom(this.noteService.saveRemoteNote(this.note, this.note.id_faq_kb));
        console.log('[CDS-NOTES] Note saved:', this.note.note_id);
      } catch (error) {
        console.error('[CDS-NOTES] Error saving note:', error);
      }
    } else {
      console.warn('[CDS-NOTES] Cannot save note: missing note or id_faq_kb');
    }
  }
  
}

