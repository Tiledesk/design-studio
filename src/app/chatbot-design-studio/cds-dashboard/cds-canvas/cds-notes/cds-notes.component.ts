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
  // ============================================================================
  // PROPRIETÀ PUBBLICHE - Decoratori e Input/Output
  // ============================================================================
  @Input() note: Note;
  @Input() IS_OPEN_PANEL_NOTE_DETAIL: boolean = false;
  @Output() noteSelected = new EventEmitter<Note>();
  @ViewChild('noteInput', { static: false }) noteInput: ElementRef<HTMLDivElement>;
  @ViewChild('noteContentElement', { static: false }) contentElement: ElementRef<HTMLDivElement>;

  // ============================================================================
  // PROPRIETÀ PUBBLICHE - Stato del componente
  // ============================================================================
  textareaHasFocus = false;
  dragged = false;  
  stateNote: 0|1|2|3 = 0; // 0: normal, 1: text focus, 2: selected, 3: dropping
  noteText: string;
  sanitizedNoteHtml: SafeHtml;

  // ============================================================================
  // PROPRIETÀ PRIVATE - Timer e sottoscrizioni
  // ============================================================================
  private openPanelTimer: any = null;
  private singleClickTimer: any = null;
  private noteUpdatedSubscription: Subscription;
  private mutationObserver: MutationObserver | null = null;

  // ============================================================================
  // PROPRIETÀ PRIVATE - Resize
  // ============================================================================
  private isResizing = false;
  private resizeHandle: string = '';
  private startX = 0;
  private startY = 0;
  private startWidth = 0; // Dimensioni base (rimangono fisse, usiamo scale per ridimensionare)
  private startHeight = 0; // Dimensioni base (rimangono fisse, usiamo scale per ridimensionare)
  private startScale = 1; // Scale iniziale
  private startCenterX = 0; // Centro iniziale del box (per calcolo scale rispetto al centro)
  private startCenterY = 0; // Centro iniziale del box (per calcolo scale rispetto al centro)
  private startDistanceFromCenter = 0; // Distanza iniziale del mouse dal centro
  private justFinishedResizing = false;

  // PROPRIETÀ PRIVATE - Rotazione
  // ============================================================================
  private isRotating = false;
  private startRotationAngle = 0; // Angolo iniziale di rotazione
  private centerX = 0; // Centro X della nota
  private centerY = 0; // Centro Y della nota

  // ============================================================================
  // PROPRIETÀ PRIVATE - Drag listeners
  // ============================================================================
  private draggedListener: EventListener | null = null;
  private draggingListener: EventListener | null = null;
  
  // ============================================================================
  // PROPRIETÀ PRIVATE - Servizi e logger
  // ============================================================================
  private readonly logger: LoggerService = LoggerInstance.getInstance();

  // ============================================================================
  // GETTER
  // ============================================================================
  get isDraggable(): boolean {
    return this.stateNote !== 1 && !this.textareaHasFocus;
  }

  // ============================================================================
  // COSTRUTTORE
  // ============================================================================
  constructor(
    private stageService: StageService,
    private noteService: NoteService,
    private sanitizer: DomSanitizer
  ) { }

  // ============================================================================
  // LIFECYCLE HOOKS
  // ============================================================================
  ngOnInit(): void {
    this.initialize();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['note'] && this.note) {
      const noteChange = changes['note'];
      
      if (noteChange.isFirstChange()) {
        this.noteText = this.note.text || '';
        this.updateSanitizedHtml();
      } else {
        const newText = this.note.text || '';
        if (this.noteText !== newText && !this.textareaHasFocus) {
          this.noteText = newText;
          if (this.noteInput) {
            if (this.noteInput.nativeElement.innerHTML !== newText) {
              this.noteInput.nativeElement.innerHTML = newText;
            }
          }
          this.updateSanitizedHtml();
        }
      }
    }
  }

  ngAfterViewInit(): void {
    if (this.contentElement && this.note) {
      // Imposta dimensioni base (rimangono fisse, usiamo scale per ridimensionare)
      const baseWidth = Note.DEFAULT_WIDTH;
      const baseHeight = Note.DEFAULT_HEIGHT;
      this.contentElement.nativeElement.style.width = baseWidth + 'px';
      this.contentElement.nativeElement.style.height = baseHeight + 'px';
      
      // Calcola lo scale iniziale basato sulle dimensioni salvate nel modello
      const savedWidth = this.note.width || baseWidth;
      const savedHeight = this.note.height || baseHeight;
      const scaleX = savedWidth / baseWidth;
      const scaleY = savedHeight / baseHeight;
      
      // Applica fontSize e fontFamily
      if (this.noteInput) {
        this.noteInput.nativeElement.style.fontSize = this.note.fontSize;
        this.noteInput.nativeElement.style.fontFamily = this.note.fontFamily;
      }
      
      // Applica la trasformazione combinando scale + rotate
      const rotation = this.note.rotation || 0;
      const transform = `scale(${scaleX}, ${scaleY}) rotate(${rotation}deg)`;
        this.contentElement.nativeElement.style.transform = transform;
        this.contentElement.nativeElement.style.transformOrigin = 'center center';
      
      // Applica scale inverso agli handle per mantenerli alla dimensione originale
      this.updateHandlesScale(scaleX, scaleY);
      
      // Setup listeners e drag
      this.setupAllListeners();
      this.updateDragState();
      this.updateChildrenDraggableClass();
      this.setupMutationObserver();
    }
  }

  ngOnDestroy(): void {
    // Rimuovi listener drag
    if (this.draggingListener) {
      document.removeEventListener("dragged", this.draggingListener, false);
    }
    if (this.draggedListener) {
      document.removeEventListener("end-dragging", this.draggedListener, false);
    }
    
    // Pulisci timer
    this.cancelOpenPanelTimer();
    this.cancelSingleClickTimer();
    
    // Rimuovi sottoscrizioni
    if (this.noteUpdatedSubscription) {
      this.noteUpdatedSubscription.unsubscribe();
    }
    
    // Disconnetti MutationObserver
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }
  }

  // ============================================================================
  // @HOSTLISTENER - Eventi globali del documento
  // ============================================================================
  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    // Gestione rotazione
    if (this.isRotating && this.contentElement && this.note) {
      this.handleRotation(event);
      return;
    }
    
    // Gestione resize con transform: scale()
    if (!this.isResizing || !this.contentElement || !this.note) return;
    
    const minScale = 0.1; // Scale minimo (10% della dimensione originale)
    const maxScale = 10; // Scale massimo (1000% della dimensione originale)
    
    // Calcola lo scale basandoti sulla distanza dal centro iniziale
    // La distanza dal centro aumenta/diminuisce proporzionalmente allo scale
    const currentDx = event.clientX - this.startCenterX;
    const currentDy = event.clientY - this.startCenterY;
    const currentDistance = Math.sqrt(currentDx * currentDx + currentDy * currentDy);
    
    let scaleX = this.startScale;
    let scaleY = this.startScale;
    
    if (this.startDistanceFromCenter > 0) {
      const distanceRatio = currentDistance / this.startDistanceFromCenter;
      const newScale = this.startScale * distanceRatio;
      scaleX = Math.max(minScale, Math.min(maxScale, newScale));
      scaleY = scaleX; // Mantieni proporzioni perfette
    } else {
      // Se la distanza iniziale è 0 (maniglia al centro), usa il delta
      const deltaX = event.clientX - this.startX;
      const deltaY = event.clientY - this.startY;
      const avgDelta = (Math.abs(deltaX) + Math.abs(deltaY)) / 2;
      const newScale = this.startScale + (avgDelta / ((this.startWidth + this.startHeight) / 2));
      scaleX = Math.max(minScale, Math.min(maxScale, newScale));
      scaleY = scaleX;
    }
    
    // Applica la trasformazione CSS con scale + rotate
    const transformOrigin = 'center center';
    const rotation = this.note.rotation || 0;
    const transform = `scale(${scaleX}, ${scaleY}) rotate(${rotation}deg)`;
    
    if (this.contentElement) {
      this.contentElement.nativeElement.style.transform = transform;
      this.contentElement.nativeElement.style.transformOrigin = transformOrigin;
      this.updateHandlesScale(scaleX, scaleY);
    }
  }

  @HostListener('document:mouseup', ['$event'])
  onMouseUp(event: MouseEvent): void {
    if (this.isResizing) {
      // Calcola le dimensioni finali basate sullo scale corrente
      if (this.contentElement && this.note) {
        const currentTransform = this.contentElement.nativeElement.style.transform || '';
        const scaleMatch = currentTransform.match(/scale\(([^,)]+)(?:,\s*([^)]+))?\)/);
        
        if (scaleMatch) {
          const scaleX = parseFloat(scaleMatch[1]) || 1;
          const scaleY = parseFloat(scaleMatch[2]) || scaleX;
          
          // Aggiorna le dimensioni nel modello con quelle reali (base * scale)
          this.note.width = this.startWidth * scaleX;
          this.note.height = this.startHeight * scaleY;
        }
      }
      
      this.isResizing = false;
      this.resizeHandle = '';
      this.changeState(0);
      this.justFinishedResizing = true;
      setTimeout(() => {
        this.justFinishedResizing = false;
      }, 100);
      this.updateNote();
    }
    
    if (this.isRotating) {
      this.isRotating = false;
      this.updateNote();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isResizing || this.justFinishedResizing || this.isRotating) {
      return;
    }
    
    if ((this.stateNote === 1 || this.stateNote === 2) && this.contentElement) {
      const target = event.target as HTMLElement;
      const clickedInside = this.contentElement.nativeElement.contains(target);
      const clickedOnHandle = target.classList.contains('resize-handle');
      const clickedOnPanel = target.closest('.panel-note-detail') !== null;
      
      if (!clickedInside && !clickedOnHandle && !clickedOnPanel) {
        this.changeState(0);
        this.updateDragState();
      }
    }
  }

  // ============================================================================
  // EVENT HANDLERS - Chiamati dal template
  // ============================================================================
  onNoteInputClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    
    if (this.stateNote === 1) {
      event.stopPropagation();
      return;
    }
    
    const isLink = target.tagName === 'A' || target.closest('a') !== null;
    
    if (isLink) {
      this.handleLinkClick(target, event);
      return;
    }
    
    if (this.dragged) {
      this.dragged = false;
      if (!this.isDraggable) {
        event.stopPropagation();
      }
      return;
    }
    
    this.cancelSingleClickTimer();
    this.singleClickTimer = setTimeout(() => {
      this.changeState(2);
      this.updateDragState();
      this.singleClickTimer = null;
    }, 300);
    
    if (!this.isDraggable) {
      event.stopPropagation();
    }
  }

  onNoteInputDoubleClick(event: MouseEvent): void {
    if (this.stateNote === 1) {
      event.stopPropagation();
      return;
    }
    
    event.stopPropagation();
    this.cancelSingleClickTimer();
    this.changeState(1);
    this.updateDragState();
  }

  onNoteInputMouseDown(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    
    this.logger.log('[CDS-NOTES] onNoteInputMouseDown - stateNote:', this.stateNote, 'isDraggable:', this.isDraggable, 'target:', target, 'hasTdsDraggable:', target.classList.contains('tds_draggable'));
    
    if (this.stateNote === 1) {
      event.stopPropagation();
      return;
    }
    
    const isLink = target.tagName === 'A' || target.closest('a') !== null;
    if (isLink) {
      return;
    }
    
    if (this.isDraggable) {
      if (this.noteInput && this.noteInput.nativeElement.contains(target) && target !== this.noteInput.nativeElement) {
        target.classList.add('tds_draggable');
        this.logger.log('[CDS-NOTES] onNoteInputMouseDown - Added tds_draggable class to child element:', target);
      }
      return;
    }
    
    event.stopPropagation();
  }

  onInputChange(event: Event): void {
    const editableDiv = event.target as HTMLDivElement;
    if (this.note) {
      this.note.text = editableDiv.innerHTML;
    }
  }

  onFocusTextarea(event: FocusEvent): void {
    this.changeState(1);
    this.updateDragState();
  }

  onBlurTextarea(event: FocusEvent): void {
    this.changeState(0);
    this.updateDragState();
    this.updateSanitizedHtml();
    this.updateNote();
  }

  startResize(event: MouseEvent, handle: string): void {
    event.stopPropagation();
    event.preventDefault();
    if (!this.contentElement || !this.note) return;
    
    this.isResizing = true;
    this.resizeHandle = handle;
    this.startX = event.clientX;
    this.startY = event.clientY;
    
    // Calcola lo scale iniziale dal transform corrente (se presente)
    const currentTransform = this.contentElement.nativeElement.style.transform || '';
    const scaleMatch = currentTransform.match(/scale\(([^,)]+)(?:,\s*([^)]+))?\)/);
    
    // PER I VERTICI: Usa sempre le dimensioni base e lo scale
    let realWidth = this.note.width || Note.DEFAULT_WIDTH;
    let realHeight = this.note.height || Note.DEFAULT_HEIGHT;
    
    if (scaleMatch) {
      // C'è già uno scale, usa quello
      this.startScale = parseFloat(scaleMatch[1]) || 1;
    } else {
      // Non c'è transform, calcola lo scale dalle dimensioni reali del modello
      this.startScale = Math.min(realWidth / Note.DEFAULT_WIDTH, realHeight / Note.DEFAULT_HEIGHT);
    }
    
    // Imposta sempre le dimensioni base nel DOM per i vertici
    this.startWidth = Note.DEFAULT_WIDTH;
    this.startHeight = Note.DEFAULT_HEIGHT;
    this.contentElement.nativeElement.style.width = this.startWidth + 'px';
    this.contentElement.nativeElement.style.height = this.startHeight + 'px';
    
    // IMPORTANTE: Usiamo sempre 'center center' come transform-origin
    // Il centro del div rimane sempre fisso
    const transformOrigin = 'center center';
    
    // Calcola lo scale corrente
    const currentScaleX = this.startScale;
    const currentScaleY = scaleMatch && scaleMatch[2] ? parseFloat(scaleMatch[2]) : currentScaleX;
    
    // Calcola e salva il centro iniziale del box (nel viewport)
    const rect = this.contentElement.nativeElement.getBoundingClientRect();
    this.startCenterX = rect.left + rect.width / 2;
    this.startCenterY = rect.top + rect.height / 2;
    
    // Calcola la distanza iniziale del mouse dal centro
    const dx = this.startX - this.startCenterX;
    const dy = this.startY - this.startCenterY;
    this.startDistanceFromCenter = Math.sqrt(dx * dx + dy * dy);
    
    // Imposta sempre 'center center' come transform-origin
    this.contentElement.nativeElement.style.transformOrigin = transformOrigin;
    
    // Preserva lo scale e la rotazione corrente
    const rotation = this.note.rotation || 0;
    const transform = `scale(${currentScaleX}, ${currentScaleY}) rotate(${rotation}deg)`;
    this.contentElement.nativeElement.style.transform = transform;
    
    // Aggiorna anche gli handle
    this.updateHandlesScale(currentScaleX, currentScaleY);
    
    this.changeState(2);
  }
  
  

  /**
   * Inizia la rotazione della nota
   */
  startRotate(event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    if (!this.contentElement || !this.note) return;
    
    this.isRotating = true;
    
    // Calcola il centro della nota
    const rect = this.contentElement.nativeElement.getBoundingClientRect();
    this.centerX = rect.left + rect.width / 2;
    this.centerY = rect.top + rect.height / 2;
    
    // Salva l'angolo iniziale di rotazione
    this.startRotationAngle = this.note.rotation || 0;
    
    // Calcola l'angolo iniziale tra il centro e la posizione del mouse
    const dx = event.clientX - this.centerX;
    const dy = event.clientY - this.centerY;
    const initialAngle = Math.atan2(dy, dx) * (180 / Math.PI);
    
    // Salva l'offset angolare iniziale
    this.startX = initialAngle;
    
    this.changeState(2);
  }

  /**
   * Gestisce la rotazione durante il movimento del mouse
   */
  private handleRotation(event: MouseEvent): void {
    if (!this.contentElement || !this.note) return;
    
    // Calcola l'angolo corrente tra il centro e la posizione del mouse
    const dx = event.clientX - this.centerX;
    const dy = event.clientY - this.centerY;
    const currentAngle = Math.atan2(dy, dx) * (180 / Math.PI);
    
    // Calcola la differenza angolare rispetto all'angolo iniziale
    let angleDelta = currentAngle - this.startX;
    
    // Normalizza l'angolo tra -180 e 180
    while (angleDelta > 180) angleDelta -= 360;
    while (angleDelta < -180) angleDelta += 360;
    
    // Calcola il nuovo angolo di rotazione
    let newRotation = this.startRotationAngle + angleDelta;
    
    // Normalizza l'angolo finale tra 0 e 360
    newRotation = ((newRotation % 360) + 360) % 360;
    
    // Aggiorna l'angolo nel modello
    this.note.rotation = newRotation;
    
    // Preserva lo scale esistente e combina con la rotazione
    if (this.contentElement) {
      const currentTransform = this.contentElement.nativeElement.style.transform || '';
      const scaleMatch = currentTransform.match(/scale\(([^,)]+)(?:,\s*([^)]+))?\)/);
      
      let scaleX = 1;
      let scaleY = 1;
      if (scaleMatch) {
        scaleX = parseFloat(scaleMatch[1]) || 1;
        scaleY = parseFloat(scaleMatch[2]) || scaleX;
      }
      
      const transform = `scale(${scaleX}, ${scaleY}) rotate(${newRotation}deg)`;
      this.contentElement.nativeElement.style.transform = transform;
      this.contentElement.nativeElement.style.transformOrigin = 'center center';
      
      // Aggiorna lo scale degli handle
      this.updateHandlesScale(scaleX, scaleY);
    }
  }

  /**
   * Applica uno scale inverso agli handle (resize e rotate) per mantenerli
   * alla dimensione originale anche quando il contenitore viene scalato.
   */
  private updateHandlesScale(scaleX: number, scaleY: number): void {
    if (!this.contentElement) return;
    
    // Calcola lo scale inverso
    const inverseScaleX = 1 / scaleX;
    const inverseScaleY = 1 / scaleY;
    
    // Trova tutti gli handle e applica lo scale inverso
    const handles = this.contentElement.nativeElement.querySelectorAll(
      '.resize-handle, .rotate-handle'
    ) as NodeListOf<HTMLElement>;
    
    handles.forEach(handle => {
      // Applica lo scale inverso agli handle per mantenerli alla dimensione originale
      const isRotateHandle = handle.classList.contains('rotate-handle');
      if (isRotateHandle) {
        // Per rotate-handle, preserva translateX(-50%)
        handle.style.transform = `translateX(-50%) scale(${inverseScaleX}, ${inverseScaleY})`;
      } else {
        // Per gli angoli, solo scale
        handle.style.transform = `scale(${inverseScaleX}, ${inverseScaleY})`;
      }
      handle.style.transformOrigin = 'center center';
    });
  }

  // ============================================================================
  // METODI PUBBLICI
  // ============================================================================
  changeState(state: 0|1|2|3): void {
    const previousState = this.stateNote;
    this.stateNote = state;
    
    if (state === 1) {
      this.cancelOpenPanelTimer();
      this.textareaHasFocus = true;
      if (previousState === 2) {
        this.noteSelected.emit(null);
      }
      this.updateChildrenDraggableClass();
      setTimeout(() => {
        if (this.noteInput) {
          this.noteInput.nativeElement.focus();
          this.placeCaretAtEnd(this.noteInput.nativeElement);
        }
      }, 150);
    } else if (state === 2) {
      this.textareaHasFocus = false;
      if (this.noteInput) {
        this.noteInput.nativeElement.blur();
      }
      this.updateChildrenDraggableClass();
      this.openPanelWithDelay();
    } else if (state === 0 || state === 3) {
      this.cancelOpenPanelTimer();
      this.textareaHasFocus = false;
      if (this.noteInput) {
        this.noteInput.nativeElement.blur();
      }
      this.updateChildrenDraggableClass();
      if (previousState === 2) {
        this.noteSelected.emit(null);
      }
    }
    
    this.updateDragState();
  }

  // ============================================================================
  // METODI PRIVATI - Inizializzazione
  // ============================================================================
  private initialize(): void {
    if (this.note) {
      const purifiedText = this.purifyAndNormalizeText(this.note.text || '');
      this.noteText = purifiedText;
      if (this.note.text !== purifiedText) {
        this.note.text = purifiedText;
      }
      this.updateSanitizedHtml();
    }
    
    this.noteUpdatedSubscription = this.noteService.noteUpdated$
      .pipe(
        filter(updatedNote => updatedNote && this.note && updatedNote.note_id === this.note.note_id)
      )
      .subscribe(updatedNote => {
        if (updatedNote && this.note) {
          Object.assign(this.note, updatedNote);
          
          if (updatedNote.text) {
            const purifiedText = this.purifyAndNormalizeText(updatedNote.text);
            this.note.text = purifiedText;
          }
          
          if (!this.textareaHasFocus) {
            const newText = this.note.text || '';
            if (this.noteText !== newText) {
              this.noteText = newText;
              if (this.noteInput && this.noteInput.nativeElement.innerHTML !== newText) {
                this.noteInput.nativeElement.innerHTML = newText;
              }
              this.updateSanitizedHtml();
            }
          }
          
          // if (this.noteInput) {
          //   if (updatedNote.fontSize && this.note.fontSize !== updatedNote.fontSize) {
          //     this.noteInput.nativeElement.style.fontSize = updatedNote.fontSize + 'px';
          //   }
          //   if (updatedNote.fontFamily && this.note.fontFamily !== updatedNote.fontFamily) {
          //     this.noteInput.nativeElement.style.fontFamily = updatedNote.fontFamily;
          //   }
          // }
          this.logger.log('[CDS-NOTES] Note updated from service:', updatedNote.note_id);
        }
      });
  }

  private setupMutationObserver(): void {
    if (this.noteInput) {
      this.mutationObserver = new MutationObserver(() => {
        if (this.isDraggable) {
          this.updateChildrenDraggableClass();
        }
      });
      
      this.mutationObserver.observe(this.noteInput.nativeElement, {
        childList: true,
        subtree: true
      });
    }
  }

  // ============================================================================
  // METODI PRIVATI - Setup listeners
  // ============================================================================
  private setupAllListeners(): void {
    this.setupDragListeners();
  }

  private setupDragListeners(): void {
    this.setupDraggingListener();
    this.setupDragEndListener();
  }

  private setupDraggingListener(): void {
    this.draggingListener = ((e: CustomEvent) => {
      const el = e.detail.element;
      if (el && el.id === this.note?.note_id) {
        this.dragged = true;
      }
    }) as EventListener;
    document.addEventListener("dragged", this.draggingListener, false);
  }

  private setupDragEndListener(): void {
    this.draggedListener = ((e: CustomEvent) => {
      const el = e.detail.element;
      if (el && el.id === this.note?.note_id) {
        if (this.note.x !== el.offsetLeft || this.note.y !== el.offsetTop) {
          this.recalculateNoteDimensionsAndPosition(el);
          this.updateNote();
        }
      } else {
        this.changeState(0);
      }
    }) as EventListener;
    document.addEventListener("end-dragging", this.draggedListener, false);
  }

  // ============================================================================
  // METODI PRIVATI - Utility e helper
  // ============================================================================
  /**
   * Aggiorna il font-size proporzionalmente alla larghezza del contenitore.
   * Mantiene una relazione lineare tra larghezza e font-size.
   * Verifica e corregge l'altezza del contenitore per garantire che non sia mai
   * inferiore all'altezza minima del testo (scrollHeight + padding).
   */
  private updateFontSizeOnResize(newWidth: number): void {
    if (!this.note || !this.noteInput) {
      return;
    }

    // Valori di riferimento
    const REFERENCE_WIDTH = Note.DEFAULT_WIDTH; // Larghezza iniziale del div contenitore in px
    const REFERENCE_FONT_SIZE = Note.DEFAULT_FONT_SIZE_EM; // Dimensione iniziale del font in em 

    // Calcola il rapporto tra la nuova larghezza e la larghezza di riferimento
    const ratio = newWidth / REFERENCE_WIDTH;

    // Calcola il nuovo font-size in em proporzionalmente alla larghezza
    let newFontSizeEm = REFERENCE_FONT_SIZE * ratio;

    // Limiti ragionevoli
    newFontSizeEm = Math.max(0.5, Math.min(10, newFontSizeEm)); // tra 0.5em e 10em

    // Aggiorna il modello (per persistenza)
    this.note.fontSize = newFontSizeEm.toFixed(2) + 'em';

    // Aggiorna il DOM
    if (this.noteInput) {
      this.noteInput.nativeElement.style.fontSize = this.note.fontSize;
    }

    // Verifica e corregge l'altezza minima dopo aver aggiornato il font-size
    // (il font-size potrebbe essere cambiato, quindi anche l'altezza minima potrebbe essere cambiata)
    this.ensureMinimumHeight();
  }

  /**
   * Verifica che l'altezza del contenitore non sia inferiore all'altezza minima
   * del testo (scrollHeight + padding verticale).
   * Se l'altezza è inferiore al minimo, la corregge automaticamente.
   * Se siamo in fase di resize e la maniglia è superiore (tr, tl), aggiorna anche la posizione Y.
   */
  private ensureMinimumHeight(): void {
    if (!this.note || !this.noteInput || !this.contentElement) {
      return;
    }

    // Calcola l'altezza minima: scrollHeight del testo + padding verticale (10px top + 10px bottom = 20px)
    const textScrollHeight = this.noteInput.nativeElement.scrollHeight;
    const verticalPadding = 20; // 10px top + 10px bottom dal CSS (.cds-notes-content padding: 10px 8px)
    const minHeight = textScrollHeight + verticalPadding;

    // Ottieni l'altezza corrente del contenitore
    const currentHeight = this.note.height || this.contentElement.nativeElement.offsetHeight;

    // Se l'altezza corrente è inferiore al minimo, correggila
    if (currentHeight < minHeight) {
      const newHeight = minHeight;
      const heightDelta = newHeight - currentHeight;
      
      // Aggiorna il modello
      this.note.height = newHeight;
      
      // Aggiorna il DOM
      this.contentElement.nativeElement.style.height = newHeight + 'px';
      
      // Se siamo in fase di resize e la maniglia è superiore (tr, tl), aggiorna anche la posizione Y
      // per mantenere il punto fisso (bottom-right per tl, bottom-left per tr)
      if (this.isResizing && (this.resizeHandle === 'tr' || this.resizeHandle === 'tl')) {
        this.note.y = this.note.y - heightDelta;
        if (this.contentElement) {
          this.contentElement.nativeElement.style.top = this.note.y + 'px';
        }
      }
    }
  }

  private purifyAndNormalizeText(html: string): string {
    if (!html) return '';
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    const links = tempDiv.querySelectorAll('a');
    links.forEach((link: HTMLAnchorElement) => {
      const href = link.getAttribute('href');
      if (href && !href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
        link.setAttribute('href', 'http://' + href);
      }
    });
    
    return tempDiv.innerHTML;
  }

  private updateSanitizedHtml(): void {
    if (this.textareaHasFocus) {
      return;
    }
    const html = this.note?.text || '';
    const purifiedHtml = this.purifyAndNormalizeText(html);
    this.sanitizedNoteHtml = this.sanitizer.bypassSecurityTrustHtml(purifiedHtml);
  }

  private updateChildrenDraggableClass(): void {
    if (!this.noteInput) return;
    
    const children = this.noteInput.nativeElement.querySelectorAll('*');
    
    if (this.isDraggable) {
      children.forEach((child: Element) => {
        (child as HTMLElement).classList.add('tds_draggable');
      });
    } else {
      children.forEach((child: Element) => {
        (child as HTMLElement).classList.remove('tds_draggable');
      });
    }
  }

  private placeCaretAtEnd(element: HTMLElement): void {
    try {
      const range = document.createRange();
      const selection = window.getSelection();
      
      if (!selection) return;
      
      range.selectNodeContents(element);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
      element.focus();
    } catch (error) {
      console.error('[CDS-NOTES] Error placing caret at end:', error);
    }
  }

  private openPanelWithDelay(): void {
    this.cancelOpenPanelTimer();
    this.openPanelTimer = setTimeout(() => {
      if (this.stateNote === 2) {
        this.noteSelected.emit(this.note);
      }
      this.openPanelTimer = null;
    }, 200);
  }

  private cancelOpenPanelTimer(): void {
    if (this.openPanelTimer) {
      clearTimeout(this.openPanelTimer);
      this.openPanelTimer = null;
    }
  }

  private cancelSingleClickTimer(): void {
    if (this.singleClickTimer) {
      clearTimeout(this.singleClickTimer);
      this.singleClickTimer = null;
    }
  }

  private recalculateNoteDimensionsAndPosition(element: HTMLElement): void {
    if (!this.note || !this.contentElement) return;
    
    const computedStyle = window.getComputedStyle(element);
    const left = parseFloat(computedStyle.left) || parseFloat(element.style.left) || element.offsetLeft || 0;
    const top = parseFloat(computedStyle.top) || parseFloat(element.style.top) || element.offsetTop || 0;
    
    // Leggi le dimensioni base dal DOM (sono fisse)
    const baseWidth = parseFloat(element.style.width) || Note.DEFAULT_WIDTH;
    const baseHeight = parseFloat(element.style.height) || Note.DEFAULT_HEIGHT;
    
    // Leggi lo scale dal transform
    const transform = element.style.transform || '';
    const scaleMatch = transform.match(/scale\(([^,)]+)(?:,\s*([^)]+))?\)/);
    let scaleX = 1;
    let scaleY = 1;
    if (scaleMatch) {
      scaleX = parseFloat(scaleMatch[1]) || 1;
      scaleY = parseFloat(scaleMatch[2]) || scaleX;
    }
    
    // Calcola le dimensioni reali (base * scale)
    const width = baseWidth * scaleX;
    const height = baseHeight * scaleY;
     
    this.note.x = left;
    this.note.y = top;
    this.note.width = width;
    this.note.height = height;
  }
  
  private updateDragState(): void {
    if (this.note?.note_id) {
      setTimeout(() => {
        if (this.isDraggable) {
          this.logger.log('[CDS-NOTES] updateDragState - Initializing drag for note_id:', this.note.note_id, 'isDraggable:', this.isDraggable);
          
          if (this.contentElement) {
            const element = this.contentElement.nativeElement;
            const hasClass = element.classList.contains('tds_draggable');
            this.logger.log('[CDS-NOTES] updateDragState - contentElement exists:', !!element, 'has tds_draggable class:', hasClass);
            
            if (!hasClass) {
              element.classList.add('tds_draggable');
              this.logger.log('[CDS-NOTES] updateDragState - Added tds_draggable class manually');
            }
          }
          
          this.stageService.setDragElement(this.note.note_id);
        } else {
          this.logger.log('[CDS-NOTES] updateDragState - Drag NOT initialized, isDraggable:', this.isDraggable);
        }
      }, 50);
    }
  }

  private handleLinkClick(target: HTMLElement, event: MouseEvent): void {
    const linkElement = target.tagName === 'A' ? target as HTMLAnchorElement : target.closest('a') as HTMLAnchorElement;
    let linkUrl = linkElement?.getAttribute('href') || 'N/A';
    
    if (linkUrl !== 'N/A' && !linkUrl.startsWith('http://') && !linkUrl.startsWith('https://')) {
      linkUrl = 'http://' + linkUrl;
    }
    
    const linkText = linkElement?.textContent || linkElement?.innerText || 'N/A';
    const targetAttr = linkElement?.getAttribute('target') || '_blank';
    
    this.logger.log('[CDS-NOTES] 🔗 LINK CLICKED - URL:', linkUrl, 'Text:', linkText, 'Target:', targetAttr);
    
    if (linkUrl && linkUrl !== 'N/A') {
      if (targetAttr === '_blank' || linkElement?.target === '_blank') {
        window.open(linkUrl, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = linkUrl;
      }
    }
    
    event.stopPropagation();
  }

  private async updateNote(): Promise<void> {
    if (this.note && this.note.id_faq_kb) {
      try {
        await firstValueFrom(this.noteService.saveRemoteNote(this.note, this.note.id_faq_kb));
      } catch (error) {
        console.error('[CDS-NOTES] Error saving note:', error);
      }
    } else {
      console.warn('[CDS-NOTES] Cannot save note: missing note or id_faq_kb');
    }
  }
}
