import { Component, OnInit, OnChanges, SimpleChanges, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit, HostListener, OnDestroy } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Note } from 'src/app/models/note-model';
import { StageService } from '../../../services/stage.service';
import { NoteService } from 'src/app/services/note.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { firstValueFrom, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'cds-notes',
  templateUrl: './cds-notes.component.html',
  styleUrls: ['./cds-notes.component.scss']
})
export class CdsNotesComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  @Input() note: Note;
  @Input() IS_OPEN_PANEL_NOTE_DETAIL: boolean = false;
  @Output() noteSelected = new EventEmitter<Note>();
  @ViewChild('noteInput', { static: false }) noteInput: ElementRef<HTMLDivElement>;
  @ViewChild('noteContentElement', { static: false }) contentElement: ElementRef<HTMLDivElement>;
  // @ViewChild('noteResize', { static: false }) noteResize: ElementRef<HTMLDivElement>;


  textareaHasFocus = false;
  dragged = false;  

  stateNote: 0|1|2|3 = 0; // 0: normal, 1: text focus, 2: resizing, 3: dropping
  
  // Timer per ritardare l'apertura del pannello e evitare aperture multiple
  private openPanelTimer: any = null;
  noteText: string;
  sanitizedNoteHtml: SafeHtml;
  
  // Sottoscrizioni per i cambiamenti delle note
  private noteUpdatedSubscription: Subscription;
  
  // Getter per determinare se il drag è abilitato
  get isDraggable(): boolean {
    return this.stateNote !== 1 && !this.textareaHasFocus;
  }
  
  // Funzione per cambiare lo stato della nota
  changeState(state: 0|1|2|3): void {
    const previousState = this.stateNote;
    this.stateNote = state;
    
    if(state === 1) {
      // Stato: text focus - NON aprire il panel (solo focus sul testo)
      // Cancella eventuali timer pendenti per evitare aperture multiple
      this.cancelOpenPanelTimer();
      this.textareaHasFocus = true;
      // Chiudi il panel se era aperto (stato precedente era 2)
      if (previousState === 2) {
        this.noteSelected.emit(null);
      }
      
      // Posiziona il cursore alla fine del testo dopo che il focus è stato applicato
      setTimeout(() => {
        if (this.noteInput) {
          this.noteInput.nativeElement.focus();
          // Posiziona il cursore alla fine del contenuto
          this.placeCaretAtEnd(this.noteInput.nativeElement);
        }
      }, 150);
    } else if(state === 2) {
      // Stato: selected con maniglie visibili - APRI il panel con ritardo
      this.textareaHasFocus = false;
      if (this.noteInput) {
        this.noteInput.nativeElement.blur();
      }
      // Apri il panel dei dettagli con un breve ritardo per evitare aperture multiple su doppio click
      this.openPanelWithDelay();
    } else if(state === 0 || state === 3) {
      // Stato: normal (0) o dropping (3) - CHIUDI il panel
      // Cancella eventuali timer pendenti
      this.cancelOpenPanelTimer();
      this.textareaHasFocus = false;
      if (this.noteInput) {
        this.noteInput.nativeElement.blur();
      }
      // Chiudi il panel quando lo stato è 0 o 3
      // Emetti null solo se il panel era aperto (stato precedente era 2)
      if (previousState === 2) {
        this.noteSelected.emit(null);
      }
    }
  }

  /**
   * Apre il pannello con un breve ritardo per evitare aperture multiple su doppio click
   * Viene chiamato solo quando lo stato è 2 (selected con maniglie visibili)
   */
  private openPanelWithDelay(): void {
    // Cancella eventuali timer precedenti
    this.cancelOpenPanelTimer();
    
    // Verifica che lo stato sia ancora 2 prima di aprire il pannello
    // Imposta un nuovo timer con ritardo di 200ms
    this.openPanelTimer = setTimeout(() => {
      // Apri il pannello solo se lo stato è ancora 2
      if (this.stateNote === 2) {
        this.noteSelected.emit(this.note);
      }
      this.openPanelTimer = null;
    }, 200);
  }

  /**
   * Cancella il timer di apertura del pannello se esiste
   */
  private cancelOpenPanelTimer(): void {
    if (this.openPanelTimer) {
      clearTimeout(this.openPanelTimer);
      this.openPanelTimer = null;
    }
  }

  /**
   * Posiziona il cursore alla fine del contenuto del div contenteditable
   */
  private placeCaretAtEnd(element: HTMLElement): void {
    try {
    const range = document.createRange();
    const selection = window.getSelection();
      
      if (!selection) return;
      
      // Seleziona tutto il contenuto
    range.selectNodeContents(element);
      // Collassa il range alla fine (false = fine, true = inizio)
    range.collapse(false);
      
      // Rimuovi tutte le selezioni esistenti e aggiungi il nuovo range
      selection.removeAllRanges();
      selection.addRange(range);
      
      // Assicurati che l'elemento abbia il focus
      element.focus();
    } catch (error) {
      console.error('[CDS-NOTES] Error placing caret at end:', error);
    }
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
  private startFontSize = 0; // Font size iniziale per calcolare il resize proporzionale
  private justFinishedResizing = false;
  private draggedListener: EventListener | null = null;
  private draggingListener: EventListener | null = null;
  
  private readonly logger: LoggerService = LoggerInstance.getInstance();
  
  constructor(
    private stageService: StageService,
    private noteService: NoteService,
    private sanitizer: DomSanitizer
  ) { }

  /**
   * Aggiorna l'HTML sanitizzato usato per il binding [innerHTML]
   * Usa DomSanitizer per preservare gli stili inline (es. color) generati da Quill
   * senza che Angular li rimuova
   */
  private updateSanitizedHtml(): void {
    // Non aggiornare mentre l'utente sta digitando per evitare che il cursore si sposti
    if (this.textareaHasFocus) {
      return;
    }
    const html = this.note?.text || '';
    this.sanitizedNoteHtml = this.sanitizer.bypassSecurityTrustHtml(html);
  }

  ngOnInit(): void {
    // Inizializza noteText con il valore corrente di note.text
    if (this.note) {
      this.noteText = this.note.text || '';
      this.updateSanitizedHtml();
    }
    
    // Sottoscrivi ai cambiamenti delle note per aggiornare il contenuto quando una nota viene modificata
    this.noteUpdatedSubscription = this.noteService.noteUpdated$
      .pipe(
        filter(updatedNote => updatedNote && this.note && updatedNote.note_id === this.note.note_id)
      )
      .subscribe(updatedNote => {
        // Aggiorna la nota locale con i dati aggiornati
        if (updatedNote && this.note) {
          // Aggiorna tutte le proprietà della nota
          Object.assign(this.note, updatedNote);
          
          // Aggiorna noteText solo se la textarea non ha il focus
          if (!this.textareaHasFocus) {
            const newText = updatedNote.text || '';
            if (this.noteText !== newText) {
              this.noteText = newText;
              // Aggiorna anche il DOM se la textarea esiste
              if (this.noteInput && this.noteInput.nativeElement.innerHTML !== newText) {
                this.noteInput.nativeElement.innerHTML = newText;
              }
              // Aggiorna anche l'HTML sanitizzato per la visualizzazione
              this.updateSanitizedHtml();
            }
          }
          
          // Aggiorna fontSize e fontFamily se cambiati
          if (this.noteInput) {
            if (updatedNote.fontSize && this.note.fontSize !== updatedNote.fontSize) {
              this.noteInput.nativeElement.style.fontSize = updatedNote.fontSize + 'px';
            }
            if (updatedNote.fontFamily && this.note.fontFamily !== updatedNote.fontFamily) {
              this.noteInput.nativeElement.style.fontFamily = updatedNote.fontFamily;
            }
          }
          
          this.logger.log('[CDS-NOTES] Note updated from service:', updatedNote.note_id);
        }
      });
  }

  /**
   * Rileva i cambiamenti all'input note e aggiorna noteText di conseguenza
   * Best practice: usa ngOnChanges per sincronizzare lo stato locale con gli input
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['note'] && this.note) {
      const noteChange = changes['note'];
      
      // Se è la prima volta che note viene impostato, inizializza noteText
      if (noteChange.isFirstChange()) {
        this.noteText = this.note.text || '';
        this.updateSanitizedHtml();
      } else {
        // Se note.text è cambiato, aggiorna noteText solo se diverso
        // Questo evita aggiornamenti inutili quando l'utente sta digitando
        const newText = this.note.text || '';
        if (this.noteText !== newText) {
          // Aggiorna noteText solo se la textarea non ha il focus
          // per evitare conflitti durante la digitazione
          if (!this.textareaHasFocus && this.noteInput) {
            this.noteText = newText;
            // Aggiorna anche il DOM se necessario
            if (this.noteInput.nativeElement.innerHTML !== newText) {
              this.noteInput.nativeElement.innerHTML = newText;
            }
            this.updateSanitizedHtml();
          } else if (!this.textareaHasFocus) {
            // Se la textarea non esiste ancora, aggiorna solo noteText
            this.noteText = newText;
            this.updateSanitizedHtml();
          }
        }
      }
    }
  }

  ngAfterViewInit(): void {
    // Imposta le dimensioni iniziali del blocco basandosi su note.width e note.height
    if (this.contentElement && this.note) {
      const width = this.note.width || 220;
      const height = this.note.height || 50;
      this.contentElement.nativeElement.style.width = width + 'px';
      this.contentElement.nativeElement.style.height = height + 'px';
      
      // Inizializza fontSize e fontFamily se non presenti
      if (!this.note.fontSize) {
        this.note.fontSize = 14;
      }
      if (!this.note.fontFamily) {
        this.note.fontFamily = 'Open Sans, sans-serif';
      }
      
      // Applica fontSize e fontFamily al div contenteditable
      if (this.noteInput) {
        this.noteInput.nativeElement.style.fontSize = this.note.fontSize + 'px';
        this.noteInput.nativeElement.style.fontFamily = this.note.fontFamily;
      }
      
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
        // Salva la nota nel localStorage dopo il drag
        // se la posizione è cambiata, salva la nota
        if (this.note.x !== el.offsetLeft || this.note.y !== el.offsetTop) {
         
          // Ricalcola e sincronizza le dimensioni e le posizioni dopo il drag
          this.recalculateNoteDimensionsAndPosition(el);
          this.updateNote();
        }
      } else {
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
    // Pulisci il timer di apertura del pannello
    this.cancelOpenPanelTimer();
    
    // Rimuovi la sottoscrizione ai cambiamenti delle note
    if (this.noteUpdatedSubscription) {
      this.noteUpdatedSubscription.unsubscribe();
    }
  }

  // ============================================================================
  // LISTENER PER EVENTI DELLA TEXTAREA
  // ============================================================================
  
  /**
   * Gestisce i click sul div note-input
   * Blocca la propagazione per evitare che il click raggiunga il canvas,
   * ma permette la selezione del testo e il funzionamento dei link
   */
  onNoteInputClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    
    // Se il click è su un link, permettere al link di funzionare normalmente
    // Verifica se il target è un link o è dentro un link
    const isLink = target.tagName === 'A' || target.closest('a') !== null;
    
    if (isLink) {
      const linkElement = target.tagName === 'A' ? target as HTMLAnchorElement : target.closest('a') as HTMLAnchorElement;
      let linkUrl = linkElement?.getAttribute('href') || 'N/A';
      
      // Normalizza l'URL: se non inizia con http:// o https://, aggiungi http://
      if ( linkUrl !== 'N/A' && !linkUrl.startsWith('http://') && !linkUrl.startsWith('https://')) {
        linkUrl = 'http://' +  linkUrl;
      }
      
      const linkText = linkElement?.textContent || linkElement?.innerText || 'N/A';
      const targetAttr = linkElement?.getAttribute('target') || '_blank';
      
      
      this.logger.log('[CDS-NOTES] 🔗 LINK CLICKED - URL:', linkUrl, 'Text:', linkText, 'Target:', targetAttr);
      
      // Apri il link esplicitamente
      if (linkUrl && linkUrl !== 'N/A') {
        // Se il link ha un target="_blank", apri in una nuova tab
        if (targetAttr === '_blank' || linkElement?.target === '_blank') {
          window.open(linkUrl, '_blank', 'noopener,noreferrer');
        } else {
          // Altrimenti apri nella stessa finestra
          window.location.href = linkUrl;
        }
      }
      
      // Blocca la propagazione per evitare che il click raggiunga il canvas
      // ma permettere al link di funzionare
      event.stopPropagation();
      return;
    } else {
      // Per altri elementi, blocca la propagazione per evitare che il click raggiunga il canvas
      event.stopPropagation();
    }
    // Non interferire con la selezione del testo - il browser gestisce automaticamente
  }

  /**
   * Gestisce i mousedown sul div note-input
   * Permette la selezione del testo e il funzionamento dei link
   */
  onNoteInputMouseDown(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    
    // Se il mousedown è su un link, permettere al link di funzionare normalmente
    const isLink = target.tagName === 'A' || target.closest('a') !== null;
    
    if (isLink) {
      // Per i link, non bloccare la propagazione - permettere al link di funzionare
      return;
    }
    
    // Per altri elementi, blocca la propagazione per evitare che il mousedown raggiunga il canvas
    // ma NON interferire con la selezione del testo
    event.stopPropagation();
    // Il browser gestirà automaticamente la selezione del testo
  }

  /**
   * Listener per l'evento input del div contenteditable
   * Aggiorna il testo HTML formattato della nota quando l'utente digita
   */
  onInputChange(event: Event): void {
    const editableDiv = event.target as HTMLDivElement;
    if (this.note) {
      // Salva l'HTML formattato invece del testo semplice
      this.note.text = editableDiv.innerHTML;
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
    this.changeState(0);
    // Riabilita il drag quando la textarea perde il focus (se non è selezionata)
    this.updateDragState();
    // Aggiorna l'HTML sanitizzato dopo che l'utente ha finito di modificare il testo
    this.updateSanitizedHtml();
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
    // Al singolo click visualizza le maniglie (stateNote === 2)
    // changeState(2) aprirà automaticamente il panel
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
    // Al doppio click nascondo il div note-resize e metto il focus sulla textarea
    this.changeState(1);
    // NON aprire il panel quando lo stato è 1 (text focus)
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
    // Salva il font size iniziale per calcolare il resize proporzionale
    this.startFontSize = this.note.fontSize || 14;
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
    //const minHeight = 50;
    // ricalcola le dimensioni minime dell'altezza assegnando la altezza del div class note-input note-resize e la larghezza del div class note-input note-resize meno 16px (padding: 6px)
    const noteInputElement = this.noteInput.nativeElement;
    const minHeight = noteInputElement.offsetHeight;
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
    
    // Calcola il nuovo font size proporzionale alla larghezza
    // Usa la larghezza come riferimento principale per mantenere la proporzione
    const widthRatio = newWidth / this.startWidth;
    const newFontSize = Math.max(8, Math.min(72, this.startFontSize * widthRatio)); // Limita tra 8px e 72px
    this.note.fontSize = Math.round(newFontSize);
    
    // Applica le nuove dimensioni al contentElement
    this.contentElement.nativeElement.style.width = newWidth + 'px';
    this.contentElement.nativeElement.style.height = newHeight + 'px';
    
    // Aggiorna le dimensioni e il font size del div contenteditable
    if (this.noteInput) {
      this.noteInput.nativeElement.style.width = (newWidth - 16) + 'px';
      this.noteInput.nativeElement.style.fontSize = this.note.fontSize + 'px';
      // Mantieni anche il fontFamily se presente
      if (this.note.fontFamily) {
        this.noteInput.nativeElement.style.fontFamily = this.note.fontFamily;
      }
      // L'altezza si adatta automaticamente al contenuto grazie al CSS
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
    
    // Se la nota è selezionata (stateNote === 1 o 2) e si clicca fuori dal componente, deseleziona
    if ((this.stateNote === 1 || this.stateNote === 2) && this.contentElement) {
      const target = event.target as HTMLElement;
      const clickedInside = this.contentElement.nativeElement.contains(target);
      
      // Non deselezionare se si clicca su una maniglia
      const clickedOnHandle = target.classList.contains('resize-handle');
      
      // Non deselezionare se si clicca sul pannello di dettaglio
      const clickedOnPanel = target.closest('.panel-note-detail') !== null;
      
      if (!clickedInside && !clickedOnHandle && !clickedOnPanel) {
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
      } catch (error) {
        console.error('[CDS-NOTES] Error saving note:', error);
      }
    } else {
      console.warn('[CDS-NOTES] Cannot save note: missing note or id_faq_kb');
    }
  }
  
}

