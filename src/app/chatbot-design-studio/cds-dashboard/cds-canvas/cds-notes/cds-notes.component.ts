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
  private isHorizontalResizing = false; // Flag per resize orizzontale simmetrico
  private resizeHandle: string = '';
  private startX = 0;
  private startY = 0;
  private startWidth = 0; // Dimensioni base (rimangono fisse, usiamo scale per ridimensionare)
  private startHeight = 0; // Dimensioni base (rimangono fisse, usiamo scale per ridimensionare)
  private startScale = 1; // Scale iniziale
  private startCenterX = 0; // Centro iniziale del box (per calcolo scale rispetto al centro)
  private startCenterY = 0; // Centro iniziale del box (per calcolo scale rispetto al centro)
  private startDistanceFromCenter = 0; // Distanza iniziale del mouse dal centro
  private startLeft = 0; // Posizione X iniziale per resize orizzontale
  private currentBaseWidth = 0; // Larghezza base corrente (può essere modificata dal resize orizzontale)
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
    private sanitizer: DomSanitizer,
    private elementRef: ElementRef
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
      // Calcola e applica il font-size basandosi su note.width (proporzione inversa)
      this.calculateAndApplyFontSize();
      
      // Applica fontFamily
      if (this.noteInput) {
        this.noteInput.nativeElement.style.fontFamily = this.note.fontFamily;
      }
      
      // Applica scale, dimensioni e trasformazioni usando la funzione riutilizzabile
      this.applyScaleAndTransform();
      
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
    
    // Gestione resize orizzontale simmetrico
    if (this.isHorizontalResizing && this.contentElement && this.note) {
      this.handleHorizontalResize(event);
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
    if (this.isHorizontalResizing) {
      // Ricalcola dimensioni e scale basandosi sul transform corrente
      this.applyScaleAndTransform();
      
      this.isHorizontalResizing = false;
      this.resizeHandle = '';
      this.changeState(0);
      this.justFinishedResizing = true;
      this.updateNote();
    }
    
    if (this.isResizing) {
      // Ricalcola dimensioni e scale basandosi sul transform corrente
      this.applyScaleAndTransform();
      
      this.isResizing = false;
      this.resizeHandle = '';
      this.changeState(0);
      this.justFinishedResizing = true;
      // setTimeout(() => {
      //   this.justFinishedResizing = false;
      // }, 100);
      this.updateNote();
    }
    
    if (this.isRotating) {
      this.isRotating = false;
      // Ricalcola dimensioni e scale dopo la rotazione
      this.applyScaleAndTransform();
      this.updateNote();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isResizing || this.isHorizontalResizing || this.justFinishedResizing || this.isRotating) {
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
    // this.singleClickTimer = setTimeout(() => {
      this.changeState(2);
      this.updateDragState();
      this.singleClickTimer = null;
    // }, 100);
    
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
    
    // Determina lo scale iniziale con priorità:
    // 1. Transform CSS corrente
    // 2. Valore scale nel modello
    // 3. Calcolo da dimensioni reali
    if (scaleMatch) {
      // C'è già uno scale nel transform, usa quello
      this.startScale = parseFloat(scaleMatch[1]) || 1;
    } else if (this.note.scale && Array.isArray(this.note.scale) && this.note.scale.length >= 1) {
      // Usa il valore scale dal modello
      this.startScale = this.note.scale[0];
    } else {
      // Calcola lo scale dalle dimensioni reali del modello
      const realWidth = this.note.width || Note.DEFAULT_WIDTH;
      const realHeight = this.note.height || Note.DEFAULT_HEIGHT;
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
    const currentScaleY = scaleMatch && scaleMatch[2] ? parseFloat(scaleMatch[2]) : 
                          (this.note.scale && Array.isArray(this.note.scale) && this.note.scale.length >= 2) ? 
                          this.note.scale[1] : currentScaleX;
    
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
   * Inizia il ridimensionamento orizzontale simmetrico
   * Il centro orizzontale del div rimane fisso durante il resize
   */
  startHorizontalResize(event: MouseEvent, handle: 'left' | 'right'): void {
    event.stopPropagation();
    event.preventDefault();
    if (!this.contentElement || !this.note) return;
    
    this.isHorizontalResizing = true;
    this.resizeHandle = handle;
    this.startX = event.clientX;
    this.startY = event.clientY;
    
    // Leggi la larghezza base corrente dal DOM (o usa currentBaseWidth o DEFAULT_WIDTH)
    let currentWidth = parseFloat(this.contentElement.nativeElement.style.width);
    if (isNaN(currentWidth) || currentWidth === 0) {
      currentWidth = this.currentBaseWidth > 0 ? this.currentBaseWidth : Note.DEFAULT_WIDTH;
    }
    this.startWidth = currentWidth;
    this.currentBaseWidth = currentWidth; // Aggiorna anche currentBaseWidth
    
    // Leggi lo scale corrente (non deve essere modificato)
    const currentTransform = this.contentElement.nativeElement.style.transform || '';
    const scaleMatch = currentTransform.match(/scale\(([^,)]+)(?:,\s*([^)]+))?\)/);
    
    if (scaleMatch) {
      this.startScale = parseFloat(scaleMatch[1]) || 1;
    } else if (this.note.scale && Array.isArray(this.note.scale) && this.note.scale.length >= 1) {
      this.startScale = this.note.scale[0];
    } else {
      this.startScale = 1;
    }
    
    // Leggi la posizione X iniziale (dal modello o dal DOM)
    const hostElement = this.elementRef.nativeElement as HTMLElement;
    const hostLeft = parseFloat(hostElement.style.left);
    if (!isNaN(hostLeft)) {
      this.startLeft = hostLeft;
    } else {
      this.startLeft = this.note.x || 0;
    }
    
    this.changeState(2);
  }

  /**
   * Gestisce il ridimensionamento orizzontale durante il movimento del mouse
   * Mantiene il centro orizzontale fisso e modifica solo la larghezza
   */
  private handleHorizontalResize(event: MouseEvent): void {
    if (!this.contentElement || !this.note) return;
    
    // Calcola il delta X (spostamento orizzontale del mouse)
    const deltaX = event.clientX - this.startX;
    
    // Calcola la nuova larghezza base
    // Per maniglia destra: aumenta la larghezza di 2*deltaX (per mantenere il centro fisso)
    // Per maniglia sinistra: aumenta la larghezza di -2*deltaX
    let newWidth = this.startWidth;
    if (this.resizeHandle === 'right') {
      newWidth = this.startWidth + (2 * deltaX);
    } else if (this.resizeHandle === 'left') {
      newWidth = this.startWidth - (2 * deltaX);
    }
    
    // Limiti minimi e massimi per la larghezza
    const minWidth = 50; // Larghezza minima
    const maxWidth = 2000; // Larghezza massima
    newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
    
    // Calcola la nuova posizione X per mantenere il centro fisso
    // Il centro deve rimanere nella stessa posizione
    // Centro iniziale = startLeft + (startWidth * startScale) / 2
    // Nuovo centro = newLeft + (newWidth * startScale) / 2
    // Quindi: newLeft = startLeft + (startWidth - newWidth) * startScale / 2
    const widthDelta = newWidth - this.startWidth;
    const newLeft = this.startLeft - (widthDelta * this.startScale) / 2;
    
    // Applica la nuova larghezza al DOM (senza modificare lo scale)
    this.contentElement.nativeElement.style.width = newWidth + 'px';
    
    // Salva la nuova larghezza base
    this.currentBaseWidth = newWidth;
    
    // Aggiorna la posizione X nel DOM e nel modello
    const hostElement = this.elementRef.nativeElement as HTMLElement;
    hostElement.style.left = newLeft + 'px';
    this.note.x = newLeft;
    
    // Preserva lo scale e la rotazione esistenti
    const rotation = this.note.rotation || 0;
    const transform = `scale(${this.startScale}, ${this.startScale}) rotate(${rotation}deg)`;
    this.contentElement.nativeElement.style.transform = transform;
    this.contentElement.nativeElement.style.transformOrigin = 'center center';
    
    // Aggiorna anche gli handle con lo scale inverso
    this.updateHandlesScale(this.startScale, this.startScale);
    
    // Aggiorna la larghezza nel modello (larghezza effettiva = base * scale)
    // Ma non modifichiamo note.width direttamente, manteniamo solo la larghezza base nel DOM
    // e lo scale separato
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
      
      // Leggi lo scale dal transform corrente o dal modello
      if (scaleMatch) {
        scaleX = parseFloat(scaleMatch[1]) || 1;
        scaleY = parseFloat(scaleMatch[2]) || scaleX;
      } else if (this.note.scale && Array.isArray(this.note.scale) && this.note.scale.length >= 2) {
        scaleX = this.note.scale[0];
        scaleY = this.note.scale[1];
      }
      
      // Aggiorna lo scale nel modello per mantenerlo sincronizzato
      this.note.scale = [scaleX, scaleY];
      
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
      const isHorizontalHandle = handle.classList.contains('resize-left') || handle.classList.contains('resize-right');
      
      if (isRotateHandle) {
        // Per rotate-handle, preserva translateX(-50%)
        handle.style.transform = `translateX(-50%) scale(${inverseScaleX}, ${inverseScaleY})`;
      } else if (isHorizontalHandle) {
        // Per le maniglie laterali, preserva translateY(-50%)
        handle.style.transform = `translateY(-50%) scale(${inverseScaleX}, ${inverseScaleY})`;
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
      // setTimeout(() => {
        if (this.noteInput) {
          this.noteInput.nativeElement.focus();
          this.placeCaretAtEnd(this.noteInput.nativeElement);
        }
      // }, 150);
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
          
          // Applica scale e trasformazioni se contentElement è disponibile
          if (this.contentElement) {
            this.applyScaleAndTransform();
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
        // Ricalcola sempre dimensioni e posizione prima di salvare
        this.recalculateNoteDimensionsAndPosition();
        this.updateNote();
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
   * Calcola il font-size basandosi su note.width usando proporzione inversa.
   * Formula: font-size = (DEFAULT_WIDTH / note.width) * DEFAULT_FONT_SIZE_EM
   * 
   * Esempio: se note.width = 200px, DEFAULT_WIDTH = 130px, DEFAULT_FONT_SIZE_EM = 0.96em
   * font-size = (130 / 200) * 0.96 = 0.624em
   */
  private calculateAndApplyFontSize(): void {
    if (!this.note || !this.noteInput) {
      return;
    }

    // Valori di riferimento
    const DEFAULT_WIDTH = Note.DEFAULT_WIDTH; // 130px
    const DEFAULT_FONT_SIZE_EM = Note.DEFAULT_FONT_SIZE_EM; // 0.96em
    
    // Usa note.width originale (non modificato)
    const noteWidth = this.note.width || DEFAULT_WIDTH;

    // Calcola il font-size in proporzione inversa
    // DEFAULT_WIDTH / DEFAULT_FONT_SIZE_EM = note.width / font-size
    // Quindi: font-size = (DEFAULT_WIDTH / note.width) * DEFAULT_FONT_SIZE_EM
    let fontSizeEm = (DEFAULT_WIDTH / noteWidth) * DEFAULT_FONT_SIZE_EM;

    // Limiti ragionevoli per evitare font-size troppo piccoli o troppo grandi
    fontSizeEm = Math.max(0.3, Math.min(3, fontSizeEm)); // tra 0.3em e 3em

    // Aggiorna il modello (per persistenza)
    this.note.fontSize = fontSizeEm.toFixed(2) + 'em';

    // Applica al DOM
    if (this.noteInput) {
      this.noteInput.nativeElement.style.fontSize = this.note.fontSize;
    }

    this.logger.log('[CDS-NOTES] Calculated font-size:', {
      noteWidth: noteWidth,
      defaultWidth: DEFAULT_WIDTH,
      defaultFontSize: DEFAULT_FONT_SIZE_EM,
      calculatedFontSize: this.note.fontSize
    });
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
    // NOTA: Non aggiorniamo note.height per mantenerlo invariato, ma aggiorniamo solo il DOM
    if (currentHeight < minHeight) {
      const newHeight = minHeight;
      const heightDelta = newHeight - currentHeight;
      
      // NON aggiorniamo il modello note.height (deve rimanere invariato)
      // Aggiorna solo il DOM per la visualizzazione
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
    // this.openPanelTimer = setTimeout(() => {
      if (this.stateNote === 2) {
        this.noteSelected.emit(this.note);
      }
      this.openPanelTimer = null;
    // }, 200);
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

  /**
   * Funzione riutilizzabile che applica scale, dimensioni e trasformazioni CSS alla nota.
   * 
   * Questa funzione:
   * 1. Legge il valore scale dal modello Note (se presente) oppure lo calcola da width/height
   * 2. Imposta le dimensioni base nel DOM (DEFAULT_WIDTH x DEFAULT_HEIGHT)
   * 3. Applica le trasformazioni CSS (scale + rotation)
   * 4. Aggiorna le dimensioni nel modello basandosi su scale (base * scale)
   * 5. Aggiorna anche il campo scale nel modello per mantenerlo sincronizzato
   * 
   * Viene chiamata in:
   * - ngAfterViewInit: per inizializzare la nota
   * - onMouseUp: dopo resize o rotazione
   * - recalculateNoteDimensionsAndPosition: dopo drag
   */
  private applyScaleAndTransform(): void {
    if (!this.note || !this.contentElement) return;
    
    const element = this.contentElement.nativeElement;
    
    // Determina la larghezza base: usa currentBaseWidth se è stata impostata (da resize orizzontale),
    // altrimenti leggi dal DOM, altrimenti usa DEFAULT_WIDTH
    let baseWidth = Note.DEFAULT_WIDTH;
    if (this.currentBaseWidth > 0) {
      baseWidth = this.currentBaseWidth;
    } else {
      // Prova a leggere dal DOM
      const domWidth = parseFloat(element.style.width);
      if (!isNaN(domWidth) && domWidth > 0) {
        baseWidth = domWidth;
        this.currentBaseWidth = baseWidth;
      }
    }
    
    const baseHeight = Note.DEFAULT_HEIGHT;
    
    // Imposta sempre le dimensioni base nel DOM (rimangono fisse, usiamo scale per ridimensionare)
    element.style.width = baseWidth + 'px';
    element.style.height = baseHeight + 'px';
    
    // Determina lo scale da applicare
    let scaleX = 1;
    let scaleY = 1;
    
    // Priorità 1: Se c'è un transform CSS già applicato, leggi lo scale da lì
    const computedStyle = window.getComputedStyle(element);
    const currentTransform = computedStyle.transform || element.style.transform || '';
    
    if (currentTransform && currentTransform !== 'none') {
      // Prova prima con la stringa scale() se presente
      const scaleMatch = currentTransform.match(/scale\(([^,)]+)(?:,\s*([^)]+))?\)/);
      if (scaleMatch) {
        scaleX = parseFloat(scaleMatch[1]) || 1;
        scaleY = parseFloat(scaleMatch[2]) || scaleX;
      } else {
        // Se è una matrix, estrai lo scale dalla matrice
        // matrix(scaleX, skewY, skewX, scaleY, translateX, translateY)
        const matrixMatch = currentTransform.match(/matrix\(([^)]+)\)/);
        if (matrixMatch) {
          const values = matrixMatch[1].split(',').map(v => parseFloat(v.trim()));
          if (values.length >= 4) {
            scaleX = Math.sqrt(values[0] * values[0] + values[1] * values[1]);
            scaleY = Math.sqrt(values[2] * values[2] + values[3] * values[3]);
          }
        }
      }
    } else {
      // Priorità 2: Se c'è un valore scale nel modello, usalo
      if (this.note.scale && Array.isArray(this.note.scale) && this.note.scale.length >= 2) {
        scaleX = this.note.scale[0];
        scaleY = this.note.scale[1];
      } else {
        // Priorità 3: Calcola lo scale dalle dimensioni salvate nel modello
        const savedWidth = this.note.width || baseWidth;
        const savedHeight = this.note.height || baseHeight;
        scaleX = savedWidth / baseWidth;
        scaleY = savedHeight / baseHeight;
      }
    }
    
    // Applica la trasformazione combinando scale + rotate
    const rotation = this.note.rotation || 0;
    const transform = `scale(${scaleX}, ${scaleY}) rotate(${rotation}deg)`;
    element.style.transform = transform;
    element.style.transformOrigin = 'center center';
    
    // Calcola le dimensioni reali (base * scale)
    const width = baseWidth * scaleX;
    const height = baseHeight * scaleY;
    
    // Aggiorna il modello con le dimensioni reali e lo scale
    // this.note.width = width;
    // this.note.height = height;
    this.note.scale = [scaleX, scaleY];
    
    // Applica scale inverso agli handle per mantenerli alla dimensione originale
    this.updateHandlesScale(scaleX, scaleY);
    
    this.logger.log('[CDS-NOTES] Applied scale and transform:', {
      scaleX: scaleX,
      scaleY: scaleY,
      width: width,
      height: height,
      rotation: rotation,
      scale: this.note.scale
    });
  }

  private recalculateNoteDimensionsAndPosition(): void {
    if (!this.note || !this.contentElement) return;
    
    // L'elemento host del componente (cds-notes) ha la posizione impostata dal template
    // Usa ElementRef per accedere all'elemento host
    const hostElement = this.elementRef.nativeElement as HTMLElement;
    const contentElement = this.contentElement.nativeElement;
    
    let left = 0;
    let top = 0;
    
    // Prova a leggere la posizione dall'elemento host (dove viene impostata dal template)
    const hostLeft = parseFloat(hostElement.style.left);
    const hostTop = parseFloat(hostElement.style.top);
    
    if (!isNaN(hostLeft)) {
      left = hostLeft;
    } else {
      // Fallback: leggi da offsetLeft/offsetTop dell'host
      left = hostElement.offsetLeft || 0;
    }
    
    if (!isNaN(hostTop)) {
      top = hostTop;
    } else {
      // Fallback: leggi da offsetTop dell'host
      top = hostElement.offsetTop || 0;
    }
    
    // Se non abbiamo trovato la posizione dall'host, prova a leggere dal div interno
    // (tiledesk-stage potrebbe impostare la posizione direttamente sul div con l'id)
    if ((left === 0 && top === 0) || (isNaN(hostLeft) && isNaN(hostTop))) {
      const contentLeft = parseFloat(contentElement.style.left);
      const contentTop = parseFloat(contentElement.style.top);
      
      if (!isNaN(contentLeft)) {
        left = contentLeft;
      }
      if (!isNaN(contentTop)) {
        top = contentTop;
      }
    }
    
    // Se ancora non abbiamo trovato la posizione, usa i valori dal modello come ultimo fallback
    // (ma solo se non sono 0,0, per evitare di sovrascrivere una posizione valida)
    if (left === 0 && top === 0 && (this.note.x !== 0 || this.note.y !== 0)) {
      left = this.note.x;
      top = this.note.y;
    }
    
    // Aggiorna la posizione nel modello
    this.note.x = left;
    this.note.y = top;
    
    // Ricalcola dimensioni e scale usando la funzione riutilizzabile
    this.applyScaleAndTransform();
    
    this.logger.log('[CDS-NOTES] Recalculated dimensions and position:', {
      x: this.note.x,
      y: this.note.y,
      width: this.note.width,
      height: this.note.height,
      scale: this.note.scale,
      hostLeft: hostLeft,
      hostTop: hostTop,
      contentLeft: parseFloat(contentElement.style.left),
      contentTop: parseFloat(contentElement.style.top)
    });
  }
  
  private updateDragState(): void {
    if (this.note?.note_id) {
      // setTimeout(() => {
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
      // }, 50);
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
